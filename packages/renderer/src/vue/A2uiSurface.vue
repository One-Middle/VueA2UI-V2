<script setup lang="ts">
/**
 * A2uiSurface 组件：渲染一个 A2UI Surface。
 *
 * 职责：
 * - 从 SurfaceGroupModel 获取指定 surface
 * - 构建 RenderNode tree 并交给 Vue renderer 渲染
 * - 在 surface 层同步 RenderNode 构建依赖的 DataModel 订阅
 *
 * 不负责：通过 provide/inject 向普通 UI 组件传递 A2UI context。
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { JsonObject } from "@a2ui-platform/shared";
import type { SurfaceGroupModel, SurfaceModel } from "../core/surface-model";
import { DataContext } from "../core/data-context";
import { createActionMessage, type RendererScriptAction } from "../core/action";
import { runActionScript as executeActionScript } from "../core/js-runtime";
import { RenderDependencyCollector } from "../render/dependency-collector";
import type { RenderContext } from "../render/render-context";
import { buildRenderTree } from "../render/build-render-node";
import RenderRoot from "./RenderRoot";

const props = defineProps<{
  /** 要渲染的 Surface ID */
  surfaceId: string;
  /** 从上层传入的 SurfaceGroupModel 实例 */
  surfaceGroup: SurfaceGroupModel;
}>();

const surfaceModel = computed(() => props.surfaceGroup.get(props.surfaceId));
const renderRevision = ref(0);
const subscriptions = new Map<string, () => void>();

const renderContext = computed<RenderContext | null>(() => {
  const surface = surfaceModel.value;
  if (!surface) return null;
  return createRenderContext(surface);
});

const buildResult = computed(() => {
  renderRevision.value;
  const surface = surfaceModel.value;
  if (!surface || !surface.components.has("root")) {
    return { node: null, dependencies: [] };
  }

  return buildRenderTree({
    surfaceModel: surface,
    rootComponentId: "root",
    basePath: "/",
    dispatchError,
    emitAction,
    runActionScript,
  });
});

watch(
  () => buildResult.value.dependencies,
  (dependencies) => {
    const surface = surfaceModel.value;
    if (!surface) {
      syncSubscriptions(null, []);
      return;
    }
    syncSubscriptions(surface, dependencies);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  syncSubscriptions(null, []);
});

function createRenderContext(surface: SurfaceModel): RenderContext {
  return {
    surfaceModel: surface,
    surfaceId: surface.surfaceId,
    basePath: "/",
    dependencies: new RenderDependencyCollector(),
    dispatchError,
    emitAction,
    runActionScript,
  };
}

function syncSubscriptions(
  surface: SurfaceModel | null,
  dependencies: string[],
): void {
  const next = new Set(dependencies);

  for (const [path, unsubscribe] of subscriptions) {
    if (!next.has(path)) {
      unsubscribe();
      subscriptions.delete(path);
    }
  }

  if (!surface) return;

  for (const path of next) {
    if (subscriptions.has(path)) continue;
    subscriptions.set(
      path,
      surface.dataModel.subscribe(path, () => {
        renderRevision.value++;
      }),
    );
  }
}

function emitAction(input: {
  name: string;
  sourceComponentId: string;
  context: JsonObject;
}): void {
  const detail = createActionMessage({
    name: input.name,
    surfaceId: props.surfaceId,
    sourceComponentId: input.sourceComponentId,
    context: input.context,
  });
  window.dispatchEvent(new CustomEvent("a2ui:action", { detail }));
}

function runActionScript(input: {
  action: RendererScriptAction;
  sourceComponentId: string;
  basePath: string;
  context: JsonObject;
}): void {
  const surface = surfaceModel.value;
  if (!surface) return;
  try {
    executeActionScript({
      script: input.action.script,
      dataContext: new DataContext(surface.dataModel, input.basePath),
      context: input.context,
      actions: {
        emit: (name, context) => {
          emitAction({
            name,
            sourceComponentId: input.sourceComponentId,
            context: context ?? {},
          });
        },
      },
    });
  } catch (error) {
    dispatchError({
      ...toRendererError(error),
      sourceComponentId: input.sourceComponentId,
    });
  }
}

function dispatchError(input: {
  code: string;
  message: string;
  path?: string;
  sourceComponentId?: string;
}): void {
  const detail = {
    version: "v0.9",
    error: {
      code: input.code,
      surfaceId: props.surfaceId,
      path: input.path,
      message: input.message,
      sourceComponentId: input.sourceComponentId,
    },
  };
  window.dispatchEvent(new CustomEvent("a2ui:error", { detail }));
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
</script>

<template>
  <section class="a2ui-surface" :data-surface-id="surfaceId">
    <div v-if="!surfaceModel" class="a2ui-empty">
      Surface 未找到：{{ surfaceId }}
    </div>

    <div v-else-if="!surfaceModel.components.has('root')" class="a2ui-empty">
      Root 组件未定义
    </div>

    <RenderRoot
      v-else-if="renderContext"
      :node="buildResult.node"
      :render-context="renderContext"
    />
  </section>
</template>
