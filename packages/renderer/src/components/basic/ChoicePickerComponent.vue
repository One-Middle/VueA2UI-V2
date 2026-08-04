<script setup lang="ts">
/**
 * ChoicePicker 组件：下拉选择器，读取 options + value 并双向绑定。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import { resolveBooleanProp, resolveStringProp } from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 选项列表 */
const options = computed(() => {
  const raw = ctx.componentModel.getProperty("options");
  const resolved = ctx.resolveValue(raw);
  return Array.isArray(resolved)
    ? (resolved as Array<{ label: string; value: unknown }>)
    : [];
});

const label = computed(() => resolveStringProp(ctx, "label"));

const description = computed(() => resolveStringProp(ctx, "description"));

const placeholder = computed(() => resolveStringProp(ctx, "placeholder"));

const helpText = computed(() => resolveStringProp(ctx, "helpText"));

const errorText = computed(() => resolveStringProp(ctx, "errorText"));

const validationState = computed(() => resolveStringProp(ctx, "validationState") || (errorText.value ? "error" : "default"));

const density = computed(() => resolveStringProp(ctx, "density") || "comfortable");

const mode = computed(() => resolveStringProp(ctx, "mode") || "select");

const isDisabled = computed(() => resolveBooleanProp(ctx, "disabled"));

const isRequired = computed(() => resolveBooleanProp(ctx, "required"));

const fieldClasses = computed(() => [
  "a2ui-choicepicker-field",
  `a2ui-field--validation-${validationState.value}`,
  `a2ui-field--density-${density.value}`,
  `a2ui-choicepicker-field--mode-${mode.value}`,
]);

/** 当前选中值（双向绑定） */
const currentValue = computed({
  get() {
    const raw = ctx.componentModel.getProperty("value");
    return ctx.resolveValue(raw) ?? "";
  },
  set(val: unknown) {
    const raw = ctx.componentModel.getProperty("value");
    if (raw && typeof raw === "object" && "path" in raw) {
      ctx.dataContext.set((raw as { path: string }).path, val as any);
    }
  },
});

function selectValue(value: unknown): void {
  currentValue.value = value;
}
</script>

<template>
  <div :class="fieldClasses" :data-component-id="componentId">
    <label v-if="label" class="a2ui-choicepicker-label">
      {{ label }}<span v-if="isRequired" class="a2ui-field-required">*</span>
    </label>
    <span v-if="description" class="a2ui-field-description">{{ description }}</span>

    <select
      v-if="mode === 'select'"
      class="a2ui-choicepicker"
      :value="currentValue"
      :disabled="isDisabled"
      :required="isRequired"
      @change="currentValue = ($event.target as HTMLSelectElement).value"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option
        v-for="(opt, idx) in options"
        :key="idx"
        :value="opt.value as string"
      >{{ opt.label }}</option>
    </select>

    <div v-else class="a2ui-choicepicker-options" role="group">
      <button
        v-for="(opt, idx) in options"
        :key="idx"
        type="button"
        class="a2ui-choicepicker-option"
        :class="{ 'a2ui-choicepicker-option--selected': currentValue === opt.value }"
        :disabled="isDisabled"
        @click="selectValue(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </div>
</template>
