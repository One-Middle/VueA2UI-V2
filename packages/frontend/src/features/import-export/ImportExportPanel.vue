<script setup lang="ts">
import { NButton, NSpace } from "naive-ui";
import { downloadA2UIJSONL, downloadSnapshot, exportSession } from "../../services/api";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();

const handleExportSession = async () => {
  if (!workspace.activeSessionId) return;
  const data = await exportSession(workspace.activeSessionId);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `session-${workspace.activeSessionId}.json`;
  a.click(); URL.revokeObjectURL(url);
};

const handleExportJSONL = () => { if (workspace.activeSessionId) downloadA2UIJSONL(workspace.activeSessionId); };
const handleExportSnapshot = () => { if (workspace.activeSessionId) downloadSnapshot(workspace.activeSessionId); };
</script>

<template>
  <div class="import-export-panel">
    <h3>导出会话产物</h3>
    <div v-if="!workspace.activeSessionId" style="color: #999;">请先选择一个会话</div>
    <n-space v-else vertical>
      <n-button @click="handleExportSession">导出会话 JSON</n-button>
      <n-button @click="handleExportJSONL">导出 A2UI JSONL</n-button>
      <n-button @click="handleExportSnapshot">导出当前 Snapshot JSON</n-button>
    </n-space>
    <div v-if="workspace.activeSessionId" style="margin-top: 16px; color: #666; font-size: 13px;">
      <p>消息数: {{ workspace.messages.length }} · Events 数: {{ workspace.a2uiEvents.length }}</p>
    </div>
  </div>
</template>

<style scoped>
.import-export-panel { padding: 16px; }
</style>
