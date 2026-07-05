import { defineStore } from "pinia";

export type WorkspaceTab = "conversation" | "preview" | "history" | "skills" | "import-export" | "runtime";

export const useWorkspaceStore = defineStore("workspace", {
  state: () => ({
    activeTab: "conversation" as WorkspaceTab,
    activeSessionId: null as string | null,
    streamStatus: "idle" as "idle" | "connecting" | "connected" | "error"
  }),
  actions: {
    setActiveTab(tab: WorkspaceTab) {
      this.activeTab = tab;
    },
    setActiveSessionId(sessionId: string | null) {
      this.activeSessionId = sessionId;
    }
  }
});
