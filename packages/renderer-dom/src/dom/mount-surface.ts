/**
 * DOM Surface 的函数式挂载入口。
 *
 * 职责：
 * - 对外提供比 DomSurfaceHost 更轻量的 mountA2uiSurface API。
 * - 透传运行时、SurfaceGroup 与事件镜像配置。
 *
 * 引用：
 * - surface-host。
 * 被引用：
 * - 包入口与测试。
 * 注意：
 * - 本文件不保存全局状态；返回的 handle 由调用方负责 unmount。
 */
import { DomSurfaceHost, type DomSurfaceHandle } from "./surface-host";
import type {
  SurfaceGroupModel,
  SurfaceRuntime,
} from "@a2ui-platform/renderer-core";

/**
 * 挂载 DOM Surface 时的可选配置。
 *
 * @property runtime - 外部提供的运行时，适合需要共享运行时状态的宿主。
 * @property surfaceGroup - 未传入 runtime 时用于创建运行时的 SurfaceGroup。
 * @property surfaceId - 初始 Surface 标识。
 * @property mirrorEventsToWindow - 是否把渲染事件同步派发到 window。
 */
export interface MountA2uiSurfaceOptions {
  runtime?: SurfaceRuntime;
  surfaceGroup?: SurfaceGroupModel;
  surfaceId?: string;
  mirrorEventsToWindow?: boolean;
}

/**
 * 将一个 A2UI Surface 挂载到指定 DOM 容器。
 *
 * @param container - 承载渲染结果的 DOM 元素。
 * @param options - 运行时或 SurfaceGroup 等挂载配置。
 * @returns 可更新、可卸载的 Surface 控制句柄。
 */
export function mountA2uiSurface(
  container: HTMLElement,
  options: MountA2uiSurfaceOptions,
): DomSurfaceHandle {
  return new DomSurfaceHost({
    container,
    runtime: options.runtime,
    surfaceGroup: options.surfaceGroup,
    surfaceId: options.surfaceId,
    mirrorEventsToWindow: options.mirrorEventsToWindow,
  });
}

export type { DomSurfaceHandle };
