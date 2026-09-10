<script setup lang="ts">
/**
 * 普通水平布局组件。
 *
 * 职责：
 * - 通过 default slot 渲染子内容
 * - 根据普通布局 props 生成 flex 样式
 *
 * 不负责：解析 A2UI children 或 componentId。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  distribution?: string;
  alignment?: string;
  gap?: string;
  wrap?: boolean;
  role?: string;
  density?: string;
  divider?: string;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const classes = computed(() =>
  [
    "a2ui-row",
    props.role ? `a2ui-row--role-${props.role}` : "",
    props.density ? `a2ui-row--density-${props.density}` : "",
    props.divider ? `a2ui-row--divider-${props.divider}` : "",
    props.variant ? `a2ui-row--variant-${props.variant}` : "",
    props.size ? `a2ui-row--size-${props.size}` : "",
    props.tone ? `a2ui-row--tone-${props.tone}` : "",
    props.preset ? `a2ui-row--preset-${props.preset}` : "",
  ].filter(Boolean),
);
const rowStyle = computed<CSSProperties>(() => ({
  ...(props.style ?? {}),
  ...(props.gap ? { gap: props.gap } : {}),
  ...(props.wrap !== undefined
    ? { flexWrap: props.wrap ? "wrap" : "nowrap" }
    : {}),
  ...(props.distribution
    ? { justifyContent: toJustify(props.distribution) }
    : {}),
  ...(props.alignment ? { alignItems: toAlign(props.alignment) } : {}),
}));

function toJustify(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function toAlign(value: string): string {
  return value === "start" || value === "end" ? `flex-${value}` : value;
}
</script>

<template>
  <div :class="classes" :style="rowStyle">
    <slot />
  </div>
</template>
