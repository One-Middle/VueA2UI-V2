<script setup lang="ts">
import type { AgentWorkflowDetailDto, WorkflowArtifactDto, WorkflowStepDto } from "@a2ui-platform/shared";
import { NButton, NEmpty, NInput, NRadio, NRadioGroup, NSelect, NSpace, NTag } from "naive-ui";
import { computed, reactive, ref } from "vue";
import { useRendererStore } from "../../stores/renderer";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();
const renderer = useRendererStore();
const revisionText = ref("");
const formAnswers = reactive<Record<string, string | string[] | null>>({});

const activeWorkflow = computed(() => {
  return workspace.workflows.find((workflow) => !["completed", "failed", "cancelled"].includes(workflow.status))
    ?? workspace.workflows[0]
    ?? null;
});

const latestPlan = computed(() => latestArtifact(activeWorkflow.value, "plan_markdown"));
const latestClarification = computed(() => latestArtifact(activeWorkflow.value, "clarification_form"));
const latestCandidate = computed(() => latestArtifact(activeWorkflow.value, "candidate_a2ui_messages"));
const latestValidationReport = computed(() => latestArtifact(activeWorkflow.value, "validation_report"));
const latestStep = computed(() => activeWorkflow.value?.steps.at(-1) ?? null);

const candidateMessages = computed(() => {
  const content = latestCandidate.value?.contentJson as { messages?: unknown } | undefined;
  return Array.isArray(content?.messages) ? content.messages : [];
});

const previewCandidate = () => {
  if (candidateMessages.value.length === 0) return;
  renderer.replaceMessages(candidateMessages.value as Parameters<typeof renderer.replaceMessages>[0]);
};

const confirmPlan = async () => {
  await workspace.confirmWorkflowPlan();
};

const confirmCommit = async () => {
  await workspace.confirmWorkflowCommit(latestCandidate.value?.id);
};

const retryStep = async () => {
  await workspace.retryWorkflowStep();
};

const submitRevision = async () => {
  if (!revisionText.value.trim()) return;
  await workspace.sendMessage(revisionText.value);
  revisionText.value = "";
};

const submitClarification = async () => {
  const text = Object.entries(formAnswers)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value ?? "")}`)
    .join("\n");
  if (!text.trim()) return;
  await workspace.sendMessage(text);
};

function latestArtifact(workflow: AgentWorkflowDetailDto | null, kind: WorkflowArtifactDto["kind"]) {
  return workflow?.artifacts
    .filter((artifact) => artifact.kind === kind)
    .sort((a, b) => b.version - a.version)
    .at(0) ?? null;
}

function stepTypeLabel(step: WorkflowStepDto) {
  const map: Record<string, string> = {
    understand: "理解需求",
    clarify: "澄清需求",
    propose: "生成方案",
    confirm_plan: "确认方案",
    generate_a2ui: "生成 Candidate",
    validate: "校验",
    preview: "预览确认",
    confirm_commit: "确认提交",
    commit: "正式提交",
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

function fieldOptions(field: Record<string, unknown>) {
  const options = Array.isArray(field.options) ? field.options : [];
  return options.map((option) => {
    const item = option as { label?: string; value?: string };
    return { label: item.label ?? item.value ?? "", value: item.value ?? item.label ?? "" };
  });
}

function stringAnswer(id: unknown): string | null {
  const value = formAnswers[String(id)];
  return typeof value === "string" ? value : null;
}

function selectAnswer(id: unknown, multiple: boolean): string | string[] | null {
  const value = formAnswers[String(id)];
  if (multiple) return Array.isArray(value) ? value : [];
  return typeof value === "string" ? value : null;
}

function updateAnswer(id: unknown, value: string | string[] | null) {
  formAnswers[String(id)] = value;
}

function updateTextAnswer(id: unknown, value: string | [string, string] | null) {
  formAnswers[String(id)] = Array.isArray(value) ? value.join("\n") : value;
}

function clarificationFields() {
  const content = latestClarification.value?.contentJson as { fields?: unknown } | undefined;
  return Array.isArray(content?.fields) ? content.fields as Record<string, unknown>[] : [];
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
      <section v-if="latestClarification && latestStep?.type === 'clarify'" class="workflow-section">
        <div class="section-heading">
          <h3>澄清需求</h3>
          <n-tag size="small" type="info">需要补充</n-tag>
        </div>
        <div class="clarification-form">
          <label v-for="field in clarificationFields()" :key="String(field.id)" class="field-row">
            <span>{{ field.label }}</span>
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
              <n-space>
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
              @update:value="(value) => updateTextAnswer(field.id, value)"
            />
          </label>
          <n-input
            :value="stringAnswer('additional_instructions')"
            type="textarea"
            placeholder="其他自然语言补充"
            :autosize="{ minRows: 2, maxRows: 5 }"
            @update:value="(value) => updateTextAnswer('additional_instructions', value)"
          />
          <n-button type="primary" size="small" @click="submitClarification">提交补充</n-button>
        </div>
      </section>

      <section v-if="latestPlan" class="workflow-section">
        <div class="section-heading">
          <h3>Markdown 方案 v{{ latestPlan.version }}</h3>
          <n-tag size="small" :type="latestStep?.type === 'confirm_plan' ? 'info' : 'success'">
            {{ latestStep?.type === 'confirm_plan' ? "等待确认" : "已生成" }}
          </n-tag>
        </div>
        <pre class="plan-markdown">{{ latestPlan.contentText }}</pre>
        <div v-if="latestStep?.type === 'confirm_plan'" class="action-row">
          <n-button type="primary" size="small" :loading="workspace.isGenerating" @click="confirmPlan">
            确认方案
          </n-button>
          <n-input
            v-model:value="revisionText"
            size="small"
            placeholder="输入修改意见"
            @keyup.enter="submitRevision"
          />
          <n-button size="small" @click="submitRevision">提交修改</n-button>
        </div>
      </section>

      <section v-if="latestCandidate" class="workflow-section">
        <div class="section-heading">
          <h3>Candidate A2UI v{{ latestCandidate.version }}</h3>
          <n-tag size="small" type="success">可预览</n-tag>
        </div>
        <div class="candidate-summary">
          <span>{{ candidateMessages.length }} 条 A2UI messages</span>
          <span>Artifact {{ latestCandidate.id.slice(0, 8) }}</span>
        </div>
        <div class="action-row">
          <n-button size="small" @click="previewCandidate">恢复候选预览</n-button>
          <n-button
            v-if="latestStep?.type === 'preview'"
            type="primary"
            size="small"
            @click="confirmCommit"
          >
            确认提交
          </n-button>
          <n-input
            v-if="latestStep?.type === 'preview'"
            v-model:value="revisionText"
            size="small"
            placeholder="输入候选修改意见"
            @keyup.enter="submitRevision"
          />
        </div>
      </section>

      <section v-if="latestValidationReport" class="workflow-section failed">
        <div class="section-heading">
          <h3>Validation Report v{{ latestValidationReport.version }}</h3>
          <n-tag size="small" type="error">失败</n-tag>
        </div>
        <pre class="plan-markdown">{{ latestValidationReport.contentText }}</pre>
        <div class="action-row retry-row">
          <n-button type="primary" size="small" :loading="workspace.isGenerating" @click="retryStep">
            重试失败步骤
          </n-button>
        </div>
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
              <p>{{ step.failureReason ?? step.status }}</p>
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

.workflow-header p {
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
  padding: 12px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: #fbfdff;
}

.workflow-section.failed {
  border-color: #f2c6c6;
  background: #fffafa;
}

.section-heading {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.plan-markdown {
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

.clarification-form,
.field-row {
  display: grid;
  gap: 8px;
}

.field-row span {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.action-row {
  display: grid;
  gap: 8px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  margin-top: 10px;
}

.retry-row {
  grid-template-columns: auto;
  justify-content: start;
}

.candidate-summary {
  display: flex;
  gap: 12px;
  color: #64748b;
  font-size: 12px;
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
