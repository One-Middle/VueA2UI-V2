<script setup lang="ts">
/**
 * 内联 Clarification Form。
 *
 * 从旧 WorkflowPanel 拆出，作为 Workflow Message 内部的可复用表单；
 * 提交复用 store 的 submitWorkflowClarification（即原 WorkflowAction API）。
 */
import type { WorkflowArtifactDto } from "@a2ui-platform/shared";
import { NButton, NInput, NRadio, NRadioGroup, NSelect, NSpace } from "naive-ui";
import { computed, reactive, ref, watch } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";
import { canSubmitClarification, fieldOptions, type ClarificationField } from "./workflowDisplay";

const props = defineProps<{ artifact: WorkflowArtifactDto }>();

const workspace = useWorkspaceStore();
const formAnswers = reactive<Record<string, string | string[] | null>>({});
const additionalText = ref("");
const submitting = ref(false);

const clarificationFields = computed(() => {
  const content = props.artifact.contentJson as { fields?: unknown } | undefined;
  return Array.isArray(content?.fields) ? (content.fields as ClarificationField[]) : [];
});

const clarificationTitle = computed(() => {
  const content = props.artifact.contentJson as { title?: string } | undefined;
  return content?.title ?? "补充需求";
});

const clarificationDescription = computed(() => {
  const content = props.artifact.contentJson as { description?: string } | undefined;
  return content?.description ?? "请补充以下信息。";
});

const canSubmit = computed(() => canSubmitClarification(clarificationFields.value, { ...formAnswers }));

// 切换到新的 clarification artifact 时重置表单
watch(() => props.artifact.id, () => {
  for (const key of Object.keys(formAnswers)) delete formAnswers[key];
  additionalText.value = "";
});

function stringAnswer(id: string): string | null {
  const value = formAnswers[id];
  return typeof value === "string" ? value : null;
}

function selectAnswer(id: string, multiple: boolean): string | string[] | null {
  const value = formAnswers[id];
  if (multiple) return Array.isArray(value) ? value : [];
  return typeof value === "string" ? value : null;
}

function updateAnswer(id: string, value: string | string[] | null) {
  formAnswers[id] = value;
}

const submit = async () => {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    await workspace.submitWorkflowClarification(
      props.artifact.id,
      { ...formAnswers },
      additionalText.value.trim() || undefined,
    );
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="clarification-form tool-block">
    <div class="section-heading">
      <h3>{{ clarificationTitle }}</h3>
      <span class="tool-tag">askClarification</span>
    </div>
    <p class="tool-prompt">{{ clarificationDescription }}</p>
    <div class="form-grid">
      <label v-for="field in clarificationFields" :key="field.id" class="field-row">
        <span>{{ field.label }}</span>
        <small v-if="field.reason">{{ field.reason }}</small>
        <n-select
          v-if="field.type === 'select' || field.type === 'checkbox'"
          :value="selectAnswer(field.id, field.type === 'checkbox')"
          :multiple="field.type === 'checkbox'"
          :options="fieldOptions(field)"
          size="small"
          @update:value="(value) => updateAnswer(field.id, value)"
        />
        <n-radio-group
          v-else-if="field.type === 'radio'"
          :value="stringAnswer(field.id)"
          @update:value="(value) => updateAnswer(field.id, String(value))"
        >
          <n-space vertical>
            <n-radio v-for="option in fieldOptions(field)" :key="option.value" :value="option.value">
              {{ option.label }}
            </n-radio>
          </n-space>
        </n-radio-group>
        <n-input
          v-else
          :value="stringAnswer(field.id)"
          :type="field.type === 'textarea' ? 'textarea' : 'text'"
          size="small"
          :autosize="field.type === 'textarea' ? { minRows: 2, maxRows: 5 } : undefined"
          @update:value="(value) => updateAnswer(field.id, value)"
        />
      </label>
      <n-input
        v-model:value="additionalText"
        type="textarea"
        placeholder="其他补充"
        :autosize="{ minRows: 2, maxRows: 5 }"
      />
      <n-button type="primary" size="small" :disabled="!canSubmit" :loading="submitting" @click="submit">
        提交补充
      </n-button>
    </div>
  </section>
</template>

<style scoped>
.clarification-form {
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

.tool-prompt {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.form-grid,
.field-row {
  display: grid;
  gap: 8px;
}

.field-row span {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.field-row small {
  color: #64748b;
  font-size: 12px;
}
</style>
