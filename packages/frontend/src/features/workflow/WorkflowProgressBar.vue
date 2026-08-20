<script setup lang="ts">
import type { AgentWorkflowDetailDto } from "@a2ui-platform/shared";
import { computed } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";
import {
  findActiveWorkflow,
  orderedSteps,
  stepVisualState,
  WORKFLOW_STEP_SEQUENCE,
} from "./workflowDisplay";

const workspace = useWorkspaceStore();

const activeWorkflow = computed(() => findActiveWorkflow(workspace.workflows));

/** 每个固定 step 对应的实际 step（若存在），用于取状态。 */
const stepEntries = computed(() => {
  const workflow: AgentWorkflowDetailDto | null = activeWorkflow.value;
  if (!workflow) return WORKFLOW_STEP_SEQUENCE.map((item) => ({ ...item, step: null }));
  const steps = orderedSteps(workflow);
  return WORKFLOW_STEP_SEQUENCE.map((item) => ({
    ...item,
    step: steps.find((step) => step.type === item.type) ?? null,
  }));
});
</script>

<template>
  <div class="workflow-progress" :class="{ empty: !activeWorkflow }">
    <div class="progress-caption">
      <span>{{ activeWorkflow ? "Agent Workflow" : "暂无 Workflow" }}</span>
      <span v-if="activeWorkflow" class="progress-status">{{ activeWorkflow.status }}</span>
    </div>
    <ol class="progress-steps">
      <li
        v-for="entry in stepEntries"
        :key="entry.type"
        class="progress-step"
        :data-state="entry.step ? stepVisualState(entry.step.status) : 'pending'"
      >
        <span class="progress-dot" />
        <span class="progress-label">{{ entry.label }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.workflow-progress {
  flex-shrink: 0;
  padding: 10px 16px 12px;
  border-bottom: 1px solid #e2eaf5;
  background:
    linear-gradient(180deg, #ffffff 0%, #f7fbfe 100%);
}

.progress-caption {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.progress-status {
  color: #94a3b8;
  font-weight: 600;
}

.progress-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.progress-step {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  color: #94a3b8;
  font-size: 12px;
}

.progress-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #cbd5e1;
}

.progress-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-step[data-state="done"] {
  color: #0f766e;
}

.progress-step[data-state="done"] .progress-dot {
  background: #0f9f8f;
}

.progress-step[data-state="active"] {
  color: #0369a1;
  font-weight: 700;
}

.progress-step[data-state="active"] .progress-dot {
  background: #0ea5e9;
  box-shadow: 0 0 0 3px rgb(14 165 233 / 20%);
}

.progress-step[data-state="waiting"] {
  color: #b45309;
}

.progress-step[data-state="waiting"] .progress-dot {
  background: #f59e0b;
}

.progress-step[data-state="error"] {
  color: #b91c1c;
}

.progress-step[data-state="error"] .progress-dot {
  background: #ef4444;
}

.progress-step[data-state="skipped"] .progress-dot {
  background: #d6d3d1;
}

.progress-step[data-state="pending"] {
  color: #a8b3c2;
}
</style>
