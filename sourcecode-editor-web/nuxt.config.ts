// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  ssr: false,
  // common-web is consumed as raw .vue/.ts sources (not as a Nuxt layer, so its
  // global CSS does not leak here). Map the package to its installed directory
  // so both Vite and the generated tsconfig resolve the raw subpath imports.
  alias: {
    "@devopsplaybook.io/common-web": fileURLToPath(
      new URL("./node_modules/@devopsplaybook.io/common-web", import.meta.url),
    ),
  },
  build: {
    transpile: ["@devopsplaybook.io/common-web"],
  },
  vite: {
    optimizeDeps: {
      exclude: ["@devopsplaybook.io/common-web"],
    },
  },
  app: {
    head: {
      charset: "utf-16",
      viewport: "width=device-width, initial-scale=1, height=device-height",
      title: "Code",
      meta: [
        { name: "description", content: "sourcecode-editor" },
        { name: "theme-color", content: "#212121" },
      ],
      link: [
        { rel: "icon", href: "/icon.png" },
        { rel: "stylesheet", href: "/styles.css" },
        { rel: "manifest", href: "/manifest.webmanifest" },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt", "@vite-pwa/nuxt"],
  imports: {
    dirs: ["./stores"],
  },
  pinia: {
    autoImports: ["defineStore", "acceptHMRUpdate"],
  },
  pwa: {
    // Prompt mode keeps the old worker controlling until the user accepts the
    // shared update banner (components/AppUpdatePrompt.vue): a reload must
    // never silently discard an unsaved buffer.
    registerType: "prompt",
    // Keep the sw.js fetch off the HTTP cache so a new build is noticed.
    updateViaCache: "none",
    // The manifest is a static public file (sed-edited at container start for
    // the application title), so it must stay out of the SW precache.
    manifest: false,
    // @vite-pwa/nuxt v2 renamed the deprecated `workbox` option to `generateSW`.
    generateSW: {
      // Public files are precached via explicit globs: includeAssets does not
      // resolve Nuxt's public dir, and these files are copied into the output
      // root that workbox globs.
      globPatterns: [
        "**/*.{js,css,html}",
        "config.json",
        "icon.png",
        "images/icon.png",
      ],
      navigateFallback: "/",
      // Never answer a navigation to the build manifest with the app shell.
      // (The module re-adds _nuxt/builds/latest.json to the precache through its
      // manifestTransforms, so detection cannot rely on excluding it; the probe
      // uses a cache-busting URL instead — see components/AppUpdatePrompt.vue.)
      navigateFallbackDenylist: [/\/_nuxt\/builds\//],
    },
  },
});
