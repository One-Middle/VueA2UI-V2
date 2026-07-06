<script setup lang="ts">
/**
 * Row 组件：水平 flex 容器，支持 distribution / alignment 属性。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 解析 distribution（justify-content） */
const distribution = computed(() => {
  const raw = ctx.componentModel.getProperty("distribution");
  return ctx.resolveValue(raw) ?? "start";
});

/** 解析 alignment（align-items） */
const alignment = computed(() => {
  const raw = ctx.componentModel.getProperty("alignment");
  return ctx.resolveValue(raw) ?? "stretch";
});

/** 静态 + 动态 children */
const childIds = computed(() => ctx.componentModel.getChildIds());
</script>

<template>
  <div
    class="a2ui-row"
    :data-component-id="componentId"
    :style="{
      justifyContent: distribution,
      alignItems: alignment,
    }"
  >
    <A2uiComponent
      v-for="childId in childIds"
      :key="childId"
      :surface-id="surfaceId"
      :component-id="childId"
    />
  </div>
</template>
