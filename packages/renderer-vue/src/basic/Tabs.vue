<script setup lang="ts">
/**
 * 普通标签页组件。
 *
 * 职责：
 * - 管理 active key 并渲染标签头
 * - 通过 scoped default slot 暴露当前 activeKey
 *
 * 不负责：接收 RenderNode panels 或解析 A2UI tabItems。
 */
import { computed, ref, watch, type CSSProperties } from "vue";

export interface UiTabItem {
  key: string;
  title: string;
  disabled?: boolean;
}

const props = defineProps<{
  items?: UiTabItem[];
  modelValue?: string;
  defaultValue?: string;
  align?: string;
  fullWidth?: boolean;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const localActiveKey = ref(
  props.modelValue ?? props.defaultValue ?? props.items?.[0]?.key ?? "",
);
const activeKey = computed(() => props.modelValue ?? localActiveKey.value);
const classes = computed(() =>
  [
    "a2ui-tabs",
    props.align ? `a2ui-tabs--align-${props.align}` : "",
    props.fullWidth ? "a2ui-tabs--full-width" : "",
    props.variant ? `a2ui-tabs--variant-${props.variant}` : "",
    props.size ? `a2ui-tabs--size-${props.size}` : "",
    props.tone ? `a2ui-tabs--tone-${props.tone}` : "",
    props.preset ? `a2ui-tabs--preset-${props.preset}` : "",
  ].filter(Boolean),
);

watch(
  () => props.items,
  (items) => {
    if (!items?.length) {
      localActiveKey.value = "";
      return;
    }
    if (!items.some((item) => item.key === activeKey.value)) {
      localActiveKey.value = items[0]?.key ?? "";
    }
  },
  { immediate: true },
);

function selectTab(key: string, disabled?: boolean): void {
  if (disabled) return;
  localActiveKey.value = key;
  emit("update:modelValue", key);
}
</script>

<template>
  <div :class="classes" :style="style">
    <div class="a2ui-tabs-header">
      <button
        v-for="item in items || []"
        :key="item.key"
        class="a2ui-tabs-tab"
        :class="{ 'a2ui-tabs-tab--active': item.key === activeKey }"
        :disabled="item.disabled"
        @click="selectTab(item.key, item.disabled)"
      >
        {{ item.title }}
      </button>
    </div>
    <div class="a2ui-tabs-content">
      <slot :active-key="activeKey" />
    </div>
  </div>
</template>
