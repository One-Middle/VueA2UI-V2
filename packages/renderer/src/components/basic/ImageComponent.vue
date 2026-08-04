<script setup lang="ts">
/**
 * Image 组件：渲染图片。
 */
import { computed, inject, ref, watch } from "vue";
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

const role = computed(() => resolveStringProp(ctx, "role") || "image");

const shape = computed(() => resolveStringProp(ctx, "shape") || "rounded");

const fallbackText = computed(() => resolveStringProp(ctx, "fallbackText"));

const caption = computed(() => resolveStringProp(ctx, "caption"));

const hasLoadError = ref(false);

watch(url, () => {
  hasLoadError.value = false;
});

const imageClasses = computed(() => [
  "a2ui-image",
  ...resolveVisualClasses(ctx, "a2ui-image"),
  `a2ui-image--role-${role.value}`,
  `a2ui-image--shape-${shape.value}`,
]);

const imageStyle = computed<CSSProperties>(() => ({
  ...resolveVisualStyle(ctx),
  ...(fit.value ? { objectFit: fit.value as CSSProperties["objectFit"] } : {}),
  ...(cssAspectRatio.value ? { aspectRatio: cssAspectRatio.value } : {}),
}));
</script>

<template>
  <figure class="a2ui-image-frame" :data-component-id="componentId">
    <div
      v-if="hasLoadError && fallbackText"
      class="a2ui-image-fallback"
      :class="imageClasses"
      :style="imageStyle"
    >
      {{ fallbackText }}
    </div>
    <img
      v-else
      class="a2ui-image"
      :class="imageClasses"
      :style="imageStyle"
      :src="String(url)"
      :alt="String(alt)"
      :loading="loading"
      @error="hasLoadError = true"
    />
    <figcaption v-if="caption" class="a2ui-image-caption">{{ caption }}</figcaption>
  </figure>
</template>
