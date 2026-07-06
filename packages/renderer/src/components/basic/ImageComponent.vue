<script setup lang="ts">
/**
 * Image 组件：渲染图片。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";

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
</script>

<template>
  <img
    class="a2ui-image"
    :data-component-id="componentId"
    :src="String(url)"
    :alt="String(alt)"
  />
</template>
