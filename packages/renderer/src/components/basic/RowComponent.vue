<script setup lang="ts">
/**
 * Row 组件：水平 flex 容器，支持 distribution / alignment 属性。
 */
import { computed, inject } from "vue";
import type { CSSProperties } from "vue";
import { componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";

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

const rowStyle = computed<CSSProperties>(() => ({
  justifyContent: justifyContentMap[distribution.value] ?? "flex-start",
  alignItems: alignItemsMap[alignment.value] ?? "stretch",
}));
</script>

<template>
  <div
    class="a2ui-row"
    :data-component-id="componentId"
    :style="rowStyle"
  >
    <A2uiComponent
      v-for="childId in childIds"
      :key="childId"
      :surface-id="surfaceId"
      :component-id="childId"
    />
  </div>
</template>
