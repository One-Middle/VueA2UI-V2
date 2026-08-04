<script setup lang="ts">
/**
 * Container 组件：为页面区块提供受控宽度、内边距和水平对齐。
 *
 * 它用 `width/padding/align` 这类语义字段覆盖常见页面容器需求，不暴露任意布局 CSS。
 */
import { computed, inject } from "vue";
import { componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";
import {
  resolveStringProp,
  resolveVisualClasses,
  resolveVisualStyle,
} from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

const childComponentId = computed(() => {
  const raw = ctx.componentModel.getProperty("child");
  return ctx.resolveValue(raw) as string | undefined;
});

const containerClasses = computed(() => [
  "a2ui-container",
  ...resolveVisualClasses(ctx, "a2ui-container"),
]);

const containerStyle = computed(() => resolveVisualStyle(ctx));

const width = computed(() => resolveStringProp(ctx, "width") || "content");
const padding = computed(() => resolveStringProp(ctx, "padding") || "md");
const align = computed(() => resolveStringProp(ctx, "align") || "center");
</script>

<template>
  <div
    class="a2ui-container"
    :class="[
      containerClasses,
      `a2ui-container--width-${width}`,
      `a2ui-container--padding-${padding}`,
      `a2ui-container--align-${align}`,
    ]"
    :style="containerStyle"
    :data-component-id="componentId"
  >
    <A2uiComponent
      v-if="childComponentId"
      :surface-id="surfaceId"
      :component-id="childComponentId"
      :base-path="ctx.dataContext.basePath"
    />
  </div>
</template>
