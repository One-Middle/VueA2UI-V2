import type {
  AgentRunDto,
  A2UIEventDto,
  SessionDto,
  MessageDto,
  UploadedFileDto,
  SkillDto,
  SurfaceSnapshotDto,
  A2UIServerMessage,
} from "@a2ui-platform/shared";
import { defineStore } from "pinia";
import * as api from "../services/api";
import { connectStream, type StreamConnection } from "../services/stream";
import { useRendererStore } from "./renderer";

export type WorkspaceTab =
  | "conversation"
  | "preview"
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
    a2uiEvents: [] as unknown as A2UIEventDto[],
    surfaceSnapshots: [] as unknown as SurfaceSnapshotDto[],

    // ─── 发送状态 ───
    isSending: false,

    // ─── SSE 连接（不在 state 中序列化） ───
    _streamConnection: null as StreamConnection | null,
  }),

  actions: {
    // ─── Tab 切换 ───
    setActiveTab(tab: WorkspaceTab) {
      this.activeTab = tab;
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

      if (sessionId) {
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

        // 加载新会话数据
        this.loadMessages();
        this.loadFiles();
        this.loadAgentRuns();
        this.loadA2UIEvents();
        this.loadSnapshots();
        this.loadSessionDetail();

        // 建立 SSE 连接
        this.connectSSE();
      }
    },

    async loadSessionDetail() {
      if (!this.activeSessionId) return;
      try {
        const result = await api.getSession(this.activeSessionId);
        // 更新 sessions 列表中对应的项
        const idx = this.sessions.findIndex((s) => s.id === this.activeSessionId);
        if (idx >= 0) {
          this.sessions[idx] = result.session;
        }
        this.enabledSkillIds = result.enabledSkillIds ?? [];
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
      if (!this.activeSessionId || !content.trim()) return;

      this.isSending = true;
      try {
        await api.sendMessage(this.activeSessionId, {
          content: content.trim(),
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
        // @ts-expect-error TS2589: A2UIEventDto 递归类型导致 Pinia 深度实例化
        this.a2uiEvents = result.items;
      } catch {
        // 静默处理
      }
    },

    async loadSnapshots() {
      if (!this.activeSessionId) return;
      try {
        const result = await api.listSnapshots(this.activeSessionId, { limit: 100 });
        this.surfaceSnapshots = result.items;
      } catch {
        // 静默处理
      }
    },

    // ─── SSE ───
    connectSSE() {
      if (!this.activeSessionId) return;

      this.streamStatus = "connecting";
      const renderer = useRendererStore();

      this._streamConnection = connectStream(this.activeSessionId, {
        heartbeat: (_data: { time: string }) => {
          this.streamStatus = "connected";
        },

        agent_run_started: (data: { sessionId: string; agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "maxAttempts"> }) => {
          this.streamStatus = "connected";
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
          if (msgs.length > 0) {
            renderer.processMessages(msgs);
          }
          // 追加 event 记录
          this.a2uiEvents.push(data.a2uiEvent);
          // 排序
          this.a2uiEvents.sort((a, b) => a.sequence - b.sequence);
        },

        surface_snapshot: (data: { sessionId: string; snapshot: SurfaceSnapshotDto }) => {
          const existingIdx = this.surfaceSnapshots.findIndex((s) => s.id === data.snapshot.id);
          if (existingIdx >= 0) {
            this.surfaceSnapshots[existingIdx] = data.snapshot;
          } else {
            this.surfaceSnapshots.push(data.snapshot);
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
        },

        onError: (_error: Error) => {
          this.streamStatus = "error";
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
