export type SkillInfoRequestParseResult =
  | {
      ok: true;
      request: {
        assistantMessage: string;
        skills: string[];
        reason?: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

/** 解析模型输出中的 skillInfoRequest。 */
export function parseSkillInfoRequest(raw: string): SkillInfoRequestParseResult {
  const parsed = parseJsonObject(raw);
  if (!parsed.ok) return parsed;

  const obj = parsed.value;
  if (typeof obj["assistantMessage"] !== "string") {
    return { ok: false, error: "缺少 assistantMessage 字符串字段" };
  }

  const request = obj["skillInfoRequest"];
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return { ok: false, error: "缺少 skillInfoRequest 对象字段" };
  }

  const requestObj = request as Record<string, unknown>;
  if (!Array.isArray(requestObj["skills"])) {
    return { ok: false, error: "skillInfoRequest.skills 必须是数组" };
  }

  const rawSkills = requestObj["skills"];
  if (rawSkills.length === 0) {
    return { ok: false, error: "skillInfoRequest.skills 不能为空" };
  }

  const skills: string[] = [];
  for (const item of rawSkills) {
    if (typeof item !== "string" || item.trim().length === 0) {
      return {
        ok: false,
        error: "skillInfoRequest.skills 只能包含非空字符串",
      };
    }
    skills.push(item.trim());
  }

  const reason =
    typeof requestObj["reason"] === "string" ? requestObj["reason"] : undefined;

  return {
    ok: true,
    request: {
      assistantMessage: obj["assistantMessage"],
      skills,
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
