<script setup lang="ts">
/**
 * PreviewPanel：A2UI 渲染预览面板。
 *
 * 从 renderer store 获取 A2UI 消息，通过 MessageProcessor 处理后
 * 将 SurfaceGroupModel 传给 A2uiSurface 渲染。
 */
import { A2uiSurface, MessageProcessor, SurfaceGroupModel, registerBasicCatalog } from "@a2ui-platform/renderer";
import { NEmpty } from "naive-ui";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRendererStore } from "../../stores/renderer";

const renderer = useRendererStore();

// 注册 Basic Catalog 组件
registerBasicCatalog();

// 创建渲染引擎
const surfaceGroup = new SurfaceGroupModel();
const messageProcessor = new MessageProcessor(surfaceGroup);
const hasContent = ref(false);

// 监听 Renderer store 中的新消息
watch(
  () => renderer.messagesForRenderer.length,
  () => {
    if (renderer.messagesForRenderer.length > 0) {
      messageProcessor.processMessages(renderer.messagesForRenderer);
      hasContent.value = surfaceGroup.getSurfaceIds().length > 0;
    }
  },
  { immediate: true }
);

onMounted(() => {
  // 初始处理已有消息
  if (renderer.messagesForRenderer.length > 0) {
    messageProcessor.processMessages(renderer.messagesForRenderer);
    hasContent.value = surfaceGroup.getSurfaceIds().length > 0;
  }
});

onBeforeUnmount(() => {
  surfaceGroup.destroy();
});
</script>

<template>
  <div class="preview-panel">
    <div v-if="!hasContent" class="panel-center">
      <n-empty description="暂无 UI 内容，请在对话中输入需求生成页面" />
    </div>
    <div v-else>
      <A2uiSurface surface-id="main" :surface-group="surfaceGroup" />
    </div>
  </div>
</template>

<style scoped>
.preview-panel { height: 100%; padding: 16px; }
.panel-center { display: flex; align-items: center; justify-content: center; height: 100%; }
</style>
