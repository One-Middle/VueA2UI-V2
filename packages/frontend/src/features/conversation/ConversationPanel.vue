<script setup lang="ts">
import { NResult, NSpin } from "naive-ui";
import { useWorkspaceStore } from "../../stores/workspace";
import MessageList from "./MessageList.vue";
import MessageInput from "./MessageInput.vue";

const workspace = useWorkspaceStore();

const send = async (content: string) => {
  try { await workspace.sendMessage(content); } catch { /* handled by store */ }
};
</script>

<template>
  <div v-if="!workspace.activeSessionId" class="panel-center">
    <n-result status="info" title="暂无会话" description="请先创建或选择一个会话" />
  </div>
  <div v-else class="conversation-panel">
    <n-spin :show="workspace.isSending" description="AI 正在生成 UI...">
      <MessageList :messages="workspace.messages" />
    </n-spin>
    <MessageInput :disabled="workspace.isSending" @send="send" />
  </div>
</template>

<style scoped>
.conversation-panel { display: flex; flex-direction: column; height: 100%; }
.panel-center { display: flex; align-items: center; justify-content: center; height: 100%; }
</style>
