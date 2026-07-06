<script setup lang="ts">
/**
 * Video 组件：渲染视频播放器。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

const url = computed(() => {
  const raw = ctx.componentModel.getProperty("url");
  return ctx.resolveValue(raw) ?? "";
});
</script>

<template>
  <video
    class="a2ui-video"
    :data-component-id="componentId"
    :src="String(url)"
    controls
  />
</template>
