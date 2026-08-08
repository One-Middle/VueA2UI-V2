/**
 * Skill 内容请求解析器。
 *
 * 职责：
 * - 从模型 JSON 输出中解析 skillInfoRequest。
 * - 校验请求中的 Skill 标识列表。
 * - 保留模型给出的 assistantMessage 与可选 reason，供 Runtime 记录披露原因。
 *
 * 引用：
 * - 无外部运行时依赖。
 * 被引用：
 * - AgentRuntime 的渐进式信息披露流程。
 * 注意：
 * - 本文件只负责识别模型是否请求 Skill 正文，不负责匹配 Skill 或注入 Skill 内容。
 */

/**
 * Skill 内容请求解析结果。
 *
 * 注意：失败结果表示当前输出不是有效 skillInfoRequest，可由 Runtime 继续尝试其他请求类型。
 */
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

/**
 * 解析模型输出中的 skillInfoRequest。
 *
 * @param raw - 模型返回的原始文本，允许带 Markdown JSON 代码块。
 * @returns 成功时返回去空白后的 Skill 标识列表；失败时返回解析或字段校验错误。
 */
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
