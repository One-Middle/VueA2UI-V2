/** 平台无关的 Agent Engine SPI v1。 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type JsonSchema = JsonObject;

export type EngineCapabilityProfile = "core-v1" | "workflow-v1";

export interface AgentEngineManifest {
  engineId: string;
  version: string;
  profiles: EngineCapabilityProfile[];
  configSchema: JsonSchema;
}

export interface AgentEnginePlugin {
  manifest: AgentEngineManifest;
  create(config: JsonObject): Promise<AgentEngine> | AgentEngine;
}

export interface ContextMaterialDescriptor {
  materialId: string;
  version: string;
  kind: string;
  title: string;
  summary: string;
  byteLength: number;
  readable: boolean;
}

export interface ContextMaterial {
  materialId: string;
  version: string;
  content: JsonValue;
  byteLength: number;
}

export interface ContextUsed {
  materialId: string;
  version: string;
}

export interface ReadContextInput {
  materialId: string;
  expectedVersion?: string;
  maxBytes?: number;
}

export interface CapabilityDescriptor {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  mode: "read" | "write";
}

export interface CapabilityInvocation {
  callId: string;
  capability: string;
  input: JsonValue;
}

export interface CapabilityResult {
  callId: string;
  output: JsonValue;
}

export type AgentEngineEventType =
  | "run_started" | "text_delta" | "context_read"
  | "capability_started" | "capability_completed" | "capability_failed"
  | "native_tool_started" | "native_tool_completed" | "native_tool_failed"
  | "budget_warning" | "error" | "run_finished";

export interface AgentEngineEvent {
  sequence: number;
  type: AgentEngineEventType;
  occurredAt: string;
  summary: JsonObject;
  native?: JsonValue;
}

export type AgentEngineFailureCode =
  | "invalid_output" | "budget_exhausted" | "context_insufficient"
  | "cancelled" | "transient_error" | "configuration_error" | "internal_error";

export interface AgentEngineFailure {
  code: AgentEngineFailureCode;
  message: string;
  retryable: boolean;
  details?: JsonObject;
  /**
   * 仅供 Host 在失败审计时加密留存的原生诊断，不得进入 diagnostics、artifact、
   * 普通 API 或 SSE。adapter 应只在失败结果中提供它。
   */
  nativePayload?: JsonValue;
}

export interface EngineContinuation {
  engineId: string;
  pluginVersion: string;
  state: JsonValue;
}

export interface AgentRunRequest {
  runId: string;
  task: string;
  input: JsonValue;
  outputSchema: JsonSchema;
  contextCatalog: ContextMaterialDescriptor[];
  capabilityCatalog: CapabilityDescriptor[];
  continuation?: EngineContinuation;
}

export interface AgentRunOptions {
  signal: AbortSignal;
  deadline: Date;
  maxEvents: number;
  maxContextBytes: number;
}

export type AgentRunOutcome =
  | { status: "completed"; output: JsonValue; contextUsed: ContextUsed[]; continuation?: EngineContinuation; diagnostics?: JsonObject }
  | { status: "failed"; failure: AgentEngineFailure; contextUsed: ContextUsed[]; continuation?: EngineContinuation; diagnostics?: JsonObject }
  | { status: "cancelled"; failure: AgentEngineFailure; contextUsed: ContextUsed[]; diagnostics?: JsonObject };

export interface AgentEngineHost {
  listContext(): Promise<ContextMaterialDescriptor[]>;
  readContext(input: ReadContextInput): Promise<ContextMaterial>;
  invokeCapability(input: CapabilityInvocation): Promise<CapabilityResult>;
  emit(event: AgentEngineEvent): Promise<void>;
  isCancelled(): boolean;
}

export interface AgentEngine {
  run(request: AgentRunRequest, host: AgentEngineHost, options: AgentRunOptions): Promise<AgentRunOutcome>;
}

/** 引擎实现可用于本地前置检查的通用运行守卫。 */
export function assertRunnable(
  request: AgentRunRequest,
  manifest: AgentEngineManifest,
  options: AgentRunOptions,
): AgentEngineFailure | null {
  if (request.continuation && (request.continuation.engineId !== manifest.engineId || request.continuation.pluginVersion !== manifest.version)) {
    return { code: "configuration_error", message: "Continuation 不属于当前引擎或插件版本", retryable: false };
  }
  if (options.signal.aborted || Date.now() >= options.deadline.getTime()) {
    return { code: options.signal.aborted ? "cancelled" : "budget_exhausted", message: options.signal.aborted ? "运行已取消" : "运行 deadline 已耗尽", retryable: options.signal.aborted };
  }
  return null;
}
