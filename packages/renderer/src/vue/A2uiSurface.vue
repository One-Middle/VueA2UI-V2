<script setup lang="ts">
defineProps<{
  surfaceId?: string;
}>();
</script>

<template>
  <section class="a2ui-surface" :data-surface-id="surfaceId">
    <slot>
      <div class="a2ui-empty">A2UI surface is ready.</div>
    </slot>
  </section>
</template>
