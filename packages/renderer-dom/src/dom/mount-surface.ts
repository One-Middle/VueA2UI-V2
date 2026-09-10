import { DomSurfaceHost, type DomSurfaceHandle } from "./surface-host";
import type { SurfaceGroupModel, SurfaceRuntime } from "@a2ui-platform/renderer-core";

export interface MountA2uiSurfaceOptions {
  runtime?: SurfaceRuntime;
  surfaceGroup?: SurfaceGroupModel;
  surfaceId?: string;
  mirrorEventsToWindow?: boolean;
}

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
