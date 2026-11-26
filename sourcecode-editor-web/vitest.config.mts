import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "~~": fileURLToPath(new URL(".", import.meta.url)),
      "@@": fileURLToPath(new URL(".", import.meta.url)),
      "~": fileURLToPath(new URL(".", import.meta.url)),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts", "services/**/*.spec.ts"],
    // common-web ships raw .vue/.ts sources that must go through Vite's
    // transform pipeline in tests too.
    server: {
      deps: {
        inline: ["@devopsplaybook.io/common-web"],
      },
    },
  },
});
