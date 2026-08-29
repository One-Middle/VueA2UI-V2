<script setup lang="ts">
/**
 * 普通音频播放组件。
 *
 * 职责：
 * - 使用浏览器原生 audio 控件渲染媒体
 * - 接收普通媒体 props
 *
 * 不负责：解析 A2UI 动态绑定或执行动作。
 */
import { computed, type CSSProperties } from "vue";

const props = withDefaults(
  defineProps<{
    src?: unknown;
    controls?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
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
    "a2ui-audio",
    props.density ? `a2ui-audio--density-${props.density}` : "",
    props.variant ? `a2ui-audio--variant-${props.variant}` : "",
    props.size ? `a2ui-audio--size-${props.size}` : "",
    props.tone ? `a2ui-audio--tone-${props.tone}` : "",
    props.preset ? `a2ui-audio--preset-${props.preset}` : "",
  ].filter(Boolean),
);
</script>

<template>
  <audio
    :class="classes"
    :src="src ? String(src) : undefined"
    :controls="controls"
    :autoplay="autoplay"
    :loop="loop"
    :muted="muted"
    :style="style"
  />
</template>
