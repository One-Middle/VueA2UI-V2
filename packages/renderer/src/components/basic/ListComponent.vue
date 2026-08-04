<script setup lang="ts">
/**
 * List 组件：渲染列表，支持动态 children（path + componentId 模板）。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";
import { resolveBooleanProp, resolveStringProp } from "./visual-props";

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

/** 动态列表每一项的独立数据作用域 */
const itemBasePaths = computed(() => {
  if (!dynamicChild.value) return [];
  const listBasePath = ctx.dataContext.resolvePath(dynamicChild.value.path);
  return items.value.map((_, index) => appendPathSegment(listBasePath, String(index)));
});

/** 静态 children（字符串列表） */
const staticChildren = computed(() => ctx.componentModel.getStaticChildren());

const emptyText = computed(() => resolveStringProp(ctx, "emptyText"));

const isLoading = computed(() => resolveBooleanProp(ctx, "loading"));

const itemRole = computed(() => resolveStringProp(ctx, "itemRole") || "default");

const hasDividers = computed(() => resolveBooleanProp(ctx, "dividers"));

const listClasses = computed(() => [
  "a2ui-list",
  `a2ui-list--item-role-${itemRole.value}`,
  {
    "a2ui-list--dividers": hasDividers.value,
    "a2ui-list--loading": isLoading.value,
  },
]);

function appendPathSegment(basePath: string, segment: string): string {
  return basePath === "/" ? `/${segment}` : `${basePath}/${segment}`;
}
</script>

<template>
  <ul :class="listClasses" :data-component-id="componentId">
    <li v-if="isLoading" class="a2ui-list-status">加载中...</li>
    <li
      v-else-if="emptyText && staticChildren.length === 0 && itemBasePaths.length === 0"
      class="a2ui-list-status"
    >
      {{ emptyText }}
    </li>
    <template v-else>
    <!-- 静态子组件 -->
    <li v-for="childId in staticChildren" :key="childId">
      <A2uiComponent
        :surface-id="surfaceId"
        :component-id="childId"
        :base-path="ctx.dataContext.basePath"
      />
    </li>

    <!-- 动态子组件：根据数据数组渲染 -->
    <li
      v-for="(itemBasePath, index) in itemBasePaths"
      :key="`${dynamicChild?.componentId}-${index}`"
    >
      <A2uiComponent
        :surface-id="surfaceId"
        :component-id="dynamicChild!.componentId"
        :base-path="itemBasePath"
      />
    </li>
    </template>
  </ul>
</template>
