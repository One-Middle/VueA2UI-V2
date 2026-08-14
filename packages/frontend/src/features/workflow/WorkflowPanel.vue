<script setup lang="ts">
import type {
  AgentWorkflowDetailDto,
  WorkflowArtifactDto,
  WorkflowDecisionOption,
  WorkflowStepDto,
} from "@a2ui-platform/shared";
import { NButton, NEmpty, NInput, NRadio, NRadioGroup, NSelect, NSpace, NTag } from "naive-ui";
import { computed, reactive, ref, watch } from "vue";
import { useRendererStore } from "../../stores/renderer";
import { useWorkspaceStore } from "../../stores/workspace";

type ClarificationField = {
  id: string;
  label: string;
  type: "select" | "radio" | "checkbox" | "text" | "textarea";
  required: boolean;
  reason?: string;
  options?: Array<{ id?: string; label?: string; value?: string }>;
};

type DecisionForm = {
  title: string;
  prompt: string;
  guidance?: string;
  target: "plan_markdown" | "candidate_a2ui_messages";
  targetArtifactId?: string;
  options: Array<{ id: WorkflowDecisionOption; label: string; description?: string }>;
};

const workspace = useWorkspaceStore();
const renderer = useRendererStore();
const formAnswers = reactive<Record<string, string | string[] | null>>({});
const additionalText = ref("");
const selectedDecision = ref<WorkflowDecisionOption | null>(null);
const decisionComment = ref("");

const activeWorkflow = computed(() => {
  return workspace.workflows.find((workflow) => !["completed", "failed", "cancelled"].includes(workflow.status))
    ?? workspace.workflows[0]
    ?? null;
});

const latestStep = computed(() => activeWorkflow.value?.steps.at(-1) ?? null);
const latestPlan = computed(() => latestArtifact(activeWorkflow.value, "plan_markdown"));
const latestClarification = computed(() => latestArtifact(activeWorkflow.value, "clarification_form"));
const latestDecision = computed(() => latestArtifact(activeWorkflow.value, "decision_form"));
const latestCandidate = computed(() => latestArtifact(activeWorkflow.value, "candidate_a2ui_messages"));
const latestValidationReport = computed(() => latestArtifact(activeWorkflow.value, "validation_report"));

const clarificationFields = computed(() => {
  const content = latestClarification.value?.contentJson as { fields?: unknown } | undefined;
  return Array.isArray(content?.fields) ? content.fields as ClarificationField[] : [];
});

const clarificationTitle = computed(() => {
  const content = latestClarification.value?.contentJson as { title?: string } | undefined;
  return content?.title ?? "补充需求";
});

const clarificationDescription = computed(() => {
  const content = latestClarification.value?.contentJson as { description?: string } | undefined;
  return content?.description ?? "请补充以下信息。";
});

const decisionForm = computed(() => {
  const content = latestDecision.value?.contentJson as Partial<DecisionForm> | undefined;
  if (!content?.title || !content.prompt || !content.target || !Array.isArray(content.options)) return null;
  return content as DecisionForm;
});

const showClarificationForm = computed(() => {
  return Boolean(
    latestClarification.value &&
    latestStep.value?.type === "plan" &&
    latestStep.value.status === "awaiting_confirmation" &&
    latestStep.value.stageState === "awaiting_clarification" &&
    latestClarification.value.workflowStepId === latestStep.value.id,
  );
});

const showDecisionForm = computed(() => {
  return Boolean(
    latestDecision.value &&
    latestStep.value?.status === "awaiting_confirmation" &&
    ["awaiting_plan_confirmation", "awaiting_preview_confirmation"].includes(latestStep.value.stageState ?? "") &&
    latestDecision.value.workflowStepId === latestStep.value.id &&
    decisionForm.value,
  );
});

const candidateMessages = computed(() => {
  const content = latestCandidate.value?.contentJson as { messages?: unknown } | undefined;
  return Array.isArray(content?.messages) ? content.messages : [];
});

const canSubmitClarification = computed(() => {
  return clarificationFields.value.every((field) => {
    if (!field.required) return true;
    const value = formAnswers[field.id];
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value?.trim());
  });
});

const canSubmitDecision = computed(() => {
  if (!selectedDecision.value) return false;
  if (selectedDecision.value === "revise") return decisionComment.value.trim().length > 0;
  return true;
});

watch(() => latestClarification.value?.id, () => {
  for (const key of Object.keys(formAnswers)) delete formAnswers[key];
  additionalText.value = "";
});

watch(() => latestDecision.value?.id, () => {
  selectedDecision.value = null;
  decisionComment.value = "";
});

const previewCandidate = () => {
  if (candidateMessages.value.length === 0) return;
  renderer.replaceMessages(candidateMessages.value as Parameters<typeof renderer.replaceMessages>[0]);
};

const submitClarification = async () => {
  if (!latestClarification.value || !canSubmitClarification.value) return;
  await workspace.submitWorkflowClarification(
    latestClarification.value.id,
    { ...formAnswers },
    additionalText.value.trim() || undefined,
  );
};

const submitDecision = async () => {
  if (!latestDecision.value || !selectedDecision.value || !canSubmitDecision.value) return;
  await workspace.submitWorkflowDecision(
    latestDecision.value.id,
    selectedDecision.value,
    selectedDecision.value === "revise" ? decisionComment.value.trim() : undefined,
  );
};

const retryStep = async () => {
  await workspace.retryWorkflowStep();
};

function latestArtifact(workflow: AgentWorkflowDetailDto | null, kind: WorkflowArtifactDto["kind"]) {
  return workflow?.artifacts
    .filter((artifact) => artifact.kind === kind)
    .sort((a, b) => b.version - a.version)
    .at(0) ?? null;
}

function stepTypeLabel(step: WorkflowStepDto) {
  const map: Record<string, string> = {
    plan: "Plan",
    generate_a2ui: "Generate A2UI",
    validate: "Validate",
    preview: "Preview",
    commit: "Commit",
  };
  return map[step.type] ?? step.type;
}

function statusType(status: string) {
  if (["completed", "confirmed"].includes(status)) return "success";
  if (status === "failed") return "error";
  if (["running", "awaiting_confirmation"].includes(status)) return "info";
  if (status === "skipped") return "warning";
  return "default";
}

function fieldOptions(field: ClarificationField) {
  return (field.options ?? []).map((option) => {
    const value = option.value ?? option.id ?? option.label ?? "";
    return { label: option.label ?? value, value };
  });
}

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

function decisionLabel(option: WorkflowDecisionOption) {
  if (option === "confirm") return "确认";
  if (option === "revise") return "修改";
  return "拒绝";
}
</script>

<template>
  <section class="workflow-panel">
    <header class="workflow-header">
      <div>
        <h2>Workflow</h2>
        <p>{{ activeWorkflow?.title ?? "当前会话暂无 workflow" }}</p>
      </div>
      <n-tag size="small" :type="activeWorkflow ? statusType(activeWorkflow.status) : 'default'">
        {{ activeWorkflow?.status ?? "idle" }}
      </n-tag>
    </header>

    <div v-if="!activeWorkflow" class="workflow-empty">
      <n-empty description="发送 A2UI 需求后会在这里显示方案、候选预览和提交状态。" />
    </div>

    <div v-else class="workflow-body">
      <section v-if="showClarificationForm" class="workflow-section tool-block">
        <div class="section-heading">
          <h3>{{ clarificationTitle }}</h3>
          <n-tag size="small" type="info">askClarification</n-tag>
        </div>
        <p class="tool-prompt">
          {{ clarificationDescription }}
        </p>
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
          <n-button type="primary" size="small" :disabled="!canSubmitClarification" @click="submitClarification">
            提交补充
          </n-button>
        </div>
      </section>

      <section v-if="latestPlan" class="workflow-section">
        <div class="section-heading">
          <h3>Markdown Plan v{{ latestPlan.version }}</h3>
          <n-tag size="small" type="success">plan_markdown</n-tag>
        </div>
        <pre class="artifact-text">{{ latestPlan.contentText }}</pre>
      </section>

      <section v-if="latestCandidate" class="workflow-section">
        <div class="section-heading">
          <h3>Candidate A2UI v{{ latestCandidate.version }}</h3>
          <n-tag size="small" type="success">candidate_a2ui_messages</n-tag>
        </div>
        <div class="candidate-summary">
          <span>{{ candidateMessages.length }} 条 A2UI messages</span>
          <span>Artifact {{ latestCandidate.id.slice(0, 8) }}</span>
        </div>
        <n-button size="small" @click="previewCandidate">恢复候选预览</n-button>
      </section>

      <section v-if="showDecisionForm && decisionForm" class="workflow-section tool-block">
        <div class="section-heading">
          <h3>{{ decisionForm.title }}</h3>
          <n-tag size="small" type="info">askUserDecision</n-tag>
        </div>
        <p class="tool-prompt">{{ decisionForm.prompt }}</p>
        <p v-if="decisionForm.guidance" class="tool-guidance">{{ decisionForm.guidance }}</p>
        <n-radio-group v-model:value="selectedDecision">
          <n-space vertical>
            <n-radio v-for="option in decisionForm.options" :key="option.id" :value="option.id">
              <strong>{{ option.label || decisionLabel(option.id) }}</strong>
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
        <n-button type="primary" size="small" :disabled="!canSubmitDecision" @click="submitDecision">
          提交选择
        </n-button>
      </section>

      <section v-if="latestValidationReport" class="workflow-section">
        <div class="section-heading">
          <h3>Validation Report v{{ latestValidationReport.version }}</h3>
          <n-tag size="small" :type="latestValidationReport.contentJson.valid === true ? 'success' : 'error'">
            validation_report
          </n-tag>
        </div>
        <pre class="artifact-text">{{ latestValidationReport.contentText }}</pre>
        <n-button
          v-if="latestStep?.status === 'failed'"
          type="primary"
          size="small"
          :loading="workspace.isGenerating"
          @click="retryStep"
        >
          重试失败步骤
        </n-button>
      </section>

      <section class="workflow-section">
        <div class="section-heading">
          <h3>Timeline</h3>
          <n-tag size="small">{{ activeWorkflow.steps.length }} steps</n-tag>
        </div>
        <ol class="timeline-list">
          <li v-for="step in activeWorkflow.steps" :key="step.id">
            <span class="timeline-index">{{ step.sequence }}</span>
            <div>
              <strong>{{ stepTypeLabel(step) }}</strong>
              <p>{{ step.stageState ?? step.failureReason ?? step.status }}</p>
            </div>
            <n-tag size="small" :type="statusType(step.status)">{{ step.status }}</n-tag>
          </li>
        </ol>
      </section>
    </div>
  </section>
</template>

<style scoped>
.workflow-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid #e2eaf5;
  border-left: 1px solid #e2eaf5;
  background: #ffffff;
}

.workflow-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px;
  border-bottom: 1px solid #e2eaf5;
}

.workflow-header h2,
.section-heading h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
}

.workflow-header p,
.tool-prompt,
.tool-guidance {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.workflow-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 14px;
  overflow: auto;
}

.workflow-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.workflow-section {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: #fbfdff;
}

.tool-block {
  border-color: #0ea5e9;
  background: #f7fcff;
}

.section-heading {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.artifact-text {
  max-height: 260px;
  margin: 0;
  padding: 10px;
  overflow: auto;
  border-radius: 6px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
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

.field-row small,
.option-description,
.candidate-summary {
  color: #64748b;
  font-size: 12px;
}

.option-description {
  display: block;
  margin-top: 2px;
}

.candidate-summary {
  display: flex;
  gap: 12px;
}

.timeline-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-list li {
  display: grid;
  gap: 10px;
  align-items: center;
  grid-template-columns: 24px minmax(0, 1fr) auto;
}

.timeline-index {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 999px;
  background: #e2eaf5;
  color: #334155;
  font-size: 12px;
}

.timeline-list strong {
  color: #0f172a;
  font-size: 13px;
}

.timeline-list p {
  margin: 2px 0 0;
  color: #64748b;
  font-size: 12px;
}
</style>
