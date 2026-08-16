/**
 * 基于 new Function 的 JSRuntime 实现。
 *
 * 职责：
 * - 使用浏览器原生 new Function 执行受限同步脚本
 * - 通过 undefined 参数遮蔽常见浏览器全局变量
 * - 执行前使用 AST guard 阻断高风险语法和原型链逃逸入口
 *
 * 不负责：
 * - 提供 SES 级别的安全隔离
 * - 提供 Worker 超时隔离
 *
 * 引用：
 * - JSRuntime 类型、校验、JSON 工具和 AST guard
 * 被引用：
 * - JSRuntime 工厂
 * 注意：
 * - new Function 不是安全沙箱，本实现只适合可信或半可信的轻量同步逻辑。
 */

import type { JsonObject, JsonValue } from "@a2ui-platform/shared";
import { assertSafeScriptAst } from "../ast-guard";
import { JsRuntimeError } from "../errors";
import { ENABLE_FUNCTION_RUNTIME_AST_GUARD } from "../js-runtime.config";
import { isJsonObject, isJsonValue, validateJsonValue } from "../json";
import type { JSRuntime, RunActionScriptInput, RunPropertyScriptInput } from "../types";
import { validateActionScript, validateScriptDataPath, validatePropertyScript } from "../validation";

const BLOCKED_GLOBALS = {
  window: undefined,
  document: undefined,
  globalThis: undefined,
  self: undefined,
  parent: undefined,
  top: undefined,
  frames: undefined,
  location: undefined,
  navigator: undefined,
  history: undefined,
  localStorage: undefined,
  sessionStorage: undefined,
  indexedDB: undefined,
  crypto: undefined,
  XMLHttpRequest: undefined,
  WebSocket: undefined,
  EventSource: undefined,
  Worker: undefined,
  SharedWorker: undefined,
  importScripts: undefined,
  fetch: undefined,
  Function: undefined,
  setTimeout: undefined,
  setInterval: undefined,
  requestAnimationFrame: undefined,
  console: undefined,
} as const;

/** 基于 new Function 的 JSRuntime。 */
export class FunctionJsRuntime implements JSRuntime {
  initialize(): void {
    // new Function 路径没有全局初始化动作，保留方法用于满足统一接口。
  }

  runPropertyScript(input: RunPropertyScriptInput): JsonValue | undefined {
    validatePropertyScript(input.script);
    assertAstIfEnabled(input.script.code);

    const result = executeFunctionScript(input.script.code, {
      dataModel: Object.freeze({
        get: (path: string) => input.dataContext.dataModel.get(resolveScriptPath(input, path)),
      }),
      actions: undefined,
      context: undefined,
    });

    if (result === undefined) {
      return undefined;
    }
    if (!isJsonValue(result)) {
      throw new JsRuntimeError("SCRIPT_RETURN_INVALID", "属性脚本返回值必须是 JSON-compatible 值。");
    }
    return result;
  }

  runActionScript(input: RunActionScriptInput): void {
    validateActionScript(input.script);
    assertAstIfEnabled(input.script.code);

    executeFunctionScript(input.script.code, {
      dataModel: Object.freeze({
        get: (path: string) => input.dataContext.dataModel.get(resolveScriptPath(input, path)),
        set: (path: string, value: unknown) => {
          const safeValue = validateJsonValue(value);
          input.dataContext.dataModel.set(resolveScriptPath(input, path), safeValue);
        },
      }),
      actions: Object.freeze({
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
      context: deepFreeze(structuredCloneFallback(input.context)),
    });
  }
}

function resolveScriptPath(input: RunPropertyScriptInput | RunActionScriptInput, path: unknown): string {
  return input.dataContext.resolvePath(validateScriptDataPath(path));
}

function assertAstIfEnabled(code: string): void {
  if (ENABLE_FUNCTION_RUNTIME_AST_GUARD) {
    assertSafeScriptAst(code);
  }
}

function executeFunctionScript(
  code: string,
  globals: { dataModel: unknown; actions: unknown; context: unknown },
): unknown {
  const blockedNames = Object.keys(BLOCKED_GLOBALS);
  const blockedValues = Object.values(BLOCKED_GLOBALS);
  const fn = new Function(
    "dataModel",
    "actions",
    "context",
    ...blockedNames,
    `"use strict";\n${code}`,
  );
  return fn(globals.dataModel, globals.actions, globals.context, ...blockedValues);
}

function structuredCloneFallback<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return value;
}
