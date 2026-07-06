<script setup lang="ts">
/**
 * ChoicePicker 组件：下拉选择器，读取 options + value 并双向绑定。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";

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
</script>

<template>
  <select
    class="a2ui-choicepicker"
    :data-component-id="componentId"
    :value="currentValue"
    @change="currentValue = ($event.target as HTMLSelectElement).value"
  >
    <option
      v-for="(opt, idx) in options"
      :key="idx"
      :value="opt.value as string"
    >{{ opt.label }}</option>
  </select>
</template>
