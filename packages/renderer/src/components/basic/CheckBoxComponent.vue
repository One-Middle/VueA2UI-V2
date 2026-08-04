<script setup lang="ts">
/**
 * CheckBox 组件：复选框 + label，支持双向绑定。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import { resolveBooleanProp, resolveStringProp } from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** label 属性 */
const label = computed(() => {
  const raw = ctx.componentModel.getProperty("label");
  return ctx.resolveValue(raw) ?? "";
});

const description = computed(() => resolveStringProp(ctx, "description"));

const helpText = computed(() => resolveStringProp(ctx, "helpText"));

const errorText = computed(() => resolveStringProp(ctx, "errorText"));

const validationState = computed(() => resolveStringProp(ctx, "validationState") || (errorText.value ? "error" : "default"));

const density = computed(() => resolveStringProp(ctx, "density") || "comfortable");

const isDisabled = computed(() => resolveBooleanProp(ctx, "disabled"));

const isRequired = computed(() => resolveBooleanProp(ctx, "required"));

const fieldClasses = computed(() => [
  "a2ui-checkbox-field",
  `a2ui-field--validation-${validationState.value}`,
  `a2ui-field--density-${density.value}`,
]);

/** 当前选中值（双向绑定） */
const currentValue = computed({
  get() {
    const raw = ctx.componentModel.getProperty("value");
    return Boolean(ctx.resolveValue(raw));
  },
  set(val: boolean) {
    const raw = ctx.componentModel.getProperty("value");
    if (raw && typeof raw === "object" && "path" in raw) {
      ctx.dataContext.set((raw as { path: string }).path, val);
    }
  },
});
</script>

<template>
  <div :class="fieldClasses" :data-component-id="componentId">
    <label class="a2ui-checkbox">
      <input
        type="checkbox"
        :checked="currentValue"
        :disabled="isDisabled"
        :required="isRequired"
        @change="currentValue = ($event.target as HTMLInputElement).checked"
      />
      <span v-if="label">
        {{ label }}<span v-if="isRequired" class="a2ui-field-required">*</span>
      </span>
    </label>
    <span v-if="description" class="a2ui-field-description">{{ description }}</span>
    <span v-if="errorText" class="a2ui-field-error">{{ errorText }}</span>
    <span v-else-if="helpText" class="a2ui-field-help">{{ helpText }}</span>
  </div>
</template>
