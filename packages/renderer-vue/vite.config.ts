import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@a2ui-platform/renderer-core": resolve(__dirname, "../renderer-core/src/index.ts") } },
  plugins: [vue()],
  build: { lib: { entry: "src/index.ts", name: "A2UIRendererVue", fileName: "index" }, rollupOptions: { external: ["vue", "@a2ui-platform/renderer-core"] } },
  test: { environment: "jsdom", include: ["src/**/*.test.ts"] },
});
