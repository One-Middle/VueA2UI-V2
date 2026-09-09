<script setup lang="ts">
/**
 * 普通网格布局组件。
 *
 * 职责：
 * - 通过 default slot 渲染网格项
 * - 根据普通 props 生成 CSS grid 样式
 *
 * 不负责：解析动态 List item 或 componentId。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  columns?: unknown;
  minItemWidth?: string;
  gap?: string;
  density?: string;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const classes = computed(() =>
  [
    "a2ui-grid",
    props.density ? `a2ui-grid--density-${props.density}` : "",
    props.variant ? `a2ui-grid--variant-${props.variant}` : "",
    props.size ? `a2ui-grid--size-${props.size}` : "",
    props.tone ? `a2ui-grid--tone-${props.tone}` : "",
    props.preset ? `a2ui-grid--preset-${props.preset}` : "",
  ].filter(Boolean),
);
const gridStyle = computed<CSSProperties>(() => {
  const columns = props.columns;
  const template =
    columns === "auto" || columns === undefined
      ? `repeat(auto-fit, minmax(${props.minItemWidth || "220px"}, 1fr))`
      : `repeat(${Number(columns) || 1}, minmax(0, 1fr))`;
  return {
    ...(props.style ?? {}),
    gridTemplateColumns: template,
    ...(props.gap ? { gap: props.gap } : {}),
  };
});
</script>

<template>
  <div :class="classes" :style="gridStyle">
    <slot />
  </div>
</template>
