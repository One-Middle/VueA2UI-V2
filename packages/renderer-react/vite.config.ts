import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@a2ui-platform/renderer-core": resolve(__dirname, "../renderer-core/src/index.ts") } },
  build: { lib: { entry: "src/index.ts", name: "A2UIRendererReact", fileName: "index" }, rollupOptions: { external: ["react", "react-dom", "@a2ui-platform/renderer-core"] } },
  test: { environment: "jsdom", include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
});
