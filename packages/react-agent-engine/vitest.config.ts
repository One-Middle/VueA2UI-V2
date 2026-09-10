import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/** 测试直接解析 workspace 源码，避免要求 adapter 测试前先发布所有内部依赖。 */
export default defineConfig({
  resolve: {
    alias: {
      "@a2ui-platform/agent": resolve(__dirname, "../agent/src/index.ts"),
      "@a2ui-platform/shared": resolve(__dirname, "../shared/src/index.ts"),
      "@a2ui-platform/agent-engine-spi": resolve(__dirname, "../agent-engine-spi/src/index.ts"),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
