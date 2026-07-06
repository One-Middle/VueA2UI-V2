<script setup lang="ts">
/**
 * AudioPlayer 组件：渲染音频播放器。
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
  <audio
    class="a2ui-audio"
    :data-component-id="componentId"
    :src="String(url)"
    controls
  />
</template>
