<script setup lang="ts">
/**
 * Icon 组件：渲染图标，使用 Unicode / emoji 作为 fallback。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import { resolveVisualClasses, resolveVisualStyle } from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 图标名称 */
const iconName = computed(() => {
  const raw = ctx.componentModel.getProperty("name") ?? ctx.componentModel.getProperty("icon");
  return ctx.resolveValue(raw) ?? "";
});

/** 简单 Unicode/emoji fallback 映射 */
const iconFallbackMap: Record<string, string> = {
  home: "🏠",
  search: "🔍",
  settings: "⚙️",
  user: "👤",
  close: "✕",
  menu: "☰",
  arrowLeft: "←",
  arrowRight: "→",
  arrowUp: "↑",
  arrowDown: "↓",
  check: "✓",
  plus: "+",
  minus: "−",
  delete: "🗑",
  edit: "✎",
  info: "ℹ",
  warning: "⚠",
  error: "✕",
  star: "★",
  heart: "♥",
  favorite: "♥",
  favorite_border: "♡",
  play_arrow: "▶",
  pause: "Ⅱ",
  skip_next: "⏭",
  skip_previous: "⏮",
  volume_up: "🔊",
  shuffle: "🔀",
  repeat: "↻",
};

const fallbackIcon = computed(() => {
  const name = String(iconName.value);
  return iconFallbackMap[name] ?? name;
});

const iconClasses = computed(() => [
  "a2ui-icon",
  ...resolveVisualClasses(ctx, "a2ui-icon"),
]);

const iconStyle = computed(() => resolveVisualStyle(ctx));
</script>

<template>
  <span
    class="a2ui-icon"
    :class="iconClasses"
    :style="iconStyle"
    :data-component-id="componentId"
    :title="String(iconName)"
  >
    {{ fallbackIcon }}
  </span>
</template>
