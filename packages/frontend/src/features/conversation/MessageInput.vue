<script setup lang="ts">
import { NButton, NInput } from "naive-ui";
import { computed, ref } from "vue";

const emit = defineEmits<{ send: [content: string] }>();
const props = defineProps<{
  disabled?: boolean;
  isGenerating?: boolean;
}>();

const content = ref("");

const placeholder = computed(() => {
  if (props.isGenerating) return "AI 正在生成 UI，请稍候...";
  return "输入你的 UI 需求，例如：生成一个数据分析仪表盘，包含筛选、图表和结果列表...";
});

const handleSend = () => {
  if (!content.value.trim()) return;
  emit("send", content.value.trim());
  content.value = "";
};
</script>

<template>
  <div class="message-input-area">
    <n-input
      v-model:value="content"
      type="textarea"
      :placeholder="placeholder"
      :autosize="{ minRows: 3, maxRows: 6 }"
      :disabled="disabled"
      @keydown.enter.exact.prevent="handleSend"
    />
    <div class="input-actions">
      <span>{{ isGenerating ? "AI 思考中..." : "Enter 发送，Shift + Enter 换行" }}</span>
      <n-button type="primary" :disabled="disabled || !content.trim()" @click="handleSend">发送</n-button>
    </div>
  </div>
</template>

<style scoped>
.message-input-area {
  padding: 14px 16px 16px;
  border-top: 1px solid #e2eaf5;
  background:
    linear-gradient(180deg, rgb(248 250 252 / 72%) 0%, #ffffff 44%);
  box-shadow: 0 -12px 28px rgb(15 23 42 / 3%);
}

.message-input-area :deep(.n-input) {
  background: #ffffff;
  box-shadow:
    0 8px 22px rgb(15 23 42 / 4%),
    inset 0 1px 0 rgb(255 255 255 / 80%);
}

.message-input-area :deep(.n-input__textarea-el) {
  color: #1e293b;
  line-height: 1.65;
}

.input-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.input-actions span {
  color: #7b8da7;
  font-size: 12px;
}

.input-actions :deep(.n-button) {
  min-width: 58px;
}
</style>
