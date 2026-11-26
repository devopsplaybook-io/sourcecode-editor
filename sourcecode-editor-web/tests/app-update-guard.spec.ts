import { afterEach, describe, expect, it, vi } from "vitest";

import {
  flushUnsavedWork,
  registerUnsavedWorkFlusher,
} from "../utils/appUpdateGuard";

const unregisters: Array<() => void> = [];

function register(flusher: () => void | Promise<void>): () => void {
  const unregister = registerUnsavedWorkFlusher(flusher);
  unregisters.push(unregister);
  return unregister;
}

afterEach(() => {
  while (unregisters.length) unregisters.pop()?.();
});

describe("appUpdateGuard", () => {
  it("runs the registered flushers in registration order, awaiting each", async () => {
    const order: string[] = [];
    register(() => {
      order.push("first");
    });
    register(async () => {
      await Promise.resolve();
      order.push("second");
    });

    await flushUnsavedWork();

    expect(order).toEqual(["first", "second"]);
  });

  it("stops calling a flusher once it is unregistered", async () => {
    const flusher = vi.fn();
    const unregister = register(flusher);
    unregister();

    await flushUnsavedWork();

    expect(flusher).not.toHaveBeenCalled();
  });

  it("is a no-op when nothing is registered", async () => {
    await expect(flushUnsavedWork()).resolves.toBeUndefined();
  });

  it("propagates a rejection and skips the remaining flushers", async () => {
    const second = vi.fn();
    register(() => {
      throw new Error("cannot save");
    });
    register(second);

    await expect(flushUnsavedWork()).rejects.toThrow("cannot save");
    expect(second).not.toHaveBeenCalled();
  });
});
