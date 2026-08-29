<script setup lang="ts">
/**
 * 普通选择器组件。
 *
 * 职责：
 * - 使用 modelValue/update:modelValue 暴露选中值
 * - 支持 select、radio 和 segmented 三种普通展示模式
 *
 * 不负责：解析 A2UI value 字段或写回 DataModel。
 */
import { computed, type CSSProperties } from "vue";

interface OptionItem {
  label: string;
  value: string | number | boolean;
}

const props = defineProps<{
  modelValue?: unknown;
  label?: string;
  name?: string;
  description?: string;
  options?: OptionItem[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  validationState?: string;
  helpText?: string;
  errorText?: string;
  density?: string;
  mode?: string;
  multiple?: boolean;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | number | boolean];
}>();

const classes = computed(() =>
  [
    "a2ui-choicepicker-field",
    props.mode ? `a2ui-choicepicker-field--mode-${props.mode}` : "",
    props.validationState
      ? `a2ui-field--validation-${props.validationState}`
      : "",
    props.density ? `a2ui-field--density-${props.density}` : "",
    props.variant ? `a2ui-choicepicker--variant-${props.variant}` : "",
    props.size ? `a2ui-choicepicker--size-${props.size}` : "",
    props.tone ? `a2ui-choicepicker--tone-${props.tone}` : "",
    props.preset ? `a2ui-choicepicker--preset-${props.preset}` : "",
  ].filter(Boolean),
);

function coerceSelected(value: string): string | number | boolean {
  const option = props.options?.find((item) => String(item.value) === value);
  return option?.value ?? value;
}

function updateSelected(event: Event): void {
  emit(
    "update:modelValue",
    coerceSelected((event.target as HTMLSelectElement).value),
  );
}
</script>

<template>
  <label :class="classes" :style="style">
    <span v-if="label" class="a2ui-choicepicker-label">
      {{ label }}<span v-if="required" class="a2ui-field-required">*</span>
    </span>
    <span v-if="description" class="a2ui-field-description">{{
      description
    }}</span>
    <select
      v-if="!mode || mode === 'select'"
      class="a2ui-choicepicker"
      :name="name"
      :value="String(modelValue ?? '')"
      :disabled="disabled"
      :required="required"
      @change="updateSelected"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option
        v-for="option in options || []"
        :key="String(option.value)"
        :value="String(option.value)"
      >
        {{ option.label }}
      </option>
    </select>
    <span v-else class="a2ui-choicepicker-options">
      <button
        v-for="option in options || []"
        :key="String(option.value)"
        type="button"
        class="a2ui-choicepicker-option"
        :class="{
          'a2ui-choicepicker-option--selected': option.value === modelValue,
        }"
        :disabled="disabled"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </span>
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </label>
</template>
