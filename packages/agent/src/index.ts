/**
 * Agent 包公共 API 入口。
 *
 * 职责：
 * - 暴露 Agent Runtime 工厂函数（后端唯一需要的运行时 API）
 * - 暴露输出解析、校验与 Catalog 工具函数
 * - 暴露内置 Skill 注册表
 *
 * 不暴露：AgentRuntime、ModelClient、PromptComposer、AgentContextBuilder
 * 等内部实现细节——外部只能通过 createAgentRuntime() 获取 IAgentRuntime 实例。
 */

// ─── 工厂入口（后端唯一需要导入的 Agent 运行时 API）───
export { createAgentRuntime } from "./runtime/create-agent-runtime.js";

// ─── 输出解析工具 ────────────────────────────────────────
export { parseModelOutput } from "./runtime/output-parser.js";
export { parseComponentInfoRequest } from "./runtime/component-info-request-parser.js";
export { parseSkillReferenceRequest } from "./runtime/skill-reference-request-parser.js";

// ─── 校验与 Catalog 工具 ─────────────────────────────────
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

// ─── 内置 Skill 注册表 ───────────────────────────────────
export { BUILTIN_SKILLS, type BuiltinSkillMeta } from "./skills/registry.js";
export {
  getPlatformAutoEnabledSkills,
  type PlatformSkill,
} from "./skills/platform-skills.js";
