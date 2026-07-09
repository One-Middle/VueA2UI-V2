<script setup lang="ts">
import { NAlert, NSpin, NTag } from "naive-ui";
import { computed, ref } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";
import MessageInput from "./MessageInput.vue";
import MessageList from "./MessageList.vue";

const workspace = useWorkspaceStore();
const errorMessage = ref("");

const activeSession = computed(() => workspace.sessions.find((session) => session.id === workspace.activeSessionId));

const isBusy = computed(() => workspace.isSending || workspace.isGenerating);

const statusText = computed(() => {
  if (workspace.isSending) return "正在发送...";
  if (workspace.isGenerating) return "AI 正在生成 UI...";
  return workspace.activeSessionId ? "会话已选择" : "等待开始";
});

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
    <header class="conversation-toolbar">
      <div>
        <h2>需求对话</h2>
        <p>{{ activeSession?.title ?? "用自然语言描述页面、组件或交互需求。" }}</p>
      </div>
      <n-tag size="small" :type="isBusy ? 'info' : (workspace.activeSessionId ? 'success' : 'default')">
        {{ statusText }}
      </n-tag>
    </header>

    <n-alert v-if="errorMessage" class="conversation-error" type="error" closable @close="errorMessage = ''">
      {{ errorMessage }}
    </n-alert>

    <n-spin :show="workspace.isSending" description="正在发送需求...">
      <MessageList
        v-if="workspace.activeSessionId"
        :messages="workspace.messages"
        :is-generating="workspace.isGenerating"
      />
      <div v-else class="conversation-start">
        <div class="start-content">
          <h2>今天想创建什么 UI？</h2>
          <p>描述你的页面、组件或交互需求，发送后会自动创建会话并开始生成。</p>
        </div>
      </div>
    </n-spin>

    <MessageInput :disabled="isBusy" :is-generating="workspace.isGenerating" @send="send" />
  </div>
</template>

<style scoped>
.conversation-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.conversation-toolbar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 18px 16px;
  border-bottom: 1px solid #e2eaf5;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.conversation-toolbar h2 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.conversation-toolbar p {
  margin: 6px 0 0;
  color: #5d6f89;
  font-size: 13px;
  line-height: 1.5;
}

.conversation-error {
  margin: 12px 14px 0;
}

.conversation-panel :deep(.n-spin-container),
.conversation-panel :deep(.n-spin-content) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.conversation-start {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 36px 24px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 35%, rgb(15 159 143 / 8%), transparent 32%),
    linear-gradient(180deg, rgb(255 255 255 / 78%) 0%, rgb(251 253 251 / 70%) 100%);
}

.start-content {
  max-width: 440px;
  padding: 24px;
}

.start-content h2 {
  margin: 0 0 10px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 700;
}

.start-content p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
}
</style>
