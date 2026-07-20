/**
 * Skill Reference 请求解析器。
 *
 * 职责：
 * - 从模型 JSON 输出中解析 skillReferenceRequest
 * - 校验请求中的 Skill 标识和 Reference 标识列表
 *
 * 不负责：匹配 Skill、披露 Reference 正文或调用模型。
 */

/** Skill Reference 请求解析结果。 */
export type SkillReferenceRequestParseResult =
  | {
      ok: true;
      request: {
        assistantMessage: string;
        skill: string;
        references: string[];
        reason?: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

/** 解析模型输出中的 skillReferenceRequest。 */
export function parseSkillReferenceRequest(
  raw: string,
): SkillReferenceRequestParseResult {
  const parsed = parseJsonObject(raw);
  if (!parsed.ok) return parsed;

  const obj = parsed.value;
  if (typeof obj["assistantMessage"] !== "string") {
    return { ok: false, error: "缺少 assistantMessage 字符串字段" };
  }

  const request = obj["skillReferenceRequest"];
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return { ok: false, error: "缺少 skillReferenceRequest 对象字段" };
  }

  const requestObj = request as Record<string, unknown>;
  if (typeof requestObj["skill"] !== "string" || requestObj["skill"].trim().length === 0) {
    return { ok: false, error: "skillReferenceRequest.skill 必须是非空字符串" };
  }
  if (!Array.isArray(requestObj["references"])) {
    return { ok: false, error: "skillReferenceRequest.references 必须是数组" };
  }

  const rawReferences = requestObj["references"];
  if (rawReferences.length === 0) {
    return { ok: false, error: "skillReferenceRequest.references 不能为空" };
  }

  const references: string[] = [];
  for (const item of rawReferences) {
    if (typeof item !== "string" || item.trim().length === 0) {
      return {
        ok: false,
        error: "skillReferenceRequest.references 只能包含非空字符串",
      };
    }
    references.push(item.trim());
  }

  const reason =
    typeof requestObj["reason"] === "string" ? requestObj["reason"] : undefined;

  return {
    ok: true,
    request: {
      assistantMessage: obj["assistantMessage"],
      skill: requestObj["skill"].trim(),
      references,
      ...(reason ? { reason } : {}),
    },
  };
}

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
