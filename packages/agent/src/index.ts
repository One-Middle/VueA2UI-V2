// ─── Runtime ────────────────────────────────────────────────
export { AgentRuntime } from "./runtime/agent-runtime.js";
export { parseModelOutput } from "./runtime/output-parser.js";
export { parseComponentInfoRequest } from "./runtime/component-info-request-parser.js";

// ─── Context ────────────────────────────────────────────────
export { AgentContextBuilder } from "./context/context-builder.js";
export type { AgentContext } from "./context/context-builder.js";

// ─── Prompts ────────────────────────────────────────────────
export { PromptComposer } from "./prompts/prompt-composer.js";

// ─── Model ──────────────────────────────────────────────────
export { ModelClient } from "./model/model-client.js";
export type {
  ChatMessage,
  ModelResponse,
  TokenUsage,
  ModelClientConfig,
} from "./model/model-client.js";

// ─── Tools ──────────────────────────────────────────────────
export { validateA2UI } from "./tools/validate-a2ui.js";
export {
  getCatalogComponents,
  getCatalogComponentSummaries,
  formatCatalogComponentSummaries,
  formatCatalogComponentDetails,
  getCatalogComponentNames,
  getAllCatalogComponentNames,
  getComponentDef,
  getBasicCatalogDefinition,
} from "./tools/catalog-schema.js";
