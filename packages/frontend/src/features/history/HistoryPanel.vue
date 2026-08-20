<script setup lang="ts">
import {
  NButton,
  NCode,
  NCollapse,
  NCollapseItem,
  NEmpty,
  NPopconfirm,
  NTabPane,
  NTabs,
  NTag,
} from "naive-ui";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();

async function handleDelete(sessionId: string) {
  try {
    await workspace.deleteSession(sessionId);
  } catch {
    // 删除失败时保持当前列表状态，由后续统一错误提示承接。
  }
}

function openSession(sessionId: string) {
  workspace.setActiveSessionId(sessionId);
  workspace.setActiveTab("conversation");
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function shortId(value?: string | null): string {
  return value ? value.slice(0, 8) : "-";
}

function eventStatusType(status: string): "success" | "warning" | "default" {
  if (status === "committed") return "success";
  if (status === "reverted") return "warning";
  return "default";
}

function surfaceLabel(surfaceIds?: string[]): string {
  if (!surfaceIds || surfaceIds.length === 0) return "无 Surface";
  if (surfaceIds.length === 1) return surfaceIds[0] ?? "无 Surface";
  return `${surfaceIds.length} 个 Surface`;
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
</script>

<template>
  <div class="panel-page history-panel">
    <div class="panel-heading">
      <div>
        <h2>历史记录</h2>
        <p>查看会话、恢复曾经生成的 A2UI 内容，并通过事件调试排查渲染链路。</p>
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
            @click="openSession(s.id)"
            @keydown.enter="openSession(s.id)"
          >
            <span class="record-info">
              <strong>{{ s.title }}</strong>
              <small>{{ s.modelName }} · {{ formatDate(s.updatedAt) }}</small>
            </span>
            <span class="record-actions">
              <n-tag size="small" :type="s.id === workspace.activeSessionId ? 'success' : 'default'">
                {{ s.status }}
              </n-tag>
              <n-popconfirm :on-positive-click="() => handleDelete(s.id)">
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

      <n-tab-pane name="events" tab="A2UI 调试">
        <div class="debug-intro">
          <strong>A2UI 事件记录</strong>
          <span>这里展示后端提交给 Renderer 的消息批次，用于确认生成结果是否被提交、包含哪些 Surface，以及校验结果。</span>
        </div>

        <div v-if="workspace.a2uiEvents.length === 0" class="panel-center">
          <n-empty description="当前会话暂无 A2UI 事件" />
        </div>
        <div v-else class="event-list">
          <section v-for="e in workspace.a2uiEvents" :key="e.id" class="event-card">
            <div class="event-summary">
              <div class="event-title">
                <span class="seq">#{{ e.sequence }}</span>
                <strong>{{ surfaceLabel(e.surfaceIds) }}</strong>
                <n-tag size="small" :type="eventStatusType(e.status)">
                  {{ e.status }}
                </n-tag>
              </div>
              <div class="event-meta">
                <span>{{ (e.messages as unknown[])?.length ?? 0 }} 条消息</span>
                <span>Run {{ shortId(e.agentRunId) }}</span>
                <span>{{ formatDate(e.createdAt) }}</span>
              </div>
              <div class="surface-list">
                {{ e.surfaceIds?.join(", ") || "没有关联 Surface" }}
              </div>
            </div>

            <n-collapse arrow-placement="right" class="event-detail">
              <n-collapse-item title="查看 messages JSON" name="messages">
                <n-code :code="formatJson(e.messages)" language="json" word-wrap />
              </n-collapse-item>
              <n-collapse-item title="查看 validationResult JSON" name="validation">
                <n-code :code="formatJson(e.validationResult)" language="json" word-wrap />
              </n-collapse-item>
            </n-collapse>
          </section>
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

.record-list,
.event-list {
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  background: #ffffff;
  box-shadow: 0 8px 18px rgb(15 23 42 / 3%);
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
  background: #ecfdf5;
  box-shadow: 0 10px 22px rgb(15 159 143 / 7%);
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

.record-info small {
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

.debug-intro {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid rgb(15 159 143 / 18%);
  border-radius: 8px;
  background: rgb(236 253 245 / 72%);
  color: #475569;
  font-size: 13px;
  line-height: 1.55;
}

.debug-intro strong {
  color: #0f172a;
  font-size: 14px;
}

.event-card {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgb(15 23 42 / 3%);
}

.event-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-title,
.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.event-title strong {
  color: #0f172a;
  font-size: 14px;
}

.event-meta,
.surface-list {
  color: #64748b;
  font-size: 12px;
}

.surface-list {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seq {
  color: #0f8f82;
  font-size: 13px;
  font-weight: 800;
}

.event-detail {
  margin-top: 10px;
}

.event-detail :deep(.n-code) {
  max-height: 360px;
  overflow: auto;
  border-radius: 8px;
}
</style>
