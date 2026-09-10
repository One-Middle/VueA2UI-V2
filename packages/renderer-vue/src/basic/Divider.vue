<script setup lang="ts">
/**
 * 普通分割线组件。
 *
 * 职责：
 * - 渲染水平或垂直分割线
 * - 支持标签、间距、颜色和线宽
 *
 * 不负责：解析 A2UI 协议或子组件。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  orientation?: string;
  thickness?: number;
  color?: string;
  spacing?: number;
  label?: string;
  labelAlign?: string;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const classes = computed(() =>
  [
    "a2ui-divider",
    props.orientation ? `a2ui-divider--${props.orientation}` : "",
    props.variant ? `a2ui-divider--variant-${props.variant}` : "",
    props.size ? `a2ui-divider--size-${props.size}` : "",
    props.tone ? `a2ui-divider--tone-${props.tone}` : "",
    props.preset ? `a2ui-divider--preset-${props.preset}` : "",
  ].filter(Boolean),
);
const dividerStyle = computed<CSSProperties>(() => ({
  ...(props.style ?? {}),
  ...(props.color ? { borderColor: props.color } : {}),
  ...(props.thickness ? { borderTopWidth: `${props.thickness}px` } : {}),
  ...(props.spacing !== undefined ? { margin: `${props.spacing}px 0` } : {}),
}));
</script>

<template>
  <div v-if="label" :class="classes" :style="dividerStyle">
    <span>{{ label }}</span>
  </div>
  <hr v-else :class="classes" :style="dividerStyle" />
</template>
