<script setup lang="ts">
/**
 * 普通图片显示组件。
 *
 * 职责：
 * - 渲染图片、替代文本、比例和说明文案
 * - 使用普通 props 表达图片视觉状态
 *
 * 不负责：解析 A2UI 动态绑定或数据模型。
 */
import { computed, ref, type CSSProperties } from "vue";

const props = defineProps<{
  src?: unknown;
  alt?: string;
  fit?: string;
  aspectRatio?: string;
  loading?: "lazy" | "eager";
  role?: string;
  shape?: string;
  fallbackText?: string;
  caption?: unknown;
  variant?: string;
  size?: string;
  tone?: string;
  preset?: string;
  style?: CSSProperties;
}>();

const failed = ref(false);
const imageClass = computed(() =>
  [
    "a2ui-image",
    props.role ? `a2ui-image--role-${props.role}` : "",
    props.shape ? `a2ui-image--shape-${props.shape}` : "",
    props.variant ? `a2ui-image--variant-${props.variant}` : "",
    props.size ? `a2ui-image--size-${props.size}` : "",
    props.tone ? `a2ui-image--tone-${props.tone}` : "",
    props.preset ? `a2ui-image--preset-${props.preset}` : "",
  ].filter(Boolean),
);
const imageStyle = computed<CSSProperties>(() => ({
  ...(props.style ?? {}),
  ...(props.fit ? { objectFit: props.fit as CSSProperties["objectFit"] } : {}),
  ...(props.aspectRatio
    ? { aspectRatio: props.aspectRatio.replace(":", " / ") }
    : {}),
}));
</script>

<template>
  <figure class="a2ui-image-frame">
    <div v-if="failed || !src" class="a2ui-image-fallback" :style="imageStyle">
      {{ fallbackText || alt || "图片不可用" }}
    </div>
    <img
      v-else
      :class="imageClass"
      :src="String(src)"
      :alt="alt || ''"
      :loading="loading"
      :style="imageStyle"
      @error="failed = true"
    />
    <figcaption v-if="caption" class="a2ui-image-caption">
      {{ caption }}
    </figcaption>
  </figure>
</template>
