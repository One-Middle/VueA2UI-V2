<script setup lang="ts">
/**
 * Text 组件：渲染文本内容，支持 h1-h5 / body / caption。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import {
  resolveStringProp,
  resolveVisualClasses,
  resolveVisualStyle,
} from "./visual-props";

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

const maxLines = computed(() => {
  const raw = ctx.componentModel.getProperty("maxLines");
  const value = Number(ctx.resolveValue(raw));
  return Number.isFinite(value) && value > 0 ? value : undefined;
});

const decoration = computed(() => resolveStringProp(ctx, "decoration") || "none");

const role = computed(() => resolveStringProp(ctx, "role") || "default");

const emphasis = computed(() => resolveStringProp(ctx, "emphasis") || "default");

const shouldTruncate = computed(() => {
  const raw = ctx.componentModel.getProperty("truncate");
  return ctx.resolveValue(raw) === true;
});

const textClasses = computed(() => [
  `a2ui-text-${usageHint.value}`,
  ...resolveVisualClasses(ctx, "a2ui-text"),
  `a2ui-text--decoration-${decoration.value}`,
  `a2ui-text--role-${role.value}`,
  `a2ui-text--emphasis-${emphasis.value}`,
  {
    "a2ui-text--truncate": shouldTruncate.value,
  },
]);

const textStyle = computed(() => ({
  ...resolveVisualStyle(ctx),
  ...(maxLines.value
    ? {
        display: "-webkit-box",
        WebkitLineClamp: maxLines.value,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }
    : {}),
  ...(shouldTruncate.value && !maxLines.value
    ? {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }
    : {}),
}));
</script>

<template>
  <component
    :is="tag"
    :class="textClasses"
    :style="textStyle"
    :data-component-id="componentId"
  >{{ text }}</component>
</template>
