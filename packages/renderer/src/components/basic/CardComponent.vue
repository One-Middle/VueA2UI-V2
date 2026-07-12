<script setup lang="ts">
/**
 * Card 组件：卡片容器，渲染可选 title 和单个 child。
 */
import { computed, inject } from "vue";
import { type ComponentContext, componentContextKey } from "../../vue/context";
import A2uiComponent from "../../vue/A2uiComponent.vue";

const props = defineProps<{ surfaceId: string; componentId: string }>();

const ctx = inject(componentContextKey)!;

const childComponentId = computed(() => {
  const raw = ctx.componentModel.getProperty("child");
  return ctx.resolveValue(raw) as string | undefined;
});

const childComponentIds = computed(() => ctx.componentModel.getChildIds());

const title = computed(() => {
  const raw = ctx.componentModel.getProperty("title");
  const resolved = ctx.resolveValue(raw);
  return typeof resolved === "string" ? resolved : "";
});
</script>

<template>
  <div class="a2ui-card" :data-component-id="componentId">
    <div v-if="title" class="a2ui-card-title">{{ title }}</div>
    <A2uiComponent
      v-if="childComponentId"
      :surface-id="surfaceId"
      :component-id="childComponentId"
    />
    <template v-else>
      <A2uiComponent
        v-for="childId in childComponentIds"
        :key="childId"
        :surface-id="surfaceId"
        :component-id="childId"
      />
    </template>
  </div>
</template>
