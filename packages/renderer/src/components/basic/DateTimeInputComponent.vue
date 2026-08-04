<script setup lang="ts">
/**
 * DateTimeInput 组件：日期时间输入框，支持双向绑定。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import { resolveBooleanProp, resolveStringProp } from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 当前值（双向绑定） */
const currentValue = computed({
  get() {
    const raw = ctx.componentModel.getProperty("value");
    return String(ctx.resolveValue(raw) ?? "");
  },
  set(val: string) {
    const raw = ctx.componentModel.getProperty("value");
    if (raw && typeof raw === "object" && "path" in raw) {
      ctx.dataContext.set((raw as { path: string }).path, val);
    }
  },
});

/** usageHint："date" | "time" | "datetime" */
const usageHint = computed(() => {
  const raw = ctx.componentModel.getProperty("usageHint");
  return ctx.resolveValue(raw) ?? "datetime";
});

const inputType = computed(() => {
  switch (usageHint.value) {
    case "date": return "date";
    case "time": return "time";
    default: return "datetime-local";
  }
});

const label = computed(() => {
  const raw = ctx.componentModel.getProperty("label");
  return ctx.resolveValue(raw) ?? "";
});

const description = computed(() => resolveStringProp(ctx, "description"));

const placeholder = computed(() => resolveStringProp(ctx, "placeholder"));

const helpText = computed(() => resolveStringProp(ctx, "helpText"));

const errorText = computed(() => resolveStringProp(ctx, "errorText"));

const validationState = computed(() => resolveStringProp(ctx, "validationState") || (errorText.value ? "error" : "default"));

const density = computed(() => resolveStringProp(ctx, "density") || "comfortable");

const isDisabled = computed(() => resolveBooleanProp(ctx, "disabled"));

const isRequired = computed(() => resolveBooleanProp(ctx, "required"));

const isReadonly = computed(() => resolveBooleanProp(ctx, "readonly"));

const fieldClasses = computed(() => [
  "a2ui-datetimeinput",
  `a2ui-field--validation-${validationState.value}`,
  `a2ui-field--density-${density.value}`,
]);
</script>

<template>
  <label :class="fieldClasses" :data-component-id="componentId">
    <span v-if="label" class="a2ui-datetimeinput-label">
      {{ label }}<span v-if="isRequired" class="a2ui-field-required">*</span>
    </span>
    <span v-if="description" class="a2ui-field-description">{{ description }}</span>
    <input
      :type="inputType"
      class="a2ui-datetimeinput-input"
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :required="isRequired"
      :readonly="isReadonly"
      @input="currentValue = ($event.target as HTMLInputElement).value"
    />
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </label>
</template>
