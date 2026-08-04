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
  resolveStringProp,
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

const label = computed(() => resolveStringProp(ctx, "label"));

const icon = computed(() => resolveStringProp(ctx, "icon"));

const iconPosition = computed(() => resolveStringProp(ctx, "iconPosition") || "left");

const intent = computed(() => resolveStringProp(ctx, "intent") || "default");

const shape = computed(() => resolveStringProp(ctx, "shape") || "rounded");

const importance = computed(() => resolveStringProp(ctx, "importance") || "normal");

const iconText = computed(() => {
  const fallbackMap: Record<string, string> = {
    search: "🔍",
    close: "✕",
    check: "✓",
    plus: "+",
    minus: "−",
    delete: "🗑",
    edit: "✎",
    warning: "⚠",
    play_arrow: "▶",
    pause: "Ⅱ",
    skip_next: "⏭",
    skip_previous: "⏮",
    chevron_right: "›",
  };
  return fallbackMap[icon.value] ?? icon.value;
});

const buttonClasses = computed(() => [
  "a2ui-button",
  ...resolveVisualClasses(ctx, "a2ui-button"),
  `a2ui-button--intent-${intent.value}`,
  `a2ui-button--shape-${shape.value}`,
  `a2ui-button--importance-${importance.value}`,
  {
    "a2ui-button--full-width": isFullWidth.value,
    "a2ui-button--loading": isLoading.value,
    "a2ui-button--icon-only": iconPosition.value === "only",
  },
]);

const buttonStyle = computed(() => resolveVisualStyle(ctx));

/** 点击时解析 action context 并派发 */
function handleClick(): void {
  if (isDisabled.value || isLoading.value) {
    return;
  }
  const action = componentAction.value;
  if (!action) {
    return;
  }
  if (action.kind === "event") {
    const context = resolveActionContext(action.context, ctx.resolveValue);
    ctx.dispatchAction(action.name, context);
    return;
  }
  if (action.kind === "script") {
    const context = resolveActionContext(action.script.context ?? {}, ctx.resolveValue);
    ctx.runActionScript(action, context);
  }
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
      :base-path="ctx.dataContext.basePath"
    />
    <template v-else>
      <span
        v-if="icon && iconPosition !== 'right'"
        class="a2ui-button-icon"
        aria-hidden="true"
      >{{ iconText }}</span>
      <span v-if="label && iconPosition !== 'only'" class="a2ui-button-label">{{ label }}</span>
      <span
        v-if="icon && iconPosition === 'right'"
        class="a2ui-button-icon"
        aria-hidden="true"
      >{{ iconText }}</span>
    </template>
  </button>
</template>
