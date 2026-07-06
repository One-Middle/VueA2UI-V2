<script setup lang="ts">
/**
 * Slider 组件：渲染滑块，支持 min / max / value 双向绑定。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 最小值 */
const min = computed(() => {
  const raw = ctx.componentModel.getProperty("min");
  return Number(ctx.resolveValue(raw) ?? 0);
});

/** 最大值 */
const max = computed(() => {
  const raw = ctx.componentModel.getProperty("max");
  return Number(ctx.resolveValue(raw) ?? 100);
});

/** 当前值（双向绑定） */
const currentValue = computed({
  get() {
    const raw = ctx.componentModel.getProperty("value");
    return Number(ctx.resolveValue(raw) ?? 0);
  },
  set(val: number) {
    const raw = ctx.componentModel.getProperty("value");
    if (raw && typeof raw === "object" && "path" in raw) {
      ctx.dataContext.set((raw as { path: string }).path, val);
    }
  },
});
</script>

<template>
  <div class="a2ui-slider" :data-component-id="componentId">
    <input
      type="range"
      :min="min"
      :max="max"
      :value="currentValue"
      @input="currentValue = Number(($event.target as HTMLInputElement).value)"
    />
    <span class="a2ui-slider-value">{{ currentValue }}</span>
  </div>
</template>
