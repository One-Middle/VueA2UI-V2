/**
 * RenderContext：RenderNode 构建过程的上下文对象。
 *
 * 职责：
 * - 向 resolver 提供 surface、dataModel、basePath 和事件/错误派发能力
 * - 持有本次构建的依赖收集器
 *
 * 不负责：普通 UI 组件 props 定义或 Vue VNode 创建。
 */

import type { JsonObject } from "@a2ui-platform/shared";
import type { SurfaceModel } from "../core/surface-model";
import type { RendererScriptAction } from "../core/action";
import type { RenderDependencyCollector } from "./dependency-collector";

export interface RenderContext {
  surfaceModel: SurfaceModel;
  surfaceId: string;
  basePath: string;
  dependencies: RenderDependencyCollector;
  dispatchError(error: {
    code: string;
    message: string;
    path?: string;
    sourceComponentId?: string;
  }): void;
  emitAction(input: {
    name: string;
    sourceComponentId: string;
    context: JsonObject;
  }): void;
  runActionScript(input: {
    action: RendererScriptAction;
    sourceComponentId: string;
    basePath: string;
    context: JsonObject;
  }): void;
}

export interface BuildRenderNodeInput {
  componentId: string;
  basePath: string;
  context: RenderContext;
}
