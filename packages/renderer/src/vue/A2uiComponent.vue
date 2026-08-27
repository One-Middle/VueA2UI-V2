<script setup lang="ts">
/**
 * A2uiComponent 组件：动态渲染单个 A2UI 组件。
 *
 * 职责：
 * - 作为 A2UI 组件树的递归渲染入口，根据 componentId 定位当前组件模型。
 * - 根据 ComponentModel.componentType 从 catalogRegistry 查找实际 Vue 组件。
 * - 为当前节点构建 ComponentContext，并通过 provide 传给 Basic Catalog 组件。
 * - 统一处理动态属性、属性脚本依赖订阅、action 派发和 renderer error 派发。
 *
 * 注意：
 * - 容器组件不会直接 import 具体子组件，而是继续渲染 A2uiComponent，实现统一递归分发。
 * - Renderer 只通过浏览器 CustomEvent 通知宿主前端，不在这里调用后端 API。
 */
import { computed, inject, onBeforeUnmount, provide, ref } from "vue";
import type { JsonObject } from "@a2ui-platform/shared";
import type { SurfaceGroupModel } from "../core/surface-model";
import { DataContext } from "../core/data-context";
import { createActionMessage, type RendererScriptAction } from "../core/action";
import { resolveDynamicValue, resolveScriptDeps } from "../core/dynamic-value";
import { runActionScript as executeActionScript } from "../core/js-runtime";
import { catalogRegistry } from "../catalog-registry";
import { type ComponentContext, componentContextKey } from "./context";

const props = defineProps<{
  /** 所属 Surface ID */
  surfaceId: string;
  /** 当前组件 ID */
  componentId: string;
  /** 当前组件读取相对 dataModel 路径时使用的数据作用域 */
  basePath?: string;
}>();

/** 从 A2uiSurface 注入全局 surface 集合；递归渲染时所有节点共享同一组 surface 状态。 */
const surfaceGroup = inject<SurfaceGroupModel>("A2UI_SURFACE_GROUP");

/**
 * 获取当前节点所属的 surface。
 *
 * 递归渲染的第一层由 A2uiSurface 传入 surfaceId，后续子节点沿用同一个 surfaceId。
 * 这里使用 computed，保证 surface 被删除或重建时，fallback 状态能自动刷新。
 */
const surfaceModel = computed(() => surfaceGroup?.get(props.surfaceId));

/**
 * 获取当前 componentId 对应的组件模型。
 *
 * ComponentModel 保存 A2UI 原始组件声明中的 component 类型和 props。
 * A2uiComponent 每递归一层都会重新按 componentId 查表，因此容器组件只需要传 child id。
 */
const componentModel = computed(() => surfaceModel.value?.components.get(props.componentId));

/** 获取当前 surface 的 dataModel，动态属性、表单写回和 action.script 都基于它工作。 */
const dataModel = computed(() => surfaceModel.value?.dataModel);

/**
 * 属性脚本依赖变化时递增，用于触发依赖当前上下文的 computed 重新求值。
 *
 * resolveValue 里会读取 scriptRevision.value，但不直接使用其值；这样 Vue 会建立依赖。
 * 当 DataModel 订阅回调递增 revision 后，Text.text.script、style 字段脚本等会重新执行。
 */
const scriptRevision = ref(0);

/** 当前组件已注册的脚本依赖订阅；key 是规整后的绝对 JSON Pointer 路径。 */
const scriptSubscriptions = new Map<string, () => void>();

/**
 * 从 Catalog 注册表查找当前 A2UI 组件类型对应的 Vue 实现。
 *
 * 例如 componentType 为 "Column" 时会得到 ColumnComponent.vue；
 * 如果类型未注册，模板层会显示统一 fallback，而不是让渲染树崩掉。
 */
const catalogComponent = computed(() => {
  const cm = componentModel.value;
  if (!cm) return null;
  return catalogRegistry.get(cm.componentType) ?? null;
});

/**
 * 构建当前组件节点自己的 ComponentContext。
 *
 * 每个 A2uiComponent 实例都对应 A2UI 树上的一个节点，因此上下文必须绑定当前 componentId、
 * surfaceId 和 basePath。Basic Catalog 组件通过 inject 获取该上下文，再读取 props、
 * 解析动态值、渲染子组件或派发交互事件。
 */
const componentContext = computed<ComponentContext | null>(() => {
  const cm = componentModel.value;
  const dm = dataModel.value;
  if (!cm || !dm) return null;

  // basePath 用于 List item 等场景；相对路径会基于它解析到当前数据作用域。
  const dataCtx = new DataContext(dm, props.basePath);

  return {
    componentModel: cm,
    dataContext: dataCtx,
    surfaceId: props.surfaceId,
    resolveValue(raw: unknown): unknown {
      // 读取 revision 是为了让调用 resolveValue 的 computed 跟随属性脚本依赖变化而刷新。
      scriptRevision.value;
      return resolveDynamicValue({
        value: raw,
        dataContext: dataCtx,
        // 属性脚本声明 deps 后，在这里注册 DataModel 订阅，避免每次全量刷新组件树。
        registerScriptDeps: (deps) => registerScriptDeps(deps, dataCtx),
        onError: dispatchRendererError,
      });
    },
    registerScriptDeps(deps: string[]): void {
      registerScriptDeps(deps, dataCtx);
    },
    dispatchError(error: { code: string; message: string; path?: string }): void {
      dispatchRendererError(error);
    },
    dispatchAction(name: string, context: JsonObject): void {
      emitAction(name, context);
    },
    runActionScript(action: RendererScriptAction, context: JsonObject): void {
      try {
        // action.script 只拿到受控能力：当前 DataContext 和 actions.emit，不开放 DOM 或后端调用。
        executeActionScript({
          script: action.script,
          dataContext: dataCtx,
          context,
          actions: {
            emit: emitAction,
          },
        });
      } catch (error) {
        dispatchRendererError(toRendererError(error));
      }
    },
    createSetter(path: string): (value: unknown) => void {
      return (value: unknown) => {
        // 表单类 Basic 组件用 setter 写回 dataModel；相对路径由 DataContext 统一处理。
        dataCtx.set(path, value as any);
      };
    },
  };
});

/**
 * 提供给 Basic Catalog 组件的上下文代理。
 *
 * provide/inject 传递的是对象引用；如果直接 provide computed 里的当前值，后续 componentModel
 * 或 dataContext 变化时，已注入的组件可能拿到旧对象。这里用 getter 和方法代理到
 * requireComponentContext()，保证调用时总是读取最新的 computed 上下文。
 */
const contextProxy: ComponentContext = {
  get componentModel() {
    return requireComponentContext().componentModel;
  },
  get dataContext() {
    return requireComponentContext().dataContext;
  },
  get surfaceId() {
    return requireComponentContext().surfaceId;
  },
  resolveValue(raw: unknown): unknown {
    return requireComponentContext().resolveValue(raw);
  },
  registerScriptDeps(deps: string[]): void {
    requireComponentContext().registerScriptDeps(deps);
  },
  dispatchError(error: { code: string; message: string; path?: string }): void {
    requireComponentContext().dispatchError(error);
  },
  dispatchAction(name: string, context: JsonObject): void {
    requireComponentContext().dispatchAction(name, context);
  },
  runActionScript(action: RendererScriptAction, context: JsonObject): void {
    requireComponentContext().runActionScript(action, context);
  },
  createSetter(path: string): (value: unknown) => void {
    return requireComponentContext().createSetter(path);
  },
};

function requireComponentContext(): ComponentContext {
  const ctx = componentContext.value;
  if (!ctx) {
    throw new Error(`A2UI component context is unavailable: ${props.componentId}`);
  }
  return ctx;
}

provide(componentContextKey, contextProxy);

// 组件卸载时取消当前节点注册过的 dataModel 订阅，避免递归列表增删后留下无效回调。
onBeforeUnmount(() => {
  for (const unsubscribe of scriptSubscriptions.values()) {
    unsubscribe();
  }
  scriptSubscriptions.clear();
});

function registerScriptDeps(deps: string[], dataCtx: DataContext): void {
  // deps 可能是相对路径；订阅前必须基于当前 DataContext 规整为绝对 JSON Pointer。
  for (const path of resolveScriptDeps(deps, dataCtx)) {
    // 同一路径只订阅一次，避免同一个属性在多次求值时重复注册回调。
    if (scriptSubscriptions.has(path)) continue;
    const unsubscribe = dataCtx.dataModel.subscribe(path, () => {
      scriptRevision.value++;
    });
    scriptSubscriptions.set(path, unsubscribe);
  }
}

function emitAction(name: string, context: JsonObject): void {
  // Renderer 只负责组装标准 A2UI client message，并通过浏览器事件交给宿主前端。
  const detail = createActionMessage({
    name,
    surfaceId: props.surfaceId,
    sourceComponentId: props.componentId,
    context,
  });
  window.dispatchEvent(new CustomEvent("a2ui:action", { detail }));
}

function dispatchRendererError(input: { code: string; message: string; path?: string }): void {
  // 错误同样走 CustomEvent 边界，后续记录、展示或上报由 frontend 宿主决定。
  const detail = {
    version: "v0.9",
    error: {
      code: input.code,
      surfaceId: props.surfaceId,
      path: input.path,
      message: input.message,
      sourceComponentId: props.componentId,
    },
  };
  window.dispatchEvent(new CustomEvent("a2ui:error", { detail }));
}

function toRendererError(error: unknown): { code: string; message: string; path?: string } {
  // JSRuntime 抛出的错误可能带 code；普通异常统一归类为脚本执行错误。
  return {
    code: error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "SCRIPT_EXECUTION_ERROR",
    message: error instanceof Error ? error.message : "动作脚本执行失败。",
  };
}
</script>

<template>
  <template v-if="componentContext && catalogComponent">
    <!-- 根据组件类型动态渲染对应 Catalog 组件 -->
    <component :is="catalogComponent" :surface-id="surfaceId" :component-id="componentId" />
  </template>

  <!-- 组件未找到 -->
  <div v-else-if="!componentModel" class="a2ui-fallback" :data-component-id="componentId">
    组件未找到：{{ componentId }}
  </div>

  <!-- 组件类型未注册 -->
  <div v-else-if="!catalogComponent" class="a2ui-fallback" :data-component-id="componentId">
    未注册的组件类型：{{ componentModel?.componentType }}
  </div>

  <!-- 上下文缺失 -->
  <div v-else class="a2ui-fallback" :data-component-id="componentId">
    上下文缺失
  </div>
</template>
