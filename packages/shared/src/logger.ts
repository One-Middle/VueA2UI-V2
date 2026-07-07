/**
 * 日志级别
 *
 * - debug: 详细追踪（请求/响应、内部状态变化）
 * - info:  关键事件和跨模块信息传递（默认级别）
 * - warn:  非致命问题
 * - error: 错误和失败
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** 日志级别优先级数值 */
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger 接口——各模块必须按自己的运行时环境实现此接口。
 *
 * - Node.js（backend / agent）：使用 pino 或 ANSI console
 * - 浏览器（frontend / renderer）：使用 console + CSS 样式
 */
export interface Logger {
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

/**
 * 判断给定日志级别是否应该输出。
 *
 * @param currentLevel 当前配置的日志级别
 * @param targetLevel 要输出的日志级别
 */
export function shouldLog(currentLevel: LogLevel, targetLevel: LogLevel): boolean {
  return LEVEL_ORDER[targetLevel] >= LEVEL_ORDER[currentLevel];
}

/**
 * 将短 id 截断为前 8 个字符以便日志展示。
 */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}
