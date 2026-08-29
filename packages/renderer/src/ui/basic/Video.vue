<script setup lang="ts">
/**
 * 普通视频播放组件。
 *
 * 职责：
 * - 使用浏览器原生 video 控件渲染媒体
 * - 接收普通媒体 props
 *
 * 不负责：解析 A2UI 动态绑定或执行动作。
 */
import { computed, type CSSProperties } from "vue";

const props = withDefaults(
  defineProps<{
    src?: unknown;
    poster?: unknown;
    controls?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    fit?: string;
    aspectRatio?: string;
    density?: string;
    variant?: string;
    size?: string;
    tone?: string;
    preset?: string;
    style?: CSSProperties;
  }>(),
  {
    controls: true,
  },
);

const classes = computed(() =>
  [
    "a2ui-video",
    props.density ? `a2ui-video--density-${props.density}` : "",
    props.variant ? `a2ui-video--variant-${props.variant}` : "",
    props.size ? `a2ui-video--size-${props.size}` : "",
    props.tone ? `a2ui-video--tone-${props.tone}` : "",
    props.preset ? `a2ui-video--preset-${props.preset}` : "",
  ].filter(Boolean),
);
const mediaStyle = computed<CSSProperties>(() => ({
  ...(props.style ?? {}),
  ...(props.fit ? { objectFit: props.fit as CSSProperties["objectFit"] } : {}),
  ...(props.aspectRatio
    ? { aspectRatio: props.aspectRatio.replace(":", " / ") }
    : {}),
}));
</script>

<template>
  <video
    :class="classes"
    :src="src ? String(src) : undefined"
    :poster="poster ? String(poster) : undefined"
    :controls="controls"
    :autoplay="autoplay"
    :loop="loop"
    :muted="muted"
    :style="mediaStyle"
  />
</template>
