<script setup lang="ts">
/**
 * 普通按钮组件。
 *
 * 职责：
 * - 渲染按钮文本、图标和 default slot
 * - emit 普通 click 事件
 *
 * 不负责：解析或派发 A2UI action。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  label?: unknown;
  icon?: unknown;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  iconPosition?: string;
  intent?: string;
  shape?: string;
  importance?: string;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const classes = computed(() =>
  [
    "a2ui-button",
    props.fullWidth ? "a2ui-button--full-width" : "",
    props.iconPosition === "only" || props.shape === "circle"
      ? "a2ui-button--icon-only"
      : "",
    props.intent ? `a2ui-button--intent-${props.intent}` : "",
    props.shape ? `a2ui-button--shape-${props.shape}` : "",
    props.importance ? `a2ui-button--importance-${props.importance}` : "",
    props.variant ? `a2ui-button--variant-${props.variant}` : "",
    props.size ? `a2ui-button--size-${props.size}` : "",
    props.tone ? `a2ui-button--tone-${props.tone}` : "",
    props.preset ? `a2ui-button--preset-${props.preset}` : "",
  ].filter(Boolean),
);

function handleClick(event: MouseEvent): void {
  if (props.disabled || props.loading) return;
  emit("click", event);
}
</script>

<template>
  <button
    :class="classes"
    :style="style"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="a2ui-button-icon">…</span>
    <span v-if="icon && iconPosition !== 'right'" class="a2ui-button-icon">{{
      icon
    }}</span>
    <slot>{{ label }}</slot>
    <span v-if="icon && iconPosition === 'right'" class="a2ui-button-icon">{{
      icon
    }}</span>
  </button>
</template>
