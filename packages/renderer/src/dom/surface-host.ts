import type { JsonObject } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import type { RendererScriptAction } from "../core/action";
import { runActionScript as executeActionScript } from "../core/js-runtime";
import type { SurfaceGroupModel, SurfaceModel } from "../core/surface-model";
import { RenderDependencyCollector } from "../render/dependency-collector";
import { buildRenderTree } from "../render/build-render-node";
import { renderDomNode, type DomRenderContext } from "../render/dom-renderer";
import type { DomRenderResult } from "../ui/dom-basic/types";
import { dispatchRendererAction, dispatchRendererError } from "./events";
import { captureFocus, restoreFocus } from "./focus-restoration";
import { DomStateStore } from "./state-store";

export interface DomSurfaceHostOptions {
  container: HTMLElement;
  surfaceGroup: SurfaceGroupModel;
  surfaceId: string;
  mirrorEventsToWindow?: boolean;
}

export interface DomSurfaceHandle {
  update(): void;
  unmount(): void;
}

export class DomSurfaceHost implements DomSurfaceHandle {
  private readonly container: HTMLElement;
  private readonly surfaceGroup: SurfaceGroupModel;
  private readonly stateStore = new DomStateStore();
  private readonly dataSubscriptions = new Map<string, () => void>();
  private readonly mirrorEventsToWindow: boolean;
  private surfaceId: string;
  private cleanupCurrentRender: (() => void) | undefined;
  private unsubscribeSurfaceGroup: (() => void) | undefined;
  private unsubscribeSurface: (() => void) | undefined;
  private currentSurface: SurfaceModel | undefined;
  private scheduled = false;
  private unmounted = false;

  constructor(options: DomSurfaceHostOptions) {
    this.container = options.container;
    this.surfaceGroup = options.surfaceGroup;
    this.surfaceId = options.surfaceId;
    this.mirrorEventsToWindow = options.mirrorEventsToWindow ?? false;
    this.unsubscribeSurfaceGroup = this.surfaceGroup.subscribe(() => {
      this.scheduleUpdate();
    });
    this.update();
  }

  setSurfaceId(surfaceId: string): void {
    if (this.surfaceId === surfaceId) return;
    this.surfaceId = surfaceId;
    this.update();
  }

  update(): void {
    if (this.unmounted) return;
    this.scheduled = false;
    const focus = captureFocus(this.container);
    this.cleanupCurrentRender?.();
    this.cleanupCurrentRender = undefined;

    const surface = this.surfaceGroup.get(this.surfaceId);
    this.syncSurfaceSubscription(surface);

    const section = document.createElement("section");
    section.className = "a2ui-surface";
    section.dataset.surfaceId = this.surfaceId;

    if (!surface) {
      section.appendChild(this.empty(`Surface 未找到：${this.surfaceId}`));
      this.syncDataSubscriptions(null, []);
      this.replaceContents(section);
      restoreFocus(this.container, focus);
      return;
    }

    if (!surface.components.has("root")) {
      section.appendChild(this.empty("Root 组件未定义"));
      this.syncDataSubscriptions(surface, []);
      this.replaceContents(section);
      restoreFocus(this.container, focus);
      return;
    }

    const buildResult = buildRenderTree({
      surfaceModel: surface,
      rootComponentId: "root",
      basePath: "/",
      dispatchError: (error) => this.dispatchError(error),
      emitAction: (action) => this.emitAction(action),
      runActionScript: (script) => this.runActionScript(script),
    });
    this.syncDataSubscriptions(surface, buildResult.dependencies);

    const context = this.createRenderContext(surface);
    const rendered = renderDomNode(buildResult.node, context);
    if (rendered) {
      section.appendChild(rendered.node);
      this.cleanupCurrentRender = rendered.cleanup;
    }
    this.replaceContents(section);
    restoreFocus(this.container, focus);
  }

  unmount(): void {
    if (this.unmounted) return;
    this.unmounted = true;
    this.scheduled = false;
    this.cleanupCurrentRender?.();
    this.cleanupCurrentRender = undefined;
    this.unsubscribeSurfaceGroup?.();
    this.unsubscribeSurface?.();
    this.syncDataSubscriptions(null, []);
    this.stateStore.clear();
    this.container.replaceChildren();
  }

  private scheduleUpdate(): void {
    if (this.unmounted || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      if (!this.scheduled || this.unmounted) return;
      this.update();
    });
  }

  private createRenderContext(surface: SurfaceModel): DomRenderContext {
    return {
      surfaceModel: surface,
      surfaceId: surface.surfaceId,
      basePath: "/",
      dependencies: new RenderDependencyCollector(),
      stateStore: this.stateStore,
      dispatchError: (error) => this.dispatchError(error),
      emitAction: (action) => this.emitAction(action),
      runActionScript: (script) => this.runActionScript(script),
      requestRender: () => this.scheduleUpdate(),
    };
  }

  private syncSurfaceSubscription(surface: SurfaceModel | undefined): void {
    if (this.currentSurface === surface) return;
    this.unsubscribeSurface?.();
    // Paths belong to a model instance, not just a surface id.
    this.syncDataSubscriptions(null, []);
    this.stateStore.clear();
    this.currentSurface = surface;
    this.unsubscribeSurface = surface?.subscribe(() => {
      this.scheduleUpdate();
    });
  }

  private syncDataSubscriptions(
    surface: SurfaceModel | null,
    dependencies: string[],
  ): void {
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
        surface.dataModel.subscribe(path, () => {
          this.scheduleUpdate();
        }),
      );
    }
  }

  private replaceContents(section: HTMLElement): void {
    this.container.replaceChildren(section);
  }

  private empty(message: string): HTMLElement {
    const empty = document.createElement("div");
    empty.className = "a2ui-empty";
    empty.textContent = message;
    return empty;
  }

  private emitAction(input: {
    name: string;
    sourceComponentId: string;
    context: JsonObject;
  }): void {
    dispatchRendererAction({
      target: this.container,
      mirrorToWindow: this.mirrorEventsToWindow,
      surfaceId: this.surfaceId,
      sourceComponentId: input.sourceComponentId,
      name: input.name,
      context: input.context,
    });
  }

  private dispatchError(input: {
    code: string;
    message: string;
    path?: string;
    sourceComponentId?: string;
  }): void {
    dispatchRendererError({
      target: this.container,
      mirrorToWindow: this.mirrorEventsToWindow,
      surfaceId: this.surfaceId,
      code: input.code,
      message: input.message,
      path: input.path,
      sourceComponentId: input.sourceComponentId,
    });
  }

  private runActionScript(input: {
    action: RendererScriptAction;
    sourceComponentId: string;
    basePath: string;
    context: JsonObject;
  }): void {
    const surface = this.surfaceGroup.get(this.surfaceId);
    if (!surface) return;
    try {
      executeActionScript({
        script: input.action.script,
        dataContext: new DataContext(surface.dataModel, input.basePath),
        context: input.context,
        actions: {
          emit: (name, context) => {
            this.emitAction({
              name,
              sourceComponentId: input.sourceComponentId,
              context: context ?? {},
            });
          },
        },
      });
    } catch (error) {
      this.dispatchError({
        ...toRendererError(error),
        sourceComponentId: input.sourceComponentId,
      });
    }
  }
}

function toRendererError(error: unknown): {
  code: string;
  message: string;
  path?: string;
} {
  return {
    code:
      error instanceof Error && "code" in error
        ? String((error as { code: unknown }).code)
        : "SCRIPT_EXECUTION_ERROR",
    message: error instanceof Error ? error.message : "动作脚本执行失败。",
  };
}
