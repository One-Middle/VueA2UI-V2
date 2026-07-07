<script setup lang="ts">
import { NAlert, NSpin } from "naive-ui";
import { ref } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";
import MessageInput from "./MessageInput.vue";
import MessageList from "./MessageList.vue";

const workspace = useWorkspaceStore();
const errorMessage = ref("");

const send = async (content: string) => {
  errorMessage.value = "";
  try {
    await workspace.sendMessage(content);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "消息发送失败";
  }
};
</script>

<template>
  <div class="conversation-panel">
    <n-alert v-if="errorMessage" class="conversation-error" type="error" closable @close="errorMessage = ''">
      {{ errorMessage }}
    </n-alert>

    <n-spin :show="workspace.isSending" description="AI 正在生成 UI...">
      <MessageList v-if="workspace.activeSessionId" :messages="workspace.messages" />
      <div v-else class="conversation-start">
        <div class="start-content">
          <h2>今天想创建什么 UI？</h2>
          <p>描述你的页面、组件或交互需求，发送后会自动创建会话并开始生成。</p>
        </div>
      </div>
    </n-spin>
    <MessageInput :disabled="workspace.isSending" @send="send" />
  </div>
</template>

<style scoped>
.conversation-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.conversation-error {
  margin: 12px 16px 0;
}

.conversation-panel :deep(.n-spin-container),
.conversation-panel :deep(.n-spin-content) {
  flex: 1;
  min-height: 0;
}

.conversation-start {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 32px 24px;
  text-align: center;
}

.start-content {
  max-width: 560px;
}

.start-content h2 {
  margin: 0 0 12px;
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
}

.start-content p {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: #667085;
}
</style>
