<script setup lang="ts">
/**
 * Divider 组件：渲染分割线。
 */
defineProps<{ surfaceId: string; componentId: string }>();
</script>

<template>
  <hr class="a2ui-divider" :data-component-id="componentId" />
</template>
