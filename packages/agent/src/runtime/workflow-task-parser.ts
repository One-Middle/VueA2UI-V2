import type {
  ClarificationForm,
  ClarificationQuestion,
  ClarificationQuestionType,
  ParsedAgentResult,
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

/**
 * 解析 workflow task 的模型输出。
 *
 * 注意：Agent 可以直接输出 Markdown plan；需要澄清时才输出 askClarification JSON。
 *
 * @param rawOutput - 模型原始输出
 * @returns Runtime 解析后的 workflow 结果
 */
export function parseWorkflowTaskOutput(rawOutput: string): ParsedAgentResult {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return { kind: "failure", reason: "Agent 未返回任何内容" };
  }

  const clarification = parseClarificationRequest(trimmed);
  if (clarification) {
    return clarification;
  }

  const markdown = stripMarkdownFence(trimmed);
  const missingHeadings = getMissingPlanHeadings(markdown);
  if (missingHeadings.length > 0) {
    return {
      kind: "failure",
      reason: `Markdown plan 缺少必要标题：${missingHeadings.join("、")}`,
      details: { missingHeadings },
    };
  }

  return { kind: "plan_markdown", markdown };
}

function parseClarificationRequest(rawOutput: string): ParsedAgentResult | null {
  const jsonText = extractJsonText(rawOutput);
  if (!jsonText) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const root = parsed as Record<string, unknown>;
  const toolName = root["tool"] ?? root["toolName"] ?? root["name"];
  const args = root["arguments"] ?? root["args"] ?? root["input"] ?? root;
  if (toolName !== "askClarification" && !("fields" in root)) return null;
  if (!args || typeof args !== "object") {
    return { kind: "failure", reason: "askClarification 缺少 arguments" };
  }

  let formResult: ClarificationForm | string;
  try {
    formResult = normalizeClarificationForm(args as Record<string, unknown>);
  } catch (err) {
    formResult = err instanceof Error ? err.message : String(err);
  }
  if (typeof formResult === "string") {
    return { kind: "failure", reason: formResult };
  }
  return { kind: "clarification_request", form: formResult };
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
      normalized.options = options.map((option, index) => {
        if (!option || typeof option !== "object") {
          throw new Error(`askClarification 问题 ${id} 的第 ${index + 1} 个 option 非法`);
        }
        const item = option as Record<string, unknown>;
        if (typeof item["label"] !== "string" || typeof item["value"] !== "string") {
          throw new Error(`askClarification 问题 ${id} 的 option 必须包含 label 和 value`);
        }
        return { label: item["label"], value: item["value"] };
      });
    }

    fields.push(normalized);
  }

  return {
    title: typeof input["title"] === "string" ? input["title"] : undefined,
    description: typeof input["description"] === "string" ? input["description"] : undefined,
    fields,
  };
}

function extractJsonText(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  if (text.startsWith("{") && text.endsWith("}")) return text;
  return null;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
