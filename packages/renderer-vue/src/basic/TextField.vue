<script setup lang="ts">
/**
 * 普通文本输入组件。
 *
 * 职责：
 * - 使用 modelValue/update:modelValue 暴露输入值
 * - 渲染标签、说明、前后缀和校验文案
 *
 * 不负责：解析 A2UI text 字段或写回 DataModel。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  modelValue?: unknown;
  label?: string;
  name?: string;
  usageHint?: string;
  rows?: number;
  minRows?: number;
  inputMode?:
    | "none"
    | "text"
    | "url"
    | "decimal"
    | "email"
    | "tel"
    | "numeric"
    | "search";
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  validationState?: string;
  helpText?: string;
  errorText?: string;
  description?: string;
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

const isTextarea = computed(
  () => props.usageHint === "longText" || Boolean(props.rows || props.minRows),
);
const inputType = computed(() => {
  if (props.usageHint === "number") return "number";
  if (props.usageHint === "obscured") return "password";
  return "text";
});
const classes = computed(() =>
  [
    "a2ui-textfield",
    props.validationState
      ? `a2ui-field--validation-${props.validationState}`
      : "",
    props.density ? `a2ui-field--density-${props.density}` : "",
    props.variant ? `a2ui-textfield--variant-${props.variant}` : "",
    props.size ? `a2ui-textfield--size-${props.size}` : "",
    props.tone ? `a2ui-textfield--tone-${props.tone}` : "",
    props.preset ? `a2ui-textfield--preset-${props.preset}` : "",
  ].filter(Boolean),
);

function update(event: Event): void {
  emit(
    "update:modelValue",
    (event.target as HTMLInputElement | HTMLTextAreaElement).value,
  );
}
</script>

<template>
  <label :class="classes" :style="style">
    <span v-if="label" class="a2ui-textfield-label">
      {{ label }}<span v-if="required" class="a2ui-field-required">*</span>
    </span>
    <span v-if="description" class="a2ui-field-description">{{
      description
    }}</span>
    <span class="a2ui-textfield-control">
      <span v-if="prefix" class="a2ui-field-affix">{{ prefix }}</span>
      <textarea
        v-if="isTextarea"
        class="a2ui-textfield-input"
        :name="name"
        :value="String(modelValue ?? '')"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        @input="update"
      />
      <input
        v-else
        class="a2ui-textfield-input"
        :type="inputType"
        :inputmode="inputMode"
        :name="name"
        :value="String(modelValue ?? '')"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        @input="update"
      />
      <span v-if="suffix" class="a2ui-field-affix">{{ suffix }}</span>
    </span>
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </label>
</template>
