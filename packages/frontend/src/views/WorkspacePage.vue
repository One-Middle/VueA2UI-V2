<script setup lang="ts">
import {
  NButton,
  NConfigProvider,
  NLayout,
  NLayoutContent,
  NLayoutSider,
  NMenu,
  NTag,
  type GlobalThemeOverrides,
} from "naive-ui";
import { computed, onMounted, ref } from "vue";
import ConversationPanel from "../features/conversation/ConversationPanel.vue";
import InitialCreatePanel from "../features/conversation/InitialCreatePanel.vue";
import HistoryPanel from "../features/history/HistoryPanel.vue";
import ImportExportPanel from "../features/import-export/ImportExportPanel.vue";
import PreviewPanel from "../features/preview/PreviewPanel.vue";
import RuntimePanel from "../features/runtime/RuntimePanel.vue";
import SkillsPanel from "../features/skills/SkillsPanel.vue";
import { useWorkspaceStore, type WorkspaceTab } from "../stores/workspace";

const workspace = useWorkspaceStore();

// ─── 两栏拖拽分割线 ───
// 会话区与组件展示区之间的分割线可拖动调整宽度比例。
const creationShellRef = ref<HTMLElement | null>(null);
const chatWidthPercent = ref(34);
const isDraggingDivider = ref(false);

const MIN_CHAT_WIDTH = 360;
const MAX_CHAT_WIDTH = 430;
const MIN_PREVIEW_WIDTH = 560;
const DIVIDER_WIDTH = 10;

/** 拖拽起点快照（null 表示未在拖拽）。 */
let dragStart: { x: number; percent: number } | null = null;

const chatStyle = computed(() => ({ width: `${chatWidthPercent.value}%` }));

/**
 * 将聊天栏宽度百分比夹紧到合法区间：
 * 下限保证聊天栏 >= MIN_CHAT_WIDTH，上限保证预览栏 >= MIN_PREVIEW_WIDTH。
 * 当容器过窄无法同时容纳两栏时，退化为最小宽度交给 overflow-x 横向滚动。
 */
function clampChatPercent(value: number, shellWidth: number): number {
  const minPercent = (MIN_CHAT_WIDTH / shellWidth) * 100;
  const preferredMaxPercent = (MAX_CHAT_WIDTH / shellWidth) * 100;
  const maxPercent = ((shellWidth - DIVIDER_WIDTH - MIN_PREVIEW_WIDTH) / shellWidth) * 100;
  return Math.min(Math.max(value, minPercent), Math.max(minPercent, Math.min(preferredMaxPercent, maxPercent)));
}

function startDividerDrag(event: PointerEvent) {
  const shell = creationShellRef.value;
  if (!shell) return;
  const divider = event.currentTarget as HTMLElement;
  // pointer capture 保证鼠标移出分割线后仍持续收到 move/up 事件
  divider.setPointerCapture(event.pointerId);
  dragStart = { x: event.clientX, percent: chatWidthPercent.value };
  isDraggingDivider.value = true;
  event.preventDefault();
}

function onDividerDrag(event: PointerEvent) {
  if (!dragStart) return;
  const shell = creationShellRef.value;
  if (!shell) return;
  const shellWidth = shell.getBoundingClientRect().width;
  if (shellWidth <= 0) return;
  const deltaPercent = ((event.clientX - dragStart.x) / shellWidth) * 100;
  chatWidthPercent.value = clampChatPercent(dragStart.percent + deltaPercent, shellWidth);
}

function endDividerDrag(event: PointerEvent) {
  dragStart = null;
  isDraggingDivider.value = false;
  try {
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  } catch {
    // pointer capture 可能已随 pointerup 自动释放
  }
}

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: "#0f9f8f",
    primaryColorHover: "#0f766e",
    primaryColorPressed: "#115e59",
    primaryColorSuppl: "#34d399",
    borderRadius: "8px",
    borderColor: "#e5e7eb",
    dividerColor: "#eef2f7",
    textColorBase: "#0f172a",
  },
  Button: {
    fontWeight: "600",
    borderRadiusMedium: "8px",
    heightMedium: "34px",
  },
  Input: {
    borderRadius: "8px",
    borderHover: "1px solid rgba(15, 159, 143, 0.36)",
    borderFocus: "1px solid rgba(15, 159, 143, 0.62)",
    boxShadowFocus: "0 0 0 3px rgba(15, 159, 143, 0.12)",
  },
  Tag: {
    borderRadius: "6px",
    fontSizeSmall: "12px",
  },
};

onMounted(() => {
  workspace.loadSessions();
  workspace.loadSkills();
});

const menuOptions = [
  { key: "conversation", label: "创作工作台" },
  { key: "history", label: "历史记录" },
  { key: "skills", label: "Skills" },
  { key: "import-export", label: "导入导出" },
  { key: "runtime", label: "Runtime" },
];

const title = computed(() => menuOptions.find((item) => item.key === workspace.activeTab)?.label ?? "创作工作台");

const activeSession = computed(() => workspace.sessions.find((session) => session.id === workspace.activeSessionId));
const isInitialCreate = computed(() => workspace.activeTab === "conversation" && !workspace.activeSessionId);

const streamStatusMeta = computed(() => {
  const map = {
    idle: { label: "未连接", type: "default" },
    connecting: { label: "连接中", type: "warning" },
    connected: { label: "已连接", type: "success" },
    error: { label: "连接异常", type: "error" },
  } as const;

  return map[workspace.streamStatus];
});

const createSession = () => {
  workspace.startNewConversation();
};
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-layout has-sider class="workspace">
      <n-layout-sider bordered :width="232" class="workspace-sider">
        <div class="brand">
          <div class="brand-mark">A2</div>
          <div>
            <div class="brand-title">A2UI Agent</div>
            <div class="brand-subtitle">无代码 UI 创作平台</div>
          </div>
        </div>

        <div class="sider-section">
          <n-button block type="primary" secondary @click="createSession">新建创作</n-button>
        </div>

        <n-menu
          class="workspace-menu"
          :value="workspace.activeTab"
          :options="menuOptions"
          @update:value="(value) => workspace.setActiveTab(value as WorkspaceTab)"
        />

        <div class="sider-footer">
          <div class="footer-label">当前会话</div>
          <div class="footer-session">{{ activeSession?.title ?? "尚未选择会话" }}</div>
        </div>
      </n-layout-sider>

      <n-layout-content :class="['workspace-content', { 'initial-mode': isInitialCreate }]">
        <header v-if="!isInitialCreate" class="workspace-header">
          <div>
            <h1>{{ title }}</h1>
            <p>{{ activeSession?.title ?? "描述 UI 需求后，系统会自动创建会话并生成预览。" }}</p>
          </div>
          <div class="header-actions">
            <n-tag size="small" :type="streamStatusMeta.type">{{ streamStatusMeta.label }}</n-tag>
            <n-tag v-if="workspace.isGenerating" size="small" type="info">AI 生成中</n-tag>
          </div>
        </header>

        <main class="workspace-main">
          <InitialCreatePanel v-if="isInitialCreate" />

          <section ref="creationShellRef" v-else-if="workspace.activeTab === 'conversation'" class="creation-shell">
            <div class="creation-chat" :style="chatStyle">
              <ConversationPanel />
            </div>
            <div
              class="creation-divider"
              :class="{ dragging: isDraggingDivider }"
              @pointerdown="startDividerDrag"
              @pointermove="onDividerDrag"
              @pointerup="endDividerDrag"
              @pointercancel="endDividerDrag"
            />
            <div class="creation-preview">
              <PreviewPanel compact />
            </div>
          </section>

          <section v-else class="page-panel">
            <HistoryPanel v-if="workspace.activeTab === 'history'" />
            <SkillsPanel v-else-if="workspace.activeTab === 'skills'" />
            <ImportExportPanel v-else-if="workspace.activeTab === 'import-export'" />
            <RuntimePanel v-else-if="workspace.activeTab === 'runtime'" />
          </section>
        </main>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>
