<script setup lang="ts">
/**
 * List 组件：渲染列表，支持动态 children（path + componentId 模板）。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

/** 动态子项配置 */
const dynamicChild = computed(() => ctx.componentModel.getDynamicChild());

/** 数据路径指向的数组 */
const items = computed(() => {
  if (!dynamicChild.value) return [];
  const data = ctx.dataContext.resolve({ path: dynamicChild.value.path });
  return Array.isArray(data) ? data : [];
});

/** 静态 children（字符串列表） */
const staticChildren = computed(() => ctx.componentModel.getStaticChildren());
</script>

<template>
  <ul class="a2ui-list" :data-component-id="componentId">
    <!-- 静态子组件 -->
    <li v-for="childId in staticChildren" :key="childId">
      <A2uiComponent
        :surface-id="surfaceId"
        :component-id="childId"
      />
    </li>

    <!-- 动态子组件：根据数据数组渲染 -->
    <li
      v-for="(item, index) in items"
      :key="`${dynamicChild?.componentId}-${index}`"
    >
      <A2uiComponent
        :surface-id="surfaceId"
        :component-id="dynamicChild!.componentId"
      />
    </li>
  </ul>
</template>
