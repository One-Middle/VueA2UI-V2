import "./styles.css";

export * from "./ui/dom-basic";
export { renderDomNode } from "./render/dom-renderer";
export { mountA2uiSurface } from "./dom/mount-surface";
export type { DomSurfaceHandle, MountA2uiSurfaceOptions } from "./dom/mount-surface";
export { DomSurfaceHost } from "./dom/surface-host";
export type { DomSurfaceHostOptions } from "./dom/surface-host";
export { registerA2uiSurfaceGroup, getA2uiSurfaceGroup, unregisterA2uiSurfaceGroup } from "./dom/surface-group-registry";
export { A2uiSurfaceElement, defineA2uiSurfaceElement } from "./dom/web-component";
