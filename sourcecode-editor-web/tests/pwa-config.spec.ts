// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";

interface GenerateSWConfig {
  globPatterns?: string[];
  globIgnores?: string[];
  navigateFallback?: string;
  navigateFallbackDenylist?: RegExp[];
  skipWaiting?: boolean;
  clientsClaim?: boolean;
}

interface PwaConfig {
  registerType?: string;
  updateViaCache?: string;
  manifest?: unknown;
  generateSW?: GenerateSWConfig;
}

interface NuxtConfig {
  alias?: Record<string, string>;
  build?: { transpile?: string[] };
  pwa?: PwaConfig;
}

function blocksBuildManifest(denylist: RegExp[], url: string): boolean {
  return denylist.some((pattern) => pattern.test(url));
}

describe("nuxt.config PWA prompt mode", () => {
  let config: NuxtConfig;

  beforeAll(async () => {
    // nuxt.config.ts calls the Nuxt global; stub it for the plain import
    (globalThis as Record<string, unknown>).defineNuxtConfig ??= (
      value: unknown,
    ) => value;
    config = (await import("../nuxt.config")).default as NuxtConfig;
  });

  it("waits for the user before activating a new build", () => {
    expect(config.pwa?.registerType).toBe("prompt");
    expect(config.pwa?.updateViaCache).toBe("none");
    expect(config.pwa?.generateSW?.skipWaiting).toBeUndefined();
    expect(config.pwa?.generateSW?.clientsClaim).toBeUndefined();
  });

  it("keeps the static manifest out of the generated SW", () => {
    expect(config.pwa?.manifest).toBe(false);
  });

  it("keeps the precache list and the offline shell", () => {
    const generateSW = config.pwa?.generateSW;
    expect(generateSW?.globPatterns).toEqual([
      "**/*.{js,css,html}",
      "config.json",
      "icon.png",
      "images/icon.png",
    ]);
    expect(generateSW?.navigateFallback).toBe("/");
  });

  it("never answers a build-manifest navigation with the app shell", () => {
    const denylist = config.pwa?.generateSW?.navigateFallbackDenylist ?? [];
    expect(blocksBuildManifest(denylist, "/_nuxt/builds/latest.json")).toBe(
      true,
    );
    expect(blocksBuildManifest(denylist, "/_nuxt/entry.js")).toBe(false);
  });

  it("does not rely on globIgnores (the module re-adds the build manifest)", () => {
    expect(config.pwa?.generateSW?.globIgnores).toBeUndefined();
  });

  it("consumes common-web raw sources through Vite", () => {
    expect(config.alias?.["@devopsplaybook.io/common-web"]).toContain(
      "node_modules/@devopsplaybook.io/common-web",
    );
    expect(config.build?.transpile).toContain(
      "@devopsplaybook.io/common-web",
    );
  });
});
