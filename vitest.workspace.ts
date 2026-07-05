import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/shared",
  "packages/renderer",
  "packages/frontend",
  "packages/backend",
  "packages/agent"
]);
