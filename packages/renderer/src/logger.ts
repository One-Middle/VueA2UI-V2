/**
 * Renderer 模块 Logger
 *
 * 使用浏览器 console + CSS 样式输出。
 * Renderer 是独立包（不依赖 frontend），因此拥有自己的 logger 实现。
 * 日志级别通过 VITE_LOG_LEVEL 环境变量控制（需由宿主应用通过 Vite 注入）。
 */

import type { Logger, LogLevel } from "@a2ui-platform/shared";
import { shouldLog, shortId } from "@a2ui-platform/shared";

// ─── CSS 样式 ────────────────────────────────────────────────

const STYLE = "color: #a855f7; font-weight: bold";
const DIM_STYLE = "color: #6b7280";

// ─── 当前日志级别 ───────────────────────────────────────────

function resolveLevel(): LogLevel {
  // 尝试读取全局注入的配置（由宿主 frontend 设置）
  try {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>)["__A2UI_LOG_LEVEL__"]) {
      const raw = String((window as unknown as Record<string, unknown>)["__A2UI_LOG_LEVEL__"]).toLowerCase();
      if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
        return raw;
      }
    }
  } catch {
    // ignore
  }
  return "info";
}

const currentLevel: LogLevel = resolveLevel();

// ─── RendererLogger ──────────────────────────────────────────

function formatArgs(args: unknown[]): string {
  if (args.length === 0) return "";
  return " " + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
}

function log(level: LogLevel, icon: string, msg: string, args: unknown[]): void {
  if (!shouldLog(currentLevel, level)) return;
  const prefix = `%c${icon} [RENDERER] %c${msg}%c${formatArgs(args)}`;
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
