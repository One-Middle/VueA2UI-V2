import type {
  AgentRunDto,
  A2UIEventDto,
  SessionDto,
  MessageDto,
  UploadedFileDto,
  SkillDto,
  SurfaceSnapshotDto,
  A2UIServerMessage,
  SurfaceState,
} from "@a2ui-platform/shared";
import { defineStore } from "pinia";
import * as api from "../services/api";
import { connectStream, type StreamConnection } from "../services/stream";
import { logger, shortId } from "../services/logger";
import { useRendererStore } from "./renderer";

type WorkspaceA2UIEvent = Omit<A2UIEventDto, "messages" | "validationResult"> & {
  messages: unknown[];
  validationResult: unknown;
};

type WorkspaceSurfaceSnapshot = Omit<SurfaceSnapshotDto, "snapshot"> & {
  snapshot: unknown;
};

export type WorkspaceTab =
  | "conversation"
  | "history"
  | "skills"
  | "import-export"
  | "runtime";

export const useWorkspaceStore = defineStore("workspace", {
  state: () => ({
    // ─── UI 状态 ───
    activeTab: "conversation" as WorkspaceTab,
    activeSessionId: null as string | null,
    streamStatus: "idle" as "idle" | "connecting" | "connected" | "error",

    // ─── 业务数据 ───
    sessions: [] as SessionDto[],
    messages: [] as MessageDto[],
    uploadedFiles: [] as UploadedFileDto[],
    skills: [] as SkillDto[],
    enabledSkillIds: [] as string[],
    agentRuns: [] as AgentRunDto[],
    a2uiEvents: [] as WorkspaceA2UIEvent[],
    surfaceSnapshots: [] as WorkspaceSurfaceSnapshot[],

    // ─── 发送状态 ───
    isSending: false,

    // ─── AI 生成状态（SSE 事件驱动） ───
    isGenerating: false,

    // ─── SSE 连接（不在 state 中序列化） ───
    _streamConnection: null as StreamConnection | null,
  }),

  actions: {
    // ─── Tab 切换 ───
    setActiveTab(tab: WorkspaceTab) {
      this.activeTab = tab;
    },

    startNewConversation() {
      this.disconnectSSE();
      this.activeTab = "conversation";
      this.activeSessionId = null;
      this.streamStatus = "idle";
      this.messages = [];
      this.uploadedFiles = [];
      this.enabledSkillIds = [];
      this.agentRuns = [];
      this.a2uiEvents = [];
      this.surfaceSnapshots = [];
      this.isSending = false;
      this.isGenerating = false;
      const renderer = useRendererStore();
      renderer.reset();
    },

    // ─── 会话管理 ───
    async loadSessions() {
      try {
        const result = await api.listSessions({ limit: 100 });
        this.sessions = result.items;
      } catch {
        // 静默处理，由调用方决定是否提示
      }
    },

    async createSession(title?: string) {
      try {
        const result = await api.createSession({ title });
        this.sessions.unshift(result.session);
        this.setActiveSessionId(result.session.id);
        return result.session;
      } catch {
        throw new Error("创建会话失败");
      }
    },

    setActiveSessionId(sessionId: string | null) {
      // 切换前断开旧的 SSE 连接
      this.disconnectSSE();

      this.activeSessionId = sessionId;
      this.isGenerating = false;

      // 清空之前的数据
      this.messages = [];
      this.uploadedFiles = [];
      this.enabledSkillIds = [];
      this.agentRuns = [];
      this.a2uiEvents = [];
      this.surfaceSnapshots = [];

      // 清空 Renderer
      const renderer = useRendererStore();
      renderer.reset();

      if (!sessionId) {
        return;
      }

      // 加载新会话数据
      this.loadMessages();
      this.loadFiles();
      this.loadAgentRuns();
      this.loadA2UIEvents();
      this.loadSnapshots();
      void this.loadSessionDetail(sessionId);

      // 建立 SSE 连接
      this.connectSSE();
    },

    async deleteSession(sessionId: string) {
      try {
        await api.deleteSession(sessionId);
        // 移除本地会话列表中的对应项
        this.sessions = this.sessions.filter((s) => s.id !== sessionId);
        // 如果正在删除的是当前选中的会话，清空选中状态
        if (this.activeSessionId === sessionId) {
          this.disconnectSSE();
          this.activeSessionId = null;
          this.messages = [];
          this.uploadedFiles = [];
          this.enabledSkillIds = [];
          this.agentRuns = [];
          this.a2uiEvents = [];
          this.surfaceSnapshots = [];
          const renderer = useRendererStore();
          renderer.reset();
        }
      } catch {
        throw new Error("删除会话失败");
      }
    },

    async loadSessionDetail(sessionId?: string | null) {
      const targetSessionId = sessionId ?? this.activeSessionId;
      if (!targetSessionId) return;
      try {
        const result = await api.getSession(targetSessionId);
        if (this.activeSessionId !== targetSessionId) return;
        // 更新 sessions 列表中对应的项
        const idx = this.sessions.findIndex((s) => s.id === targetSessionId);
        if (idx >= 0) {
          this.sessions[idx] = result.session;
        }
        this.enabledSkillIds = result.enabledSkillIds ?? [];
        restoreRendererFromSnapshot(result.currentSnapshot);
      } catch {
        // 静默处理
      }
    },

    // ─── 消息管理 ───
    async loadMessages() {
      if (!this.activeSessionId) return;
      try {
        const result = await api.listMessages(this.activeSessionId, { limit: 200 });
        this.messages = result.items;
      } catch {
        // 静默处理
      }
    },

    async sendMessage(content: string, attachmentFileIds?: string[]) {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      this.isSending = true;
      try {
        let sessionId = this.activeSessionId;
        if (!sessionId) {
          const session = await this.createSession(createSessionTitle(trimmedContent));
          sessionId = session.id;
        }

        logger.info(`发送消息 → session=${shortId(sessionId)}, content=${trimmedContent.length}字`);
        await api.sendMessage(sessionId, {
          content: trimmedContent,
          attachmentFileIds,
          options: { intent: "CREATE_UI" },
        });
        // 消息发送成功后，SSE 会自动推送 assistant 消息和 A2UI 结果
        // 这里先重新加载消息列表确保 user 消息出现在列表中
        await this.loadMessages();
      } catch {
        throw new Error("消息发送失败");
      } finally {
        this.isSending = false;
      }
    },

    // ─── 文件管理 ───
    async loadFiles() {
      if (!this.activeSessionId) return;
      try {
        const result = await api.listFiles(this.activeSessionId);
        this.uploadedFiles = result.items;
      } catch {
        // 静默处理
      }
    },

    async uploadFile(file: File) {
      if (!this.activeSessionId) throw new Error("请先创建或选择会话");
      // 客户端检查 .txt 扩展名
      if (!file.name.toLowerCase().endsWith(".txt")) {
        throw new Error("仅支持上传 .txt 文件");
      }
      try {
        const result = await api.uploadFileToSession(this.activeSessionId, file);
        this.uploadedFiles.push(result.file);
        return result.file;
      } catch {
        throw new Error("文件上传失败");
      }
    },

    async deleteFile(fileId: string) {
      if (!this.activeSessionId) return;
      try {
        await api.deleteFile(this.activeSessionId, fileId);
        this.uploadedFiles = this.uploadedFiles.filter((f) => f.id !== fileId);
      } catch {
        throw new Error("删除文件失败");
      }
    },

    // ─── Skills 管理 ───
    async loadSkills() {
      try {
        const result = await api.listSkills();
        this.skills = result.items;
      } catch {
        // 静默处理
      }
    },

    async createSkill(name: string, description: string, content: string) {
      try {
        const result = await api.createSkill({ name, description, content });
        this.skills.push(result.skill);
        return result.skill;
      } catch {
        throw new Error("创建 Skill 失败");
      }
    },

    async updateSkill(skillId: string, data: { name?: string; description?: string; content?: string; isActive?: boolean }) {
      try {
        const result = await api.updateSkill(skillId, data);
        const idx = this.skills.findIndex((s) => s.id === skillId);
        if (idx >= 0) {
          this.skills[idx] = result.skill;
        }
        return result.skill;
      } catch {
        throw new Error("更新 Skill 失败");
      }
    },

    async enableSkill(skillId: string) {
      if (!this.activeSessionId) throw new Error("请先选择会话");
      try {
        await api.enableSkill(this.activeSessionId, skillId);
        if (!this.enabledSkillIds.includes(skillId)) {
          this.enabledSkillIds.push(skillId);
        }
      } catch {
        throw new Error("启用 Skill 失败");
      }
    },

    async disableSkill(skillId: string) {
      if (!this.activeSessionId) throw new Error("请先选择会话");
      try {
        await api.disableSkill(this.activeSessionId, skillId);
        this.enabledSkillIds = this.enabledSkillIds.filter((id) => id !== skillId);
      } catch {
        throw new Error("禁用 Skill 失败");
      }
    },

    // ─── Agent Run ───
    async loadAgentRuns() {
      if (!this.activeSessionId) return;
      try {
        const result = await api.listAgentRuns(this.activeSessionId, { limit: 100 });
        this.agentRuns = result.items;
      } catch {
        // 静默处理
      }
    },

    async loadAgentRunDetail(runId: string) {
      if (!this.activeSessionId) return null;
      try {
        return await api.getAgentRunDetail(this.activeSessionId, runId);
      } catch {
        return null;
      }
    },

    // ─── A2UI / Snapshots ───
    async loadA2UIEvents() {
      if (!this.activeSessionId) return;
      try {
        const result = await api.listA2UIEvents(this.activeSessionId, { limit: 200 });
        this.a2uiEvents = result.items.map(toWorkspaceA2UIEvent);
      } catch {
        // 静默处理
      }
    },

    async loadSnapshots() {
      if (!this.activeSessionId) return;
      try {
        const result = await api.listSnapshots(this.activeSessionId, { limit: 100 });
        this.surfaceSnapshots = result.items.map(toWorkspaceSurfaceSnapshot);
      } catch {
        // 静默处理
      }
    },

    // ─── SSE ───
    connectSSE() {
      if (!this.activeSessionId) return;

      this.streamStatus = "connecting";
      const renderer = useRendererStore();
      const sid = shortId(this.activeSessionId);

      logger.info(`SSE 连接中 → session=${sid}`);

      this._streamConnection = connectStream(this.activeSessionId, {
        heartbeat: (_data: { time: string }) => {
          this.streamStatus = "connected";
        },

        agent_run_started: (data: { sessionId: string; agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "maxAttempts"> }) => {
          this.streamStatus = "connected";
          this.isGenerating = true;
          logger.info(`← SSE ← BACKEND: agent_run_started → runId=${shortId(data.agentRun.id)}`);
          // 添加或更新 run
          const existingIdx = this.agentRuns.findIndex((r) => r.id === data.agentRun.id);
          if (existingIdx >= 0) {
            this.agentRuns[existingIdx] = { ...this.agentRuns[existingIdx], ...data.agentRun } as AgentRunDto;
          } else {
            this.agentRuns.push(data.agentRun as AgentRunDto);
          }
        },

        agent_run_attempt: (data: { sessionId: string; agentRunId: string; attemptIndex: number; phase: string; toolCall?: unknown }) => {
          // 更新对应 run 的 attempt
          const run = this.agentRuns.find((r) => r.id === data.agentRunId);
          if (run) {
            run.attemptCount = data.attemptIndex + 1;
          }
        },

        agent_run_completed: (data: {
          sessionId: string;
          agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "assistantMessageId" | "outputSnapshotId" | "completedAt">;
        }) => {
          logger.info(`← SSE ← BACKEND: agent_run_completed → runId=${shortId(data.agentRun.id)}`);
          const run = this.agentRuns.find((r) => r.id === data.agentRun.id);
          if (run) {
            run.status = data.agentRun.status;
            run.attemptCount = data.agentRun.attemptCount;
            run.assistantMessageId = data.agentRun.assistantMessageId;
            run.outputSnapshotId = data.agentRun.outputSnapshotId;
            run.completedAt = data.agentRun.completedAt;
          }
          this.isGenerating = false;
        },

        assistant_message: (data: { sessionId: string; message: MessageDto }) => {
          // 追加 assistant 消息
          const existing = this.messages.find((m) => m.id === data.message.id);
          if (!existing) {
            this.messages.push(data.message);
          }
          // 重新加载消息确保顺序
          this.loadMessages();
        },

        a2ui_messages: (data: { sessionId: string; a2uiEvent: A2UIEventDto }) => {
          // 将 A2UI 消息交给 Renderer 处理
          const msgs = data.a2uiEvent.messages as A2UIServerMessage[];
          logger.info(`← SSE ← BACKEND: a2ui_messages → ${msgs.length}条 → RENDERER`);
          if (msgs.length > 0) {
            renderer.processMessages(msgs);
          }
          // 追加 event 记录
          this.a2uiEvents.push(toWorkspaceA2UIEvent(data.a2uiEvent));
          // 排序
          this.a2uiEvents.sort((a, b) => a.sequence - b.sequence);
          // A2UI 消息到达 = 生成完成
          this.isGenerating = false;
        },

        surface_snapshot: (data: { sessionId: string; snapshot: SurfaceSnapshotDto }) => {
          const snapshot = toWorkspaceSurfaceSnapshot(data.snapshot);
          logger.info(`← SSE ← BACKEND: surface_snapshot → surfaces=${data.snapshot.surfaceCount}, components=${data.snapshot.componentCount}`);
          const existingIdx = this.surfaceSnapshots.findIndex((s) => s.id === snapshot.id);
          if (existingIdx >= 0) {
            this.surfaceSnapshots[existingIdx] = snapshot;
          } else {
            this.surfaceSnapshots.push(snapshot);
          }
          // 确保 isCurrent 只标记最新的
          this.surfaceSnapshots.sort((a, b) => a.sequence - b.sequence);
          this.surfaceSnapshots.forEach((s, i) => {
            s.isCurrent = i === this.surfaceSnapshots.length - 1;
          });
        },

        agent_run_failed: (data: {
          sessionId: string;
          agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "failureReason">;
          message: MessageDto;
        }) => {
          logger.warn(`← SSE ← BACKEND: agent_run_failed → runId=${shortId(data.agentRun.id)}, reason=${(data.agentRun.failureReason ?? "").slice(0, 80)}`);
          // 更新 run 状态
          const run = this.agentRuns.find((r) => r.id === data.agentRun.id);
          if (run) {
            run.status = "failed";
            run.failureReason = data.agentRun.failureReason;
            run.attemptCount = data.agentRun.attemptCount;
          }
          // 追加失败消息
          const existing = this.messages.find((m) => m.id === data.message.id);
          if (!existing) {
            this.messages.push(data.message);
          }
          // 生成结束
          this.isGenerating = false;
        },

        onError: (_error: Error) => {
          this.streamStatus = "error";
          logger.error(`SSE 连接错误 → ${_error.message}`);
        },

        onReconnecting: (_attempt: number) => {
          this.streamStatus = "connecting";
        },

        onClosed: () => {
          this.streamStatus = "idle";
        },
      });
    },

    disconnectSSE() {
      this._streamConnection?.close();
      this._streamConnection = null;
      this.streamStatus = "idle";
    },
  },
});

function toWorkspaceA2UIEvent(event: A2UIEventDto): WorkspaceA2UIEvent {
  return {
    ...event,
    messages: event.messages as unknown[],
    validationResult: event.validationResult,
  };
}

function toWorkspaceSurfaceSnapshot(snapshot: SurfaceSnapshotDto): WorkspaceSurfaceSnapshot {
  return {
    ...snapshot,
    snapshot: snapshot.snapshot,
  };
}

function restoreRendererFromSnapshot(snapshot: SurfaceSnapshotDto | null): void {
  if (!snapshot) return;

  const renderer = useRendererStore();
  const messages = snapshotToRendererMessages(snapshot);
  if (messages.length > 0) {
    renderer.processMessages(messages);
  }
}

function snapshotToRendererMessages(snapshot: SurfaceSnapshotDto): A2UIServerMessage[] {
  const version = snapshot.snapshot.version;
  const surfaces = Object.values(snapshot.snapshot.surfaces) as SurfaceState[];
  const messages: A2UIServerMessage[] = [];

  for (const surface of surfaces) {
    messages.push({
      version,
      createSurface: {
        surfaceId: surface.surfaceId,
        catalogId: surface.catalogId,
        theme: surface.theme,
        sendDataModel: surface.sendDataModel,
      },
    });

    const components = Object.values(surface.components);
    if (components.length > 0) {
      messages.push({
        version,
        updateComponents: {
          surfaceId: surface.surfaceId,
          components,
        },
      });
    }

    messages.push({
      version,
      updateDataModel: {
        surfaceId: surface.surfaceId,
        path: "/",
        value: surface.dataModel,
      },
    });
  }

  return messages;
}

function createSessionTitle(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
}
