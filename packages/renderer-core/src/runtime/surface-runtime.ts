import type { JsonObject, JsonValue } from "@a2ui-platform/shared";
import { DataContext } from "../core/data-context";
import { runActionScript } from "../core/js-runtime";
import type { RendererScriptAction } from "../core/action";
import type { SurfaceGroupModel, SurfaceModel } from "../core/surface-model";
import { buildRenderTree } from "../render/build-render-node";
import type { ComponentAddress, RenderEventIntent, RenderNode } from "../render/render-node";
import { ComponentStateStore, type ComponentState } from "./component-state-store";

export interface AdapterEvent {
  address: ComponentAddress;
  eventName: string;
  value?: unknown;
}

export interface RenderPlanSnapshot {
  revision: number;
  surfaceId: string;
  node: RenderNode | null;
}

export interface SurfaceRuntimeOptions {
  surfaceGroup: SurfaceGroupModel;
  surfaceId: string;
  onAction?: (event: { name: string; sourceComponentId: string; context: JsonObject }) => void;
  onError?: (error: { code: string; message: string; path?: string; sourceComponentId?: string }) => void;
}

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

  getSnapshot(): RenderPlanSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setSurfaceId(surfaceId: string): void {
    if (this.surfaceId === surfaceId) return;
    this.surfaceId = surfaceId;
    this.update();
  }

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
    this.snapshot = { revision: ++this.revision, surfaceId: this.surfaceId, node };
    for (const listener of this.listeners) listener();
  }

  dispatch(event: AdapterEvent): void {
    if (this.disposed || event.address.surfaceId !== this.surfaceId) return;
    const intent = findIntent(this.snapshot.node, event.address, event.eventName);
    if (!intent) return;
    if (intent.kind === "model-set") {
      this.currentSurface?.dataModel.set(intent.path, event.value as JsonValue);
      return;
    }
    if (intent.kind === "action-event") {
      this.emitAction({ name: intent.name, sourceComponentId: event.address.componentId, context: intent.context });
      return;
    }
    this.executeScript({
      action: intent.action,
      sourceComponentId: event.address.componentId,
      basePath: event.address.basePath,
      context: intent.context,
    });
  }

  stateFor(address: ComponentAddress): ComponentState {
    return this.states.stateFor(address);
  }

  setState<T>(address: ComponentAddress, field: string, value: T): void {
    this.states.stateFor(address).set(field, value);
    this.schedule();
  }

  requestUpdate(): void {
    this.schedule();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeGroup?.();
    this.unsubscribeSurface?.();
    this.syncData(null, []);
    this.states.clear();
    this.listeners.clear();
  }

  private schedule(): void {
    if (this.disposed || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      if (!this.scheduled || this.disposed) return;
      this.update();
    });
  }

  private syncSurface(surface: SurfaceModel | undefined): void {
    if (this.currentSurface === surface) return;
    this.unsubscribeSurface?.();
    this.syncData(null, []);
    this.states.clear();
    this.currentSurface = surface;
    this.unsubscribeSurface = surface?.subscribe(() => this.schedule());
  }

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
      this.dataSubscriptions.set(path, surface.dataModel.subscribe(path, () => this.schedule()));
    }
  }

  private emitAction(input: { name: string; sourceComponentId: string; context: JsonObject }): void {
    this.onAction?.(input);
  }

  private reportError(error: { code: string; message: string; path?: string; sourceComponentId?: string }): void {
    this.onError?.(error);
  }

  private executeScript(input: { action: RendererScriptAction; sourceComponentId: string; basePath: string; context: JsonObject }): void {
    const surface = this.currentSurface;
    if (!surface) return;
    try {
      runActionScript({
        script: input.action.script,
        dataContext: new DataContext(surface.dataModel, input.basePath),
        context: input.context,
        actions: { emit: (name, context) => this.emitAction({ name, sourceComponentId: input.sourceComponentId, context: context ?? {} }) },
      });
    } catch (error) {
      this.reportError({
        code: error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "SCRIPT_EXECUTION_ERROR",
        message: error instanceof Error ? error.message : "动作脚本执行失败。",
        sourceComponentId: input.sourceComponentId,
      });
    }
  }
}

function findIntent(node: RenderNode | null, address: ComponentAddress, eventName: string): RenderEventIntent | undefined {
  if (!node) return undefined;
  if (node.meta.componentId === address.componentId && node.meta.basePath === address.basePath) return node.events?.[eventName];
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
