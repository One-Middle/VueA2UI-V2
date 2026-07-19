/**
 * 统一 API 客户端
 *
 * 基于 fetch 封装，支持 JSON 请求、文件上传、二进制下载。
 * 所有 API endpoint 方法都集中在此文件中。
 */

import type {
  AgentRunDetailResponse,
  AgentRunDto,
  A2UIClientMessage,
  A2UIEventDto,
  CreateSessionRequest,
  CreateSkillRequest,
  ExportSessionDto,
  MessageDto,
  PageResult,
  RendererEventDto,
  RuntimeConfigDto,
  SendMessageRequest,
  SendMessageResponse,
  SessionDetailResponse,
  SessionDto,
  SessionSkillDto,
  SkillDto,
  SurfaceSnapshotDto,
  UpdateRuntimeConfigRequest,
  UpdateSessionRequest,
  UpdateSkillRequest,
  UploadedFileDto,
} from "@a2ui-platform/shared";
import { logger } from "./logger";

/** API 基础路径，从环境变量读取，默认 /api */
const baseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export function resolveApiBaseUrl(configuredBaseUrl?: string): string {
  const trimmed = configuredBaseUrl?.trim();
  if (!trimmed) return "/api";

  const normalized = trimmed.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

/** API 错误类 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 通用 JSON 请求 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal }
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const init: RequestInit = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  if (options?.signal) {
    init.signal = options.signal;
  }

  const res = await fetch(url, init);

  logger.debug(`${method} ${path} → ${res.status}`);

  if (res.status === 204) {
    return undefined as T;
  }

  const json = await res.json();

  if (!res.ok) {
    const errorBody = json as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
    throw new ApiError(
      res.status,
      errorBody?.error?.code ?? "UNKNOWN",
      errorBody?.error?.message ?? `请求失败，状态码 ${res.status}`,
      errorBody?.error?.details
    );
  }

  return json as T;
}

/** multipart 文件上传 */
async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });

  const json = await res.json();

  if (!res.ok) {
    const errorBody = json as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
    throw new ApiError(
      res.status,
      errorBody?.error?.code ?? "UNKNOWN",
      errorBody?.error?.message ?? `上传失败，状态码 ${res.status}`,
      errorBody?.error?.details
    );
  }

  return json as T;
}

/** 下载二进制 Blob 并触发浏览器下载 */
async function downloadBlob(path: string, filename?: string): Promise<void> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: { message: "下载失败" } }));
    throw new ApiError(
      res.status,
      (json as { error?: { code?: string } })?.error?.code ?? "UNKNOWN",
      (json as { error?: { message?: string } })?.error?.message ?? `下载失败，状态码 ${res.status}`
    );
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?(.+?)"?$/);
  const finalFilename = filename ?? match?.[1] ?? "download";

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

// ─── Runtime 配置 ──────────────────────────────────────────

/** 获取 Runtime 配置 */
export function getRuntimeConfig(): Promise<RuntimeConfigDto> {
  return request<RuntimeConfigDto>("GET", "/runtime/config");
}

/** 更新 Runtime 配置 */
export function updateRuntimeConfig(data: UpdateRuntimeConfigRequest): Promise<{ config: RuntimeConfigDto }> {
  return request("PATCH", "/runtime/config", data);
}

// ─── 会话 ──────────────────────────────────────────────────

/** 创建会话 */
export function createSession(data?: CreateSessionRequest): Promise<{ session: SessionDto }> {
  return request("POST", "/sessions", data ?? {});
}

/** 获取会话列表 */
export function listSessions(params?: { status?: string; limit?: number; cursor?: string }): Promise<PageResult<SessionDto>> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return request("GET", `/sessions${qs ? `?${qs}` : ""}`);
}

/** 获取会话详情 */
export function getSession(id: string): Promise<SessionDetailResponse> {
  return request("GET", `/sessions/${id}`);
}

/** 更新会话 */
export function updateSession(id: string, data: UpdateSessionRequest): Promise<{ session: SessionDto }> {
  return request("PATCH", `/sessions/${id}`, data);
}

/** 删除会话（软删除） */
export function deleteSession(id: string): Promise<{ success: boolean }> {
  return request("DELETE", `/sessions/${id}`);
}

// ─── 消息 ──────────────────────────────────────────────────

/** 获取消息列表 */
export function listMessages(sessionId: string, params?: { limit?: number; cursor?: string }): Promise<PageResult<MessageDto>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return request("GET", `/sessions/${sessionId}/messages${qs ? `?${qs}` : ""}`);
}

/** 发送用户消息并触发 Agent */
export function sendMessage(sessionId: string, data: SendMessageRequest): Promise<SendMessageResponse> {
  return request("POST", `/sessions/${sessionId}/messages`, data);
}

// ─── Agent Run ─────────────────────────────────────────────

/** 获取 Agent Run 列表 */
export function listAgentRuns(sessionId: string, params?: { limit?: number; cursor?: string }): Promise<PageResult<AgentRunDto>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return request("GET", `/sessions/${sessionId}/agent-runs${qs ? `?${qs}` : ""}`);
}

/** 获取 Agent Run 详情 */
export function getAgentRunDetail(sessionId: string, runId: string): Promise<AgentRunDetailResponse> {
  return request("GET", `/sessions/${sessionId}/agent-runs/${runId}`);
}

// ─── 文件 ──────────────────────────────────────────────────

/** 上传 .txt 文件 */
export function uploadFileToSession(sessionId: string, file: File): Promise<{ file: UploadedFileDto }> {
  const formData = new FormData();
  formData.append("file", file);
  return uploadFile(`/sessions/${sessionId}/files`, formData);
}

/** 获取文件列表 */
export function listFiles(sessionId: string): Promise<{ items: UploadedFileDto[] }> {
  return request("GET", `/sessions/${sessionId}/files`);
}

/** 获取文件详情（含内容） */
export function getFile(sessionId: string, fileId: string): Promise<{ file: UploadedFileDto }> {
  return request("GET", `/sessions/${sessionId}/files/${fileId}?includeContent=true`);
}

/** 删除文件 */
export function deleteFile(sessionId: string, fileId: string): Promise<void> {
  return request("DELETE", `/sessions/${sessionId}/files/${fileId}`);
}

// ─── Skills ────────────────────────────────────────────────

/** 创建 Skill */
export function createSkill(data: CreateSkillRequest): Promise<{ skill: SkillDto }> {
  return request("POST", "/skills", data);
}

/** 获取 Skill 列表 */
export function listSkills(params?: { active?: boolean; limit?: number; cursor?: string }): Promise<PageResult<SkillDto>> {
  const query = new URLSearchParams();
  if (params?.active !== undefined) query.set("active", String(params.active));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return request("GET", `/skills${qs ? `?${qs}` : ""}`);
}

/** 更新 Skill */
export function updateSkill(id: string, data: UpdateSkillRequest): Promise<{ skill: SkillDto }> {
  return request("PATCH", `/skills/${id}`, data);
}

/** 启用会话 Skill */
export function enableSkill(sessionId: string, skillId: string): Promise<{ sessionSkill: SessionSkillDto }> {
  return request("POST", `/sessions/${sessionId}/skills/${skillId}/enable`);
}

/** 禁用会话 Skill */
export function disableSkill(sessionId: string, skillId: string): Promise<{ sessionSkill: SessionSkillDto }> {
  return request("POST", `/sessions/${sessionId}/skills/${skillId}/disable`);
}

// ─── A2UI ──────────────────────────────────────────────────

/** 获取 A2UI Events 列表 */
export function listA2UIEvents(sessionId: string, params?: { fromSequence?: number; limit?: number }): Promise<PageResult<A2UIEventDto>> {
  const query = new URLSearchParams();
  if (params?.fromSequence) query.set("fromSequence", String(params.fromSequence));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request("GET", `/sessions/${sessionId}/a2ui-events${qs ? `?${qs}` : ""}`);
}

/** 获取 Surface Snapshots 列表 */
export function listSnapshots(sessionId: string, params?: { limit?: number; cursor?: string }): Promise<PageResult<SurfaceSnapshotDto>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  return request("GET", `/sessions/${sessionId}/surface-snapshots${qs ? `?${qs}` : ""}`);
}

/** 获取当前 Snapshot */
export function getCurrentSnapshot(sessionId: string): Promise<{ snapshot: SurfaceSnapshotDto | null }> {
  return request("GET", `/sessions/${sessionId}/surface-snapshots/current`);
}

// ─── Renderer 回传 ─────────────────────────────────────────

/** 提交 Renderer action */
export function recordAction(sessionId: string, action: A2UIClientMessage): Promise<{ rendererEvent: RendererEventDto }> {
  return request("POST", `/sessions/${sessionId}/renderer/action`, action);
}

/** 提交 Renderer error */
export function recordError(sessionId: string, error: A2UIClientMessage): Promise<{ rendererEvent: RendererEventDto }> {
  return request("POST", `/sessions/${sessionId}/renderer/error`, error);
}

// ─── 导入导出 ──────────────────────────────────────────────

/** 导出完整会话 JSON */
export function exportSession(sessionId: string): Promise<ExportSessionDto> {
  return request("GET", `/sessions/${sessionId}/export`);
}

/** 导出 A2UI JSONL 并触发浏览器下载 */
export function downloadA2UIJSONL(sessionId: string): Promise<void> {
  return downloadBlob(`/sessions/${sessionId}/export/a2ui.jsonl`, `session-${sessionId}-a2ui.jsonl`);
}

/** 导出当前 Snapshot JSON 并触发浏览器下载 */
export function downloadSnapshot(sessionId: string): Promise<void> {
  return downloadBlob(`/sessions/${sessionId}/export/snapshot.json`, `surface-snapshot-${sessionId}.json`);
}
