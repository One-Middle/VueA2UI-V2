import type { SurfaceGroupModel } from "@a2ui-platform/renderer-core";

const registry = new Map<string, SurfaceGroupModel>();

export function registerA2uiSurfaceGroup(
  name: string,
  surfaceGroup: SurfaceGroupModel,
): void {
  registry.set(name, surfaceGroup);
}

export function getA2uiSurfaceGroup(
  name: string,
): SurfaceGroupModel | undefined {
  return registry.get(name);
}

export function unregisterA2uiSurfaceGroup(name: string): void {
  registry.delete(name);
}
