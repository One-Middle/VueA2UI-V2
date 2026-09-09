<script setup lang="ts">
/**
 * 普通空隙组件。
 *
 * 职责：
 * - 渲染受控尺寸或弹性占位
 *
 * 不负责：布局父级逻辑或 A2UI 协议解析。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  size?: string;
  axis?: string;
  flex?: boolean;
}>();

const sizeMap: Record<string, string> = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
};
const spacerStyle = computed<CSSProperties>(() => {
  if (props.flex) return { flex: "1 1 auto" };
  const size = sizeMap[props.size || "md"] ?? props.size ?? "16px";
  return props.axis === "horizontal"
    ? { width: size, minWidth: size, height: "1px" }
    : { height: size, minHeight: size, width: "1px" };
});
</script>

<template>
  <div class="a2ui-spacer" :style="spacerStyle" aria-hidden="true" />
</template>
