// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive, ref } from "vue";
import type { Ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AppUpdatePrompt from "../components/AppUpdatePrompt.vue";
import { EventBus, EventTypes } from "~~/services/EventBus";

const mocks = vi.hoisted(() => {
  const updateServiceWorker = vi.fn(async () => undefined);
  const cancelPrompt = vi.fn(async () => undefined);
  const swUpdate = vi.fn(async () => undefined);
  const flushUnsavedWork = vi.fn(async () => undefined);
  const getRegistration = vi.fn(
    async (): Promise<{ waiting: unknown; update: () => Promise<void> }> => ({
      waiting: {},
      update: swUpdate,
    }),
  );
  return {
    useAppUpdate: vi.fn(),
    createBuildVersionProbe: vi.fn(),
    flushUnsavedWork,
    updateServiceWorker,
    cancelPrompt,
    swUpdate,
    getRegistration,
  };
});

vi.mock("@devopsplaybook.io/common-web/composables/useAppUpdate", () => ({
  useAppUpdate: mocks.useAppUpdate,
}));
vi.mock("@devopsplaybook.io/common-web/services/BuildVersionProbe", () => ({
  createBuildVersionProbe: mocks.createBuildVersionProbe,
}));
vi.mock("../utils/appUpdateGuard", () => ({
  flushUnsavedWork: mocks.flushUnsavedWork,
}));

let updateAvailable: Ref<boolean>;
let reload: ReturnType<typeof vi.fn>;
let dismiss: ReturnType<typeof vi.fn>;
let pwa: {
  needRefresh: boolean;
  updateServiceWorker: ReturnType<typeof vi.fn>;
  cancelPrompt: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  updateAvailable = ref(false);
  reload = vi.fn(async () => undefined);
  dismiss = vi.fn(() => {
    updateAvailable.value = false;
  });
  mocks.createBuildVersionProbe.mockReturnValue(vi.fn(async () => null));
  mocks.flushUnsavedWork.mockResolvedValue(undefined);
  mocks.getRegistration.mockResolvedValue({
    waiting: {},
    update: mocks.swUpdate,
  });
  mocks.useAppUpdate.mockReturnValue({
    updateAvailable,
    dismissed: ref(false),
    latestBuildId: ref(null),
    checkNow: vi.fn(),
    start: vi.fn(() => () => undefined),
    stop: vi.fn(),
    reload,
    dismiss,
  });
  pwa = reactive({
    needRefresh: false,
    updateServiceWorker: mocks.updateServiceWorker,
    cancelPrompt: mocks.cancelPrompt,
  });
  vi.stubGlobal("useNuxtApp", () => ({ $pwa: pwa }));
  vi.stubGlobal("useRuntimeConfig", () => ({ app: { buildId: "build-a" } }));
  Object.defineProperty(window.navigator, "serviceWorker", {
    value: { getRegistration: mocks.getRegistration },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("AppUpdatePrompt", () => {
  it("wires the cache-busting probe, the build id and the reload guard", () => {
    mount(AppUpdatePrompt);

    expect(mocks.createBuildVersionProbe).toHaveBeenCalledWith({
      manifestUrl: "/_nuxt/builds/latest.json?probe=1",
    });
    expect(mocks.useAppUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        currentBuildId: "build-a",
        fetchLatestBuildId: expect.any(Function),
        beforeReload: expect.any(Function),
      }),
    );
  });

  it("is hidden until an update is signalled", () => {
    const wrapper = mount(AppUpdatePrompt);

    expect(wrapper.find('[data-testid="app-update-reload"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });

  it("shows the notice and refreshes the worker when the probe detects a build", async () => {
    const wrapper = mount(AppUpdatePrompt);

    updateAvailable.value = true;
    await nextTick();
    await flushPromises();

    expect(wrapper.find('[data-testid="app-update-reload"]').exists()).toBe(
      true,
    );
    expect(wrapper.get('[data-testid="app-update-message"]').text()).toBe(
      "New version available.",
    );
    expect(mocks.getRegistration).toHaveBeenCalled();
    expect(mocks.swUpdate).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("shows the notice when only the service worker needs a refresh", async () => {
    const wrapper = mount(AppUpdatePrompt);

    pwa.needRefresh = true;
    await nextTick();
    await flushPromises();

    expect(wrapper.find('[data-testid="app-update-reload"]').exists()).toBe(
      true,
    );
    wrapper.unmount();
  });

  it("flushes unsaved buffers and activates the waiting worker exactly once", async () => {
    const order: string[] = [];
    mocks.flushUnsavedWork.mockImplementation(async () => {
      order.push("flush");
    });
    mocks.updateServiceWorker.mockImplementation(async () => {
      order.push("activate");
    });

    const wrapper = mount(AppUpdatePrompt);
    pwa.needRefresh = true;
    await nextTick();
    await flushPromises();

    await wrapper.get('[data-testid="app-update-reload"]').trigger("click");
    await flushPromises();

    expect(order).toEqual(["flush", "activate"]);
    expect(mocks.updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(mocks.updateServiceWorker).toHaveBeenCalledWith(true);
    expect(reload).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("vetoes the reload and warns when unsaved work cannot be saved", async () => {
    mocks.flushUnsavedWork.mockRejectedValue(new Error("save failed"));
    const alerts: unknown[] = [];
    const onAlert = (payload: unknown): void => {
      alerts.push(payload);
    };
    EventBus.on(EventTypes.ALERT_MESSAGE, onAlert);

    const wrapper = mount(AppUpdatePrompt);
    pwa.needRefresh = true;
    await nextTick();
    await flushPromises();

    await wrapper.get('[data-testid="app-update-reload"]').trigger("click");
    await flushPromises();

    expect(mocks.updateServiceWorker).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type: "error" });
    EventBus.off(EventTypes.ALERT_MESSAGE, onAlert);
    wrapper.unmount();
  });

  it("falls back to a plain shared reload without a waiting worker", async () => {
    mocks.getRegistration.mockResolvedValue({
      waiting: null,
      update: mocks.swUpdate,
    });
    const wrapper = mount(AppUpdatePrompt);
    updateAvailable.value = true;
    await nextTick();
    await flushPromises();

    await wrapper.get('[data-testid="app-update-reload"]').trigger("click");
    await flushPromises();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(mocks.updateServiceWorker).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("dismisses the notice and cancels the plugin prompt on later", async () => {
    const wrapper = mount(AppUpdatePrompt);
    updateAvailable.value = true;
    await nextTick();
    await flushPromises();

    await wrapper.get('[data-testid="app-update-later"]').trigger("click");
    await flushPromises();

    expect(mocks.cancelPrompt).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="app-update-reload"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });
});
