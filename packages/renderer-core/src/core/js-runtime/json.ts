/**
 * JSRuntime JSON 值校验工具。
 *
 * 职责：
 * - 判断脚本返回值、dataModel 写入值和 actions.emit context 是否为 JSON-compatible
 *
 * 不负责：
 * - 校验脚本语法或执行脚本
 *
 * 引用：
 * - @a2ui-platform/shared
 * - JSRuntime 错误定义
 * 被引用：
 * - validation 和不同 JSRuntime 实现
 * 注意：
 * - Renderer 当前只允许脚本和宿主交换 JSON-compatible 值，避免函数、DOM 对象等能力泄露。
 */

import type { JsonObject, JsonValue } from "@a2ui-platform/shared";
import { JsRuntimeError } from "./errors";

/** 校验并返回 JSON-compatible 值。 */
export function validateJsonValue(value: unknown): JsonValue {
  if (!isJsonValue(value)) {
    throw new JsRuntimeError("SCRIPT_WRITE_INVALID", "写入 dataModel 的值必须是 JSON-compatible。");
  }
  return value;
}

/** 判断值是否为 JSON object。 */
export function isJsonObject(value: unknown): value is JsonObject {
  return isPlainObject(value) && Object.values(value).every(isJsonValue);
}

/** 判断值是否为 JSON-compatible。 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (["string", "number", "boolean"].includes(typeof value)) {
    return typeof value !== "number" || Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isJsonObject(value);
}

/** 判断值是否为普通对象。 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 判断值是否为字符串数组。 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
