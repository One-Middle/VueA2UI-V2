<script setup lang="ts">
/**
 * Card 组件：卡片容器，渲染可选 title 和单个 child。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";
import {
  resolveBooleanProp,
  resolveStringProp,
  resolveVisualClasses,
  resolveVisualStyle,
} from "./visual-props";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

const childComponentId = computed(() => {
  const raw = ctx.componentModel.getProperty("child");
  return ctx.resolveValue(raw) as string | undefined;
});

const childComponentIds = computed(() => ctx.componentModel.getChildIds());

const title = computed(() => {
  const raw = ctx.componentModel.getProperty("header") ?? ctx.componentModel.getProperty("title");
  const resolved = ctx.resolveValue(raw);
  return typeof resolved === "string" ? resolved : "";
});

const subtitle = computed(() => resolveStringProp(ctx, "subtitle"));

const footer = computed(() => resolveStringProp(ctx, "footer"));

const role = computed(() => resolveStringProp(ctx, "role") || "default");

const density = computed(() => resolveStringProp(ctx, "density") || "comfortable");

const isSelected = computed(() => resolveBooleanProp(ctx, "selected"));

const isClickable = computed(() => resolveBooleanProp(ctx, "clickable"));

const cardClasses = computed(() => [
  "a2ui-card",
  ...resolveVisualClasses(ctx, "a2ui-card"),
  `a2ui-card--role-${role.value}`,
  `a2ui-card--density-${density.value}`,
  {
    "a2ui-card--selected": isSelected.value,
    "a2ui-card--clickable": isClickable.value,
  },
]);

const cardStyle = computed(() => resolveVisualStyle(ctx));
</script>

<template>
  <div class="a2ui-card" :class="cardClasses" :style="cardStyle" :data-component-id="componentId">
    <header v-if="title || subtitle" class="a2ui-card-header">
      <div v-if="title" class="a2ui-card-title">{{ title }}</div>
      <div v-if="subtitle" class="a2ui-card-subtitle">{{ subtitle }}</div>
    </header>
    <A2uiComponent
      v-if="childComponentId"
      :surface-id="surfaceId"
      :component-id="childComponentId"
      :base-path="ctx.dataContext.basePath"
    />
    <template v-else>
      <A2uiComponent
        v-for="childId in childComponentIds"
        :key="childId"
        :surface-id="surfaceId"
        :component-id="childId"
        :base-path="ctx.dataContext.basePath"
      />
    </template>
    <footer v-if="footer" class="a2ui-card-footer">{{ footer }}</footer>
  </div>
</template>
