<script setup lang="ts">
/**
 * AI Workflow Message：一次 Workflow 的连续执行，聚合成会话流中的一条消息。
 *
 * 内部按时间顺序渲染一条事件时间线：agent 过程（reasoning summary / 工具调用）、
 * artifact 产出、用户动作（确认/修改/拒绝/补充，可展开明细），末尾是等待中的表单
 * 与生成中动画。
 */
import type { AgentWorkflowDetailDto, MessageDto, WorkflowArtifactDto } from "@a2ui-platform/shared";
import { NButton, NTag } from "naive-ui";
import { computed } from "vue";
import { useRendererStore } from "../../stores/renderer";
import { useWorkspaceStore } from "../../stores/workspace";
import {
  buildWorkflowTimeline,
  latestArtifact,
  orderedSteps,
  shouldShowClarificationForm,
  shouldShowDecisionForm,
  stepLogAction,
  type TimelineNode,
} from "./workflowDisplay";
import ArtifactTimelineItem from "./ArtifactTimelineItem.vue";
import ClarificationForm from "./ClarificationForm.vue";
import DecisionForm from "./DecisionForm.vue";
import UserActionTimelineItem from "./UserActionTimelineItem.vue";

const props = defineProps<{
  workflowId: string;
  workflow: AgentWorkflowDetailDto | null;
  stepLogMessages: MessageDto[];
  actionMessages: MessageDto[];
}>();

const workspace = useWorkspaceStore();
const renderer = useRendererStore();

const steps = computed(() => orderedSteps(props.workflow));
const latestStep = computed(() => steps.value.at(-1) ?? null);

const latestClarification = computed(() => latestArtifact(props.workflow, "clarification_form"));
const latestDecision = computed(() => latestArtifact(props.workflow, "decision_form"));

const showClarificationForm = computed(() =>
  shouldShowClarificationForm(latestStep.value, latestClarification.value));
const showDecisionForm = computed(() =>
  shouldShowDecisionForm(latestStep.value, latestDecision.value));

/** 当前等待中的表单 artifact（从时间线排除，单独渲染在末尾）。 */
const waitingArtifactIds = computed(() => {
  const ids = new Set<string>();
  if (showClarificationForm.value && latestClarification.value) ids.add(latestClarification.value.id);
  if (showDecisionForm.value && latestDecision.value) ids.add(latestDecision.value.id);
  return ids;
});

/** 事件时间线：agent 过程、artifact 产出、用户动作按 createdAt 合并排序。 */
const timeline = computed(() =>
  buildWorkflowTimeline(props.workflow, props.stepLogMessages, props.actionMessages, waitingArtifactIds.value),
);

const statusMeta = computed(() => {
  const status = props.workflow?.status;
  switch (status) {
    case "completed":
      return { label: "completed", type: "success" as const };
    case "failed":
    case "failed_retryable":
      return { label: status, type: "error" as const };
    case "running":
    case "active":
      return { label: status, type: "info" as const };
    case "awaiting_confirmation":
      return { label: "awaiting_confirmation", type: "warning" as const };
    case "cancelled":
      return { label: "cancelled", type: "default" as const };
    default:
      return { label: status ?? "—", type: "default" as const };
  }
});

const retryAvailable = computed(() => latestStep.value?.status === "failed");

/** 该 workflow 是否正在生成（存在 running 的 step），用于在消息末尾显示加载动画。 */
const isGenerating = computed(() =>
  props.workflow?.steps.some((step) => step.status === "running") ?? false,
);

const previewCandidate = (artifact: WorkflowArtifactDto) => {
  const content = artifact.contentJson as { messages?: unknown };
  const messages = Array.isArray(content?.messages) ? content.messages : [];
  if (messages.length === 0) return;
  renderer.replaceMessages(messages as Parameters<typeof renderer.replaceMessages>[0]);
};

const retryStep = async () => {
  await workspace.retryWorkflowStep();
};

/** 时间线节点的 v-for key。 */
const nodeKey = (node: TimelineNode): string =>
  node.kind === "artifact" ? `artifact-${node.artifact.id}` : `${node.kind}-${node.message.id}`;
</script>

<template>
  <article class="workflow-message">
    <header class="workflow-header">
      <div class="workflow-title">
        <span class="workflow-badge">Workflow</span>
        <strong>{{ workflow?.title ?? "AI Workflow" }}</strong>
      </div>
      <n-tag size="small" :type="statusMeta.type">{{ statusMeta.label }}</n-tag>
    </header>

    <div class="workflow-body">
      <ol v-if="timeline.length > 0" class="timeline">
        <li
          v-for="node in timeline"
          :key="nodeKey(node)"
          :class="['timeline-node', `node-${node.kind}`]"
        >
          <span class="timeline-dot" :data-kind="node.kind" />

          <!-- agent 过程节点 -->
          <div v-if="node.kind === 'agent'" class="timeline-content">
            <div class="step-row">
              <span v-if="stepLogAction(node.message).kind" class="step-tag" :data-kind="stepLogAction(node.message).kind">
                {{ stepLogAction(node.message).kind === 'tool' ? '工具' : '产出' }} · {{ stepLogAction(node.message).label }}
              </span>
              <span class="step-content" :class="{ 'is-result': node.message.kind !== 'agent_status' }">
                {{ node.message.content }}
              </span>
            </div>
          </div>

          <!-- artifact 产出 / 提问节点 -->
          <div v-else-if="node.kind === 'artifact'" class="timeline-content">
            <ArtifactTimelineItem :artifact="node.artifact" @restore="previewCandidate" />
          </div>

          <!-- 用户动作节点 -->
          <div v-else class="timeline-content">
            <UserActionTimelineItem :message="node.message" />
          </div>
        </li>
      </ol>

      <!-- 等待中的表单（时间线末尾） -->
      <ClarificationForm v-if="showClarificationForm && latestClarification" :artifact="latestClarification" />
      <DecisionForm v-if="showDecisionForm && latestDecision" :artifact="latestDecision" />

      <!-- 失败重试 -->
      <section v-if="retryAvailable" class="failure-retry">
        <div class="failure-reason">
          <strong>执行失败</strong>
          <p>{{ latestStep?.failureReason ?? "该步骤失败，可重试。" }}</p>
        </div>
        <n-button type="primary" size="small" :loading="workspace.isGenerating" @click="retryStep">
          重试失败步骤
        </n-button>
      </section>

      <!-- 生成中动画（时间线末尾） -->
      <div v-if="isGenerating" class="generating-indicator">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="generating-text">AI 正在生成...</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.workflow-message {
  align-self: flex-start;
  width: 100%;
  max-width: 76%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgb(15 23 42 / 5%);
}

.workflow-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 11px 13px;
  border-bottom: 1px solid #eef2f7;
}

.workflow-title {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.workflow-title strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  color: #0f766e;
  font-size: 11px;
  font-weight: 700;
  background: rgb(45 212 191 / 12%);
}

.workflow-body {
  display: grid;
  gap: 9px;
  padding: 12px 13px;
}

.timeline {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-node {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.timeline-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 999px;
  background: #cbd5e1;
}

.timeline-dot[data-kind="artifact"] {
  background: #0ea5e9;
}

.timeline-dot[data-kind="user-action"] {
  background: #0f9f8f;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.step-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
  padding: 6px 10px;
  border-left: 2px solid #e2e8f0;
  border-radius: 4px;
  background: #f8fafc;
}

.step-tag {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  background: #eef2f7;
}

.step-tag[data-kind="tool"] {
  color: #0369a1;
  background: rgb(14 165 233 / 12%);
}

.step-tag[data-kind="produce"] {
  color: #0f766e;
  background: rgb(45 212 191 / 14%);
}

/* 过程消息（agent_status）弱化展示，最终结果消息（chat）正常突出 */
.step-content {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.step-content.is-result {
  color: #1e293b;
  font-weight: 600;
}

.failure-retry {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
}

.failure-reason {
  min-width: 0;
}

.failure-reason strong {
  color: #b91c1c;
  font-size: 12px;
}

.failure-reason p {
  margin: 4px 0 0;
  color: #7f1d1d;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.generating-indicator {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 10px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.generating-indicator .dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #5eead4;
  animation: typing-bounce 1.2s infinite ease-in-out;
}

.generating-indicator .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.generating-indicator .dot:nth-child(3) {
  animation-delay: 0.4s;
}

.generating-text {
  margin-left: 2px;
  color: #94a3b8;
  font-size: 12px;
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
</style>
