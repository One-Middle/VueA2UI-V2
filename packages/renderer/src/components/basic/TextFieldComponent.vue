<script setup lang="ts">
/**
 * TextField 组件：输入框 / 文本域，支持 label 和双向绑定。
 */
import { computed, inject } from "vue";
import { componentContextKey } from "../../vue/context";
import { resolveBooleanProp, resolveStringProp } from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** label 属性 */
const label = computed(() => {
  const raw = ctx.componentModel.getProperty("label");
  return String(ctx.resolveValue(raw) ?? "");
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

/** 当前文本值（通过 text 属性的 { path } 引用解析） */
const currentValue = computed({
  get() {
    const raw = ctx.componentModel.getProperty("text");
    return String(ctx.resolveValue(raw) ?? "");
  },
  set(val: string) {
    const raw = ctx.componentModel.getProperty("text");
    if (raw && typeof raw === "object" && "path" in raw) {
      ctx.dataContext.set((raw as { path: string }).path, val);
    }
  },
});

/** usageHint："short" → input，"long" → textarea */
const usageHint = computed(() => {
  const raw = ctx.componentModel.getProperty("usageHint");
  return ctx.resolveValue(raw) ?? "shortText";
});

const isTextarea = computed(() => usageHint.value === "longText");
const inputType = computed(() => {
  const inputMode = resolveStringProp(ctx, "inputMode");
  if (inputMode === "email") return "email";
  if (inputMode === "url") return "url";
  if (inputMode === "tel") return "tel";
  if (usageHint.value === "number") return "number";
  if (usageHint.value === "obscured") return "password";
  return "text";
});

const prefix = computed(() => resolveStringProp(ctx, "prefix"));

const suffix = computed(() => resolveStringProp(ctx, "suffix"));

const fieldClasses = computed(() => [
  "a2ui-textfield",
  `a2ui-field--validation-${validationState.value}`,
  `a2ui-field--density-${density.value}`,
]);
</script>

<template>
  <label :class="fieldClasses" :data-component-id="componentId">
    <span v-if="label" class="a2ui-textfield-label">
      {{ label }}<span v-if="isRequired" class="a2ui-field-required">*</span>
    </span>
    <span v-if="description" class="a2ui-field-description">{{ description }}</span>
    <span class="a2ui-textfield-control">
      <span v-if="prefix" class="a2ui-field-affix">{{ prefix }}</span>
    <textarea
      v-if="isTextarea"
      class="a2ui-textfield-input"
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :required="isRequired"
      :readonly="isReadonly"
      @input="currentValue = ($event.target as HTMLTextAreaElement).value"
    />
    <input
      v-else
      :type="inputType"
      class="a2ui-textfield-input"
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :required="isRequired"
      :readonly="isReadonly"
      @input="currentValue = ($event.target as HTMLInputElement).value"
    />
      <span v-if="suffix" class="a2ui-field-affix">{{ suffix }}</span>
    </span>
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </label>
</template>
