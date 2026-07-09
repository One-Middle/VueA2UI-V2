<script setup lang="ts">
import type { MessageDto } from "@a2ui-platform/shared";
import { NScrollbar } from "naive-ui";
import { nextTick, onMounted, ref, watch } from "vue";

const props = defineProps<{
  messages: MessageDto[];
  isGenerating?: boolean;
}>();

const bottomRef = ref<HTMLElement>();

const scrollToBottom = async () => {
  await nextTick();
  bottomRef.value?.scrollIntoView({ behavior: "smooth" });
};

onMounted(scrollToBottom);
watch(() => props.messages.length, scrollToBottom);
watch(() => props.isGenerating, (val) => {
  if (val) scrollToBottom();
});
</script>

<template>
  <n-scrollbar class="message-list">
    <div class="message-stack">
      <div v-if="messages.length === 0 && !isGenerating" class="message-empty">当前会话还没有消息。</div>
      <div v-for="msg in messages" :key="msg.id" :class="['message-bubble', msg.role]">
        <div class="message-role">{{ msg.role === "user" ? "你" : "AI" }}</div>
        <div class="message-content">{{ msg.content }}</div>
      </div>
      <!-- AI 正在生成时的打字指示器 -->
      <div v-if="isGenerating" class="message-bubble assistant typing-indicator">
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
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.message-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  max-width: 84%;
  padding: 12px 14px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgb(15 23 42 / 5%);
}

.message-bubble.user {
  align-self: flex-end;
  border-color: rgb(45 212 191 / 42%);
  background: linear-gradient(180deg, #ecfdf9 0%, #e5f7f2 100%);
  box-shadow: 0 10px 24px rgb(15 159 143 / 10%);
}

.message-bubble.assistant {
  align-self: flex-start;
  border-color: #e0e7f1;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.typing-indicator {
  min-width: 72px;
  border-color: rgb(45 212 191 / 42%);
  background: linear-gradient(180deg, #ecfdf9 0%, #e5f7f2 100%);
  box-shadow: 0 10px 24px rgb(15 159 143 / 8%);
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
