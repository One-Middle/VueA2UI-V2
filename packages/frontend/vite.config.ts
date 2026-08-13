import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const envDir = resolve(__dirname, "../..");
  const env = loadEnv(mode, envDir, "");

  return {
    plugins: [vue()],
    envDir,
    resolve: {
      alias: {
        "@a2ui-platform/renderer": resolve(__dirname, "../renderer/src/index.ts"),
        "@a2ui-platform/shared": resolve(__dirname, "../shared/src/index.ts"),
        "@a2ui-platform/agent": resolve(__dirname, "../agent/src/index.ts"),
      },
    },
    server: {
      port: Number(env.VITE_PORT || 5173),
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:3100",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.ts"]
    },
  };
});
