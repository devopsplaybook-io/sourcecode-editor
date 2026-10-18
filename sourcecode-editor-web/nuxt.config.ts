// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
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
    registerType: "autoUpdate",
    // The manifest is a static public file (sed-edited at container start for
    // the application title), so it must stay out of the SW precache.
    manifest: false,
    workbox: {
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
    },
  },
});
