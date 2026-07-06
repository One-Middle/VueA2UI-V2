<script setup lang="ts">
/**
 * TextField 组件：输入框 / 文本域，支持 label 和双向绑定。
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

/** 当前文本值（通过 text 属性的 { path } 引用解析） */
const currentValue = computed({
  get() {
    const raw = ctx.componentModel.getProperty("text");
    return ctx.resolveValue(raw) ?? "";
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
  return ctx.resolveValue(raw) ?? "short";
});

const isTextarea = computed(() => usageHint.value === "long");
</script>

<template>
  <label class="a2ui-textfield" :data-component-id="componentId">
    <span v-if="label" class="a2ui-textfield-label">{{ label }}</span>
    <textarea
      v-if="isTextarea"
      class="a2ui-textfield-input"
      :value="currentValue"
      @input="currentValue = ($event.target as HTMLTextAreaElement).value"
    />
    <input
      v-else
      type="text"
      class="a2ui-textfield-input"
      :value="currentValue"
      @input="currentValue = ($event.target as HTMLInputElement).value"
    />
  </label>
</template>
