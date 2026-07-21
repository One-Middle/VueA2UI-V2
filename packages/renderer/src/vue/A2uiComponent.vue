<script setup lang="ts">
/**
 * A2uiComponent 组件：动态渲染单个 A2UI 组件。
 *
 * 根据 ComponentModel 的 componentType，从 catalogRegistry 中查找对应的
 * Vue 组件并渲染。通过 provide 向下传递 ComponentContext。
 */
import { computed, inject, provide } from "vue";
import type { JsonObject } from "@a2ui-platform/shared";
import type { SurfaceGroupModel } from "../core/surface-model";
import { DataContext } from "../core/data-context";
import { createActionMessage } from "../core/action";
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

/** 从上层注入 SurfaceGroupModel */
const surfaceGroup = inject<SurfaceGroupModel>("A2UI_SURFACE_GROUP");

/** 获取当前 surface */
const surfaceModel = computed(() => surfaceGroup?.get(props.surfaceId));

/** 获取当前 ComponentModel */
const componentModel = computed(() => surfaceModel.value?.components.get(props.componentId));

/** 获取当前 dataModel */
const dataModel = computed(() => surfaceModel.value?.dataModel);

/** 从注册表中查找对应的 Catalog 组件 */
const catalogComponent = computed(() => {
  const cm = componentModel.value;
  if (!cm) return null;
  return catalogRegistry.get(cm.componentType) ?? null;
});

/** 构建当前组件的 ComponentContext */
const componentContext = computed<ComponentContext | null>(() => {
  const cm = componentModel.value;
  const dm = dataModel.value;
  if (!cm || !dm) return null;

  const dataCtx = new DataContext(dm, props.basePath);

  return {
    componentModel: cm,
    dataContext: dataCtx,
    surfaceId: props.surfaceId,
    resolveValue(raw: unknown): unknown {
      return dataCtx.resolve(raw);
    },
    dispatchAction(name: string, context: JsonObject): void {
      const detail = createActionMessage({
        name,
        surfaceId: props.surfaceId,
        sourceComponentId: props.componentId,
        context,
      });
      window.dispatchEvent(new CustomEvent("a2ui:action", { detail }));
    },
    createSetter(path: string): (value: unknown) => void {
      return (value: unknown) => {
        dataCtx.set(path, value as any);
      };
    },
  };
});

/** 提供 ComponentContext 给子组件 */
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
  dispatchAction(name: string, context: JsonObject): void {
    requireComponentContext().dispatchAction(name, context);
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
