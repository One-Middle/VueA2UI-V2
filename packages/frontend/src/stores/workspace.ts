/**
 * 工作台核心状态管理（Pinia Store）。
 *
 * 职责：
 * - 管理会话列表、消息、文件、Skills、Agent Run、A2UI Event、Surface Snapshot 等业务数据
 * - 管理 UI 状态（Tab 切换、SSE 连接状态、发送/生成状态、会话 hydration 状态）
 * - 暴露 action 方法供组件调用（CRUD + SSE 连接管理）
 * - 协调 Renderer Store 的生命周期（reset、processMessages、replaceMessages）
 *
 * 不负责：A2UI 渲染逻辑（见 renderer Store）、HTTP 请求实现（见 services/api）、
 * SSE 底层连接（见 services/stream）。
 */

import type {
  AgentRunDto,
  AgentTraceEventDto,
  AgentWorkflowDetailDto,
  AgentWorkflowDto,
  A2UIEventDto,
  SessionDto,
  MessageDto,
  UploadedFileDto,
  SkillDto,
  SkillReference,
  SurfaceSnapshotDto,
  ToolCallDto,
  A2UIServerMessage,
  SurfaceState,
  WorkflowArtifactDto,
  WorkflowDecisionOption,
  WorkflowStepDto,
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
    sessionHydrationStatus: "idle" as "idle" | "loading" | "ready" | "error",
    sessionHydrationError: null as string | null,
    _sessionRevision: 0,

    // ─── 业务数据 ───
    sessions: [] as SessionDto[],
    messages: [] as MessageDto[],
    uploadedFiles: [] as UploadedFileDto[],
    skills: [] as SkillDto[],
    enabledSkillIds: [] as string[],
    agentRuns: [] as AgentRunDto[],
    runtimeToolCalls: [] as ToolCallDto[],
    runtimeTraceEvents: [] as AgentTraceEventDto[],
    workflows: [] as AgentWorkflowDetailDto[],
    a2uiEvents: [] as WorkspaceA2UIEvent[],
    surfaceSnapshots: [] as WorkspaceSurfaceSnapshot[],

    // ─── 发送状态 ───
    isSending: false,

    // ─── SSE 连接（不在 state 中序列化） ───
    _streamConnection: null as StreamConnection | null,
  }),

  getters: {
    /**
     * Agent 是否正在生成（派生状态）。
     *
     * 不再依赖手动布尔赋值，而是从数据实时推导，避免「任务已结束但动画残留」：
     * - workflow 存在 running 的 step 视为正在生成（workflow task 执行中）
     * - 非 workflow 的 agent run 处于 running 视为正在生成（普通聊天）
     */
    isGenerating(state): boolean {
      return state.workflows.some((workflow) =>
        workflow.steps.some((step) => step.status === "running"),
      ) || state.agentRuns.some((run) => run.status === "running" && run.workflowId == null);
    },

    /** 非 workflow 的普通 agent run 是否生成中（用于独立 typing 指示器）。 */
    isPlainChatGenerating(state): boolean {
      return state.agentRuns.some((run) => run.status === "running" && run.workflowId == null);
    },
  },

  actions: {
    // ─── Tab 切换 ───

    /** 切换工作台 Tab。 */
    setActiveTab(tab: WorkspaceTab) {
      this.activeTab = tab;
    },

    /** 开始新会话：断开 SSE、清空所有业务数据、重置 Renderer。 */
    startNewConversation() {
      this.disconnectSSE();
      this.activeTab = "conversation";
      this.activeSessionId = null;
      this.streamStatus = "idle";
      this.sessionHydrationStatus = "idle";
      this.sessionHydrationError = null;
      this._sessionRevision += 1;
      this.messages = [];
      this.uploadedFiles = [];
      this.enabledSkillIds = [];
      this.agentRuns = [];
      this.runtimeToolCalls = [];
      this.runtimeTraceEvents = [];
      this.workflows = [];
      this.a2uiEvents = [];
      this.surfaceSnapshots = [];
      this.isSending = false;
      const renderer = useRendererStore();
      renderer.reset();
    },

    // ─── 会话管理 ───

    /** 加载会话列表（最多 100 条）。 */
    async loadSessions() {
      try {
        const result = await api.listSessions({ limit: 100 });
        this.sessions = result.items;
      } catch {
        // 静默处理，由调用方决定是否提示
      }
    },

    /** 创建新会话并自动选中。 */
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

    /**
     * 设置当前活跃会话 ID，触发数据加载和 SSE 连接。
     * 切换前断开旧 SSE、清空旧数据、重置 Renderer，然后并行加载新会话的消息/文件/Agent Run/A2UI Event/Snapshot。
     */
    setActiveSessionId(sessionId: string | null) {
      // 切换前断开旧的 SSE 连接
      this.disconnectSSE();

      this.activeSessionId = sessionId;
      const sessionRevision = ++this._sessionRevision;
      this.sessionHydrationStatus = sessionId ? "loading" : "idle";
      this.sessionHydrationError = null;

      // 清空之前的数据
      this.messages = [];
      this.uploadedFiles = [];
      this.enabledSkillIds = [];
      this.agentRuns = [];
      this.runtimeToolCalls = [];
      this.runtimeTraceEvents = [];
      this.workflows = [];
      this.a2uiEvents = [];
      this.surfaceSnapshots = [];

      // 清空 Renderer
      const renderer = useRendererStore();
      renderer.reset();

      if (!sessionId) {
        return;
      }

      // 加载新会话数据
      void this.loadMessages(sessionId, sessionRevision);
      void this.loadFiles(sessionId, sessionRevision);
      void this.loadAgentRuns(sessionId, sessionRevision);
      void this.loadWorkflows(sessionId, sessionRevision);
      void this.loadA2UIEvents(sessionId, sessionRevision);
      void this.loadSnapshots(sessionId, sessionRevision);
      void this.loadSessionDetail(sessionId, sessionRevision);

      // 建立 SSE 连接
      this.connectSSE(sessionId, sessionRevision);
    },

    /** 软删除会话，同时清理前端状态。 */
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
          this.runtimeToolCalls = [];
          this.runtimeTraceEvents = [];
          this.workflows = [];
          this.a2uiEvents = [];
          this.surfaceSnapshots = [];
          const renderer = useRendererStore();
          renderer.reset();
        }
      } catch {
        throw new Error("删除会话失败");
      }
    },

    /**
     * 加载会话详情（含当前快照和已启用 Skill），并尝试从快照恢复 Renderer 状态。
     * 通过 sessionRevision 防止竞态：只有当前会话 ID 与版本号匹配时才会写入状态。
     */
    async loadSessionDetail(sessionId?: string | null, requestedRevision?: number) {
      const targetSessionId = sessionId ?? this.activeSessionId;
      const sessionRevision = requestedRevision ?? this._sessionRevision;
      if (!targetSessionId) return;
      try {
        const result = await api.getSession(targetSessionId);
        if (!this.isCurrentSession(targetSessionId, sessionRevision)) return;
        // 更新 sessions 列表中对应的项
        const idx = this.sessions.findIndex((s) => s.id === targetSessionId);
        if (idx >= 0) {
          this.sessions[idx] = result.session;
        }
        this.enabledSkillIds = result.enabledSkillIds ?? [];
        restoreRendererFromSnapshot(result.currentSnapshot);
        this.sessionHydrationStatus = "ready";
      } catch (error) {
        if (!this.isCurrentSession(targetSessionId, sessionRevision)) return;
        this.sessionHydrationStatus = "error";
        this.sessionHydrationError = error instanceof Error ? error.message : "会话恢复失败";
        logger.error(`会话恢复失败 → session=${shortId(targetSessionId)}`);
      }
    },

    /** 检查给定的会话 ID 和版本号是否为当前活跃会话（用于防止异步竞态）。 */
    isCurrentSession(sessionId: string, sessionRevision: number) {
      return this.activeSessionId === sessionId && this._sessionRevision === sessionRevision;
    },

    // ─── 消息管理 ───

    /** 加载当前会话的消息列表（最多 200 条）。 */
    async loadMessages(requestedSessionId?: string | null, requestedRevision?: number) {
      const sessionId = requestedSessionId ?? this.activeSessionId;
      const sessionRevision = requestedRevision ?? this._sessionRevision;
      if (!sessionId) return;
      try {
        const result = await api.listMessages(sessionId, { limit: 200 });
        if (!this.isCurrentSession(sessionId, sessionRevision)) return;
        this.messages = result.items;
      } catch {
        // 静默处理
      }
    },

    /**
     * 发送消息到当前会话。
     * 若当前无活跃会话则自动创建（标题从消息内容截取），
     * 发送成功后 SSE 连接会自动推送 assistant 回复和 A2UI 结果。
     */
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
        const result = await api.sendMessage(sessionId, {
          content: trimmedContent,
          attachmentFileIds,
          options: { intent: "CREATE_UI" },
        });
        if (result.workflow) {
          this.upsertWorkflow(result.workflow);
        }
        if (["pending", "running"].includes(result.agentRun?.status ?? "") || result.workflow?.status === "running") {
          this.isGenerating = true;
        }
        // 消息发送成功后，SSE 会自动推送 assistant 消息和 A2UI 结果
        // 这里先重新加载消息列表确保 user 消息出现在列表中
        await this.loadMessages();
        // 后端在 sendMessage 请求内同步完成 plan task 并持久化 workflow，
        // 但 SSE 是内存广播、无回放，初始 plan 阶段又不会产生 assistant 消息，
        // 因此显式重拉 workflow 详情，避免依赖 SSE 事件的时序。
        await this.loadWorkflows();
      } catch {
        throw new Error("消息发送失败");
      } finally {
        this.isSending = false;
      }
    },

    // ─── 文件管理 ───

    /** 加载当前会话的上传文件列表。 */
    async loadFiles(requestedSessionId?: string | null, requestedRevision?: number) {
      const sessionId = requestedSessionId ?? this.activeSessionId;
      const sessionRevision = requestedRevision ?? this._sessionRevision;
      if (!sessionId) return;
      try {
        const result = await api.listFiles(sessionId);
        if (!this.isCurrentSession(sessionId, sessionRevision)) return;
        this.uploadedFiles = result.items;
      } catch {
        // 静默处理
      }
    },

    /** 上传 .txt 文件到当前会话。 */
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

    /** 删除当前会话的上传文件。 */
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

    /** 加载全局 Skill 列表。 */
    async loadSkills() {
      try {
        const result = await api.listSkills();
        this.skills = result.items;
      } catch {
        // 静默处理
      }
    },

    /** 创建新 Skill。 */
    async createSkill(
      name: string,
      description: string,
      content: string,
      references: SkillReference[] = [],
    ) {
      try {
        const result = await api.createSkill({ name, description, content, references });
        this.skills.push(result.skill);
        return result.skill;
      } catch {
        throw new Error("创建 Skill 失败");
      }
    },

    /** 更新已有 Skill 的字段。 */
    async updateSkill(
      skillId: string,
      data: {
        name?: string;
        description?: string;
        content?: string;
        references?: SkillReference[];
        isActive?: boolean;
      },
    ) {
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

    /** 为当前会话启用某个 Skill。 */
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

    /** 为当前会话禁用某个 Skill。 */
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

    /** 加载当前会话的 Agent Run 列表（最多 100 条）。 */
    async loadAgentRuns(requestedSessionId?: string | null, requestedRevision?: number) {
      const sessionId = requestedSessionId ?? this.activeSessionId;
      const sessionRevision = requestedRevision ?? this._sessionRevision;
      if (!sessionId) return;
      try {
        const result = await api.listAgentRuns(sessionId, { limit: 100 });
        if (!this.isCurrentSession(sessionId, sessionRevision)) return;
        this.agentRuns = result.items;
      } catch {
        // 静默处理
      }
    },

    /** 获取单个 Agent Run 的详细信息（含 toolCalls、assistantMessage、a2uiEvents）。 */
    async loadAgentRunDetail(runId: string) {
      if (!this.activeSessionId) return null;
      try {
        return await api.getAgentRunDetail(this.activeSessionId, runId);
      } catch {
        return null;
      }
    },

    // ─── Workflow ───

    /** 加载当前会话的 Workflow 历史。 */
    async loadWorkflows(requestedSessionId?: string | null, requestedRevision?: number) {
      const sessionId = requestedSessionId ?? this.activeSessionId;
      const sessionRevision = requestedRevision ?? this._sessionRevision;
      if (!sessionId) return;
      try {
        const result = await api.listWorkflows(sessionId);
        if (!this.isCurrentSession(sessionId, sessionRevision)) return;
        this.workflows = result.items;
      } catch {
        // 静默处理
      }
    },

    /** 提交 workflow clarification form。 */
    async submitWorkflowClarification(
      artifactId: string,
      answers: Record<string, unknown>,
      additionalText?: string,
    ) {
      if (!this.activeSessionId) throw new Error("请先选择会话");
      const result = await api.sendWorkflowAction(this.activeSessionId, {
        action: "submit_clarification",
        artifactId,
        message: additionalText || "提交澄清答案",
        payload: {
          answers,
          additionalText,
        },
      });
      this.upsertWorkflow(result.workflow);
      if (result.message && !this.messages.some((message) => message.id === result.message!.id)) {
        this.messages.push(result.message);
      }
    },

    /** 提交 workflow decision form 的三选一结果。 */
    async submitWorkflowDecision(
      artifactId: string,
      selectedOption: WorkflowDecisionOption,
      comment?: string,
    ) {
      if (!this.activeSessionId) throw new Error("请先选择会话");
      const result = await api.sendWorkflowAction(this.activeSessionId, {
        action: "submit_decision",
        artifactId,
        message: selectedOption === "revise" ? comment : selectedOption === "confirm" ? "确认" : "拒绝",
        payload: selectedOption === "confirm"
          ? { selectedOption }
          : selectedOption === "revise"
            ? { selectedOption, comment: comment ?? "" }
            : { selectedOption, comment },
      });
      this.upsertWorkflow(result.workflow);
      if (result.message && !this.messages.some((message) => message.id === result.message!.id)) {
        this.messages.push(result.message);
      }
    },

    /** 重试当前失败的 workflow step。 */
    async retryWorkflowStep() {
      if (!this.activeSessionId) throw new Error("请先选择会话");
      const result = await api.sendWorkflowAction(this.activeSessionId, {
        action: "retry_step",
        message: "重试失败步骤",
      });
      this.upsertWorkflow(result.workflow);
      if (result.message && !this.messages.some((message) => message.id === result.message!.id)) {
        this.messages.push(result.message);
      }
      if (result.agentRun) {
        this.upsertAgentRun(result.agentRun);
      }
    },

    /** 插入或更新 Workflow。 */
    upsertWorkflow(workflow: AgentWorkflowDetailDto | AgentWorkflowDto | Pick<AgentWorkflowDto, "id" | "status" | "currentStepType">) {
      const existingIdx = this.workflows.findIndex((item) => item.id === workflow.id);
      const detail = "steps" in workflow
        ? workflow
        : ({
            ...workflow,
            sessionId: "sessionId" in workflow ? workflow.sessionId : (this.activeSessionId ?? ""),
            title: "title" in workflow ? workflow.title : (existingIdx >= 0 ? this.workflows[existingIdx]!.title : null),
            intent: "intent" in workflow ? workflow.intent : (existingIdx >= 0 ? this.workflows[existingIdx]!.intent : null),
            completedReason: "completedReason" in workflow ? workflow.completedReason : (existingIdx >= 0 ? this.workflows[existingIdx]!.completedReason : null),
            failureReason: "failureReason" in workflow ? workflow.failureReason : (existingIdx >= 0 ? this.workflows[existingIdx]!.failureReason : null),
            metadata: "metadata" in workflow ? workflow.metadata : (existingIdx >= 0 ? this.workflows[existingIdx]!.metadata : {}),
            startedAt: "startedAt" in workflow ? workflow.startedAt : (existingIdx >= 0 ? this.workflows[existingIdx]!.startedAt : null),
            completedAt: "completedAt" in workflow ? workflow.completedAt : (existingIdx >= 0 ? this.workflows[existingIdx]!.completedAt : null),
            createdAt: "createdAt" in workflow ? workflow.createdAt : (existingIdx >= 0 ? this.workflows[existingIdx]!.createdAt : new Date().toISOString()),
            updatedAt: "updatedAt" in workflow ? workflow.updatedAt : new Date().toISOString(),
            steps: existingIdx >= 0 ? this.workflows[existingIdx]!.steps : [],
            artifacts: existingIdx >= 0 ? this.workflows[existingIdx]!.artifacts : [],
            agentRuns: existingIdx >= 0 ? this.workflows[existingIdx]!.agentRuns : [],
          } satisfies AgentWorkflowDetailDto);
      if (existingIdx >= 0) {
        this.workflows[existingIdx] = {
          ...this.workflows[existingIdx],
          ...detail,
        };
      } else {
        this.workflows.unshift(detail);
      }
    },

    /** 插入或更新 Workflow step。 */
    upsertWorkflowStep(workflowId: string, step: WorkflowStepDto) {
      const workflow = this.workflows.find((item) => item.id === workflowId);
      if (!workflow) return;
      const existingIdx = workflow.steps.findIndex((item) => item.id === step.id);
      if (existingIdx >= 0) {
        workflow.steps[existingIdx] = step;
      } else {
        workflow.steps.push(step);
        workflow.steps.sort((a, b) => a.sequence - b.sequence);
      }
      workflow.currentStepType = step.type;
    },

    /** 插入或更新 Workflow artifact。 */
    upsertWorkflowArtifact(workflowId: string, artifact: WorkflowArtifactDto) {
      const workflow = this.workflows.find((item) => item.id === workflowId);
      if (!workflow) return;
      const existingIdx = workflow.artifacts.findIndex((item) => item.id === artifact.id);
      if (existingIdx >= 0) {
        workflow.artifacts[existingIdx] = artifact;
      } else {
        workflow.artifacts.push(artifact);
        workflow.artifacts.sort((a, b) => a.kind.localeCompare(b.kind) || a.version - b.version);
      }
    },

    /** 插入或更新 Agent run。 */
    upsertAgentRun(agentRun: AgentRunDto) {
      const existingIdx = this.agentRuns.findIndex((run) => run.id === agentRun.id);
      if (existingIdx >= 0) {
        this.agentRuns[existingIdx] = { ...this.agentRuns[existingIdx], ...agentRun };
      } else {
        this.agentRuns.push(agentRun);
      }
    },

    // ─── A2UI / Snapshots ───

    /** 加载当前会话的 A2UI Event 列表（最多 200 条）。 */
    async loadA2UIEvents(requestedSessionId?: string | null, requestedRevision?: number) {
      const sessionId = requestedSessionId ?? this.activeSessionId;
      const sessionRevision = requestedRevision ?? this._sessionRevision;
      if (!sessionId) return;
      try {
        const result = await api.listA2UIEvents(sessionId, { limit: 200 });
        if (!this.isCurrentSession(sessionId, sessionRevision)) return;
        this.a2uiEvents = result.items.map(toWorkspaceA2UIEvent);
      } catch {
        // 静默处理
      }
    },

    /** 加载当前会话的 Surface Snapshot 列表（最多 100 条）。 */
    async loadSnapshots(requestedSessionId?: string | null, requestedRevision?: number) {
      const sessionId = requestedSessionId ?? this.activeSessionId;
      const sessionRevision = requestedRevision ?? this._sessionRevision;
      if (!sessionId) return;
      try {
        const result = await api.listSnapshots(sessionId, { limit: 100 });
        if (!this.isCurrentSession(sessionId, sessionRevision)) return;
        this.surfaceSnapshots = result.items.map(toWorkspaceSurfaceSnapshot);
      } catch {
        // 静默处理
      }
    },

    // ─── SSE ───

    /**
     * 建立 SSE 连接，注册各类事件的回调处理器。
     * 通过 sessionRevision 防止切换会话后的旧事件污染新状态。
     */
    connectSSE(requestedSessionId?: string | null, requestedRevision?: number) {
      const sessionId = requestedSessionId ?? this.activeSessionId;
      const sessionRevision = requestedRevision ?? this._sessionRevision;
      if (!sessionId) return;

      this.streamStatus = "connecting";
      const renderer = useRendererStore();
      const sid = shortId(sessionId);
      const isCurrent = () => this.isCurrentSession(sessionId, sessionRevision);

      logger.info(`SSE 连接中 → session=${sid}`);

      this._streamConnection = connectStream(sessionId, {
        heartbeat: (_data: { time: string }) => {
          if (!isCurrent()) return;
          this.streamStatus = "connected";
        },

        agent_run_started: (data: { sessionId: string; agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "maxAttempts"> }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          this.streamStatus = "connected";
          this.runtimeToolCalls = this.runtimeToolCalls.filter((toolCall) => toolCall.agentRunId === data.agentRun.id);
          logger.info(`← SSE ← BACKEND: agent_run_started → runId=${shortId(data.agentRun.id)}`);
          // 添加或更新 run
          const existingIdx = this.agentRuns.findIndex((r) => r.id === data.agentRun.id);
          if (existingIdx >= 0) {
            this.agentRuns[existingIdx] = { ...this.agentRuns[existingIdx], ...data.agentRun } as AgentRunDto;
          } else {
            this.agentRuns.push(data.agentRun as AgentRunDto);
          }
        },

        workflow_started: (data: { sessionId: string; workflow: AgentWorkflowDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          this.upsertWorkflow(data.workflow);
        },

        workflow_step_updated: (data: { sessionId: string; workflowId: string; step: WorkflowStepDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          this.upsertWorkflowStep(data.workflowId, data.step);
        },

        workflow_artifact_created: (data: { sessionId: string; workflowId: string; artifact: WorkflowArtifactDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          this.upsertWorkflowArtifact(data.workflowId, data.artifact);
        },

        workflow_completed: (data: { sessionId: string; workflow: AgentWorkflowDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          this.upsertWorkflow(data.workflow);
        },

        workflow_failed: (data: { sessionId: string; workflow: AgentWorkflowDto; failedStep?: WorkflowStepDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          this.upsertWorkflow(data.workflow);
          if (data.failedStep) {
            this.upsertWorkflowStep(data.workflow.id, data.failedStep);
          }
        },

        agent_run_attempt: (data: { sessionId: string; agentRunId: string; attemptIndex: number; phase: string; toolCall?: ToolCallDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          // 更新对应 run 的 attempt
          const run = this.agentRuns.find((r) => r.id === data.agentRunId);
          if (run) {
            run.attemptCount = data.attemptIndex + 1;
          }
          if (data.toolCall) {
            const existingIdx = this.runtimeToolCalls.findIndex((toolCall) => toolCall.id === data.toolCall!.id);
            if (existingIdx >= 0) {
              this.runtimeToolCalls[existingIdx] = data.toolCall;
            } else {
              this.runtimeToolCalls.push(data.toolCall);
            }
          }
        },

        agent_run_completed: (data: {
          sessionId: string;
          agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "assistantMessageId" | "outputSnapshotId" | "completedAt">;
        }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          logger.info(`← SSE ← BACKEND: agent_run_completed → runId=${shortId(data.agentRun.id)}`);
          const run = this.agentRuns.find((r) => r.id === data.agentRun.id);
          if (run) {
            run.status = data.agentRun.status;
            run.attemptCount = data.agentRun.attemptCount;
            run.assistantMessageId = data.agentRun.assistantMessageId;
            run.outputSnapshotId = data.agentRun.outputSnapshotId;
            run.completedAt = data.agentRun.completedAt;
          }
        },

        assistant_message: (data: { sessionId: string; message: MessageDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          // 追加 assistant 消息
          const existing = this.messages.find((m) => m.id === data.message.id);
          if (!existing) {
            this.messages.push(data.message);
          }
          // 重新加载消息确保顺序
          this.loadMessages();
        },

        a2ui_messages: (data: { sessionId: string; a2uiEvent: A2UIEventDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
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
        },

        surface_snapshot: (data: { sessionId: string; snapshot: SurfaceSnapshotDto }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
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
          restoreRendererFromSnapshot(data.snapshot);
        },

        agent_run_failed: (data: {
          sessionId: string;
          agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "failureReason">;
          message: MessageDto;
        }) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
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
        },

        agent_trace_event: (data: AgentTraceEventDto) => {
          if (!isCurrent() || data.sessionId !== sessionId) return;
          this.runtimeTraceEvents.push(data);
        },

        onError: (_error: Error) => {
          if (!isCurrent()) return;
          this.streamStatus = "error";
          logger.error(`SSE 连接错误 → ${_error.message}`);
        },

        onReconnecting: (_attempt: number) => {
          if (!isCurrent()) return;
          this.streamStatus = "connecting";
        },

        onClosed: () => {
          if (!isCurrent()) return;
          this.streamStatus = "idle";
        },
      });
    },

    /** 断开当前 SSE 连接并重置连接状态。 */
    disconnectSSE() {
      this._streamConnection?.close();
      this._streamConnection = null;
      this.streamStatus = "idle";
    },
  },
});

/**
 * 将 A2UIEventDto 转换为 Store 内部使用的宽松类型（messages 和 validationResult 转为 unknown）。
 */
function toWorkspaceA2UIEvent(event: A2UIEventDto): WorkspaceA2UIEvent {
  return {
    ...event,
    messages: event.messages as unknown[],
    validationResult: event.validationResult,
  };
}

/**
 * 将 SurfaceSnapshotDto 转换为 Store 内部使用的宽松类型（snapshot 转为 unknown）。
 */
function toWorkspaceSurfaceSnapshot(snapshot: SurfaceSnapshotDto): WorkspaceSurfaceSnapshot {
  return {
    ...snapshot,
    snapshot: snapshot.snapshot,
  };
}

/**
 * 从 Surface Snapshot 中提取 A2UI 消息，传入 Renderer 恢复渲染状态。
 */
function restoreRendererFromSnapshot(snapshot: SurfaceSnapshotDto | null): void {
  if (!snapshot) return;

  const renderer = useRendererStore();
  const messages = snapshotToRendererMessages(snapshot);
  if (messages.length > 0) {
    renderer.replaceMessages(messages);
  }
}

/**
 * 将 Surface Snapshot 数据还原为 A2UI Server Message 序列（createSurface → updateComponents → updateDataModel）。
 */
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

/**
 * 从消息内容生成会话标题（截取前 24 个字符）。
 */
function createSessionTitle(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
}
