<script setup lang="ts">
/**
 * Slider 组件：渲染滑块，支持 min / max / value 双向绑定。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import {
  resolveBooleanProp,
  resolveStringProp,
  resolveVisualClasses,
  resolveVisualStyle,
} from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 最小值 */
const min = computed(() => {
  const raw = ctx.componentModel.getProperty("min");
  return Number(ctx.resolveValue(raw) ?? 0);
});

/** 最大值 */
const max = computed(() => {
  const raw = ctx.componentModel.getProperty("max");
  return Number(ctx.resolveValue(raw) ?? 100);
});

/** 步进值 */
const step = computed(() => {
  const raw = ctx.componentModel.getProperty("step");
  return Number(ctx.resolveValue(raw) ?? 1);
});

/** 当前值（双向绑定） */
const currentValue = computed({
  get() {
    const raw = ctx.componentModel.getProperty("value");
    return Number(ctx.resolveValue(raw) ?? 0);
  },
  set(val: number) {
    const raw = ctx.componentModel.getProperty("value");
    if (raw && typeof raw === "object" && "path" in raw) {
      ctx.dataContext.set((raw as { path: string }).path, val);
    }
  },
});

const showValue = computed(() => resolveBooleanProp(ctx, "showValue", true));

const label = computed(() => resolveStringProp(ctx, "label"));

const helpText = computed(() => resolveStringProp(ctx, "helpText"));

const errorText = computed(() => resolveStringProp(ctx, "errorText"));

const validationState = computed(() => resolveStringProp(ctx, "validationState") || (errorText.value ? "error" : "default"));

const density = computed(() => resolveStringProp(ctx, "density") || "comfortable");

const valueDisplay = computed(() => resolveStringProp(ctx, "valueDisplay") || (showValue.value ? "inline" : "none"));

const isDisabled = computed(() => resolveBooleanProp(ctx, "disabled"));

const isRequired = computed(() => resolveBooleanProp(ctx, "required"));

const valuePrefix = computed(() => resolveStringProp(ctx, "valuePrefix"));

const valueSuffix = computed(() => resolveStringProp(ctx, "valueSuffix"));

const sliderClasses = computed(() => [
  "a2ui-slider",
  ...resolveVisualClasses(ctx, "a2ui-slider"),
  `a2ui-field--validation-${validationState.value}`,
  `a2ui-field--density-${density.value}`,
]);

const sliderStyle = computed(() => resolveVisualStyle(ctx));
</script>

<template>
  <div
    class="a2ui-slider"
    :class="sliderClasses"
    :style="sliderStyle"
    :data-component-id="componentId"
  >
    <div v-if="label" class="a2ui-slider-label">
      {{ label }}<span v-if="isRequired" class="a2ui-field-required">*</span>
    </div>
    <div class="a2ui-slider-control">
    <input
      class="a2ui-slider-input"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="currentValue"
      :disabled="isDisabled"
      @input="currentValue = Number(($event.target as HTMLInputElement).value)"
    />
    <span v-if="valueDisplay !== 'none'" class="a2ui-slider-value">
      {{ valuePrefix }}{{ currentValue }}{{ valueSuffix }}
    </span>
    </div>
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </div>
</template>
