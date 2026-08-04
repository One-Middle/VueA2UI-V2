<script setup lang="ts">
/**
 * Column 组件：垂直 flex 容器，支持 distribution / alignment 属性。
 */
import { computed, inject } from "vue";
import type { CSSProperties } from "vue";
import { componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";
import {
  resolveBooleanProp,
  resolveStringProp,
  resolveVisualClasses,
  resolveVisualStyle,
} from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

const justifyContentMap: Record<string, CSSProperties["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  spaceBetween: "space-between",
  spaceAround: "space-around",
  spaceEvenly: "space-evenly",
};

const alignItemsMap: Record<string, CSSProperties["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

/** 解析 distribution（justify-content） */
const distribution = computed(() => {
  const raw = ctx.componentModel.getProperty("distribution");
  return String(ctx.resolveValue(raw) ?? "start");
});

/** 解析 alignment（align-items） */
const alignment = computed(() => {
  const raw = ctx.componentModel.getProperty("alignment");
  return String(ctx.resolveValue(raw) ?? "stretch");
});

/** 静态 + 动态 children */
const childIds = computed(() => ctx.componentModel.getChildIds());

const role = computed(() => resolveStringProp(ctx, "role") || "default");

const density = computed(() => resolveStringProp(ctx, "density") || "comfortable");

const divider = computed(() => resolveStringProp(ctx, "divider") || "none");

const columnStyle = computed<CSSProperties>(() => ({
  ...resolveVisualStyle(ctx),
  justifyContent: justifyContentMap[distribution.value] ?? "flex-start",
  alignItems: alignItemsMap[alignment.value] ?? "stretch",
  ...(resolveStringProp(ctx, "gap") ? { gap: resolveStringProp(ctx, "gap") } : {}),
  flexWrap: resolveBooleanProp(ctx, "wrap") ? "wrap" : "nowrap",
}));

const columnClasses = computed(() => [
  "a2ui-column",
  ...resolveVisualClasses(ctx, "a2ui-column"),
  `a2ui-column--role-${role.value}`,
  `a2ui-column--density-${density.value}`,
  `a2ui-column--divider-${divider.value}`,
]);
</script>

<template>
  <div
    class="a2ui-column"
    :class="columnClasses"
    :data-component-id="componentId"
    :style="columnStyle"
  >
    <A2uiComponent
      v-for="childId in childIds"
      :key="childId"
      :surface-id="surfaceId"
      :component-id="childId"
      :base-path="ctx.dataContext.basePath"
    />
  </div>
</template>
