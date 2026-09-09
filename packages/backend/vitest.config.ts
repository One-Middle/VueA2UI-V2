import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@a2ui-platform/agent": resolve(__dirname, "../agent/src/index.ts"),
      "@a2ui-platform/shared": resolve(__dirname, "../shared/src/index.ts"),
      "@a2ui-platform/agent-engine-spi": resolve(__dirname, "../agent-engine-spi/src/index.ts"),
      "@a2ui-platform/react-agent-engine": resolve(__dirname, "../react-agent-engine/src/index.ts"),
      "@a2ui-platform/codex-sdk-agent-engine": resolve(__dirname, "../codex-sdk-agent-engine/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
