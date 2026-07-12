<script setup lang="ts">
/**
 * Image 组件：渲染图片。
 */
import { computed, inject } from "vue";
import type { CSSProperties } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import {
  resolveStringProp,
  resolveVisualClasses,
  resolveVisualStyle,
} from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

const url = computed(() => {
  const raw = ctx.componentModel.getProperty("url");
  return ctx.resolveValue(raw) ?? "";
});

const alt = computed(() => {
  const raw = ctx.componentModel.getProperty("alt");
  return ctx.resolveValue(raw) ?? "";
});

const fit = computed(() => resolveStringProp(ctx, "fit"));

const aspectRatio = computed(() => resolveStringProp(ctx, "aspectRatio"));

const cssAspectRatio = computed(() => aspectRatio.value.replace(":", " / "));

const loading = computed(() => {
  const value = resolveStringProp(ctx, "loading");
  return value === "lazy" || value === "eager" ? value : undefined;
});

const imageClasses = computed(() => [
  "a2ui-image",
  ...resolveVisualClasses(ctx, "a2ui-image"),
]);

const imageStyle = computed<CSSProperties>(() => ({
  ...resolveVisualStyle(ctx),
  ...(fit.value ? { objectFit: fit.value as CSSProperties["objectFit"] } : {}),
  ...(cssAspectRatio.value ? { aspectRatio: cssAspectRatio.value } : {}),
}));
</script>

<template>
  <img
    class="a2ui-image"
    :class="imageClasses"
    :style="imageStyle"
    :data-component-id="componentId"
    :src="String(url)"
    :alt="String(alt)"
    :loading="loading"
  />
</template>
