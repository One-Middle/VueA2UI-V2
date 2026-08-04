<script setup lang="ts">
/**
 * Spacer 组件：在组件树中表达受控空隙或弹性占位。
 *
 * 使用 `size/axis/flex` 语义字段处理常见间隔，不需要 Agent 输出 margin hack。
 */
import { computed, inject } from "vue";
import type { CSSProperties } from "vue";
import { componentContextKey } from "../../vue/context";
import { resolveBooleanProp, resolveStringProp } from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

const axis = computed(() => resolveStringProp(ctx, "axis") || "vertical");
const size = computed(() => resolveStringProp(ctx, "size") || "md");
const isFlex = computed(() => resolveBooleanProp(ctx, "flex"));

const sizeMap: Record<string, string> = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
};

const spacerStyle = computed<CSSProperties>(() => {
  if (isFlex.value) {
    return { flex: "1 1 auto" };
  }
  const value = sizeMap[size.value] ?? sizeMap.md;
  return axis.value === "horizontal"
    ? { width: value, minWidth: value, height: "1px" }
    : { height: value, minHeight: value, width: "1px" };
});
</script>

<template>
  <div
    class="a2ui-spacer"
    :class="[`a2ui-spacer--axis-${axis}`, `a2ui-spacer--size-${size}`]"
    :style="spacerStyle"
    :data-component-id="componentId"
    aria-hidden="true"
  />
</template>
