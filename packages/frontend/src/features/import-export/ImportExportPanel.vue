<script setup lang="ts">
import { NButton, NEmpty, NTag } from "naive-ui";
import { downloadA2UIJSONL, downloadSnapshot, exportSession } from "../../services/api";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();

const handleExportSession = async () => {
  if (!workspace.activeSessionId) return;
  const data = await exportSession(workspace.activeSessionId);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `session-${workspace.activeSessionId}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleExportJSONL = () => {
  if (workspace.activeSessionId) downloadA2UIJSONL(workspace.activeSessionId);
};

const handleExportSnapshot = () => {
  if (workspace.activeSessionId) downloadSnapshot(workspace.activeSessionId);
};
</script>

<template>
  <div class="panel-page import-export-panel">
    <div class="panel-heading">
      <div>
        <h2>导入导出</h2>
        <p>导出当前会话、A2UI JSONL 或最新 Snapshot，便于调试和归档。</p>
      </div>
      <n-tag size="small" :type="workspace.activeSessionId ? 'success' : 'default'">
        {{ workspace.activeSessionId ? "已选择会话" : "未选择会话" }}
      </n-tag>
    </div>

    <div v-if="!workspace.activeSessionId" class="panel-center">
      <n-empty description="请先选择或创建一个会话" />
    </div>

    <div v-else class="export-grid">
      <section class="export-card">
        <div>
          <h3>会话 JSON</h3>
          <p>导出会话基础信息、消息和相关记录。</p>
        </div>
        <n-button @click="handleExportSession">导出 JSON</n-button>
      </section>

      <section class="export-card">
        <div>
          <h3>A2UI JSONL</h3>
          <p>导出已提交的 A2UI 消息流，适合回放和排查。</p>
        </div>
        <n-button @click="handleExportJSONL">导出 JSONL</n-button>
      </section>

      <section class="export-card">
        <div>
          <h3>Snapshot</h3>
          <p>导出当前 Renderer surface 快照。</p>
        </div>
        <n-button @click="handleExportSnapshot">导出 Snapshot</n-button>
      </section>
    </div>

    <div v-if="workspace.activeSessionId" class="export-stats">
      <span>消息 {{ workspace.messages.length }}</span>
      <span>Events {{ workspace.a2uiEvents.length }}</span>
      <span>Snapshots {{ workspace.surfaceSnapshots.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.export-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
}

.export-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 170px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgb(15 23 42 / 3%);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.export-card:hover {
  border-color: rgb(45 212 191 / 34%);
  box-shadow: 0 10px 22px rgb(15 159 143 / 6%);
  transform: translateY(-1px);
}

.export-card h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
}

.export-card p {
  margin: 8px 0 18px;
  color: #5d6f89;
  font-size: 13px;
  line-height: 1.6;
}

.export-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  color: #64748b;
  font-size: 12px;
}

.export-stats span {
  padding: 5px 9px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
}

@media (max-width: 900px) {
  .export-grid {
    grid-template-columns: 1fr;
  }
}
</style>
