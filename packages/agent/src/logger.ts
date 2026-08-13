/**
 * Agent 模块零依赖 Logger
 *
 * 使用 ANSI 颜色码输出到终端 console。
 * 日志级别通过 LOG_LEVEL 环境变量控制。
 */

import type { Logger, LogLevel } from "@a2ui-platform/shared";
import { shouldLog, shortId } from "@a2ui-platform/shared";

// ─── ANSI 颜色 ──────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
} as const;

// ─── 当前日志级别 ───────────────────────────────────────────

function resolveLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

const currentLevel: LogLevel = resolveLevel();

// ─── AgentLogger ─────────────────────────────────────────────

function format(msg: string): string {
  return `${C.cyan}[AGENT]${C.reset} ${msg}`;
}

function formatArgs(args: unknown[]): string {
  if (args.length === 0) return "";
  return " " + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
}

function log(level: LogLevel, color: string, icon: string, msg: string, args: unknown[]): void {
  if (!shouldLog(currentLevel, level)) return;
  const line = `${color}${icon}${C.reset} ${format(msg)}${C.dim}${formatArgs(args)}${C.reset}`;
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger: Logger = {
  debug(msg, ...args) {
    log("debug", C.gray, "●", msg, args);
  },
  info(msg, ...args) {
    log("info", C.cyan, "◆", msg, args);
  },
  warn(msg, ...args) {
    log("warn", C.yellow, "▲", msg, args);
  },
  error(msg, ...args) {
    log("error", C.red, "✖", msg, args);
  },
};

export { shortId };

/**
 * 截断长文本到指定长度，超长时在末尾追加截断标记。
 *
 * @param text - 原始文本
 * @param maxLen - 最大保留字符数
 * @returns 截断后的文本；未超长时原样返回
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…（截断，原长 ${text.length}）`;
}
