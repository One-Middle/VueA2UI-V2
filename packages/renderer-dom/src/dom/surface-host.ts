import type { SurfaceGroupModel, SurfaceRuntime } from "@a2ui-platform/renderer-core";
import { SurfaceRuntime as Runtime } from "@a2ui-platform/renderer-core";
import { renderDomNode } from "../render/dom-renderer";
import { dispatchRendererAction, dispatchRendererError } from "./events";
import { captureFocus, restoreFocus } from "./focus-restoration";

export interface DomSurfaceHostOptions {
  container: HTMLElement;
  runtime?: SurfaceRuntime;
  surfaceGroup?: SurfaceGroupModel;
  surfaceId?: string;
  mirrorEventsToWindow?: boolean;
}

export interface DomSurfaceHandle { update(): void; unmount(): void; }

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
    this.runtime = options.runtime ?? new Runtime({
      surfaceGroup: required(options.surfaceGroup, "surfaceGroup"),
      surfaceId: options.surfaceId ?? "main",
      onAction: (action) => dispatchRendererAction({ target: this.container, mirrorToWindow: this.mirrorEventsToWindow, surfaceId: this.runtime.getSnapshot().surfaceId, ...action }),
      onError: (error) => dispatchRendererError({ target: this.container, mirrorToWindow: this.mirrorEventsToWindow, surfaceId: this.runtime.getSnapshot().surfaceId, ...error }),
    });
    this.unsubscribe = this.runtime.subscribe(() => this.render());
    this.render();
  }

  update(): void { this.runtime.update(); }

  setSurfaceId(surfaceId: string): void {
    this.runtime.setSurfaceId(surfaceId);
  }

  unmount(): void {
    this.cleanup?.();
    this.unsubscribe?.();
    if (this.ownsRuntime) this.runtime.dispose();
    this.container.replaceChildren();
  }

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
  if (value === undefined) throw new Error(`DomSurfaceHost requires ${name} when runtime is omitted`);
  return value;
}
