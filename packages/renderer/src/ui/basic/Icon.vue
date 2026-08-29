<script setup lang="ts">
/**
 * 普通图标显示组件。
 *
 * 职责：
 * - 将普通图标名称渲染为稳定的文本 fallback
 * - 根据视觉 props 生成现有样式类
 *
 * 不负责：接入真实图标库或解析 A2UI 协议。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  name?: unknown;
  icon?: unknown;
  semantic?: string;
  label?: string;
  status?: string;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const displayName = computed(() => String(props.name ?? props.icon ?? ""));
const iconMap: Record<string, string> = {
  play_arrow: "▶",
  pause: "⏸",
  skip_next: "⏭",
  skip_previous: "⏮",
  favorite: "♥",
  favorite_border: "♡",
  check: "✓",
  close: "×",
  search: "⌕",
};
const classes = computed(() =>
  [
    "a2ui-icon",
    props.status ? `a2ui-icon--status-${props.status}` : "",
    props.variant ? `a2ui-icon--variant-${props.variant}` : "",
    props.size ? `a2ui-icon--size-${props.size}` : "",
    props.tone ? `a2ui-icon--tone-${props.tone}` : "",
    props.preset ? `a2ui-icon--preset-${props.preset}` : "",
  ].filter(Boolean),
);
</script>

<template>
  <span
    :class="classes"
    :style="style"
    :aria-label="semantic === 'decorative' ? undefined : label || displayName"
    :aria-hidden="semantic === 'decorative'"
  >
    {{ iconMap[displayName] || displayName }}
  </span>
</template>
