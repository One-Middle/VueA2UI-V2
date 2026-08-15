/**
 * ReAct Agent 严格 JSON action 解析器。
 *
 * 职责：
 * - 把模型原始输出解析为单一 AgentModelAction。
 * - 只接受严格 JSON object，拒绝 Markdown、旧 tool-call 文本协议、数组与多 action 输出。
 * - 对解析失败返回结构化 parse failure，供 executor 转为 system observation。
 *
 * 不负责：调用模型、执行工具、做最终产物业务校验。
 */

import type { AgentToolName, JsonObject } from "@a2ui-platform/shared";
import type { AgentFinalKind, AgentModelAction } from "./react-agent-types.js";

/** 已知工具名白名单，用于 schema 校验（授权校验由 ToolRegistry 负责）。 */
const TOOL_NAMES = new Set<AgentToolName>([
  "askClarification",
  "askUserDecision",
  "getSkillContent",
  "getSkillReferenceContent",
  "getCatalogComponentDetails",
  "validateA2UI",
]);

/** 合法最终产物种类白名单。 */
const FINAL_KINDS = new Set<AgentFinalKind>([
  "clarification_form",
  "decision_form",
  "plan_markdown",
  "candidate_a2ui_messages",
]);

/** 模型动作解析结果：成功返回 action，失败返回结构化错误。 */
export type AgentActionParseResult =
  | { ok: true; action: AgentModelAction }
  | { ok: false; error: string; details?: JsonObject };

/**
 * 解析模型原始输出为单一 AgentModelAction。
 *
 * @param rawOutput - 模型原始输出文本
 * @returns 解析结果，失败时不会 throw，而是返回结构化 parse failure。
 */
export function parseAgentAction(rawOutput: string): AgentActionParseResult {
  const text = extractJsonText(rawOutput);
  if (text === null) {
    return failure("模型输出不是 JSON object，期望单个 JSON envelope");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return failure(
      `模型输出不是合法 JSON：${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!isRecord(parsed)) {
    return failure("模型输出必须是单个 JSON object，不能是数组或标量");
  }

  return parseAction(parsed);
}

/** 按 type 字段分派到具体 action 的 schema 校验。 */
function parseAction(root: Record<string, unknown>): AgentActionParseResult {
  const type = root["type"];
  if (typeof type !== "string") {
    return failure('模型动作缺少 "type" 字段');
  }

  switch (type) {
    case "tool_call":
      return parseToolCall(root);
    case "final_draft":
      return parseFinalDraft(root);
    case "give_up":
      return parseGiveUp(root);
    default:
      return failure(
        `未知动作类型 "${type}"，必须是 tool_call、final_draft 或 give_up`,
        { type },
      );
  }
}

/** 校验 tool_call 动作。 */
function parseToolCall(root: Record<string, unknown>): AgentActionParseResult {
  const reasoningSummary = root["reasoningSummary"];
  if (typeof reasoningSummary !== "string" || reasoningSummary.trim().length === 0) {
    return failure('tool_call 动作缺少非空 "reasoningSummary"');
  }

  const tool = root["tool"];
  if (typeof tool !== "string" || !TOOL_NAMES.has(tool as AgentToolName)) {
    return failure(`tool_call 动作的 "tool" 不受支持：${String(tool)}`, {
      tool: typeof tool === "string" ? tool : null,
    });
  }

  const args = root["arguments"];
  if (!isRecord(args)) {
    return failure('tool_call 动作缺少 "arguments" object');
  }

  return {
    ok: true,
    action: {
      type: "tool_call",
      reasoningSummary: reasoningSummary.trim(),
      tool: tool as AgentToolName,
      arguments: args as JsonObject,
    },
  };
}

/** 校验 final_draft 动作。 */
function parseFinalDraft(root: Record<string, unknown>): AgentActionParseResult {
  const reasoningSummary = root["reasoningSummary"];
  if (typeof reasoningSummary !== "string" || reasoningSummary.trim().length === 0) {
    return failure('final_draft 动作缺少非空 "reasoningSummary"');
  }

  const finalKind = root["finalKind"];
  if (
    typeof finalKind !== "string" ||
    !FINAL_KINDS.has(finalKind as AgentFinalKind)
  ) {
    return failure(
      `final_draft 动作的 "finalKind" 不受支持：${String(finalKind)}`,
      { finalKind: typeof finalKind === "string" ? finalKind : null },
    );
  }

  const draft = root["draft"];
  if (!isRecord(draft)) {
    return failure('final_draft 动作缺少 "draft" object');
  }

  return {
    ok: true,
    action: {
      type: "final_draft",
      reasoningSummary: reasoningSummary.trim(),
      finalKind: finalKind as AgentFinalKind,
      draft: draft as JsonObject,
    },
  };
}

/** 校验 give_up 动作。 */
function parseGiveUp(root: Record<string, unknown>): AgentActionParseResult {
  const reasoningSummary = root["reasoningSummary"];
  if (typeof reasoningSummary !== "string" || reasoningSummary.trim().length === 0) {
    return failure('give_up 动作缺少非空 "reasoningSummary"');
  }

  const reason = root["reason"];
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return failure('give_up 动作缺少非空 "reason"');
  }

  const recoverable = root["recoverable"];
  if (typeof recoverable !== "boolean") {
    return failure('give_up 动作缺少 boolean "recoverable"');
  }

  const details = root["details"];
  if (details !== undefined && !isRecord(details)) {
    return failure('give_up 动作的 "details" 必须是 object');
  }

  return {
    ok: true,
    action: {
      type: "give_up",
      reasoningSummary: reasoningSummary.trim(),
      reason: reason.trim(),
      recoverable,
      ...(isRecord(details) ? { details: details as JsonObject } : {}),
    },
  };
}

/**
 * 提取可能是 JSON 的文本。
 * 接受裸 JSON object / array，或整体被 ```json 围栏包裹的 JSON；
 * 围栏外若有额外 Markdown 内容，或首字符不是 { / [，则视为非 JSON。
 */
function extractJsonText(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  return null;
}

/** 判断值是否为非数组的普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** 构造 parse failure。 */
function failure(error: string, details?: JsonObject): AgentActionParseResult {
  return details === undefined ? { ok: false, error } : { ok: false, error, details };
}
