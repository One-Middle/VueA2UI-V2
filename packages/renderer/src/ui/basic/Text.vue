<script setup lang="ts">
/**
 * 普通文本显示组件。
 *
 * 职责：
 * - 根据普通 props 渲染文本内容和文本样式类
 * - 支持外部传入受控 style
 *
 * 不负责：解析 A2UI `{ path }`、属性脚本或 ComponentModel。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  text?: unknown;
  usageHint?: string;
  maxLines?: number;
  decoration?: string;
  emphasis?: string;
  role?: string;
  truncate?: boolean;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const tag = computed(() =>
  props.usageHint && /^h[1-5]$/.test(props.usageHint) ? props.usageHint : "p",
);
const textClass = computed(() =>
  [
    `a2ui-text-${props.usageHint || "body"}`,
    props.decoration ? `a2ui-text--decoration-${props.decoration}` : "",
    props.emphasis ? `a2ui-text--emphasis-${props.emphasis}` : "",
    props.role ? `a2ui-text--role-${props.role}` : "",
    props.variant ? `a2ui-text--variant-${props.variant}` : "",
    props.size ? `a2ui-text--size-${props.size}` : "",
    props.tone ? `a2ui-text--tone-${props.tone}` : "",
    props.preset ? `a2ui-text--preset-${props.preset}` : "",
    props.truncate ? "a2ui-text--truncate" : "",
  ].filter(Boolean),
);
const lineClampStyle = computed<CSSProperties>(() => {
  if (!props.maxLines) return props.style ?? {};
  return {
    ...(props.style ?? {}),
    display: "-webkit-box",
    WebkitLineClamp: props.maxLines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
});
</script>

<template>
  <component :is="tag" :class="textClass" :style="lineClampStyle">
    {{ text }}
  </component>
</template>
