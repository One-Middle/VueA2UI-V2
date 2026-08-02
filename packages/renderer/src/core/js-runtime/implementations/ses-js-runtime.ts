/**
 * 基于 SES Compartment 的 JSRuntime 实现。
 *
 * 职责：
 * - 初始化 SES lockdown
 * - 通过 Compartment 执行受限同步脚本
 * - 注入 dataModel、actions 和 context 的最小能力
 *
 * 不负责：
 * - 提供 Worker 超时隔离
 *
 * 引用：
 * - ses
 * - JSRuntime 类型、校验和 JSON 工具
 * 被引用：
 * - JSRuntime 工厂
 * 注意：
 * - SES 兼容性不稳定时，可在 js-runtime.config.ts 切换到 function 路径。
 */

import "ses";
import type { JsonObject, JsonValue } from "@a2ui-platform/shared";
import { JsRuntimeError } from "../errors";
import { isJsonObject, isJsonValue, validateJsonValue } from "../json";
import type { JSRuntime, RunActionScriptInput, RunPropertyScriptInput } from "../types";
import { validateActionScript, validateJsonPointer, validatePropertyScript } from "../validation";

let isInitialized = false;

/** 基于 SES 的 JSRuntime。 */
export class SesJsRuntime implements JSRuntime {
  initialize(): void {
    if (isInitialized) return;
    lockdown();
    isInitialized = true;
  }

  runPropertyScript(input: RunPropertyScriptInput): JsonValue | undefined {
    validatePropertyScript(input.script);
    this.initialize();

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

  runActionScript(input: RunActionScriptInput): void {
    validateActionScript(input.script);
    this.initialize();

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
}

function wrapScript(code: string): string {
  return `
(() => {
  "use strict";
  ${code}
})()
`;
}
