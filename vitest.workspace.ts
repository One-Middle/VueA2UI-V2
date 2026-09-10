import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared",
  "packages/renderer-core",
  "packages/renderer-dom",
  "packages/renderer-vue",
  "packages/renderer-react",
  "packages/frontend",
  "packages/backend",
  "packages/agent",
  "packages/agent-engine-spi",
  "packages/react-agent-engine",
  "packages/codex-sdk-agent-engine"
]);
