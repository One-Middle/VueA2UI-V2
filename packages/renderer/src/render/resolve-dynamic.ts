/**
 * Render 层动态值解析封装。
 *
 * 职责：
 * - 复用 core/dynamic-value 的旧链路语义
 * - 在解析 `{ path }` 和属性脚本 deps 时收集 RenderNode 构建依赖
 *
 * 不负责：定义动态值协议或执行 action.script。
 */

import { DataContext } from "../core/data-context";
import { isDynamicRef, resolveDynamicValue } from "../core/dynamic-value";
import type { RenderContext } from "./render-context";

export function resolveRenderValue(input: {
  value: unknown;
  dataContext: DataContext;
  renderContext: RenderContext;
  sourceComponentId: string;
}): unknown {
  if (isDynamicRef(input.value)) {
    input.renderContext.dependencies.addPath(
      input.value.path,
      input.dataContext,
    );
  }

  return resolveDynamicValue({
    value: input.value,
    dataContext: input.dataContext,
    registerScriptDeps: (deps) => {
      input.renderContext.dependencies.addScriptDeps(deps, input.dataContext);
    },
    onError: (error) => {
      input.renderContext.dispatchError({
        ...error,
        sourceComponentId: input.sourceComponentId,
      });
    },
  });
}
