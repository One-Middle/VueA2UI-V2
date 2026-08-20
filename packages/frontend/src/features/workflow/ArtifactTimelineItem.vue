<script setup lang="ts">
/**
 * Artifact 时间线节点。
 *
 * 将单个 workflow artifact 渲染为时间线上的一个产出/提问节点：
 * - plan / validation / clarification / decision → 复用 ArtifactSummary（可折叠详情）
 * - candidate → 紧凑摘要 + 恢复预览按钮
 */
import type { WorkflowArtifactDto } from "@a2ui-platform/shared";
import { NButton, NTag } from "naive-ui";
import { computed } from "vue";
import { artifactDisplay } from "./workflowDisplay";
import ArtifactSummary from "./ArtifactSummary.vue";

const props = defineProps<{ artifact: WorkflowArtifactDto }>();
const emit = defineEmits<{ restore: [artifact: WorkflowArtifactDto] }>();

const display = computed(() => artifactDisplay(props.artifact));
const isCandidate = computed(() => props.artifact.kind === "candidate_a2ui_messages");
const candidateCount = computed(() => {
  const content = props.artifact.contentJson as { messages?: unknown };
  return Array.isArray(content?.messages) ? content.messages.length : 0;
});
</script>

<template>
  <ArtifactSummary
    v-if="!isCandidate"
    :title="display.title"
    :tag="display.tag"
    :tag-type="display.tagType"
    :summary="display.summary"
    :details="display.details"
  />
  <div v-else class="candidate-summary">
    <div class="summary-title">
      <h3>{{ display.title }}</h3>
      <n-tag size="small" type="success">candidate_a2ui_messages</n-tag>
    </div>
    <p class="summary-line">{{ candidateCount }} 条 A2UI messages</p>
    <n-button size="tiny" :disabled="candidateCount === 0" @click="emit('restore', artifact)">
      恢复候选预览
    </n-button>
  </div>
</template>

<style scoped>
.candidate-summary {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fbfdff;
}

.summary-title {
  display: flex;
  gap: 8px;
  align-items: center;
}

.summary-title h3 {
  margin: 0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.summary-line {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}
</style>
