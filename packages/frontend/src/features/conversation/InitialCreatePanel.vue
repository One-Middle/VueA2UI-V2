<script setup lang="ts">
import { NAlert, NButton, NInput } from "naive-ui";
import { ref } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();
const content = ref("");
const errorMessage = ref("");

const send = async () => {
  const value = content.value.trim();
  if (!value || workspace.isSending || workspace.isGenerating) return;

  errorMessage.value = "";
  try {
    await workspace.sendMessage(value);
    content.value = "";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "消息发送失败";
  }
};
</script>

<template>
  <section class="initial-create">
    <div class="initial-composer">
      <h1>你想构建什么？</h1>
      <div class="composer-bar">
        <n-input
          v-model:value="content"
          class="composer-input"
          placeholder="描述一个 A2UI 页面、组件或交互..."
          :disabled="workspace.isSending || workspace.isGenerating"
          @keydown.enter.prevent="send"
        />
        <n-button
          round
          type="primary"
          :disabled="workspace.isSending || workspace.isGenerating || !content.trim()"
          @click="send"
        >
          创建
        </n-button>
      </div>
      <p class="composer-meta">A2UI Agent Platform</p>
      <n-alert v-if="errorMessage" type="error" closable @close="errorMessage = ''">
        {{ errorMessage }}
      </n-alert>
    </div>
  </section>
</template>

<style scoped>
.initial-create {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 48px 24px;
}

.initial-composer {
  display: grid;
  width: min(640px, 100%);
  gap: 18px;
  justify-items: center;
  transform: translateY(-8vh);
}

.initial-composer h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(30px, 4vw, 42px);
  font-weight: 400;
  letter-spacing: 0;
}

.composer-bar {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px 8px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: rgb(255 255 255 / 82%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 78%),
    0 18px 40px rgb(15 23 42 / 8%);
  backdrop-filter: blur(18px);
}

.composer-input :deep(.n-input) {
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  background: transparent;
}

.composer-input :deep(.n-input-wrapper) {
  padding-left: 0;
}

.composer-input :deep(.n-input__input-el) {
  height: 38px;
  color: #172033;
  font-size: 15px;
}

.composer-meta {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

@media (max-width: 760px) {
  .initial-create {
    padding: 32px 14px;
  }

  .initial-composer {
    transform: translateY(-4vh);
  }

  .composer-bar {
    grid-template-columns: 1fr;
    border-radius: 8px;
    padding: 12px;
  }

  .composer-bar :deep(.n-button) {
    width: 100%;
  }
}
</style>
