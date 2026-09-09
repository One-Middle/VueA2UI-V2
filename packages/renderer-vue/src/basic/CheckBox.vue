<script setup lang="ts">
/**
 * 普通复选框组件。
 *
 * 职责：
 * - 使用 modelValue/update:modelValue 暴露勾选状态
 * - 渲染标签、说明和校验文案
 *
 * 不负责：解析 A2UI value 字段或写回 DataModel。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  modelValue?: unknown;
  label?: string;
  name?: string;
  description?: string;
  labelPosition?: string;
  disabled?: boolean;
  required?: boolean;
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
  "update:modelValue": [value: boolean];
}>();

const classes = computed(() =>
  [
    "a2ui-checkbox-field",
    props.validationState
      ? `a2ui-field--validation-${props.validationState}`
      : "",
    props.density ? `a2ui-field--density-${props.density}` : "",
    props.variant ? `a2ui-checkbox--variant-${props.variant}` : "",
    props.size ? `a2ui-checkbox--size-${props.size}` : "",
    props.tone ? `a2ui-checkbox--tone-${props.tone}` : "",
    props.preset ? `a2ui-checkbox--preset-${props.preset}` : "",
  ].filter(Boolean),
);

function updateChecked(event: Event): void {
  emit("update:modelValue", (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <div :class="classes" :style="style">
    <label class="a2ui-checkbox">
      <span v-if="labelPosition === 'left'">{{ label }}</span>
      <input
        type="checkbox"
        :name="name"
        :checked="Boolean(modelValue)"
        :disabled="disabled"
        :required="required"
        @change="updateChecked"
      />
      <span v-if="labelPosition !== 'left'">{{ label }}</span>
    </label>
    <span v-if="description" class="a2ui-field-description">{{
      description
    }}</span>
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </div>
</template>
