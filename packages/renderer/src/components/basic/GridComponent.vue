<script setup lang="ts">
/**
 * Grid 组件：面向卡片墙、表单栅格和仪表盘区域的二维布局容器。
 *
 * 使用语义字段描述列数、最小项宽和密度，避免让 A2UI 退化成任意 CSS Grid 配置。
 */
import { computed, inject } from "vue";
import type { CSSProperties } from "vue";
import { componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";
import {
  resolveStringProp,
  resolveVisualClasses,
  resolveVisualStyle,
} from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

const dynamicChild = computed(() => ctx.componentModel.getDynamicChild());

const staticChildren = computed(() => ctx.componentModel.getStaticChildren());

const items = computed(() => {
  if (!dynamicChild.value) return [];
  const data = ctx.dataContext.resolve({ path: dynamicChild.value.path });
  return Array.isArray(data) ? data : [];
});

const itemBasePaths = computed(() => {
  if (!dynamicChild.value) return [];
  const listBasePath = ctx.dataContext.resolvePath(dynamicChild.value.path);
  return items.value.map((_, index) => appendPathSegment(listBasePath, String(index)));
});

const columns = computed(() => {
  const resolved = ctx.resolveValue(ctx.componentModel.getProperty("columns"));
  if (resolved === "auto") return "auto";
  const value = Number(resolved ?? 1);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
});

const minItemWidth = computed(() => resolveStringProp(ctx, "minItemWidth") || "220px");

const gap = computed(() => resolveStringProp(ctx, "gap"));

const gridClasses = computed(() => [
  "a2ui-grid",
  ...resolveVisualClasses(ctx, "a2ui-grid"),
]);

const gridStyle = computed<CSSProperties>(() => ({
  ...resolveVisualStyle(ctx),
  gridTemplateColumns:
    columns.value === "auto"
      ? `repeat(auto-fit, minmax(${minItemWidth.value}, 1fr))`
      : `repeat(${columns.value}, minmax(0, 1fr))`,
  ...(gap.value ? { gap: gap.value } : {}),
}));

function appendPathSegment(basePath: string, segment: string): string {
  return basePath === "/" ? `/${segment}` : `${basePath}/${segment}`;
}
</script>

<template>
  <div
    class="a2ui-grid"
    :class="gridClasses"
    :style="gridStyle"
    :data-component-id="componentId"
  >
    <template v-if="dynamicChild">
      <A2uiComponent
        v-for="(itemBasePath, index) in itemBasePaths"
        :key="`${dynamicChild.componentId}-${index}`"
        :surface-id="surfaceId"
        :component-id="dynamicChild.componentId"
        :base-path="itemBasePath"
      />
    </template>
    <template v-else>
      <A2uiComponent
        v-for="childId in staticChildren"
        :key="childId"
        :surface-id="surfaceId"
        :component-id="childId"
        :base-path="ctx.dataContext.basePath"
      />
    </template>
  </div>
</template>
