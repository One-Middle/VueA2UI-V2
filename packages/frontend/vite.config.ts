import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  envDir: resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@a2ui-platform/renderer": resolve(__dirname, "../renderer/src/index.ts"),
      "@a2ui-platform/shared": resolve(__dirname, "../shared/src/index.ts"),
      "@a2ui-platform/agent": resolve(__dirname, "../agent/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"]
  }
});
