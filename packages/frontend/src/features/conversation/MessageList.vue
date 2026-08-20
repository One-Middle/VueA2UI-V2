<script setup lang="ts">
import type { AgentWorkflowDetailDto, MessageDto } from "@a2ui-platform/shared";
import { NScrollbar } from "naive-ui";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { buildDisplayItems } from "../workflow/workflowDisplay";
import WorkflowMessage from "../workflow/WorkflowMessage.vue";

const props = defineProps<{
  messages: MessageDto[];
  workflows: AgentWorkflowDetailDto[];
  /** 非 workflow 的普通 agent run 是否生成中（用于独立 typing 指示器） */
  isPlainGenerating?: boolean;
}>();

const bottomRef = ref<HTMLElement>();

/**
 * 将消息列表聚合为「普通消息 / AI Workflow Message」两类展示项。
 * 保持原始顺序，Workflow Message 出现在其第一条相关消息的位置。
 */
const displayItems = computed(() => buildDisplayItems(props.messages, props.workflows));

const scrollToBottom = async () => {
  await nextTick();
  bottomRef.value?.scrollIntoView({ behavior: "smooth" });
};

onMounted(scrollToBottom);
watch(() => props.messages.length, scrollToBottom);
watch(() => props.isPlainGenerating, (val) => {
  if (val) scrollToBottom();
});
</script>

<template>
  <n-scrollbar class="message-list">
    <div class="message-stack">
      <div v-if="displayItems.length === 0 && !isPlainGenerating" class="message-empty">当前会话还没有消息。</div>

      <template v-for="item in displayItems" :key="item.kind === 'workflow' ? `workflow-${item.workflowId}` : `message-${item.message.id}`">
        <WorkflowMessage
          v-if="item.kind === 'workflow'"
          :workflow-id="item.workflowId"
          :workflow="item.workflow"
          :step-log-messages="item.stepLogMessages"
          :action-messages="item.actionMessages"
        />
        <div v-else :class="['message-bubble', item.message.role]">
          <div class="message-role">{{ item.message.role === 'user' ? '你' : 'AI' }}</div>
          <div class="message-content">{{ item.message.content }}</div>
        </div>
      </template>

      <!-- 非 workflow 普通聊天的打字指示器（workflow 的生成动画在 Workflow Message 末尾） -->
      <div v-if="isPlainGenerating" class="message-bubble assistant typing-indicator">
        <div class="message-role">AI</div>
        <div class="typing-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
      <div ref="bottomRef" />
    </div>
  </n-scrollbar>
</template>

<style scoped>
.message-list {
  flex: 1;
  min-height: 0;
  background: #ffffff;
}

.message-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 16px;
}

.message-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: #94a3b8;
  font-size: 13px;
}

.message-bubble {
  max-width: 72%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgb(15 23 42 / 4%);
}

.message-bubble.user {
  max-width: 78%;
  align-self: flex-end;
  border-color: rgb(45 212 191 / 34%);
  background: linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%);
  box-shadow: 0 10px 22px rgb(15 159 143 / 8%);
}

.message-bubble.assistant {
  align-self: flex-start;
  border-color: #e5e7eb;
  background: #ffffff;
}

.typing-indicator {
  min-width: 72px;
  border-color: rgb(45 212 191 / 34%);
  background: #ecfdf5;
  box-shadow: 0 10px 22px rgb(15 159 143 / 7%);
}

.typing-dots {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 4px 0;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #5eead4;
  animation: typing-bounce 1.2s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%, 60%, 100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  30% {
    opacity: 1;
    transform: scale(1.15);
  }
}

.message-role {
  display: inline-flex;
  align-items: center;
  margin-bottom: 6px;
  color: #5d6f89;
  font-size: 12px;
  font-weight: 700;
}

.message-role::before {
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 999px;
  background: #94a3b8;
  content: "";
}

.message-bubble.user .message-role {
  color: #0f766e;
}

.message-bubble.user .message-role::before {
  background: #0f9f8f;
}

.message-content {
  color: #1e293b;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
