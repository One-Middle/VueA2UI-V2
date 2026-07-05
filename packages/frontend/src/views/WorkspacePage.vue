<script setup lang="ts">
import { A2uiSurface } from "@a2ui-platform/renderer";
import { NConfigProvider, NLayout, NLayoutContent, NLayoutSider, NMenu } from "naive-ui";
import { computed } from "vue";
import { useWorkspaceStore, type WorkspaceTab } from "../stores/workspace";

const workspace = useWorkspaceStore();

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
          <a2ui-surface v-if="workspace.activeTab === 'preview'" surface-id="main" />
          <div v-else class="placeholder">{{ title }}模块待实现</div>
        </main>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>
