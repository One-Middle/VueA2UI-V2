<script setup lang="ts">
import type { RuntimeConfigDto, ToolCallDto } from "@a2ui-platform/shared";
import { NButton, NDataTable, NTag } from "naive-ui";
import { h, onMounted, ref } from "vue";
import { getRuntimeConfig } from "../../services/api";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();
const runtimeConfig = ref<RuntimeConfigDto | null>(null);
const selectedToolCalls = ref<ToolCallDto[]>([]);

onMounted(async () => {
  try {
    runtimeConfig.value = await getRuntimeConfig();
  } catch {
    // 运行时配置不可用时保持页面可访问。
  }
  workspace.loadAgentRuns();
});

const runColumns = [
  {
    title: "Status",
    key: "status",
    render: (row: any) => {
      const typeMap: Record<string, "success" | "error" | "info" | "default"> = {
        committed: "success",
        failed: "error",
        running: "info",
        pending: "default",
      };
      return h(NTag, { size: "small", type: typeMap[row.status] ?? "default" }, { default: () => row.status });
    },
  },
  { title: "Attempts", key: "attemptCount" },
  { title: "Model", key: "modelName" },
  {
    title: "Started",
    key: "startedAt",
    render: (row: any) => (row.startedAt ? new Date(row.startedAt).toLocaleString() : "-"),
  },
  { title: "Failure", key: "failureReason", render: (row: any) => row.failureReason ?? "-" },
  {
    title: "Tools",
    key: "tools",
    render: (row: any) =>
      h(
        NButton,
        {
          size: "tiny",
          quaternary: true,
          onClick: async () => {
            const detail = await workspace.loadAgentRunDetail(row.id);
            selectedToolCalls.value = detail?.toolCalls ?? [];
          },
        },
        { default: () => "查看" },
      ),
  },
];

const toolCallColumns = [
  { title: "Tool", key: "toolName" },
  {
    title: "Status",
    key: "status",
    render: (row: ToolCallDto) => {
      const typeMap: Record<string, "success" | "error" | "info" | "default"> = {
        succeeded: "success",
        failed: "error",
        running: "info",
      };
      return h(NTag, { size: "small", type: typeMap[row.status] ?? "default" }, { default: () => row.status });
    },
  },
  { title: "Attempt", key: "attemptIndex" },
  {
    title: "Summary",
    key: "summary",
    render: (row: ToolCallDto) => formatToolCallSummary(row),
  },
  {
    title: "Duration",
    key: "durationMs",
    render: (row: ToolCallDto) => (row.durationMs == null ? "-" : `${row.durationMs}ms`),
  },
  { title: "Error", key: "errorMessage", render: (row: ToolCallDto) => row.errorMessage ?? "-" },
];

function formatToolCallSummary(row: ToolCallDto): string {
  if (row.toolName === "getSkillContent") {
    const output = row.output as { disclosedSkills?: Array<{ name?: string; id?: string }> } | null;
    const input = row.inputSummary as { requestedSkills?: string[] };
    const disclosed = output?.disclosedSkills?.map((skill) => skill.name ?? skill.id).filter(Boolean).join("、");
    const requested = input.requestedSkills?.join("、");
    return disclosed ? `调用 Skill：${disclosed}` : `请求 Skill：${requested ?? "-"}`;
  }
  if (row.toolName === "getCatalogComponentDetails") {
    const output = row.output as { disclosedComponents?: string[] } | null;
    const input = row.inputSummary as { requestedComponents?: string[] };
    return output?.disclosedComponents?.length
      ? `披露组件：${output.disclosedComponents.join("、")}`
      : `请求组件：${input.requestedComponents?.join("、") ?? "-"}`;
  }
  if (row.toolName === "validateA2UI") {
    const output = row.output as { valid?: boolean; errorCount?: number; warningCount?: number } | null;
    return `valid=${output?.valid ?? "-"}, errors=${output?.errorCount ?? 0}, warnings=${output?.warningCount ?? 0}`;
  }
  return JSON.stringify(row.inputSummary);
}
</script>

<template>
  <div class="panel-page runtime-panel">
    <div class="panel-heading">
      <div>
        <h2>Runtime</h2>
        <p>查看当前模型配置、Catalog 信息和 Agent Run 执行记录。</p>
      </div>
    </div>

    <div class="runtime-summary">
      <div class="summary-item">
        <span>模型</span>
        <strong>{{ runtimeConfig?.modelName ?? "-" }}</strong>
      </div>
      <div class="summary-item">
        <span>Temperature</span>
        <strong>{{ (runtimeConfig as any)?.temperature ?? 0.2 }}</strong>
      </div>
      <div class="summary-item">
        <span>Max Tokens</span>
        <strong>{{ (runtimeConfig as any)?.maxTokens ?? 8192 }}</strong>
      </div>
      <div class="summary-item">
        <span>Catalog</span>
        <strong>{{ runtimeConfig?.catalogId ?? "-" }}</strong>
      </div>
    </div>

    <section class="runs-section">
      <h3>Agent Runs</h3>
      <n-data-table :columns="runColumns" :data="workspace.agentRuns" :bordered="false" size="small" />
    </section>

    <section class="runs-section">
      <h3>Runtime Tool Calls</h3>
      <n-data-table
        :columns="toolCallColumns"
        :data="selectedToolCalls.length > 0 ? selectedToolCalls : workspace.runtimeToolCalls"
        :bordered="false"
        size="small"
      />
    </section>
  </div>
</template>

<style scoped>
.runtime-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.summary-item {
  padding: 14px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 8px 20px rgb(15 23 42 / 4%);
}

.summary-item span {
  display: block;
  color: #5d6f89;
  font-size: 12px;
}

.summary-item strong {
  display: block;
  overflow: hidden;
  margin-top: 8px;
  color: #0f172a;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runs-section {
  padding: 16px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgb(15 23 42 / 4%);
}

.runs-section + .runs-section {
  margin-top: 16px;
}

.runs-section h3 {
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 15px;
}

@media (max-width: 900px) {
  .runtime-summary {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
}
</style>
