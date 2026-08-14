/**
 * 解析 workflow task 的模型输出。
 *
 * 职责：
 * - 识别 Runtime 内部工具调用文本协议。
 * - 将 clarification、decision、Markdown plan 和 candidate 解析为 ParsedAgentResult。
 * - 对 Runtime 可校验的最低结构做归一化。
 *
 * 不负责：
 * - 持久化 artifact。
 * - 判断当前 Workflow gate 是否允许某个结果。
 * - 提交正式 A2UI event 或 surface snapshot。
 */

import type {
  A2UIServerMessage,
  ClarificationForm,
  ClarificationQuestion,
  ClarificationQuestionType,
  DecisionForm,
  DecisionFormOption,
  DecisionFormTarget,
  JsonObject,
  ParsedAgentResult,
  WorkflowDecisionOption,
} from "@a2ui-platform/shared";

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

const DECISION_TARGETS = new Set<DecisionFormTarget>(["plan_markdown", "candidate_a2ui_messages"]);
const DECISION_OPTIONS = new Set<WorkflowDecisionOption>(["confirm", "revise", "reject"]);

/**
 * 解析 workflow task 的模型原始输出。
 *
 * Agent 可以输出：
 * - `askClarification` JSON。
 * - `askUserDecision` JSON，可同时携带 `markdown` / `planMarkdown`。
 * - candidate A2UI JSON。
 *
 * @param rawOutput - 模型原始输出。
 * @returns Runtime 解析后的 workflow 结果。
 */
export function parseWorkflowTaskOutput(rawOutput: string): ParsedAgentResult {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return failure("Agent 未返回任何内容", false);
  }

  const parsedJson = parseJsonObject(extractJsonText(trimmed));
  if (parsedJson) {
    const toolResult = parseToolOrStructuredResult(parsedJson, trimmed);
    if (toolResult) return toolResult;
  }

  const markdown = stripMarkdownFence(trimmed);
  const missingHeadings = getMissingPlanHeadings(markdown);
  if (missingHeadings.length > 0) {
    return failure("Markdown plan 缺少必要标题", true, { missingHeadings });
  }

  return failure("Markdown plan 缺少 askUserDecision 结果，不能进入等待确认", true);
}

function parseToolOrStructuredResult(root: Record<string, unknown>, rawOutput: string): ParsedAgentResult | null {
  const toolName = root["tool"] ?? root["toolName"] ?? root["name"];
  const args = root["arguments"] ?? root["args"] ?? root["input"] ?? root;
  if (!args || typeof args !== "object") {
    return failure("Agent tool call 缺少 arguments", true);
  }

  if (toolName === "askClarification" || "fields" in root || "questions" in root) {
    return parseClarificationRequest(args as Record<string, unknown>);
  }

  if (toolName === "askUserDecision" || "decisionForm" in root) {
    return parseDecisionRequest(root, args as Record<string, unknown>, rawOutput);
  }

  const candidate = parseCandidateResult(root);
  if (candidate) return candidate;

  return null;
}

function parseClarificationRequest(input: Record<string, unknown>): ParsedAgentResult {
  let formResult: ClarificationForm | string;
  try {
    formResult = normalizeClarificationForm(input);
  } catch (err) {
    formResult = err instanceof Error ? err.message : String(err);
  }
  if (typeof formResult === "string") {
    return failure(formResult, true);
  }
  return { kind: "clarification_request", form: formResult };
}

function parseDecisionRequest(
  root: Record<string, unknown>,
  input: Record<string, unknown>,
  rawOutput: string,
): ParsedAgentResult {
  const rawDecisionForm = root["decisionForm"];
  const decisionInput = rawDecisionForm && typeof rawDecisionForm === "object"
    ? rawDecisionForm as Record<string, unknown>
    : input;

  let formResult: DecisionForm | string;
  try {
    formResult = normalizeDecisionForm(decisionInput);
  } catch (err) {
    formResult = err instanceof Error ? err.message : String(err);
  }
  if (typeof formResult === "string") {
    return failure(formResult, true);
  }

  const markdown = pickMarkdown(root, input, rawOutput);
  if (!markdown) {
    return { kind: "decision_form", form: formResult };
  }

  const missingHeadings = getMissingPlanHeadings(markdown);
  if (missingHeadings.length > 0) {
    return failure("Markdown plan 缺少必要标题", true, { missingHeadings });
  }

  return {
    kind: "plan_markdown",
    markdown,
    decisionForm: formResult,
  };
}

function parseCandidateResult(root: Record<string, unknown>): ParsedAgentResult | null {
  const kind = root["kind"] ?? root["type"];
  const rawMessages = root["messages"] ?? root["a2uiMessages"];
  if (kind !== "candidate_a2ui_messages" && !Array.isArray(rawMessages)) {
    return null;
  }
  if (!Array.isArray(rawMessages)) {
    return failure("candidate_a2ui_messages 缺少 messages 数组", true);
  }

  return {
    kind: "candidate_a2ui_messages",
    messages: rawMessages as A2UIServerMessage[],
    assistantMessage: typeof root["assistantMessage"] === "string" ? root["assistantMessage"] : undefined,
  };
}

function normalizeClarificationForm(input: Record<string, unknown>): ClarificationForm | string {
  const rawFields = input["fields"] ?? input["questions"];
  if (!Array.isArray(rawFields) || rawFields.length === 0) {
    return "askClarification 必须包含非空 fields";
  }

  const fields: ClarificationQuestion[] = [];
  for (const rawField of rawFields) {
    if (!rawField || typeof rawField !== "object") {
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
    if (typeof type !== "string" || !CLARIFICATION_TYPES.has(type as ClarificationQuestionType)) {
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
      normalized.options = options.map((option, index) => normalizeOption(option, id, index));
    }

    fields.push(normalized);
  }

  return {
    title: typeof input["title"] === "string" ? input["title"] : undefined,
    description: typeof input["description"] === "string" ? input["description"] : undefined,
    fields,
  };
}

function normalizeDecisionForm(input: Record<string, unknown>): DecisionForm | string {
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
  if (typeof target !== "string" || !DECISION_TARGETS.has(target as DecisionFormTarget)) {
    return "askUserDecision target 必须是 plan_markdown 或 candidate_a2ui_messages";
  }
  if (!Array.isArray(rawOptions) || rawOptions.length !== 3) {
    return "askUserDecision 必须提供 confirm、revise、reject 三个选项";
  }

  const options = rawOptions.map(normalizeDecisionOption);
  const optionIds = new Set(options.map((option) => option.id));
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
    options,
  };
}

function normalizeDecisionOption(option: unknown): DecisionFormOption {
  if (!option || typeof option !== "object") {
    throw new Error("askUserDecision options 中存在非法选项");
  }
  const item = option as Record<string, unknown>;
  const id = item["id"];
  const label = item["label"];
  if (typeof id !== "string" || !DECISION_OPTIONS.has(id as WorkflowDecisionOption)) {
    throw new Error("askUserDecision option id 必须是 confirm、revise 或 reject");
  }
  if (typeof label !== "string" || label.trim().length === 0) {
    throw new Error(`askUserDecision option ${id} 缺少 label`);
  }
  return {
    id: id as WorkflowDecisionOption,
    label: label.trim(),
    description: typeof item["description"] === "string" ? item["description"] : undefined,
  };
}

function normalizeOption(option: unknown, questionId: string, index: number) {
  if (!option || typeof option !== "object") {
    throw new Error(`askClarification 问题 ${questionId} 的第 ${index + 1} 个 option 非法`);
  }
  const item = option as Record<string, unknown>;
  if (typeof item["label"] !== "string" || typeof item["value"] !== "string") {
    throw new Error(`askClarification 问题 ${questionId} 的 option 必须包含 label 和 value`);
  }
  return { label: item["label"], value: item["value"] };
}

function pickMarkdown(root: Record<string, unknown>, input: Record<string, unknown>, rawOutput: string): string | null {
  const explicit = root["markdown"] ?? root["planMarkdown"] ?? input["markdown"] ?? input["planMarkdown"];
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return stripMarkdownFence(explicit.trim());
  }

  const withoutJson = removeJsonFence(rawOutput).trim();
  if (withoutJson.length === 0 || withoutJson === rawOutput.trim()) {
    return null;
  }
  return stripMarkdownFence(withoutJson);
}

function parseJsonObject(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function extractJsonText(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  if (text.startsWith("{") && text.endsWith("}")) return text;
  return null;
}

function removeJsonFence(text: string): string {
  return text.replace(/```(?:json)?\s*[\s\S]*?```/i, "").trim();
}

function stripMarkdownFence(text: string): string {
  const fenced = text.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? text;
}

function getMissingPlanHeadings(markdown: string): string[] {
  return REQUIRED_PLAN_HEADINGS.filter((heading) => {
    const pattern = new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\s*$`, "im");
    return !pattern.test(markdown);
  });
}

function failure(reason: string, recoverable: boolean, details?: JsonObject): ParsedAgentResult {
  return {
    kind: "failure",
    reason,
    recoverable,
    details,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
