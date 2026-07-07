/**
 * Frontend 模块 Logger
 *
 * 使用浏览器 console + CSS 样式输出。
 * 日志级别通过 VITE_LOG_LEVEL 环境变量控制（Vite 编译时注入）。
 */

import type { Logger, LogLevel } from "@a2ui-platform/shared";
import { shouldLog, shortId } from "@a2ui-platform/shared";

// ─── CSS 样式 ────────────────────────────────────────────────

const STYLE = "color: #3b82f6; font-weight: bold";
const DIM_STYLE = "color: #6b7280";

// ─── 当前日志级别 ───────────────────────────────────────────

function resolveLevel(): LogLevel {
  try {
    const raw = (import.meta.env.VITE_LOG_LEVEL as string | undefined)?.toLowerCase();
    if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "info";
}

const currentLevel: LogLevel = resolveLevel();

// ─── FrontendLogger ──────────────────────────────────────────

function formatArgs(args: unknown[]): string {
  if (args.length === 0) return "";
  return " " + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
}

function log(level: LogLevel, icon: string, msg: string, args: unknown[]): void {
  if (!shouldLog(currentLevel, level)) return;
  const prefix = `%c${icon} [FRONTEND] %c${msg}%c${formatArgs(args)}`;
  const dimClose = "";
  if (level === "error") {
    console.error(prefix, STYLE, "color: #ef4444", DIM_STYLE, ...args);
  } else if (level === "warn") {
    console.warn(prefix, STYLE, "color: #f59e0b", DIM_STYLE, ...args);
  } else if (level === "debug") {
    console.debug(prefix, STYLE, DIM_STYLE, DIM_STYLE, ...args);
  } else {
    console.log(prefix, STYLE, "", DIM_STYLE, ...args);
  }
}

export const logger: Logger = {
  debug(msg: string, ...args: unknown[]) {
    log("debug", "●", msg, args);
  },
  info(msg: string, ...args: unknown[]) {
    log("info", "◆", msg, args);
  },
  warn(msg: string, ...args: unknown[]) {
    log("warn", "▲", msg, args);
  },
  error(msg: string, ...args: unknown[]) {
    log("error", "✖", msg, args);
  },
};

export { shortId };
