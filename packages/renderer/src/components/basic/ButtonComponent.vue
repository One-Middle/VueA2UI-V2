<script setup lang="ts">
/**
 * Button 组件：渲染可点击按钮，点击时派发 action。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 按钮子组件（child 属性） */
const childComponentId = computed(() => {
  const raw = ctx.componentModel.getProperty("child");
  return ctx.resolveValue(raw) as string | undefined;
});

/** action 名称 */
const actionName = computed(() => {
  const raw = ctx.componentModel.getProperty("action");
  return ctx.resolveValue(raw) ?? "";
});

/** action 上下文键列表 */
const actionContextKeys = computed(() => {
  const raw = ctx.componentModel.getProperty("context");
  const resolved = ctx.resolveValue(raw);
  return Array.isArray(resolved) ? resolved as string[] : [];
});

/** 点击时解析 action context 并派发 */
function handleClick(): void {
  const context: Record<string, unknown> = {};
  for (const key of actionContextKeys.value) {
    context[key] = ctx.dataContext.resolve({ path: key });
  }
  ctx.dispatchAction(actionName.value as string, context);
}
</script>

<template>
  <button
    class="a2ui-button"
    :data-component-id="componentId"
    @click="handleClick"
  >
    <A2uiComponent
      v-if="childComponentId"
      :surface-id="surfaceId"
      :component-id="childComponentId"
    />
  </button>
</template>
