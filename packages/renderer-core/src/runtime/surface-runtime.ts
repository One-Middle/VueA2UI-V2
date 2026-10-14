/**
 * SurfaceRuntime 是 renderer-core 面向各平台渲染适配器的运行时门面。
 *
 * 职责：
 * - 监听 SurfaceGroup、SurfaceModel 和 DataModel 变化，并生成最新 RenderNode 快照。
 * - 接收 DOM/Vue/React 等适配器回传的组件事件，并执行 model 写回或 action。
 * - 管理组件局部状态和微任务级刷新调度，避免同步事件风暴重复构建渲染树。
 *
 * 引用：
 * - core/data-context、core/js-runtime、render/build-render-node、component-state-store。
 * 被引用：
 * - renderer-dom、renderer-vue、renderer-react 等平台适配层。
 * 注意：
 * - 本模块不创建真实 UI 节点，只维护协议运行时和 RenderNode 快照。
 */
import type { JsonObject, JsonValue } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import { runActionScript } from "../core/js-runtime";
import type { RendererScriptAction } from "../core/action";
import type { SurfaceGroupModel, SurfaceModel } from "../core/surface-model";
import { buildRenderTree } from "../render/build-render-node";
import type {
  ComponentAddress,
  RenderEventIntent,
  RenderNode,
} from "../render/render-node";
import {
  ComponentStateStore,
  type ComponentState,
} from "./component-state-store";

/**
 * 平台适配器派回 renderer-core 的组件事件。
 *
 * @property address - 触发事件的组件地址，包含 surface、组件 ID 和数据作用域。
 * @property eventName - 普通 UI 组件发出的事件名。
 * @property value - 事件携带的值，常用于 model 写回。
 */
export interface AdapterEvent {
  address: ComponentAddress;
  eventName: string;
  value?: unknown;
}

/**
 * SurfaceRuntime 暴露给适配器的渲染快照。
 *
 * @property revision - 单调递增的快照版本号。
 * @property surfaceId - 当前快照所属 Surface。
 * @property node - 根 RenderNode；Surface 或 root 组件不存在时为 null。
 */
export interface RenderPlanSnapshot {
  revision: number;
  surfaceId: string;
  node: RenderNode | null;
}

/**
 * 创建 SurfaceRuntime 的配置。
 *
 * @property surfaceGroup - 运行时监听的 Surface 集合。
 * @property surfaceId - 初始渲染的 Surface 标识。
 * @property onAction - action.event 或动作脚本 emit 时的回调。
 * @property onError - 渲染解析或脚本执行错误回调。
 */
export interface SurfaceRuntimeOptions {
  surfaceGroup: SurfaceGroupModel;
  surfaceId: string;
  onAction?: (event: {
    name: string;
    sourceComponentId: string;
    context: JsonObject;
  }) => void;
  onError?: (error: {
    code: string;
    message: string;
    path?: string;
    sourceComponentId?: string;
  }) => void;
}

/**
 * 管理单个 Surface 渲染计划的运行时。
 *
 * @remarks
 * 运行时会根据 RenderNode 构建结果中的依赖路径订阅 DataModel；当依赖变更时，
 * 它通过 queueMicrotask 合并刷新，并通知订阅者读取新的 snapshot。
 */
export class SurfaceRuntime {
  private readonly group: SurfaceGroupModel;
  private readonly states = new ComponentStateStore();
  private readonly listeners = new Set<() => void>();
  private readonly dataSubscriptions = new Map<string, () => void>();
  private readonly onAction?: SurfaceRuntimeOptions["onAction"];
  private readonly onError?: SurfaceRuntimeOptions["onError"];
  private surfaceId: string;
  private currentSurface: SurfaceModel | undefined;
  private unsubscribeGroup: (() => void) | undefined;
  private unsubscribeSurface: (() => void) | undefined;
  private scheduled = false;
  private disposed = false;
  private revision = 0;
  private snapshot: RenderPlanSnapshot;

  constructor(options: SurfaceRuntimeOptions) {
    this.group = options.surfaceGroup;
    this.surfaceId = options.surfaceId;
    this.onAction = options.onAction;
    this.onError = options.onError;
    this.snapshot = { revision: 0, surfaceId: this.surfaceId, node: null };
    this.unsubscribeGroup = this.group.subscribe(() => this.schedule());
    this.update();
  }

  /**
   * 获取最近一次构建完成的渲染快照。
   *
   * @returns 当前 RenderPlanSnapshot；不会主动触发重建。
   */
  getSnapshot(): RenderPlanSnapshot {
    return this.snapshot;
  }

  /**
   * 订阅快照变化。
   *
   * @param listener - 每次 update 完成后调用的监听器。
   * @returns 取消订阅函数。
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 切换当前运行时渲染的 Surface。
   *
   * @param surfaceId - 目标 Surface 标识。
   */
  setSurfaceId(surfaceId: string): void {
    if (this.surfaceId === surfaceId) return;
    this.surfaceId = surfaceId;
    this.update();
  }

  /**
   * 立即重建当前 Surface 的 RenderNode 快照。
   *
   * 副作用：同步 Surface/DataModel 订阅，递增 revision，并通知所有监听器。
   */
  update(): void {
    if (this.disposed) return;
    this.scheduled = false;
    const surface = this.group.get(this.surfaceId);
    this.syncSurface(surface);
    let node: RenderNode | null = null;
    if (surface?.components.has("root")) {
      const result = buildRenderTree({
        surfaceModel: surface,
        rootComponentId: "root",
        basePath: "/",
        dispatchError: (error) => this.reportError(error),
        emitAction: (action) => this.emitAction(action),
        runActionScript: (script) => this.executeScript(script),
      });
      this.syncData(surface, result.dependencies);
      node = result.node;
    } else {
      this.syncData(null, []);
    }
    this.snapshot = {
      revision: ++this.revision,
      surfaceId: this.surfaceId,
      node,
    };
    for (const listener of this.listeners) listener();
  }

  /**
   * 处理平台适配器派回的组件事件。
   *
   * 副作用：可能写入 DataModel、派发 action，或执行动作脚本。
   */
  dispatch(event: AdapterEvent): void {
    if (this.disposed || event.address.surfaceId !== this.surfaceId) return;
    const intent = findIntent(
      this.snapshot.node,
      event.address,
      event.eventName,
    );
    if (!intent) return;
    if (intent.kind === "model-set") {
      this.currentSurface?.dataModel.set(intent.path, event.value as JsonValue);
      return;
    }
    if (intent.kind === "action-event") {
      this.emitAction({
        name: intent.name,
        sourceComponentId: event.address.componentId,
        context: intent.context,
      });
      return;
    }
    this.executeScript({
      action: intent.action,
      sourceComponentId: event.address.componentId,
      basePath: event.address.basePath,
      context: intent.context,
    });
  }

  /**
   * 获取指定组件地址下的局部 UI 状态。
   *
   * @param address - 组件地址，同一组件在不同数据作用域下状态隔离。
   */
  stateFor(address: ComponentAddress): ComponentState {
    return this.states.stateFor(address);
  }

  /**
   * 写入组件局部状态并安排刷新。
   */
  setState<T>(address: ComponentAddress, field: string, value: T): void {
    this.states.stateFor(address).set(field, value);
    this.schedule();
  }

  /**
   * 请求在微任务中刷新 RenderNode 快照。
   */
  requestUpdate(): void {
    this.schedule();
  }

  /**
   * 释放运行时订阅、组件状态和监听器。
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeGroup?.();
    this.unsubscribeSurface?.();
    this.syncData(null, []);
    this.states.clear();
    this.listeners.clear();
  }

  /**
   * 合并同一同步调用栈内的多次刷新请求。
   */
  private schedule(): void {
    if (this.disposed || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      if (!this.scheduled || this.disposed) return;
      this.update();
    });
  }

  /**
   * 同步当前 Surface 引用，并在 Surface 切换时清理旧状态。
   */
  private syncSurface(surface: SurfaceModel | undefined): void {
    if (this.currentSurface === surface) return;
    this.unsubscribeSurface?.();
    this.syncData(null, []);
    this.states.clear();
    this.currentSurface = surface;
    this.unsubscribeSurface = surface?.subscribe(() => this.schedule());
  }

  /**
   * 根据最新渲染依赖同步 DataModel 订阅。
   */
  private syncData(surface: SurfaceModel | null, dependencies: string[]): void {
    const next = new Set(dependencies);
    for (const [path, unsubscribe] of this.dataSubscriptions) {
      if (!next.has(path)) {
        unsubscribe();
        this.dataSubscriptions.delete(path);
      }
    }
    if (!surface) return;
    for (const path of next) {
      if (this.dataSubscriptions.has(path)) continue;
      this.dataSubscriptions.set(
        path,
        surface.dataModel.subscribe(path, () => this.schedule()),
      );
    }
  }

  private emitAction(input: {
    name: string;
    sourceComponentId: string;
    context: JsonObject;
  }): void {
    this.onAction?.(input);
  }

  private reportError(error: {
    code: string;
    message: string;
    path?: string;
    sourceComponentId?: string;
  }): void {
    this.onError?.(error);
  }

  private executeScript(input: {
    action: RendererScriptAction;
    sourceComponentId: string;
    basePath: string;
    context: JsonObject;
  }): void {
    const surface = this.currentSurface;
    if (!surface) return;
    try {
      runActionScript({
        script: input.action.script,
        dataContext: new DataContext(surface.dataModel, input.basePath),
        context: input.context,
        actions: {
          emit: (name, context) =>
            this.emitAction({
              name,
              sourceComponentId: input.sourceComponentId,
              context: context ?? {},
            }),
        },
      });
    } catch (error) {
      this.reportError({
        code:
          error instanceof Error && "code" in error
            ? String((error as { code: unknown }).code)
            : "SCRIPT_EXECUTION_ERROR",
        message: error instanceof Error ? error.message : "动作脚本执行失败。",
        sourceComponentId: input.sourceComponentId,
      });
    }
  }
}

/**
 * 在当前快照树中查找与组件地址和事件名匹配的事件意图。
 */
function findIntent(
  node: RenderNode | null,
  address: ComponentAddress,
  eventName: string,
): RenderEventIntent | undefined {
  if (!node) return undefined;
  if (
    node.meta.componentId === address.componentId &&
    node.meta.basePath === address.basePath
  )
    return node.events?.[eventName];
  for (const slot of Object.values(node.slots ?? {})) {
    for (const item of slot) {
      const children = "nodes" in item ? item.nodes : [item];
      for (const child of children) {
        const found = findIntent(child, address, eventName);
        if (found) return found;
      }
    }
  }
  return undefined;
}
