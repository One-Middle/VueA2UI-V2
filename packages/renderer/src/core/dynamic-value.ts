/**
 * Renderer 动态值解析工具。
 *
 * 职责：
 * - 解析组件属性中的 `{ path }` dataModel 引用
 * - 执行属性脚本 `{ script: { code, deps, fallback } }`
 * - 将属性脚本依赖交给调用方订阅，保持组件属性随 dataModel 更新
 *
 * 不负责：
 * - 递归执行任意对象中的脚本；对象子字段解析由调用方在受控场景中显式触发
 * - 执行动作脚本，动作脚本由 Button action 链路处理
 */

import type { JsonValue } from "@a2ui-platform/shared";
import type { DataContext } from "./data-context";
import {
  getPropertyScriptFallback,
  isPropertyScriptValue,
  runPropertyScript,
  validateJsonPointer,
  type PropertyScriptDeclaration,
} from "./js-runtime";

/** 动态值解析输入。 */
export interface ResolveDynamicValueInput {
  /** 待解析的原始值。 */
  value: unknown;
  /** 当前组件作用域的数据上下文。 */
  dataContext: DataContext;
  /** 属性脚本 deps 注册回调。 */
  registerScriptDeps?: (deps: string[]) => void;
  /** 脚本执行或声明错误回调。 */
  onError?: (error: { code: string; message: string; path?: string }) => void;
}

/** 判断值是否为严格的 `{ path }` 动态引用。 */
export function isDynamicRef(value: unknown): value is { path: string } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).path === "string" &&
    Object.keys(value as Record<string, unknown>).length === 1
  );
}

/** 解析单个动态值。 */
export function resolveDynamicValue(input: ResolveDynamicValueInput): unknown {
  if (isDynamicRef(input.value)) {
    return input.dataContext.resolve(input.value);
  }

  if (isPropertyScriptValue(input.value)) {
    const script = input.value.script;
    try {
      input.registerScriptDeps?.(script.deps);
      return runPropertyScript({
        script,
        dataModel: input.dataContext.dataModel,
      });
    } catch (error) {
      input.onError?.(toErrorPayload(error, script));
      return getPropertyScriptFallback(script);
    }
  }

  return input.value;
}

/** 解析受控对象的直接子字段，供 style 白名单等场景使用。 */
export function resolveObjectFields(
  value: Record<string, unknown>,
  input: Omit<ResolveDynamicValueInput, "value">,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const fieldValue = resolveDynamicValue({ ...input, value: raw });
    if (fieldValue !== undefined) {
      resolved[key] = fieldValue;
    }
  }
  return resolved;
}

/** 解析脚本声明中的 deps，并转换为当前 DataContext 下的绝对路径。 */
export function resolveScriptDeps(deps: string[], dataContext: DataContext): string[] {
  return deps.map((dep) => dataContext.resolvePath(validateJsonPointer(dep)));
}

function toErrorPayload(
  error: unknown,
  script: PropertyScriptDeclaration,
): { code: string; message: string; path?: string } {
  const code = error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "SCRIPT_EXECUTION_ERROR";
  const message = error instanceof Error ? error.message : "属性脚本执行失败。";
  return {
    code,
    message,
    path: script.deps[0],
  };
}
