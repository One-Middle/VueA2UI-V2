/**
 * 组件详情请求解析器。
 *
 * 职责：
 * - 从模型 JSON 输出中解析 componentInfoRequest。
 * - 校验请求中的组件名称列表。
 * - 保留模型给出的 assistantMessage 与可选 reason，供 Runtime 记录上下文。
 *
 * 引用：
 * - 无外部运行时依赖。
 * 被引用：
 * - AgentRuntime 的渐进式信息披露流程。
 * 注意：
 * - 本文件只负责解析和基础字段校验，不负责判断组件是否存在于 Basic Catalog。
 */

/**
 * 组件详情请求解析结果。
 *
 * 注意：失败结果用于表示“当前模型输出不是有效组件详情请求”，不一定代表 Agent 运行失败。
 */
export type ComponentInfoRequestParseResult =
  | {
      ok: true;
      request: {
        assistantMessage: string;
        components: string[];
        reason?: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

/**
 * 解析模型输出中的 componentInfoRequest。
 *
 * @param raw - 模型返回的原始文本，允许带 Markdown JSON 代码块。
 * @returns 成功时返回去空白后的组件名称列表；失败时返回解析或字段校验错误。
 */
export function parseComponentInfoRequest(
  raw: string,
): ComponentInfoRequestParseResult {
  const parsed = parseJsonObject(raw);
  if (!parsed.ok) return parsed;

  const obj = parsed.value;
  if (typeof obj["assistantMessage"] !== "string") {
    return { ok: false, error: "缺少 assistantMessage 字符串字段" };
  }

  const request = obj["componentInfoRequest"];
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return { ok: false, error: "缺少 componentInfoRequest 对象字段" };
  }

  const requestObj = request as Record<string, unknown>;
  if (!Array.isArray(requestObj["components"])) {
    return { ok: false, error: "componentInfoRequest.components 必须是数组" };
  }

  const rawComponents = requestObj["components"];
  if (rawComponents.length === 0) {
    return { ok: false, error: "componentInfoRequest.components 不能为空" };
  }

  const components: string[] = [];
  for (const item of rawComponents) {
    if (typeof item !== "string" || item.trim().length === 0) {
      return {
        ok: false,
        error: "componentInfoRequest.components 只能包含非空字符串",
      };
    }
    components.push(item.trim());
  }

  const reason =
    typeof requestObj["reason"] === "string" ? requestObj["reason"] : undefined;

  return {
    ok: true,
    request: {
      assistantMessage: obj["assistantMessage"],
      components,
      ...(reason ? { reason } : {}),
    },
  };
}

/**
 * 将模型文本宽松解析为 JSON 对象。
 *
 * 注意：为了兼容模型输出，会尝试剥离 Markdown 代码块并截取首尾花括号之间的内容。
 *
 * @param raw - 待解析的模型原始文本。
 * @returns JSON 对象或解析错误。
 */
function parseJsonObject(
  raw: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, error: "模型输出为空" };
  }

  let jsonStr = raw.trim();
  const codeBlockPattern = /^```(?:json)?\s*\n([\s\S]*?)\n\s*```\s*$/;
  const match = jsonStr.match(codeBlockPattern);
  if (match) {
    jsonStr = match[1]!.trim();
  }

  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?\s*```\s*$/, "")
      .trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(jsonStr.slice(firstBrace, lastBrace + 1));
      } catch {
        return {
          ok: false,
          error: `JSON 解析失败：${err instanceof SyntaxError ? err.message : String(err)}`,
        };
      }
    } else {
      return {
        ok: false,
        error: `JSON 解析失败：${err instanceof SyntaxError ? err.message : String(err)}`,
      };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "解析结果必须是 JSON 对象" };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}
