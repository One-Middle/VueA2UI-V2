// ─── 类型定义 ──────────────────────────────────────────────

/** 聊天消息。 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Token 用量信息。 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** 模型调用响应。 */
export interface ModelResponse {
  content: string;
  usage?: TokenUsage;
}

/** ModelClient 构造配置。 */
export interface ModelClientConfig {
  /** OpenAI-compatible API 的 base URL */
  baseUrl: string;
  /** API Key（不记录到日志） */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 温度参数 (0-2) */
  temperature: number;
  /** 最大生成 token 数 */
  maxTokens: number;
  /** 请求超时时间（毫秒） */
  timeoutMs: number;
}

// ─── ModelClient ────────────────────────────────────────────

import { logger } from "../logger.js";

export class ModelClient {
  private config: ModelClientConfig;

  constructor(config: ModelClientConfig) {
    this.config = config;
  }

  /**
   * 调用 OpenAI-compatible API 生成回复。
   * @param messages 对话消息数组
   * @returns 模型响应（内容 + 可选 token 用量）
   */
  async generate(messages: ChatMessage[]): Promise<ModelResponse> {
    const { baseUrl, apiKey, model, temperature, maxTokens, timeoutMs } =
      this.config;

    // 规范化 baseUrl（去除尾部斜杠）
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    const url = `${normalizedBaseUrl}/chat/completions`;

    const body = JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    logger.debug(`调用 LLM API → url=${url}, model=${model}, messages=${messages.length}`);

    // 使用 AbortController 控制超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body,
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errorBody = await response.text();
          errorDetail += `: ${errorBody.slice(0, 500)}`;
        } catch {
          // 无法读取错误响应体，使用状态码信息
        }
        throw new Error(`模型 API 调用失败：${errorDetail}`);
      }

      const data: unknown = await response.json();

      if (!isValidChatCompletion(data)) {
        throw new Error("模型 API 返回格式不符合预期");
      }

      const choice = data.choices[0]!;
      const result: ModelResponse = {
        content: choice.message.content,
      };

      if (data.usage) {
        result.usage = {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        };
      }

      logger.info(
        `LLM 响应 → tokens=${result.usage?.totalTokens ?? "?"}, 内容长度=${result.content.length}, 耗时=${elapsed}ms`
      );

      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`模型 API 调用超时（${timeoutMs}ms）`);
      }
      // 重新抛出已处理的错误
      if (err instanceof Error && err.message.startsWith("模型 API")) {
        throw err;
      }
      throw new Error(
        `模型 API 调用异常：${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ─── 类型守卫 ──────────────────────────────────────────────

/** OpenAI-compatible chat completion 响应的最小结构 */
interface RawChatCompletion {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 校验 API 响应是否符合 chat completion 格式。
 */
function isValidChatCompletion(data: unknown): data is RawChatCompletion {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d["choices"]) || d["choices"].length === 0) return false;
  const choice = d["choices"][0] as Record<string, unknown> | undefined;
  if (!choice || typeof choice !== "object") return false;
  const msg = choice["message"] as Record<string, unknown> | undefined;
  if (!msg || typeof msg !== "object") return false;
  if (typeof msg["content"] !== "string") return false;
  return true;
}
