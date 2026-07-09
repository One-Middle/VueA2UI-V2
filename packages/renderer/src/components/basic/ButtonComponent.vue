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
  const resolved = ctx.resolveValue(raw);
  if (resolved && typeof resolved === "object" && "name" in resolved) {
    return String((resolved as { name?: unknown }).name ?? "");
  }
  return String(resolved ?? "");
});

/** action 上下文 */
const actionContext = computed(() => {
  const raw = ctx.componentModel.getProperty("action");
  const resolved = ctx.resolveValue(raw);
  if (!resolved || typeof resolved !== "object" || !("context" in resolved)) {
    return {};
  }
  const value = (resolved as { context?: unknown }).context;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
});

/** 点击时解析 action context 并派发 */
function handleClick(): void {
  const context: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actionContext.value)) {
    context[key] = ctx.resolveValue(value);
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
