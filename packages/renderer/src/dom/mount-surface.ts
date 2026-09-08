import { DomSurfaceHost, type DomSurfaceHandle } from "./surface-host";
import type { SurfaceGroupModel } from "../core/surface-model";

export interface MountA2uiSurfaceOptions {
  surfaceGroup: SurfaceGroupModel;
  surfaceId: string;
  mirrorEventsToWindow?: boolean;
}

export function mountA2uiSurface(
  container: HTMLElement,
  options: MountA2uiSurfaceOptions,
): DomSurfaceHandle {
  return new DomSurfaceHost({
    container,
    surfaceGroup: options.surfaceGroup,
    surfaceId: options.surfaceId,
    mirrorEventsToWindow: options.mirrorEventsToWindow,
  });
}

export type { DomSurfaceHandle };
