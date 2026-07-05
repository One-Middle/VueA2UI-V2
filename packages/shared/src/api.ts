import type { A2UIClientMessage, A2UIServerMessage, JsonObject, SurfaceSnapshotData } from "./a2ui";

export type SessionStatus = "active" | "archived" | "deleted";
export type MessageRole = "user" | "assistant" | "system" | "tool";
export type MessageKind =
  | "chat"
  | "agent_status"
  | "validation_error"
  | "renderer_action"
  | "renderer_error"
  | "import_notice"
  | "export_notice";
export type AgentRunStatus = "pending" | "running" | "committed" | "failed" | "cancelled";
export type ToolCallStatus = "running" | "succeeded" | "failed";
export type A2UIEventStatus = "committed" | "reverted" | "ignored";
export type UploadedFileStatus = "ready" | "failed" | "deleted";

export interface PageInfo {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PageResult<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: JsonObject;
  };
}

export interface SessionDto {
  id: string;
  title: string;
  description: string | null;
  status: SessionStatus;
  catalogId: string;
  catalogVersion: string;
  rendererVersion: string;
  modelProvider: string;
  modelName: string;
  currentSnapshotId: string | null;
  lastAgentRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  sessionId: string;
  agentRunId: string | null;
  role: MessageRole;
  kind: MessageKind;
  content: string;
  attachments: JsonObject[];
  a2uiEventIds: string[];
  metadata: JsonObject;
  createdAt: string;
}

export interface UploadedFileDto {
  id: string;
  sessionId: string;
  originalName: string;
  mimeType: string;
  extension: ".txt";
  sizeBytes: number;
  encoding: string;
  status: UploadedFileStatus;
  createdAt: string;
  content?: string;
}

export interface SkillDto {
  id: string;
  name: string;
  description: string | null;
  content: string;
  sourceType: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunDto {
  id: string;
  sessionId: string;
  triggerMessageId: string | null;
  status: AgentRunStatus;
  intent: string | null;
  modelProvider: string;
  modelName: string;
  attemptCount: number;
  maxAttempts: number;
  inputSnapshotId: string | null;
  outputSnapshotId: string | null;
  assistantMessageId: string | null;
  failureReason: string | null;
  validationSummary: JsonObject;
  tokenUsage: JsonObject;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ToolCallDto {
  id: string;
  agentRunId: string;
  sessionId: string;
  toolName: string;
  status: ToolCallStatus;
  attemptIndex: number;
  inputSummary: JsonObject;
  output: JsonObject | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface A2UIEventDto {
  id: string;
  sessionId: string;
  agentRunId: string | null;
  messageId: string | null;
  sequence: number;
  status: A2UIEventStatus;
  catalogId: string;
  catalogVersion: string;
  rendererVersion: string;
  surfaceIds: string[];
  messages: A2UIServerMessage[];
  validationResult: JsonObject;
  createdAt: string;
}

export interface SurfaceSnapshotDto {
  id: string;
  sessionId: string;
  a2uiEventId: string | null;
  agentRunId: string | null;
  sequence: number;
  isCurrent: boolean;
  catalogId: string;
  catalogVersion: string;
  rendererVersion: string;
  surfaceCount: number;
  componentCount: number;
  snapshot: SurfaceSnapshotData;
  summary: string | null;
  createdAt: string;
}

export interface RendererEventDto {
  id: string;
  eventType: "action" | "error";
  handled: boolean;
}

export interface SendMessageRequest {
  content: string;
  attachmentFileIds?: string[];
  options?: {
    intent?: string;
  };
}

export interface SendMessageResponse {
  message: Pick<MessageDto, "id" | "role" | "content">;
  agentRun: Pick<AgentRunDto, "id" | "status">;
  streamUrl: string;
}

export type RendererActionRequest = A2UIClientMessage;
export type RendererErrorRequest = A2UIClientMessage;
