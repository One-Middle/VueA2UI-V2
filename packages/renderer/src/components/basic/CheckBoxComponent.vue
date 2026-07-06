<script setup lang="ts">
/**
 * CheckBox 组件：复选框 + label，支持双向绑定。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** label 属性 */
const label = computed(() => {
  const raw = ctx.componentModel.getProperty("label");
  return ctx.resolveValue(raw) ?? "";
});

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
  <label class="a2ui-checkbox" :data-component-id="componentId">
    <input
      type="checkbox"
      :checked="currentValue"
      @change="currentValue = ($event.target as HTMLInputElement).checked"
    />
    <span v-if="label">{{ label }}</span>
  </label>
</template>
