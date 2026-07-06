<script setup lang="ts">
import { NDataTable, NTag } from "naive-ui";
import { onMounted, ref } from "vue";
import type { RuntimeConfigDto } from "@a2ui-platform/shared";
import { getRuntimeConfig } from "../../services/api";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();
const runtimeConfig = ref<RuntimeConfigDto | null>(null);

onMounted(async () => {
  try { runtimeConfig.value = await getRuntimeConfig(); } catch { /* ignore */ }
  workspace.loadAgentRuns();
});

const runColumns = [
  { title: "Status", key: "status", render: (row: any) => {
    const typeMap: Record<string, any> = { committed: "success", failed: "error", running: "info", pending: "default" };
    return { default: () => ({ component: NTag, props: { type: typeMap[row.status] ?? "default" }, children: () => row.status }) } as any;
  }},
  { title: "Attempts", key: "attemptCount" },
  { title: "Model", key: "modelName" },
  { title: "Started", key: "startedAt", render: (row: any) => row.startedAt ? new Date(row.startedAt).toLocaleString() : "-" },
  { title: "Failure", key: "failureReason", render: (row: any) => row.failureReason ?? "-" }
];
</script>

<template>
  <div class="runtime-panel">
    <div v-if="runtimeConfig" class="config-card">
      <h3>运行时配置</h3>
      <p>模型: {{ runtimeConfig.modelName }} · temperature: {{ (runtimeConfig as any).temperature ?? 0.2 }} · maxTokens: {{ (runtimeConfig as any).maxTokens ?? 8192 }} · maxAttempts: {{ (runtimeConfig as any).maxAttempts ?? 3 }}</p>
      <p>Catalog: {{ runtimeConfig.catalogId }}</p>
    </div>
    <div style="margin-top: 16px;">
      <h3>Agent Runs</h3>
      <n-data-table :columns="runColumns" :data="workspace.agentRuns" :bordered="false" size="small" />
    </div>
  </div>
</template>

<style scoped>
.runtime-panel { padding: 16px; }
.config-card { background: #f8f8f8; padding: 16px; border-radius: 8px; }
.config-card h3 { margin: 0 0 8px 0; }
</style>
