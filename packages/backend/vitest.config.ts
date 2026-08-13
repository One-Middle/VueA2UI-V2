import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@a2ui-platform/agent": resolve(__dirname, "../agent/src/index.ts"),
      "@a2ui-platform/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
