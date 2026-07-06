<script setup lang="ts">
/**
 * Text 组件：渲染文本内容，支持 h1-h5 / body / caption。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 解析 text 属性 */
const text = computed(() => {
  const raw = ctx.componentModel.getProperty("text");
  return ctx.resolveValue(raw) ?? "";
});

/** usageHint 决定渲染标签 */
const usageHint = computed(() => {
  const raw = ctx.componentModel.getProperty("usageHint");
  return ctx.resolveValue(raw) ?? "body";
});

/** 标签映射 */
const tagMap: Record<string, string> = {
  h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5",
  body: "p", caption: "span",
};
const tag = computed(() => tagMap[usageHint.value as string] ?? "p");
</script>

<template>
  <component
    :is="tag"
    :class="`a2ui-text-${usageHint}`"
    :data-component-id="componentId"
  >{{ text }}</component>
</template>
