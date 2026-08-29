<script setup lang="ts">
/**
 * 普通滑块组件。
 *
 * 职责：
 * - 使用 modelValue/update:modelValue 暴露数值
 * - 渲染标签、数值和校验文案
 *
 * 不负责：解析 A2UI value 字段或写回 DataModel。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  modelValue?: unknown;
  label?: string;
  name?: string;
  min?: unknown;
  max?: unknown;
  step?: number;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  disabled?: boolean;
  required?: boolean;
  validationState?: string;
  helpText?: string;
  errorText?: string;
  density?: string;
  valueDisplay?: string;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

const numericValue = computed(() => Number(props.modelValue ?? props.min ?? 0));
const classes = computed(() =>
  [
    "a2ui-slider",
    props.validationState
      ? `a2ui-field--validation-${props.validationState}`
      : "",
    props.density ? `a2ui-field--density-${props.density}` : "",
    props.variant ? `a2ui-slider--variant-${props.variant}` : "",
    props.size ? `a2ui-slider--size-${props.size}` : "",
    props.tone ? `a2ui-slider--tone-${props.tone}` : "",
    props.preset ? `a2ui-slider--preset-${props.preset}` : "",
  ].filter(Boolean),
);
const shouldShowValue = computed(
  () => props.valueDisplay !== "none" && props.showValue !== false,
);

function updateValue(event: Event): void {
  emit("update:modelValue", Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <label :class="classes" :style="style">
    <span v-if="label" class="a2ui-slider-label">{{ label }}</span>
    <span class="a2ui-slider-control">
      <input
        class="a2ui-slider-input"
        type="range"
        :name="name"
        :min="Number(min ?? 0)"
        :max="Number(max ?? 100)"
        :step="step || 1"
        :value="numericValue"
        :disabled="disabled"
        :required="required"
        @input="updateValue"
      />
      <span v-if="shouldShowValue" class="a2ui-slider-value">
        {{ valuePrefix }}{{ numericValue }}{{ valueSuffix }}
      </span>
    </span>
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </label>
</template>
