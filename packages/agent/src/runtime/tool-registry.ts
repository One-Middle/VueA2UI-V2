/**
 * ReAct Agent 工具注册表。
 *
 * 职责：
 * - 封装 ReAct Agent 可调用的受控工具（第一版 6 个）。
 * - 执行工具参数校验，按工具 failure policy 返回 observation 或 final artifact。
 * - 提供最终产物结构校验辅助函数（normalizeClarificationForm、normalizeDecisionForm、
 *   getMissingPlanHeadings），供 executor 的 final draft 校验复用。
 *
 * 引用：
 * - ../tools/validate-a2ui（A2UI 校验）、../tools/catalog-schema（组件详情）。
 * 被引用：
 * - workflow-agent-executor（注入并调用）、backend（构造时注入 skill 数据源）。
 * 注意：
 * - 不保存 ToolCall 到数据库、不发送 SSE、不决定 WorkflowStep 状态。
 * - skill 内容通过注入的依赖获取，本模块不直接查询数据库。
 */

import type {
  A2UIServerMessage,
  AgentToolName,
  ClarificationForm,
  ClarificationQuestion,
  ClarificationQuestionType,
  DecisionForm,
  DecisionFormOption,
  DecisionFormTarget,
  JsonObject,
  SurfaceSnapshotData,
  ValidateA2UIResult,
  WorkflowDecisionOption,
} from "@a2ui-platform/shared";
import { validateA2UI } from "../tools/validate-a2ui.js";
import {
  formatCatalogComponentDetails,
  getComponentDef,
} from "../tools/catalog-schema.js";
import {
  hasSkill,
  hasSkillReference,
  recordSkill,
  recordSkillReferences,
  type ResourceLedger,
} from "./resource-ledger.js";
import type {
  AgentCapabilities,
  AgentFinalArtifact,
  AgentObservation,
  ToolExecutionResult,
} from "./react-agent-types.js";

/** 已启用 skill 的完整内容记录（含 reference 摘要，不含 reference 正文）。 */
export interface SkillContentRecord {
  id: string;
  name: string;
  content: string;
  references: Array<{ id: string; title: string; content: string }>;
}

/** ToolRegistry 的注入依赖，由 backend / WorkflowService 提供。 */
export interface ToolRegistryDependencies {
  /** 按 id 或 name 查询已启用 skill 的完整内容，找不到返回 null。 */
  getSkillContent: (skillIdOrName: string) => SkillContentRecord | null;
  /** 当前 Surface 快照，用于 validateA2UI 增量校验。 */
  currentSnapshot?: SurfaceSnapshotData | null;
  /** 当前 workflow task 的 Resource Ledger，用于记录已披露资源并做去重。 */
  resourceLedger: ResourceLedger;
}

/** 受控工具注册表。 */
export class ToolRegistry {
  constructor(
    private readonly capabilities: AgentCapabilities,
    private readonly deps: ToolRegistryDependencies,
  ) {}

  /** 判断工具是否在当前 gate 被授权。 */
  isAllowed(tool: AgentToolName): boolean {
    return this.capabilities.allowedTools.includes(tool);
  }

  /**
   * 对候选 A2UI 消息执行校验，供 executor 的强制 final validation 使用。
   *
   * 与 execute("validateA2UI") 的区别：本方法直接返回校验结果，不包装成 observation。
   */
  validateMessages(messages: A2UIServerMessage[]): ValidateA2UIResult {
    return validateA2UI({
      messages,
      catalogId: this.capabilities.catalogId,
      currentSnapshot: this.deps.currentSnapshot ?? null,
    });
  }

  /**
   * 执行一个工具调用。
   *
   * @param tool - 工具名
   * @param args - 模型提供的工具参数
   * @returns 工具执行结果（completed / failed / final_artifact）。
   */
  async execute(tool: AgentToolName, args: JsonObject): Promise<ToolExecutionResult> {
    if (!this.isAllowed(tool)) {
      return {
        status: "failed",
        observation: {
          kind: "tool_result",
          message: `工具 ${tool} 未在当前 gate 授权，不能调用`,
        },
        recoverable: false,
      };
    }

    try {
      switch (tool) {
        case "getSkillContent":
          return this.executeGetSkillContent(args);
        case "getSkillReferenceContent":
          return this.executeGetSkillReferenceContent(args);
        case "getCatalogComponentDetails":
          return this.executeGetCatalogComponentDetails(args);
        case "validateA2UI":
          return this.executeValidateA2UI(args);
        case "askClarification":
          return this.executeAskClarification(args);
        case "askUserDecision":
          return this.executeAskUserDecision(args);
      }
    } catch (err) {
      // 工具内部参数校验可能 throw（如非法 option），转成 recoverable 失败，避免穿透 executor
      const message = err instanceof Error ? err.message : String(err);
      return failedRecoverable(`工具 ${tool} 执行异常：${message}`);
    }
  }

  private executeGetSkillContent(args: JsonObject): ToolExecutionResult {
    const skill = args["skill"];
    if (typeof skill !== "string" || skill.trim().length === 0) {
      return failedRecoverable("getSkillContent 缺少非空 skill 参数");
    }

    const record = this.deps.getSkillContent(skill.trim());
    if (!record) {
      return completed({
        kind: "tool_result",
        message: `Skill "${skill}" 未启用或不存在，请换一个已启用的 skill`,
      });
    }

    // 重复请求：资源已在 Working Resources 中，返回 completed 而非失败，不再重复披露正文
    if (hasSkill(this.deps.resourceLedger, record.id)) {
      return completed({
        kind: "tool_result",
        message: `Skill "${record.name}" 已在 Working Resources 中，无需重复获取。`,
        details: { skillId: record.id, name: record.name },
      });
    }

    // 首次披露：正文写入 ledger，由 PromptComposer 注入 Working Resources；
    // observation 只回 skill 元信息与 reference 摘要，不含 skill 正文与 reference 正文。
    recordSkill(this.deps.resourceLedger, {
      id: record.id,
      name: record.name,
      content: record.content,
    });

    return completed({
      kind: "tool_result",
      message: `已获取 Skill "${record.name}" 的完整内容，已加入 Working Resources。`,
      details: {
        skillId: record.id,
        name: record.name,
        references: record.references.map((r) => ({ id: r.id, title: r.title })),
      },
    });
  }

  private executeGetSkillReferenceContent(args: JsonObject): ToolExecutionResult {
    const skill = args["skill"];
    const refs = args["references"];
    if (typeof skill !== "string" || skill.trim().length === 0) {
      return failedRecoverable("getSkillReferenceContent 缺少非空 skill 参数");
    }
    if (!Array.isArray(refs) || refs.length === 0 || refs.some((r) => typeof r !== "string")) {
      return failedRecoverable("getSkillReferenceContent 需要非空字符串数组 references");
    }

    const record = this.deps.getSkillContent(skill.trim());
    if (!record) {
      return completed({
        kind: "tool_result",
        message: `Skill "${skill}" 未启用或不存在，请换一个已启用的 skill`,
      });
    }

    const requested = refs as string[];
    const shouldDiscloseAll = requested.includes("*");
    const matched = shouldDiscloseAll
      ? record.references
      : record.references.filter(
          (r) => requested.includes(r.id) || requested.includes(r.title),
        );

    if (matched.length === 0) {
      return completed({
        kind: "tool_result",
        message: `Skill "${skill}" 中没有匹配的 reference，可用 reference：${record.references
          .map((r) => `${r.id}:${r.title}`)
          .join("、") || "（无）"}`,
      });
    }

    // 去重：只披露尚未进入 Working Resources 的 reference
    const alreadyMatched = matched.filter((r) =>
      hasSkillReference(this.deps.resourceLedger, record.id, r.id),
    );
    const newlyMatched = matched.filter(
      (r) => !hasSkillReference(this.deps.resourceLedger, record.id, r.id),
    );
    const newlyDisclosed = recordSkillReferences(
      this.deps.resourceLedger,
      { id: record.id, name: record.name },
      newlyMatched,
    );

    if (newlyDisclosed.length === 0) {
      return completed({
        kind: "tool_result",
        message: `请求的 Skill Reference 均已在 Working Resources 中，无需重复获取。`,
        details: {
          references: alreadyMatched.map((r) => ({ id: r.id, title: r.title })),
        },
      });
    }

    return completed({
      kind: "tool_result",
      message:
        alreadyMatched.length > 0
          ? `已获取 ${newlyDisclosed.length} 个 Skill Reference 内容，跳过 ${alreadyMatched.length} 个已在 Working Resources 的 reference。`
          : `已获取 ${newlyDisclosed.length} 个 Skill Reference 内容，已加入 Working Resources。`,
      details: {
        references: newlyDisclosed.map((r) => ({
          skillId: r.skillId,
          skillName: r.skillName,
          id: r.referenceId,
          title: r.title,
        })),
        ...(alreadyMatched.length > 0
          ? {
              alreadyDisclosed: alreadyMatched.map((r) => ({ id: r.id, title: r.title })),
            }
          : {}),
      },
    });
  }

  private executeGetCatalogComponentDetails(args: JsonObject): ToolExecutionResult {
    const components = args["components"];
    if (
      !Array.isArray(components) ||
      components.length === 0 ||
      components.some((c) => typeof c !== "string")
    ) {
      return failedRecoverable("getCatalogComponentDetails 需要非空字符串数组 components");
    }

    const names = Array.from(new Set(components as string[]));
    const missing = names.filter((n) => !getComponentDef(n));
    if (missing.length > 0) {
      return completed({
        kind: "tool_result",
        message: `以下组件不在 Basic Catalog 中，不能使用：${missing.join("、")}`,
      });
    }

    return completed({
      kind: "tool_result",
      message: `已获取 ${names.length} 个组件的字段详情。`,
      details: { componentDetails: formatCatalogComponentDetails(names) },
    });
  }

  private executeValidateA2UI(args: JsonObject): ToolExecutionResult {
    const messages = args["messages"];
    if (!Array.isArray(messages)) {
      return failedRecoverable("validateA2UI 需要 messages 数组");
    }

    const result = validateA2UI({
      messages: messages as unknown as A2UIServerMessage[],
      catalogId: this.capabilities.catalogId,
      currentSnapshot: this.deps.currentSnapshot ?? null,
    });

    if (result.valid) {
      return completed({
        kind: "tool_result",
        message: "A2UI 校验通过。",
        details: { valid: true, warningCount: result.warnings.length },
      });
    }

    return completed({
      kind: "tool_result",
      message: `A2UI 校验未通过，共 ${result.errors.length} 个错误。`,
      details: {
        valid: false,
        errors: result.errors.map((e) => ({
          code: e.code,
          path: e.path ?? null,
          message: e.message,
        })),
      },
    });
  }

  private executeAskClarification(args: JsonObject): ToolExecutionResult {
    const normalized = normalizeClarificationForm(args);
    if (typeof normalized === "string") {
      return failedRecoverable(`askClarification 参数非法：${normalized}`);
    }
    return {
      status: "final_artifact",
      artifact: { kind: "clarification_form", form: normalized },
    };
  }

  private executeAskUserDecision(args: JsonObject): ToolExecutionResult {
    const normalized = normalizeDecisionForm(args);
    if (typeof normalized === "string") {
      return failedRecoverable(`askUserDecision 参数非法：${normalized}`);
    }
    return {
      status: "final_artifact",
      artifact: { kind: "decision_form", form: normalized },
    };
  }
}

// ─── 最终产物结构校验（供 executor 的 final draft 校验复用） ─────────

const REQUIRED_PLAN_HEADINGS = [
  "页面目标",
  "布局结构",
  "组件清单",
  "Data Model",
  "交互行为",
  "假设",
  "风险",
] as const;

const CLARIFICATION_TYPES = new Set<ClarificationQuestionType>([
  "select",
  "radio",
  "checkbox",
  "text",
  "textarea",
]);

const DECISION_TARGETS = new Set<DecisionFormTarget>([
  "plan_markdown",
  "candidate_a2ui_messages",
]);
const DECISION_OPTIONS = new Set<WorkflowDecisionOption>(["confirm", "revise", "reject"]);

/**
 * 规范化 clarification form 参数。
 *
 * @param input - 模型提供的 form 参数对象
 * @returns 规范化后的 ClarificationForm；返回 string 表示校验失败及原因。
 */
export function normalizeClarificationForm(
  input: Record<string, unknown>,
): ClarificationForm | string {
  const rawFields = input["fields"] ?? input["questions"];
  if (!Array.isArray(rawFields) || rawFields.length === 0) {
    return "askClarification 必须包含非空 fields";
  }

  const fields: ClarificationQuestion[] = [];
  for (const rawField of rawFields) {
    if (!rawField || typeof rawField !== "object" || Array.isArray(rawField)) {
      return "askClarification fields 中存在非法问题";
    }
    const field = rawField as Record<string, unknown>;
    const id = field["id"];
    const label = field["label"];
    const type = field["type"];
    const required = field["required"];
    const reason = field["reason"];

    if (typeof id !== "string" || id.trim().length === 0) {
      return "askClarification 每个问题必须包含 id";
    }
    if (typeof label !== "string" || label.trim().length === 0) {
      return `askClarification 问题 ${id} 缺少 label`;
    }
    if (
      typeof type !== "string" ||
      !CLARIFICATION_TYPES.has(type as ClarificationQuestionType)
    ) {
      return `askClarification 问题 ${id} 的 type 不受支持`;
    }
    if (typeof required !== "boolean") {
      return `askClarification 问题 ${id} 必须包含 boolean required`;
    }
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return `askClarification 问题 ${id} 缺少 reason`;
    }

    const normalized: ClarificationQuestion = {
      id: id.trim(),
      label: label.trim(),
      type: type as ClarificationQuestionType,
      required,
      reason: reason.trim(),
    };

    if (typeof field["placeholder"] === "string") {
      normalized.placeholder = field["placeholder"];
    }

    if (type === "select" || type === "radio" || type === "checkbox") {
      const options = field["options"];
      if (!Array.isArray(options) || options.length === 0) {
        return `askClarification 问题 ${id} 是选择类问题，必须包含 options`;
      }
      const normalizedOptions = options.map((option, index) =>
        normalizeOption(option, id, index),
      );
      const optionError = normalizedOptions.find(isString);
      if (typeof optionError === "string") {
        return optionError;
      }
      normalized.options = normalizedOptions.filter(isClarificationOption);
    }

    fields.push(normalized);
  }

  return {
    title: typeof input["title"] === "string" ? input["title"] : undefined,
    description: typeof input["description"] === "string" ? input["description"] : undefined,
    fields,
  };
}

/**
 * 规范化 decision form 参数。
 *
 * @param input - 模型提供的 form 参数对象
 * @returns 规范化后的 DecisionForm；返回 string 表示校验失败及原因。
 */
export function normalizeDecisionForm(input: Record<string, unknown>): DecisionForm | string {
  const title = input["title"];
  const prompt = input["prompt"];
  const guidance = input["guidance"];
  const target = input["target"];
  const rawOptions = input["options"];

  if (typeof title !== "string" || title.trim().length === 0) {
    return "askUserDecision 必须包含 title";
  }
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return "askUserDecision 必须包含 prompt";
  }
  if (typeof guidance !== "string" || guidance.trim().length === 0) {
    return "askUserDecision 必须包含 guidance";
  }
  if (
    typeof target !== "string" ||
    !DECISION_TARGETS.has(target as DecisionFormTarget)
  ) {
    return "askUserDecision target 必须是 plan_markdown 或 candidate_a2ui_messages";
  }
  if (!Array.isArray(rawOptions) || rawOptions.length !== 3) {
    return "askUserDecision 必须提供 confirm、revise、reject 三个选项";
  }

  const options = rawOptions.map(normalizeDecisionOption);
  const optionError = options.find(isString);
  if (typeof optionError === "string") {
    return optionError;
  }
  const normalizedOptions = options.filter(isDecisionFormOption);
  const optionIds = new Set(normalizedOptions.map((option) => option.id));
  for (const expected of DECISION_OPTIONS) {
    if (!optionIds.has(expected)) {
      return `askUserDecision 缺少 ${expected} 选项`;
    }
  }

  return {
    title: title.trim(),
    prompt: prompt.trim(),
    guidance: guidance.trim(),
    target: target as DecisionFormTarget,
    targetArtifactId: typeof input["targetArtifactId"] === "string" ? input["targetArtifactId"] : undefined,
    options: normalizedOptions,
  };
}

/**
 * 返回 plan markdown 中缺失的必需标题。
 *
 * @param markdown - plan markdown 文本
 * @returns 缺失的标题列表（空数组表示齐全）。
 */
export function getMissingPlanHeadings(markdown: string): string[] {
  return REQUIRED_PLAN_HEADINGS.filter((heading) => {
    const pattern = new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\s*$`, "im");
    return !pattern.test(markdown);
  });
}

// ─── 内部辅助 ──────────────────────────────────────────────

function normalizeDecisionOption(option: unknown): DecisionFormOption | string {
  if (!option || typeof option !== "object" || Array.isArray(option)) {
    return "askUserDecision options 中存在非法选项";
  }
  const item = option as Record<string, unknown>;
  const id = item["id"];
  const label = item["label"];
  if (typeof id !== "string" || !DECISION_OPTIONS.has(id as WorkflowDecisionOption)) {
    return "askUserDecision option id 必须是 confirm、revise 或 reject";
  }
  if (typeof label !== "string" || label.trim().length === 0) {
    return `askUserDecision option ${id} 缺少 label`;
  }
  return {
    id: id as WorkflowDecisionOption,
    label: label.trim(),
    description: typeof item["description"] === "string" ? item["description"] : undefined,
  };
}

function normalizeOption(
  option: unknown,
  questionId: string,
  index: number,
): NonNullable<ClarificationQuestion["options"]>[number] | string {
  if (!option || typeof option !== "object" || Array.isArray(option)) {
    return `askClarification 问题 ${questionId} 的第 ${index + 1} 个 option 非法`;
  }
  const item = option as Record<string, unknown>;
  if (typeof item["label"] !== "string" || typeof item["value"] !== "string") {
    return `askClarification 问题 ${questionId} 的 option 必须包含 label 和 value`;
  }
  return { label: item["label"], value: item["value"] };
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isClarificationOption(
  value: string | NonNullable<ClarificationQuestion["options"]>[number],
): value is NonNullable<ClarificationQuestion["options"]>[number] {
  return typeof value !== "string";
}

function isDecisionFormOption(
  value: DecisionFormOption | string,
): value is DecisionFormOption {
  return typeof value !== "string";
}

function completed(observation: AgentObservation): ToolExecutionResult {
  return { status: "completed", observation };
}

function failedRecoverable(message: string): ToolExecutionResult {
  return {
    status: "failed",
    observation: { kind: "tool_result", message },
    recoverable: true,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
