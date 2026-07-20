/**
 * API DTO 类型定义（请求/响应）。
 *
 * 职责：
 * - 定义前后端通信的请求/响应 DTO 类型
 * - 定义枚举类型（SessionStatus、MessageRole、AgentRunStatus 等）
 * - 定义分页、错误响应等通用结构
 *
 * 不负责：A2UI 协议类型（见 a2ui.ts）、Agent 内部类型（见 agent.ts）、SSE 事件类型（见 sse.ts）。
 */

import type { A2UIClientMessage, A2UIServerMessage, JsonObject, SurfaceSnapshotData } from "./a2ui";

/** Skill 附带的参考资料。 */
export interface SkillReference {
  /** Reference 在所属 Skill 内的唯一标识。 */
  id: string;
  /** Reference 标题，用于摘要展示和模型请求。 */
  title: string;
  /** Reference 正文内容。 */
  content: string;
  /** Reference 描述或使用提示。 */
  description?: string | null;
}

/** 会话状态 */
export type SessionStatus = "active" | "archived" | "deleted";
/** 消息角色 */
export type MessageRole = "user" | "assistant" | "system" | "tool";
/** 消息种类 */
export type MessageKind =
  | "chat"
  | "agent_status"
  | "validation_error"
  | "renderer_action"
  | "renderer_error"
  | "import_notice"
  | "export_notice";
/** Agent 运行状态 */
export type AgentRunStatus = "pending" | "running" | "committed" | "failed" | "cancelled";
/** 工具调用状态 */
export type ToolCallStatus = "running" | "succeeded" | "failed";
/** A2UI 事件状态 */
export type A2UIEventStatus = "committed" | "reverted" | "ignored";
/** 上传文件状态 */
export type UploadedFileStatus = "ready" | "failed" | "deleted";

/** 分页信息 */
export interface PageInfo {
  /** 下一页游标，null 表示无下一页 */
  nextCursor: string | null;
  /** 是否还有更多数据 */
  hasMore: boolean;
}

/** 分页结果泛型 */
export interface PageResult<T> {
  /** 当前页数据列表 */
  items: T[];
  /** 分页元信息 */
  pageInfo: PageInfo;
}

/** API 错误响应结构 */
export interface ApiErrorResponse {
  error: {
    /** 错误代码 */
    code: string;
    /** 人类可读的错误描述 */
    message: string;
    /** 附加详情（可选） */
    details?: JsonObject;
  };
}

/** 会话 DTO */
export interface SessionDto {
  /** 会话唯一 ID */
  id: string;
  /** 会话标题 */
  title: string;
  /** 会话描述 */
  description: string | null;
  /** 会话状态 */
  status: SessionStatus;
  /** 使用的 Catalog ID */
  catalogId: string;
  /** Catalog 版本 */
  catalogVersion: string;
  /** Renderer 版本 */
  rendererVersion: string;
  /** 模型提供商 */
  modelProvider: string;
  /** 模型名称 */
  modelName: string;
  /** 当前快照 ID */
  currentSnapshotId: string | null;
  /** 最近一次 Agent 运行 ID */
  lastAgentRunId: string | null;
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 更新时间（ISO 8601） */
  updatedAt: string;
}

/** 消息 DTO */
export interface MessageDto {
  /** 消息唯一 ID */
  id: string;
  /** 所属会话 ID */
  sessionId: string;
  /** 关联的 Agent 运行 ID（普通聊天消息为 null） */
  agentRunId: string | null;
  /** 消息角色 */
  role: MessageRole;
  /** 消息种类 */
  kind: MessageKind;
  /** 消息内容 */
  content: string;
  /** 附件列表 */
  attachments: JsonObject[];
  /** 关联的 A2UI Event ID 列表 */
  a2uiEventIds: string[];
  /** 扩展元数据 */
  metadata: JsonObject;
  /** 创建时间（ISO 8601） */
  createdAt: string;
}

/** 上传文件 DTO */
export interface UploadedFileDto {
  /** 文件唯一 ID */
  id: string;
  /** 所属会话 ID */
  sessionId: string;
  /** 原始文件名 */
  originalName: string;
  /** MIME 类型 */
  mimeType: string;
  /** 文件扩展名（仅 .txt） */
  extension: ".txt";
  /** 文件大小（字节） */
  sizeBytes: number;
  /** 文件编码 */
  encoding: string;
  /** 文件状态 */
  status: UploadedFileStatus;
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 文件内容（仅列表时不返回，详情时返回） */
  content?: string;
}

/** Skill DTO */
export interface SkillDto {
  /** Skill 唯一 ID */
  id: string;
  /** Skill 名称 */
  name: string;
  /** Skill 描述 */
  description: string | null;
  /** Skill 内容（Markdown） */
  content: string;
  /** Skill 附带的参考资料列表。 */
  references: SkillReference[];
  /** Skill 来源类型（system / user） */
  sourceType: string;
  /** 版本号 */
  version: number;
  /** 是否启用 */
  isActive: boolean;
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 更新时间（ISO 8601） */
  updatedAt: string;
}

/** Agent 运行 DTO */
export interface AgentRunDto {
  /** Agent 运行唯一 ID */
  id: string;
  /** 所属会话 ID */
  sessionId: string;
  /** 触发消息 ID */
  triggerMessageId: string | null;
  /** 运行状态 */
  status: AgentRunStatus;
  /** 用户意图（如 CREATE_UI） */
  intent: string | null;
  /** 模型提供商 */
  modelProvider: string;
  /** 模型名称 */
  modelName: string;
  /** 实际尝试次数 */
  attemptCount: number;
  /** 最大尝试次数 */
  maxAttempts: number;
  /** 输入快照 ID */
  inputSnapshotId: string | null;
  /** 输出快照 ID */
  outputSnapshotId: string | null;
  /** 关联的 AI 回复消息 ID */
  assistantMessageId: string | null;
  /** 失败原因 */
  failureReason: string | null;
  /** 校验结果摘要 */
  validationSummary: JsonObject;
  /** Token 用量统计 */
  tokenUsage: JsonObject;
  /** 开始时间（ISO 8601） */
  startedAt: string | null;
  /** 完成时间（ISO 8601） */
  completedAt: string | null;
  /** 创建时间（ISO 8601） */
  createdAt: string;
}

/** 工具调用 DTO */
export interface ToolCallDto {
  /** 工具调用唯一 ID */
  id: string;
  /** 所属 Agent 运行 ID */
  agentRunId: string;
  /** 所属会话 ID */
  sessionId: string;
  /** 工具名称 */
  toolName: string;
  /** 调用状态 */
  status: ToolCallStatus;
  /** 所在尝试轮次索引 */
  attemptIndex: number;
  /** 输入摘要（脱敏后） */
  inputSummary: JsonObject;
  /** 输出结果（脱敏后） */
  output: JsonObject | null;
  /** 失败时的错误信息 */
  errorMessage: string | null;
  /** 调用耗时（毫秒） */
  durationMs: number | null;
  /** 创建时间（ISO 8601） */
  createdAt: string;
}

/** A2UI Event DTO */
export interface A2UIEventDto {
  /** Event 唯一 ID */
  id: string;
  /** 所属会话 ID */
  sessionId: string;
  /** 所属 Agent 运行 ID */
  agentRunId: string | null;
  /** 关联的消息 ID */
  messageId: string | null;
  /** 事件序号（递增） */
  sequence: number;
  /** 事件状态 */
  status: A2UIEventStatus;
  /** 使用的 Catalog ID */
  catalogId: string;
  /** Catalog 版本 */
  catalogVersion: string;
  /** Renderer 版本 */
  rendererVersion: string;
  /** 涉及的 Surface ID 列表 */
  surfaceIds: string[];
  /** A2UI 消息列表 */
  messages: A2UIServerMessage[];
  /** 校验结果 */
  validationResult: JsonObject;
  /** 创建时间（ISO 8601） */
  createdAt: string;
}

/** Surface 快照 DTO */
export interface SurfaceSnapshotDto {
  /** 快照唯一 ID */
  id: string;
  /** 所属会话 ID */
  sessionId: string;
  /** 关联的 A2UI Event ID */
  a2uiEventId: string | null;
  /** 关联的 Agent 运行 ID */
  agentRunId: string | null;
  /** 快照序号（递增） */
  sequence: number;
  /** 是否为当前最新快照 */
  isCurrent: boolean;
  /** 使用的 Catalog ID */
  catalogId: string;
  /** Catalog 版本 */
  catalogVersion: string;
  /** Renderer 版本 */
  rendererVersion: string;
  /** Surface 数量 */
  surfaceCount: number;
  /** 组件总数 */
  componentCount: number;
  /** 快照数据 */
  snapshot: SurfaceSnapshotData;
  /** 快照摘要（可选） */
  summary: string | null;
  /** 创建时间（ISO 8601） */
  createdAt: string;
}

/** Renderer 事件 DTO（action / error） */
export interface RendererEventDto {
  /** 事件唯一 ID */
  id: string;
  /** 事件类型 */
  eventType: "action" | "error";
  /** 是否已被处理 */
  handled: boolean;
}

/** 发送消息请求 */
export interface SendMessageRequest {
  /** 消息文本内容 */
  content: string;
  /** 关联的附件文件 ID 列表 */
  attachmentFileIds?: string[];
  /** 附加选项 */
  options?: {
    /** 用户意图 */
    intent?: string;
  };
}

/** 发送消息响应 */
export interface SendMessageResponse {
  /** 创建的消息摘要 */
  message: Pick<MessageDto, "id" | "role" | "content">;
  /** 触发的 Agent 运行摘要 */
  agentRun: Pick<AgentRunDto, "id" | "status">;
  /** SSE 流地址 */
  streamUrl: string;
}

/** Renderer Action 请求（复用 A2UI 客户端消息） */
export type RendererActionRequest = A2UIClientMessage;
/** Renderer Error 请求（复用 A2UI 客户端消息） */
export type RendererErrorRequest = A2UIClientMessage;

// ─── 会话请求 / 响应 ────────────────────────────────────

/** 创建会话请求。 */
export interface CreateSessionRequest {
  /** 会话标题，默认 "未命名会话" */
  title?: string;
  /** 会话描述 */
  description?: string;
  /** 模型名称，省略时使用 Runtime 默认配置 */
  modelName?: string;
}

/** 更新会话请求。 */
export interface UpdateSessionRequest {
  /** 新的会话标题 */
  title?: string;
  /** 新的会话描述 */
  description?: string;
  /** 新的会话状态 */
  status?: SessionStatus;
}

/** 会话详情响应。 */
export interface SessionDetailResponse {
  /** 会话 DTO */
  session: SessionDto;
  /** 当前快照（可能为 null） */
  currentSnapshot: SurfaceSnapshotDto | null;
  /** 已启用的 Skill ID 列表 */
  enabledSkillIds: string[];
}

// ─── Skill 请求 ─────────────────────────────────────────

/** 创建 Skill 请求。 */
export interface CreateSkillRequest {
  /** Skill 名称 */
  name: string;
  /** Skill 描述 */
  description?: string;
  /** Skill 内容（Markdown） */
  content: string;
  /** Skill 附带的参考资料列表。 */
  references?: SkillReference[];
}

/** 更新 Skill 请求。 */
export interface UpdateSkillRequest {
  /** 新的 Skill 名称 */
  name?: string;
  /** 新的 Skill 描述 */
  description?: string;
  /** 新的 Skill 内容 */
  content?: string;
  /** 新的 Skill 参考资料列表。 */
  references?: SkillReference[];
  /** 是否启用 */
  isActive?: boolean;
}

// ─── Runtime 配置 ───────────────────────────────────────

/** 运行时配置的完整 DTO（与 API 文档 12.1 对齐）。 */
export interface RuntimeConfigDto {
  /** 模型提供商 */
  modelProvider: string;
  /** 模型名称 */
  modelName: string;
  /** Base URL 是否已配置 */
  baseUrlConfigured: boolean;
  /** API Key 是否已配置 */
  apiKeyConfigured: boolean;
  /** 温度参数 */
  temperature: number;
  /** 最大 Token 数 */
  maxTokens: number;
  /** 超时时间（毫秒） */
  timeoutMs: number;
  /** 最大尝试次数 */
  maxAttempts: number;
  /** Catalog ID */
  catalogId: string;
  /** Catalog 版本 */
  catalogVersion: string;
  /** Renderer 版本 */
  rendererVersion: string;
}

/** 更新 Runtime 配置请求。 */
export interface UpdateRuntimeConfigRequest {
  /** 模型名称 */
  modelName?: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 Token 数 */
  maxTokens?: number;
  /** 超时时间（毫秒） */
  timeoutMs?: number;
  /** 最大尝试次数 */
  maxAttempts?: number;
}

// ─── 导出 / 详情响应 ────────────────────────────────────

/** 导出完整会话的类型（与 API 文档 11.1 对齐）。 */
export interface ExportSessionDto {
  /** 导出格式版本 */
  version: string;
  /** 导出时间（ISO 8601） */
  exportedAt: string;
  /** 会话 DTO */
  session: SessionDto;
  /** 所有消息 */
  messages: MessageDto[];
  /** 所有上传文件 */
  uploadedFiles: UploadedFileDto[];
  /** 所有 Skill */
  skills: SkillDto[];
  /** 会话-Skill 关联 */
  sessionSkills: SessionSkillDto[];
  /** 所有 Agent 运行记录 */
  agentRuns: AgentRunDto[];
  /** 所有工具调用记录 */
  toolCalls: ToolCallDto[];
  /** 所有 A2UI 事件 */
  a2uiEvents: A2UIEventDto[];
  /** 所有 Surface 快照 */
  surfaceSnapshots: SurfaceSnapshotDto[];
}

/** Agent Run 详情响应。 */
export interface AgentRunDetailResponse {
  /** Agent 运行 DTO */
  agentRun: AgentRunDto;
  /** 关联的工具调用列表 */
  toolCalls: ToolCallDto[];
  /** 关联的 AI 回复消息 */
  assistantMessage: MessageDto | null;
  /** 关联的 A2UI 事件列表 */
  a2uiEvents: A2UIEventDto[];
}

// ─── 会话 Skill 关联表 DTO ──────────────────────────────

/** 会话与 Skill 的关联记录。 */
export interface SessionSkillDto {
  /** 会话 ID */
  sessionId: string;
  /** Skill ID */
  skillId: string;
  /** 是否已启用 */
  enabled: boolean;
}
