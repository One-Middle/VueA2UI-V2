<script setup lang="ts">
import { NTabPane, NTabs } from "naive-ui";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();
</script>

<template>
  <n-tabs type="line" class="history-tabs">
    <n-tab-pane name="sessions" tab="会话列表">
      <div class="tab-content">
        <div v-if="workspace.sessions.length === 0" style="color: #999; padding: 20px;">暂无会话</div>
        <div v-for="s in workspace.sessions" :key="s.id" class="session-item"
          :class="{ active: s.id === workspace.activeSessionId }" @click="workspace.setActiveSessionId(s.id)">
          <strong>{{ s.title }}</strong>
          <span class="meta">{{ s.status }} · {{ s.modelName }} · {{ new Date(s.updatedAt).toLocaleString() }}</span>
        </div>
      </div>
    </n-tab-pane>
    <n-tab-pane name="events" tab="A2UI Events">
      <div class="tab-content">
        <div v-if="workspace.a2uiEvents.length === 0" style="color: #999; padding: 20px;">暂无事件</div>
        <div v-for="e in workspace.a2uiEvents" :key="e.id" class="event-item">
          <span class="seq">#{{ e.sequence }}</span>
          <span>{{ e.surfaceIds?.join(", ") }}</span>
          <span class="meta">{{ (e.messages as any[])?.length ?? 0 }} 条消息 · {{ new Date(e.createdAt).toLocaleString() }}</span>
        </div>
      </div>
    </n-tab-pane>
  </n-tabs>
</template>

<style scoped>
.history-tabs { height: 100%; }
.tab-content { padding: 12px; overflow-y: auto; max-height: calc(100vh - 200px); }
.session-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
.session-item:hover { background: #f8f8f8; }
.session-item.active { background: #e8f4fd; }
.event-item { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 12px; align-items: center; }
.seq { font-weight: bold; color: #4a90d9; min-width: 40px; }
.meta { font-size: 12px; color: #999; }
</style>
