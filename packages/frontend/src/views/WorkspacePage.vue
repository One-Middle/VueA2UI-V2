<script setup lang="ts">
import { NConfigProvider, NLayout, NLayoutContent, NLayoutSider, NMenu } from "naive-ui";
import { computed, onMounted } from "vue";
import ConversationPanel from "../features/conversation/ConversationPanel.vue";
import HistoryPanel from "../features/history/HistoryPanel.vue";
import ImportExportPanel from "../features/import-export/ImportExportPanel.vue";
import PreviewPanel from "../features/preview/PreviewPanel.vue";
import RuntimePanel from "../features/runtime/RuntimePanel.vue";
import SkillsPanel from "../features/skills/SkillsPanel.vue";
import { useWorkspaceStore, type WorkspaceTab } from "../stores/workspace";

const workspace = useWorkspaceStore();

onMounted(() => {
  workspace.loadSessions();
  workspace.loadSkills();
});

const menuOptions = [
  { key: "conversation", label: "对话" },
  { key: "preview", label: "预览" },
  { key: "history", label: "历史" },
  { key: "skills", label: "Skills" },
  { key: "import-export", label: "导入导出" },
  { key: "runtime", label: "Runtime" }
];

const title = computed(() => menuOptions.find((item) => item.key === workspace.activeTab)?.label ?? "对话");
</script>

<template>
  <n-config-provider>
    <n-layout has-sider class="workspace">
      <n-layout-sider bordered :width="220">
        <div class="brand">A2UI Agent</div>
        <n-menu
          :value="workspace.activeTab"
          :options="menuOptions"
          @update:value="(value) => workspace.setActiveTab(value as WorkspaceTab)"
        />
      </n-layout-sider>
      <n-layout-content class="workspace-content">
        <header class="workspace-header">
          <h1>{{ title }}</h1>
        </header>
        <main class="workspace-main">
          <ConversationPanel v-if="workspace.activeTab === 'conversation'" />
          <PreviewPanel v-else-if="workspace.activeTab === 'preview'" />
          <HistoryPanel v-else-if="workspace.activeTab === 'history'" />
          <SkillsPanel v-else-if="workspace.activeTab === 'skills'" />
          <ImportExportPanel v-else-if="workspace.activeTab === 'import-export'" />
          <RuntimePanel v-else-if="workspace.activeTab === 'runtime'" />
        </main>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>
