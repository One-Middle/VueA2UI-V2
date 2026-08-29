<script setup lang="ts">
/**
 * 普通卡片组件。
 *
 * 职责：
 * - 渲染卡片标题、副标题、媒体区、默认内容和底部说明
 * - 根据普通视觉 props 生成卡片样式类
 *
 * 不负责：解析 A2UI child/media 引用。
 */
import { computed, type CSSProperties } from "vue";

const props = defineProps<{
  title?: unknown;
  header?: unknown;
  subtitle?: unknown;
  footer?: unknown;
  role?: string;
  density?: string;
  selected?: boolean;
  clickable?: boolean;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const classes = computed(() =>
  [
    "a2ui-card",
    props.role ? `a2ui-card--role-${props.role}` : "",
    props.density ? `a2ui-card--density-${props.density}` : "",
    props.selected ? "a2ui-card--selected" : "",
    props.clickable ? "a2ui-card--clickable" : "",
    props.variant ? `a2ui-card--variant-${props.variant}` : "",
    props.size ? `a2ui-card--size-${props.size}` : "",
    props.tone ? `a2ui-card--tone-${props.tone}` : "",
    props.preset ? `a2ui-card--preset-${props.preset}` : "",
  ].filter(Boolean),
);
</script>

<template>
  <section :class="classes" :style="style">
    <slot name="media" />
    <header v-if="header || title || subtitle" class="a2ui-card-header">
      <div v-if="header || title" class="a2ui-card-title">
        {{ header || title }}
      </div>
      <div v-if="subtitle" class="a2ui-card-subtitle">{{ subtitle }}</div>
    </header>
    <slot />
    <footer v-if="footer" class="a2ui-card-footer">{{ footer }}</footer>
  </section>
</template>
