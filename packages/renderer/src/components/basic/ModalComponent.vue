<script setup lang="ts">
/**
 * Modal 组件：模态框，简单的 overlay + 内容区。
 */
import { computed, inject, ref } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 是否显示 */
const visible = ref(true);

/** child 子组件 */
const childComponentId = computed(() => {
  const raw = ctx.componentModel.getProperty("child");
  return ctx.resolveValue(raw) as string | undefined;
});

function close(): void {
  visible.value = false;
}
</script>

<template>
  <div v-if="visible" class="a2ui-modal-overlay" @click.self="close">
    <div class="a2ui-modal" :data-component-id="componentId">
      <button class="a2ui-modal-close" @click="close">✕</button>
      <A2uiComponent
        v-if="childComponentId"
        :surface-id="surfaceId"
        :component-id="childComponentId"
        :base-path="ctx.dataContext.basePath"
      />
    </div>
  </div>
</template>
