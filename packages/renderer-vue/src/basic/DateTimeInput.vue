<script setup lang="ts">
/**
 * 普通日期时间输入组件。
 *
 * 职责：
 * - 使用 modelValue/update:modelValue 暴露输入值
 * - 根据 usageHint 选择原生 input 类型
 *
 * 不负责：解析 A2UI value 字段或写回 DataModel。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  modelValue?: unknown;
  label?: string;
  name?: string;
  usageHint?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  validationState?: string;
  helpText?: string;
  errorText?: string;
  density?: string;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const inputType = computed(() => {
  if (props.usageHint === "time") return "time";
  if (props.usageHint === "datetime") return "datetime-local";
  return "date";
});
const classes = computed(() =>
  [
    "a2ui-datetimeinput",
    props.validationState
      ? `a2ui-field--validation-${props.validationState}`
      : "",
    props.density ? `a2ui-field--density-${props.density}` : "",
    props.variant ? `a2ui-datetimeinput--variant-${props.variant}` : "",
    props.size ? `a2ui-datetimeinput--size-${props.size}` : "",
    props.tone ? `a2ui-datetimeinput--tone-${props.tone}` : "",
    props.preset ? `a2ui-datetimeinput--preset-${props.preset}` : "",
  ].filter(Boolean),
);

function updateValue(event: Event): void {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <label :class="classes" :style="style">
    <span v-if="label" class="a2ui-datetimeinput-label">
      {{ label }}<span v-if="required" class="a2ui-field-required">*</span>
    </span>
    <span v-if="description" class="a2ui-field-description">{{
      description
    }}</span>
    <input
      class="a2ui-datetimeinput-input"
      :type="inputType"
      :name="name"
      :value="String(modelValue ?? '')"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      @input="updateValue"
    />
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </label>
</template>
