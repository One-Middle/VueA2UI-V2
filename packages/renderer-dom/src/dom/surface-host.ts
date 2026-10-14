/**
 * DOM Surface 宿主，负责把 renderer-core 的运行时快照渲染到指定容器。
 *
 * 职责：
 * - 持有或接入 SurfaceRuntime，并订阅运行时变更触发 DOM 重绘。
 * - 在重绘前后保存与恢复焦点，降低受控输入框被替换时的交互中断。
 * - 将运行时动作与错误转换为 DOM 自定义事件。
 *
 * 引用：
 * - renderer-core 的 SurfaceRuntime 与 SurfaceGroupModel。
 * - dom-renderer、events、focus-restoration。
 * 被引用：
 * - mount-surface、web-component。
 * 注意：
 * - 本模块只负责 DOM 宿主生命周期，不负责解释 A2UI 协议或组件具体渲染。
 */
import type {
  SurfaceGroupModel,
  SurfaceRuntime,
} from "@a2ui-platform/renderer-core";
import { SurfaceRuntime as Runtime } from "@a2ui-platform/renderer-core";
import { renderDomNode } from "../render/dom-renderer";
import { dispatchRendererAction, dispatchRendererError } from "./events";
import { captureFocus, restoreFocus } from "./focus-restoration";

/**
 * 创建 DOM Surface 宿主所需的配置。
 *
 * @property container - 承载渲染结果的 DOM 容器。
 * @property runtime - 可选的外部运行时；传入后宿主不会销毁它。
 * @property surfaceGroup - 未传入 runtime 时用于创建内部运行时的 SurfaceGroup。
 * @property surfaceId - 初始渲染的 Surface 标识，默认使用 main。
 * @property mirrorEventsToWindow - 是否把容器事件额外镜像到 window，便于全局监听。
 */
export interface DomSurfaceHostOptions {
  container: HTMLElement;
  runtime?: SurfaceRuntime;
  surfaceGroup?: SurfaceGroupModel;
  surfaceId?: string;
  mirrorEventsToWindow?: boolean;
}

/**
 * DOM Surface 挂载后的控制句柄。
 *
 * 注意：unmount 会释放本宿主拥有的运行时，并清空容器内容。
 */
export interface DomSurfaceHandle {
  update(): void;
  unmount(): void;
}

/**
 * 管理一个 A2UI Surface 在 DOM 容器中的完整生命周期。
 *
 * @remarks
 * 当调用方传入 runtime 时，本类只订阅并驱动渲染；当调用方只传入 surfaceGroup
 * 时，本类会创建并拥有一个 Runtime，unmount 时一并释放。
 */
export class DomSurfaceHost implements DomSurfaceHandle {
  private readonly container: HTMLElement;
  private readonly runtime: SurfaceRuntime;
  private readonly ownsRuntime: boolean;
  private readonly mirrorEventsToWindow: boolean;
  private unsubscribe: (() => void) | undefined;
  private cleanup: (() => void) | undefined;

  constructor(options: DomSurfaceHostOptions) {
    this.container = options.container;
    this.mirrorEventsToWindow = options.mirrorEventsToWindow ?? false;
    this.ownsRuntime = !options.runtime;
    this.runtime =
      options.runtime ??
      new Runtime({
        surfaceGroup: required(options.surfaceGroup, "surfaceGroup"),
        surfaceId: options.surfaceId ?? "main",
        onAction: (action) =>
          dispatchRendererAction({
            target: this.container,
            mirrorToWindow: this.mirrorEventsToWindow,
            surfaceId: this.runtime.getSnapshot().surfaceId,
            ...action,
          }),
        onError: (error) =>
          dispatchRendererError({
            target: this.container,
            mirrorToWindow: this.mirrorEventsToWindow,
            surfaceId: this.runtime.getSnapshot().surfaceId,
            ...error,
          }),
      });
    this.unsubscribe = this.runtime.subscribe(() => this.render());
    this.render();
  }

  /**
   * 请求运行时刷新当前 Surface 快照。
   *
   * 副作用：可能触发订阅回调并重建容器内的 DOM。
   */
  update(): void {
    this.runtime.update();
  }

  /**
   * 切换当前宿主渲染的 Surface。
   *
   * @param surfaceId - 目标 Surface 标识。
   */
  setSurfaceId(surfaceId: string): void {
    this.runtime.setSurfaceId(surfaceId);
  }

  /**
   * 释放当前 DOM 渲染结果与运行时订阅。
   *
   * 副作用：清空容器；如果运行时由宿主创建，也会调用 runtime.dispose。
   */
  unmount(): void {
    this.cleanup?.();
    this.unsubscribe?.();
    if (this.ownsRuntime) this.runtime.dispose();
    this.container.replaceChildren();
  }

  /**
   * 根据运行时快照重建 DOM 树。
   *
   * 注意：当前渲染器采用整棵 Surface 替换，因此需要显式恢复焦点和选择区。
   */
  private render(): void {
    const focus = captureFocus(this.container);
    this.cleanup?.();
    const snapshot = this.runtime.getSnapshot();
    const section = document.createElement("section");
    section.className = "a2ui-surface";
    section.dataset.surfaceId = snapshot.surfaceId;
    if (!snapshot.node) {
      const empty = document.createElement("div");
      empty.className = "a2ui-empty";
      empty.textContent = "Surface 未找到或 Root 组件未定义";
      section.appendChild(empty);
    } else {
      const result = renderDomNode(snapshot.node, this.runtime);
      if (result) {
        section.appendChild(result.node);
        this.cleanup = result.cleanup;
      }
    }
    this.container.replaceChildren(section);
    restoreFocus(this.container, focus);
  }
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined)
    throw new Error(`DomSurfaceHost requires ${name} when runtime is omitted`);
  return value;
}
