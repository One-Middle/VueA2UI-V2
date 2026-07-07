<script setup lang="ts">
/**
 * Tabs 组件：标签页容器，读取 tabItems 数组。
 */
import { computed, inject, ref } from "vue";
import { componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** tabItems 数组：每个元素 { title: string; child: string } */
const tabItems = computed(() => {
  const raw = ctx.componentModel.getProperty("tabItems");
  const resolved = ctx.resolveValue(raw);
  return Array.isArray(resolved) ? resolved as Record<string, unknown>[] : [];
});

/** 当前选中的 tab 索引 */
const activeIndex = ref(0);

const activeTab = computed(() => tabItems.value[activeIndex.value]);

/** 切换标签页 */
function selectTab(index: number): void {
  activeIndex.value = index;
}
</script>

<template>
  <div class="a2ui-tabs" :data-component-id="componentId">
    <div class="a2ui-tabs-header">
      <button
        v-for="(tab, idx) in tabItems"
        :key="idx"
        class="a2ui-tabs-tab"
        :class="{ 'a2ui-tabs-tab--active': idx === activeIndex }"
        @click="selectTab(idx)"
      >
        {{ tab.title }}
      </button>
    </div>
    <div class="a2ui-tabs-content">
      <A2uiComponent
        v-if="activeTab?.child"
        :surface-id="surfaceId"
        :component-id="String(activeTab.child)"
      />
    </div>
  </div>
</template>
