import type { A2UIServerMessage } from "@a2ui-platform/shared";

// ─── 类型定义 ──────────────────────────────────────────────

/** 解析结果 */
export type ParseResult =
  | {
      ok: true;
      data: {
        assistantMessage: string;
        a2uiMessages: A2UIServerMessage[];
      };
    }
  | {
      ok: false;
      error: string;
    };

// ─── parseModelOutput ───────────────────────────────────────

/**
 * 解析模型原始输出为结构化数据。
 * 处理 Markdown 代码块包裹、JSON 解析、字段验证等。
 */
export function parseModelOutput(raw: string): ParseResult {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, error: "模型输出为空" };
  }

  // 1. 去除 Markdown 代码块包裹（```json ... ``` 或 ``` ... ```）
  let jsonStr = raw.trim();

  // 匹配多种 Markdown 代码块格式
  const codeBlockPattern = /^```(?:json)?\s*\n([\s\S]*?)\n\s*```\s*$/;
  const match = jsonStr.match(codeBlockPattern);
  if (match) {
    jsonStr = match[1]!.trim();
  }

  // 如果以 ``` 开头但不是标准块，尝试去除首尾 ```
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
    jsonStr = jsonStr.trim();
  }

  // 2. JSON 解析
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    // 尝试查找 JSON 对象的起始和结束位置
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

  // 3. 验证顶层结构
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "解析结果必须是 JSON 对象，不能是数组" };
  }

  const obj = parsed as Record<string, unknown>;

  // 4. 验证 assistantMessage 字段
  if (typeof obj["assistantMessage"] !== "string") {
    return {
      ok: false,
      error: "缺少 assistantMessage 字段或该字段不是字符串类型",
    };
  }

  // 5. 验证 a2uiMessages 字段
  if (!Array.isArray(obj["a2uiMessages"])) {
    return {
      ok: false,
      error: "缺少 a2uiMessages 字段或该字段不是数组类型",
    };
  }

  // 6. 基本验证 a2uiMessages 数组元素
  const a2uiMessages = obj["a2uiMessages"] as unknown[];
  for (let i = 0; i < a2uiMessages.length; i++) {
    const msg = a2uiMessages[i];
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      return {
        ok: false,
        error: `a2uiMessages[${i}] 不是有效的对象`,
      };
    }
    const msgObj = msg as Record<string, unknown>;
    if (msgObj["version"] !== "v0.9") {
      return {
        ok: false,
        error: `a2uiMessages[${i}].version 必须为 "v0.9"`,
      };
    }
  }

  return {
    ok: true,
    data: {
      assistantMessage: obj["assistantMessage"] as string,
      a2uiMessages: a2uiMessages as A2UIServerMessage[],
    },
  };
}
