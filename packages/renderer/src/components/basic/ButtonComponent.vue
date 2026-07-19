<script setup lang="ts">
/**
 * Button 组件：渲染可点击按钮，点击时派发 action。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import {
  resolveActionContext,
  resolveComponentAction,
} from "../../core/action";
import A2uiComponent from "../../vue/A2uiComponent.vue";
import {
  resolveBooleanProp,
  resolveVisualClasses,
  resolveVisualStyle,
} from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 按钮子组件（child 属性） */
const childComponentId = computed(() => {
  const raw = ctx.componentModel.getProperty("child");
  return ctx.resolveValue(raw) as string | undefined;
});

/** action 声明 */
const componentAction = computed(() => {
  const raw = ctx.componentModel.getProperty("action");
  return resolveComponentAction(raw, ctx.resolveValue);
});

const isDisabled = computed(() => resolveBooleanProp(ctx, "disabled"));

const isLoading = computed(() => resolveBooleanProp(ctx, "loading"));

const isFullWidth = computed(() => resolveBooleanProp(ctx, "fullWidth"));

const buttonClasses = computed(() => [
  "a2ui-button",
  ...resolveVisualClasses(ctx, "a2ui-button"),
  {
    "a2ui-button--full-width": isFullWidth.value,
    "a2ui-button--loading": isLoading.value,
  },
]);

const buttonStyle = computed(() => resolveVisualStyle(ctx));

/** 点击时解析 action context 并派发 */
function handleClick(): void {
  if (isDisabled.value || isLoading.value) {
    return;
  }
  const action = componentAction.value;
  if (!action || action.kind !== "event") {
    return;
  }
  const context = resolveActionContext(action.context, ctx.resolveValue);
  ctx.dispatchAction(action.name, context);
}
</script>

<template>
  <button
    class="a2ui-button"
    :class="buttonClasses"
    :style="buttonStyle"
    :data-component-id="componentId"
    :disabled="isDisabled || isLoading"
    :aria-busy="isLoading ? 'true' : undefined"
    @click="handleClick"
  >
    <A2uiComponent
      v-if="childComponentId"
      :surface-id="surfaceId"
      :component-id="childComponentId"
    />
  </button>
</template>
