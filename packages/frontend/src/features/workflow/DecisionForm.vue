<script setup lang="ts">
/**
 * 内联 Decision Form（确认 / 修改 / 拒绝三选一）。
 *
 * 从旧 WorkflowPanel 拆出，作为 Workflow Message 内部的可复用表单；
 * 提交复用 store 的 submitWorkflowDecision（即原 WorkflowAction API）。
 */
import type { WorkflowArtifactDto, WorkflowDecisionOption } from "@a2ui-platform/shared";
import { NButton, NInput, NRadio, NRadioGroup, NSpace } from "naive-ui";
import { computed, ref, watch } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";
import { canSubmitDecision, decisionOptionLabel, type DecisionFormData } from "./workflowDisplay";

const props = defineProps<{ artifact: WorkflowArtifactDto }>();

const workspace = useWorkspaceStore();
const selectedDecision = ref<WorkflowDecisionOption | null>(null);
const decisionComment = ref("");
const submitting = ref(false);

const decisionForm = computed(() => {
  const content = props.artifact.contentJson as Partial<DecisionFormData> | undefined;
  if (!content?.title || !content.prompt || !content.target || !Array.isArray(content.options)) return null;
  return content as DecisionFormData;
});

const canSubmit = computed(() => canSubmitDecision(selectedDecision.value, decisionComment.value));

// 切换到新的 decision artifact 时重置表单
watch(() => props.artifact.id, () => {
  selectedDecision.value = null;
  decisionComment.value = "";
});

const submit = async () => {
  if (!selectedDecision.value || !canSubmit.value) return;
  submitting.value = true;
  try {
    await workspace.submitWorkflowDecision(
      props.artifact.id,
      selectedDecision.value,
      selectedDecision.value === "revise" ? decisionComment.value.trim() : undefined,
    );
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section v-if="decisionForm" class="decision-form tool-block">
    <div class="section-heading">
      <h3>{{ decisionForm.title }}</h3>
      <span class="tool-tag">askUserDecision</span>
    </div>
    <p class="tool-prompt">{{ decisionForm.prompt }}</p>
    <p v-if="decisionForm.guidance" class="tool-guidance">{{ decisionForm.guidance }}</p>
    <n-radio-group v-model:value="selectedDecision">
      <n-space vertical>
        <n-radio v-for="option in decisionForm.options" :key="option.id" :value="option.id">
          <strong>{{ option.label || decisionOptionLabel(option.id) }}</strong>
          <span v-if="option.description" class="option-description">{{ option.description }}</span>
        </n-radio>
      </n-space>
    </n-radio-group>
    <n-input
      v-if="selectedDecision === 'revise'"
      v-model:value="decisionComment"
      type="textarea"
      placeholder="输入修改意见"
      :autosize="{ minRows: 2, maxRows: 5 }"
    />
    <n-button type="primary" size="small" :disabled="!canSubmit" :loading="submitting" @click="submit">
      提交选择
    </n-button>
  </section>
</template>

<style scoped>
.decision-form {
  display: grid;
  gap: 10px;
}

.section-heading {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.section-heading h3 {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.tool-tag {
  padding: 2px 8px;
  border-radius: 999px;
  color: #0369a1;
  font-size: 11px;
  font-weight: 600;
  background: rgb(14 165 233 / 12%);
}

.tool-prompt,
.tool-guidance {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.option-description {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}
</style>
