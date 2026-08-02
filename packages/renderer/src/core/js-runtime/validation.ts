/**
 * JSRuntime 通用声明校验。
 *
 * 职责：
 * - 校验属性脚本和动作脚本声明结构
 * - 校验脚本长度、同步限制和 dataModel JSON Pointer 路径
 *
 * 不负责：
 * - 做执行路径专属安全检查，例如 new Function 的 AST guard
 *
 * 引用：
 * - JSRuntime 类型、错误和 JSON 工具
 * 被引用：
 * - JSRuntime 门面和具体实现
 * 注意：
 * - 本文件中的校验会同时影响 SES 和 new Function 两条执行路径。
 */

import { JsRuntimeError } from "./errors";
import { isJsonValue, isPlainObject, isStringArray } from "./json";
import type { ActionScriptDeclaration, PropertyScriptDeclaration } from "./types";

const MAX_SCRIPT_CODE_LENGTH = 2000;
const MAX_SCRIPT_DEPS = 32;

/** 判断值是否为属性脚本包装对象。 */
export function isPropertyScriptValue(value: unknown): value is { script: PropertyScriptDeclaration } {
  return isPlainObject(value) && isPropertyScriptDeclaration(value.script);
}

/** 判断值是否为动作脚本声明。 */
export function isActionScriptDeclaration(value: unknown): value is ActionScriptDeclaration {
  if (!isPlainObject(value)) return false;
  const code = value.code;
  const deps = value.deps;
  return (
    typeof code === "string" &&
    (deps === undefined || isStringArray(deps)) &&
    (value.context === undefined || isPlainObject(value.context))
  );
}

/** 校验属性脚本声明。 */
export function validatePropertyScript(script: PropertyScriptDeclaration): void {
  validateScriptCode(script.code, true);
  if (!Array.isArray(script.deps) || script.deps.length === 0 || script.deps.length > MAX_SCRIPT_DEPS) {
    throw new JsRuntimeError("SCRIPT_DEPS_INVALID", "属性脚本 deps 必须包含 1 到 32 个路径。");
  }
  script.deps.forEach(validateJsonPointer);
}

/** 校验动作脚本声明。 */
export function validateActionScript(script: ActionScriptDeclaration): void {
  validateScriptCode(script.code, false);
  if (script.deps !== undefined) {
    if (!Array.isArray(script.deps) || script.deps.length > MAX_SCRIPT_DEPS) {
      throw new JsRuntimeError("SCRIPT_DEPS_INVALID", "动作脚本 deps 最多允许 32 个路径。");
    }
    script.deps.forEach(validateJsonPointer);
  }
}

/** 返回属性脚本的兜底值，兜底值非法时返回 undefined。 */
export function getPropertyScriptFallback(script: PropertyScriptDeclaration) {
  return isJsonValue(script.fallback) ? script.fallback : undefined;
}

/** 校验 JSON Pointer 路径，Renderer DataModel 当前支持根路径 "/"。 */
export function validateJsonPointer(path: unknown): string {
  if (typeof path !== "string" || (path !== "/" && !path.startsWith("/"))) {
    throw new JsRuntimeError("SCRIPT_DEP_INVALID", "dataModel 路径必须是 JSON Pointer 字符串。");
  }
  return path;
}

function validateScriptCode(code: unknown, requireReturn: boolean): void {
  if (typeof code !== "string" || !code.trim()) {
    throw new JsRuntimeError("SCRIPT_EXECUTION_ERROR", "脚本 code 不能为空。");
  }
  if (code.length > MAX_SCRIPT_CODE_LENGTH) {
    throw new JsRuntimeError("SCRIPT_CODE_TOO_LONG", "脚本 code 超过 2000 字符限制。");
  }
  if (requireReturn && !/\breturn\b/.test(code) && !/\bthrow\b/.test(code)) {
    throw new JsRuntimeError("SCRIPT_RETURN_INVALID", "属性脚本必须显式 return。");
  }
  if (/\bimport\s*(?:\(|[\s{*])/.test(code) || /\basync\b/.test(code) || /\bawait\b/.test(code)) {
    throw new JsRuntimeError("SCRIPT_EXECUTION_ERROR", "脚本不支持 import、async 或 await。");
  }
}

function isPropertyScriptDeclaration(value: unknown): value is PropertyScriptDeclaration {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.code === "string" &&
    isStringArray(value.deps) &&
    (value.fallback === undefined || isJsonValue(value.fallback))
  );
}
