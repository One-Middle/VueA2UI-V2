<script setup lang="ts">
import { NButton, NInput } from "naive-ui";
import { ref } from "vue";
const emit = defineEmits<{ send: [content: string] }>();
defineProps<{ disabled?: boolean }>();

const content = ref("");
const handleSend = () => { if (content.value.trim()) { emit("send", content.value.trim()); content.value = ""; } };
</script>

<template>
  <div class="message-input-area">
    <n-input v-model:value="content" type="textarea" placeholder="输入您的 UI 需求..." :rows="3" :disabled="disabled"
      @keydown.enter.prevent="handleSend" />
    <n-button type="primary" :disabled="disabled || !content.trim()" @click="handleSend" style="margin-top: 8px">
      发送 (Enter)
    </n-button>
  </div>
</template>

<style scoped>
.message-input-area { padding: 12px 16px; border-top: 1px solid #eee; }
</style>
