/**
 * Renderer JSRuntime：基于 SES 执行受限的 A2UI 脚本声明。
 *
 * 职责：
 * - 初始化 SES lockdown，并通过 Compartment 执行同步脚本
 * - 为属性脚本注入只读 dataModel.get 能力
 * - 为动作脚本注入 dataModel.get/set 和宿主提供的 actions 能力分组
 *
 * 不负责：
 * - 解析组件树或决定哪些属性可使用脚本
 * - 提供 Worker 超时隔离；MVP 假设脚本为可信的简单同步逻辑
 *
 * 注意：
 * - 属性脚本必须显式 return，且返回值必须是 JSON-compatible。
 * - SES 不能阻止死循环，后续如需强超时应迁移到 Worker + SES。
 */

import "ses";
import type { JsonObject, JsonValue } from "@a2ui-platform/shared";
import type { DataModel } from "./data-model";

declare global {
  function lockdown(options?: Record<string, unknown>): void;
  function harden<T>(value: T): T;

  class Compartment {
    constructor(options?: Record<string, unknown>);
    evaluate(source: string): unknown;
  }
}

const MAX_SCRIPT_CODE_LENGTH = 2000;
const MAX_SCRIPT_DEPS = 32;

let isInitialized = false;

/** 属性脚本声明。 */
export interface PropertyScriptDeclaration {
  /** 同步 JS 函数体，必须显式 return。 */
  code: string;
  /** dataModel 依赖路径，用于订阅刷新。 */
  deps: string[];
  /** 执行失败或返回值非法时的兜底值。 */
  fallback?: JsonValue;
}

/** 动作脚本声明。 */
export interface ActionScriptDeclaration {
  /** 同步 JS 函数体。 */
  code: string;
  /** 可选 dataModel 依赖说明；动作脚本不使用该字段做响应式订阅。 */
  deps?: string[];
  /** 脚本上下文。 */
  context?: Record<string, unknown>;
}

/** Renderer 可注入给动作脚本的动作能力分组。 */
export interface ActionScriptActions {
  /** 派发一个受控业务事件。 */
  emit(name: string, context?: JsonObject): void;
}

/** 属性脚本执行输入。 */
export interface RunPropertyScriptInput {
  script: PropertyScriptDeclaration;
  dataModel: DataModel;
}

/** 动作脚本执行输入。 */
export interface RunActionScriptInput {
  script: ActionScriptDeclaration;
  dataModel: DataModel;
  actions: ActionScriptActions;
  context: JsonObject;
}

/** JSRuntime 执行错误。 */
export class JsRuntimeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JsRuntimeError";
    this.code = code;
  }
}

/** 确保 SES 已初始化。 */
export function initializeJsRuntime(): void {
  if (isInitialized) return;
  lockdown();
  isInitialized = true;
}

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

/** 执行只读属性脚本，失败时抛出 JsRuntimeError。 */
export function runPropertyScript(input: RunPropertyScriptInput): JsonValue | undefined {
  validatePropertyScript(input.script);
  initializeJsRuntime();

  const compartment = new Compartment({
    globals: harden({
      dataModel: harden({
        get: (path: string) => input.dataModel.get(validateJsonPointer(path)),
      }),
    }),
    __options__: true,
  });

  const result = compartment.evaluate(wrapScript(input.script.code));
  if (result === undefined) {
    return undefined;
  }
  if (!isJsonValue(result)) {
    throw new JsRuntimeError("SCRIPT_RETURN_INVALID", "属性脚本返回值必须是 JSON-compatible 值。");
  }
  return result;
}

/** 执行动作脚本，失败时抛出 JsRuntimeError。 */
export function runActionScript(input: RunActionScriptInput): void {
  validateActionScript(input.script);
  initializeJsRuntime();

  const compartment = new Compartment({
    globals: harden({
      dataModel: harden({
        get: (path: string) => input.dataModel.get(validateJsonPointer(path)),
        set: (path: string, value: unknown) => {
          const safeValue = validateJsonValue(value);
          input.dataModel.set(validateJsonPointer(path), safeValue);
        },
      }),
      actions: harden({
        emit: (name: unknown, context?: unknown) => {
          if (typeof name !== "string" || !name.trim()) {
            throw new JsRuntimeError("SCRIPT_EMIT_INVALID", "actions.emit 的事件名必须是非空字符串。");
          }
          if (context !== undefined && !isJsonObject(context)) {
            throw new JsRuntimeError("SCRIPT_EMIT_INVALID", "actions.emit 的 context 必须是 JSON object。");
          }
          input.actions.emit(name.trim(), (context ?? {}) as JsonObject);
        },
      }),
      context: harden(input.context),
    }),
    __options__: true,
  });

  compartment.evaluate(wrapScript(input.script.code));
}

/** 返回属性脚本的兜底值，兜底值非法时返回 undefined。 */
export function getPropertyScriptFallback(script: PropertyScriptDeclaration): JsonValue | undefined {
  return isJsonValue(script.fallback) ? script.fallback : undefined;
}

/** 校验 JSON Pointer 路径，Renderer DataModel 当前支持根路径 "/"。 */
export function validateJsonPointer(path: unknown): string {
  if (typeof path !== "string" || (path !== "/" && !path.startsWith("/"))) {
    throw new JsRuntimeError("SCRIPT_DEP_INVALID", "dataModel 路径必须是 JSON Pointer 字符串。");
  }
  return path;
}

function validatePropertyScript(script: PropertyScriptDeclaration): void {
  validateScriptCode(script.code, true);
  if (!Array.isArray(script.deps) || script.deps.length === 0 || script.deps.length > MAX_SCRIPT_DEPS) {
    throw new JsRuntimeError("SCRIPT_DEPS_INVALID", "属性脚本 deps 必须包含 1 到 32 个路径。");
  }
  script.deps.forEach(validateJsonPointer);
}

function validateActionScript(script: ActionScriptDeclaration): void {
  validateScriptCode(script.code, false);
  if (script.deps !== undefined) {
    if (!Array.isArray(script.deps) || script.deps.length > MAX_SCRIPT_DEPS) {
      throw new JsRuntimeError("SCRIPT_DEPS_INVALID", "动作脚本 deps 最多允许 32 个路径。");
    }
    script.deps.forEach(validateJsonPointer);
  }
}

function validateScriptCode(code: unknown, requireReturn: boolean): void {
  if (typeof code !== "string" || !code.trim()) {
    throw new JsRuntimeError("SCRIPT_EXECUTION_ERROR", "脚本 code 不能为空。");
  }
  if (code.length > MAX_SCRIPT_CODE_LENGTH) {
    throw new JsRuntimeError("SCRIPT_CODE_TOO_LONG", "脚本 code 超过 2000 字符限制。");
  }
  if (requireReturn && !/\breturn\b/.test(code)) {
    throw new JsRuntimeError("SCRIPT_RETURN_INVALID", "属性脚本必须显式 return。");
  }
  if (/\bimport\s*(?:\(|[\s{*])/.test(code) || /\basync\b/.test(code) || /\bawait\b/.test(code)) {
    throw new JsRuntimeError("SCRIPT_EXECUTION_ERROR", "脚本不支持 import、async 或 await。");
  }
}

function wrapScript(code: string): string {
  return `
(() => {
  "use strict";
  ${code}
})()
`;
}

function isPropertyScriptDeclaration(value: unknown): value is PropertyScriptDeclaration {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.code === "string" &&
    isStringArray(value.deps) &&
    (value.fallback === undefined || isJsonValue(value.fallback))
  );
}

function validateJsonValue(value: unknown): JsonValue {
  if (!isJsonValue(value)) {
    throw new JsRuntimeError("SCRIPT_WRITE_INVALID", "写入 dataModel 的值必须是 JSON-compatible。");
  }
  return value;
}

function isJsonObject(value: unknown): value is JsonObject {
  return isPlainObject(value) && Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (["string", "number", "boolean"].includes(typeof value)) {
    return typeof value !== "number" || Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isJsonObject(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
