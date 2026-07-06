<script setup lang="ts">
/**
 * DateTimeInput 组件：日期时间输入框，支持双向绑定。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";

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
</script>

<template>
  <label class="a2ui-datetimeinput" :data-component-id="componentId">
    <span v-if="label" class="a2ui-datetimeinput-label">{{ label }}</span>
    <input
      :type="inputType"
      class="a2ui-datetimeinput-input"
      :value="currentValue"
      @input="currentValue = ($event.target as HTMLInputElement).value"
    />
  </label>
</template>
