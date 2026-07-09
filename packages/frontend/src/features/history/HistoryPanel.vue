<script setup lang="ts">
import { NButton, NEmpty, NPopconfirm, NTabPane, NTabs, NTag } from "naive-ui";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();

async function handleDelete(sessionId: string) {
  try {
    await workspace.deleteSession(sessionId);
  } catch {
    // 删除失败静默处理
  }
}
</script>

<template>
  <div class="panel-page history-panel">
    <div class="panel-heading">
      <div>
        <h2>历史记录</h2>
        <p>查看会话、A2UI 事件和最近生成结果，点击会话可回到创作工作台。</p>
      </div>
    </div>

    <n-tabs type="line" class="history-tabs">
      <n-tab-pane name="sessions" tab="会话列表">
        <div v-if="workspace.sessions.length === 0" class="panel-center">
          <n-empty description="暂无会话" />
        </div>
        <div v-else class="record-list">
          <div
            v-for="s in workspace.sessions"
            :key="s.id"
            class="record-row"
            :class="{ active: s.id === workspace.activeSessionId }"
            role="button"
            tabindex="0"
            @click="workspace.setActiveSessionId(s.id); workspace.setActiveTab('conversation')"
            @keydown.enter="workspace.setActiveSessionId(s.id); workspace.setActiveTab('conversation')"
          >
            <span class="record-info">
              <strong>{{ s.title }}</strong>
              <small>{{ s.modelName }} · {{ new Date(s.updatedAt).toLocaleString() }}</small>
            </span>
            <span class="record-actions">
              <n-tag size="small" :type="s.id === workspace.activeSessionId ? 'success' : 'default'">{{ s.status }}</n-tag>
              <n-popconfirm
                :on-positive-click="() => handleDelete(s.id)"
              >
                <template #trigger>
                  <n-button size="tiny" quaternary type="error" @click.stop>
                    删除
                  </n-button>
                </template>
                确定要删除这个会话吗？
              </n-popconfirm>
            </span>
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="events" tab="A2UI Events">
        <div v-if="workspace.a2uiEvents.length === 0" class="panel-center">
          <n-empty description="暂无事件" />
        </div>
        <div v-else class="record-list">
          <div v-for="e in workspace.a2uiEvents" :key="e.id" class="event-row">
            <span class="seq">#{{ e.sequence }}</span>
            <span class="event-main">{{ e.surfaceIds?.join(", ") || "（无）" }}</span>
            <small>{{ (e.messages as unknown[])?.length ?? 0 }} 条消息 · {{ new Date(e.createdAt).toLocaleString() }}</small>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
}

.history-tabs {
  min-height: 0;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.record-row {
  display: flex;
  width: 100%;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  background: #ffffff;
  box-shadow: 0 8px 20px rgb(15 23 42 / 4%);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.record-row:hover,
.record-row.active {
  border-color: rgb(45 212 191 / 42%);
  background: #ecfdf9;
  box-shadow: 0 12px 24px rgb(15 159 143 / 8%);
  transform: translateY(-1px);
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-info strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
}

.record-info small,
.event-row small {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
}

.record-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.event-row {
  display: grid;
  grid-template-columns: 70px minmax(160px, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgb(15 23 42 / 4%);
}

.seq {
  color: #0f8f82;
  font-size: 13px;
  font-weight: 800;
}

.event-main {
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
