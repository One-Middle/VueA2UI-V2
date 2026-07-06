<script setup lang="ts">
import type { MessageDto } from "@a2ui-platform/shared";
import { NScrollbar } from "naive-ui";
import { nextTick, onMounted, ref, watch } from "vue";

const props = defineProps<{ messages: MessageDto[] }>();
const bottomRef = ref<HTMLElement>();

const scrollToBottom = async () => { await nextTick(); bottomRef.value?.scrollIntoView({ behavior: "smooth" }); };

onMounted(scrollToBottom);
watch(() => props.messages.length, scrollToBottom);
</script>

<template>
  <n-scrollbar class="message-list">
    <div v-for="msg in messages" :key="msg.id" :class="['message-bubble', msg.role]">
      <div class="message-role">{{ msg.role === "user" ? "我" : "AI" }}</div>
      <div class="message-content">{{ msg.content }}</div>
    </div>
    <div ref="bottomRef" />
  </n-scrollbar>
</template>

<style scoped>
.message-list { flex: 1; padding: 16px; }
.message-bubble { margin-bottom: 12px; padding: 10px 14px; border-radius: 8px; max-width: 80%; }
.message-bubble.user { background: #e8f4fd; margin-left: auto; }
.message-bubble.assistant { background: #f5f5f5; }
.message-role { font-size: 12px; color: #999; margin-bottom: 4px; }
</style>
