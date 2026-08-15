/**
 * Model IO Logging 本地诊断模块。
 *
 * 职责：
 * - 根据 MODEL_IO_LOG 输出模型输入输出摘要、截断预览和本地 JSONL trace
 * - 为单次模型调用生成 requestId，并统计 prompt role 分布
 * - 在 full 模式写入前执行基础密钥脱敏
 *
 * 引用：
 * - node:fs / node:path / node:process
 * - model-client 类型
 * 被引用：
 * - model-client
 * 注意：
 * - 该模块只服务本地开发诊断，任何日志失败都不能影响模型调用主流程。
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import process from "node:process";
import type { ChatMessage, ModelResponse, TokenUsage } from "./model-client.js";

export type ModelIOLogMode = "off" | "summary" | "debug" | "full";

export interface ModelTraceContext {
  sessionId?: string | null;
  agentRunId?: string | null;
  workflowId?: string | null;
  workflowStepId?: string | null;
  task?: string | null;
  phase?: string | null;
  attempt?: number | null;
  round?: number | null;
}

type NormalizedTraceContext = Required<ModelTraceContext>;

type RoleStats = Record<string, { count: number; chars: number }>;

type TraceResult =
  | { response: ModelResponse; durationMs: number }
  | { error: unknown; durationMs: number };

const INPUT_PREVIEW_LIMIT = 1000;
const OUTPUT_PREVIEW_LIMIT = 2000;

/**
 * 解析 MODEL_IO_LOG 环境变量。
 *
 * @param raw - 原始环境变量值
 * @returns 合法日志模式，未知值按 off 处理
 */
export function resolveModelIOLogMode(raw = process.env.MODEL_IO_LOG): ModelIOLogMode {
  const value = raw?.toLowerCase();
  if (value === "summary" || value === "debug" || value === "full") {
    return value;
  }
  return "off";
}

/**
 * 截断长文本，避免终端被 prompt 或 response 淹没。
 *
 * @param text - 原始文本
 * @param maxLen - 最大保留字符数
 * @returns 截断后的文本
 */
export function truncateForModelIO(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...（截断，原长 ${text.length}）`;
}

/**
 * 统计模型 messages 的 role 分布和字符数。
 *
 * @param messages - 模型输入消息
 * @returns role 统计信息
 */
export function summarizeRoles(messages: ChatMessage[]): RoleStats {
  const stats: RoleStats = {};
  for (const message of messages) {
    const current = stats[message.role] ?? { count: 0, chars: 0 };
    stats[message.role] = {
      count: current.count + 1,
      chars: current.chars + message.content.length,
    };
  }
  return stats;
}

/**
 * 对文本执行基础密钥脱敏。
 *
 * @param value - 待脱敏文本
 * @returns 脱敏后的文本
 */
export function redactSecrets(value: string): string {
  return value
    .replace(/Authorization:\s*Bearer\s+[^\s"']+/gi, "Authorization: Bearer [REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "sk-[REDACTED]")
    .replace(
      /(["'](?:apiKey|api_key|authorization|Authorization)["']\s*:\s*["'])([^"']+)(["'])/g,
      "$1[REDACTED]$3",
    )
    .replace(
      /\b(apiKey|api_key|authorization|Authorization)=([^\s"']+)/g,
      "$1=[REDACTED]",
    )
    .replace(
      /\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET))=([^\s"']+)/g,
      "$1=[REDACTED]",
    );
}

/**
 * 生成模型调用 requestId。
 *
 * @param now - 当前时间
 * @returns 短 requestId
 */
export function createModelIORequestId(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8);
  return `mi_${date}_${random}`;
}

/**
 * 开始一次模型 IO trace。
 *
 * @param input - trace 输入
 * @returns 完成或失败记录器
 */
export function startModelIOTrace(input: {
  model: string;
  messages: ChatMessage[];
  traceContext?: ModelTraceContext;
}): {
  requestId: string;
  complete(response: ModelResponse, durationMs: number): void;
  fail(error: unknown, durationMs: number): void;
} {
  const mode = resolveModelIOLogMode();
  const requestId = createModelIORequestId();
  const traceContext = normalizeTraceContext(input.traceContext);

  if (mode !== "off") {
    safeRun(() => {
      logRequestSummary({
        requestId,
        model: input.model,
        messages: input.messages,
        traceContext,
        mode,
      });
    });
  }

  return {
    requestId,
    complete(response, durationMs) {
      recordTrace({
        mode,
        requestId,
        model: input.model,
        messages: input.messages,
        traceContext,
        result: { response, durationMs },
      });
    },
    fail(error, durationMs) {
      recordTrace({
        mode,
        requestId,
        model: input.model,
        messages: input.messages,
        traceContext,
        result: { error, durationMs },
      });
    },
  };
}

function normalizeTraceContext(context?: ModelTraceContext): NormalizedTraceContext {
  return {
    sessionId: context?.sessionId ?? null,
    agentRunId: context?.agentRunId ?? null,
    workflowId: context?.workflowId ?? null,
    workflowStepId: context?.workflowStepId ?? null,
    task: context?.task ?? null,
    phase: context?.phase ?? null,
    attempt: context?.attempt ?? null,
    round: context?.round ?? null,
  };
}

function recordTrace(input: {
  mode: ModelIOLogMode;
  requestId: string;
  model: string;
  messages: ChatMessage[];
  traceContext: NormalizedTraceContext;
  result: TraceResult;
}): void {
  if (input.mode === "off") return;

  safeRun(() => {
    logResultSummary(input);
    if (input.mode === "debug" && "response" in input.result) {
      logResponsePreview(input.requestId, input.result.response.content);
    }
    if (input.mode === "full") {
      writeTraceJsonl(input);
    }
  });
}

function logRequestSummary(input: {
  requestId: string;
  model: string;
  messages: ChatMessage[];
  traceContext: NormalizedTraceContext;
  mode: ModelIOLogMode;
}): void {
  const roleStats = summarizeRoles(input.messages);
  const totalChars = Object.values(roleStats).reduce((sum, item) => sum + item.chars, 0);
  const context = [
    input.traceContext.phase ? `phase=${input.traceContext.phase}` : null,
    input.traceContext.task ? `task=${input.traceContext.task}` : null,
    input.traceContext.attempt ? `attempt=${input.traceContext.attempt}` : null,
    input.traceContext.round ? `round=${input.traceContext.round}` : null,
  ].filter(Boolean).join(", ");

  console.log(
    `◆ [MODEL_IO] request ${input.requestId} -> model=${input.model}, messages=${input.messages.length}, chars=${totalChars}${context ? `, ${context}` : ""}`,
  );
  console.log(`◆ [MODEL_IO] roles ${input.requestId} -> ${formatRoleStats(roleStats)}`);

  if (input.mode === "debug") {
    console.log(`◆ [MODEL_IO] input preview ${input.requestId}\n${formatInputPreview(input.messages)}`);
  }
}

function logResultSummary(input: {
  requestId: string;
  result: TraceResult;
}): void {
  if ("response" in input.result) {
    const usage = formatUsage(input.result.response.usage);
    console.log(
      `◆ [MODEL_IO] response ${input.requestId} -> tokens=${usage}, chars=${input.result.response.content.length}, duration=${input.result.durationMs}ms`,
    );
    return;
  }

  const message = input.result.error instanceof Error
    ? input.result.error.message
    : String(input.result.error);
  console.warn(
    `▲ [MODEL_IO] error ${input.requestId} -> duration=${input.result.durationMs}ms, error=${truncateForModelIO(message, 300)}`,
  );
}

function logResponsePreview(requestId: string, content: string): void {
  console.log(`◆ [MODEL_IO] output preview ${requestId}\n${truncateForModelIO(content, OUTPUT_PREVIEW_LIMIT)}`);
}

function formatInputPreview(messages: ChatMessage[]): string {
  return messages
    .map((message) => `[${message.role}]\n${truncateForModelIO(message.content, INPUT_PREVIEW_LIMIT)}`)
    .join("\n\n");
}

function formatRoleStats(stats: RoleStats): string {
  return Object.entries(stats)
    .map(([role, item]) => `${role}=${item.count}(${item.chars} chars)`)
    .join(", ");
}

function formatUsage(usage?: TokenUsage): string {
  return usage ? String(usage.totalTokens) : "?";
}

function writeTraceJsonl(input: {
  requestId: string;
  model: string;
  messages: ChatMessage[];
  traceContext: NormalizedTraceContext;
  result: TraceResult;
}): void {
  const filePath = getTraceFilePath();
  const record = buildTraceRecord(input);
  mkdirSync(dirname(filePath), { recursive: true });
  appendFileSync(filePath, `${JSON.stringify(redactJson(record))}\n`, "utf8");
  console.log(`◆ [MODEL_IO] trace ${input.requestId} -> ${filePath}`);
}

function buildTraceRecord(input: {
  requestId: string;
  model: string;
  messages: ChatMessage[];
  traceContext: NormalizedTraceContext;
  result: TraceResult;
}): Record<string, unknown> {
  const base = {
    requestId: input.requestId,
    timestamp: new Date().toISOString(),
    model: input.model,
    traceContext: input.traceContext,
    request: {
      messages: input.messages,
      messageCount: input.messages.length,
      roleStats: summarizeRoles(input.messages),
    },
  };

  if ("response" in input.result) {
    return {
      ...base,
      response: {
        content: input.result.response.content,
        chars: input.result.response.content.length,
        usage: input.result.response.usage,
      },
      durationMs: input.result.durationMs,
      error: null,
    };
  }

  const error = input.result.error instanceof Error
    ? { message: input.result.error.message, stack: input.result.error.stack }
    : { message: String(input.result.error) };
  return {
    ...base,
    response: null,
    durationMs: input.result.durationMs,
    error,
  };
}

function redactJson(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map((item) => redactJson(item));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^(apiKey|api_key|authorization|Authorization)$/u.test(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = redactJson(item);
      }
    }
    return output;
  }
  return value;
}

function getTraceFilePath(): string {
  const root = findWorkspaceRoot(process.cwd());
  const date = new Date().toISOString().slice(0, 10);
  return join(root, "logs", "model-io", `${date}.jsonl`);
}

function findWorkspaceRoot(startDir: string): string {
  let current = startDir;
  for (let i = 0; i < 8; i++) {
    const maybeWorkspace = join(current, "pnpm-workspace.yaml");
    if (existsSync(maybeWorkspace)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current || parse(current).root === current) break;
    current = parent;
  }
  return startDir;
}

function safeRun(action: () => void): void {
  try {
    action();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`▲ [MODEL_IO] logging failed -> ${message}`);
  }
}
