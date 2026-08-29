<script setup lang="ts">
/**
 * 普通页面容器组件。
 *
 * 职责：
 * - 通过 default slot 渲染区块内容
 * - 应用宽度、内边距和对齐样式类
 *
 * 不负责：解析 A2UI child 字段。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  width?: string;
  padding?: string;
  align?: string;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const classes = computed(() =>
  [
    "a2ui-container",
    props.width ? `a2ui-container--width-${props.width}` : "",
    props.padding ? `a2ui-container--padding-${props.padding}` : "",
    props.align ? `a2ui-container--align-${props.align}` : "",
    props.variant ? `a2ui-container--variant-${props.variant}` : "",
    props.size ? `a2ui-container--size-${props.size}` : "",
    props.tone ? `a2ui-container--tone-${props.tone}` : "",
    props.preset ? `a2ui-container--preset-${props.preset}` : "",
  ].filter(Boolean),
);
</script>

<template>
  <div :class="classes" :style="style">
    <slot />
  </div>
</template>
