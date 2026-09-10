import { Codex, type ThreadEvent } from "@openai/codex-sdk";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { assertRunnable, type AgentEngine, type AgentEngineEvent, type AgentEngineHost, type AgentEngineManifest, type AgentEnginePlugin, type AgentRunOptions, type AgentRunOutcome, type AgentRunRequest, type JsonObject, type JsonValue } from "@a2ui-platform/agent-engine-spi";
import { createLoopbackHostServer } from "./loopback-host-server.js";

// 编译后的 CLI 与本模块位于同一目录；使用绝对路径避免依赖部署环境的 PATH。
const engineHostCliPath = join(dirname(fileURLToPath(import.meta.url)), "engine-host-cli.js");

export interface CodexSdkConfig {
  apiKeyEnv: string;
  model?: string;
  reasoningEffort?: string;
  workingDirectory: string;
  sessionDirectory?: string;
}

/** SDK bridge 仅存在于 adapter 内，避免 SDK 类型穿透 SPI。 */
export interface CodexSdkBridge {
  run(input: { prompt: string; outputSchema: JsonObject; continuation?: JsonValue; config: CodexSdkConfig; signal: AbortSignal; hostEnvironment?: Record<string, string> }): AsyncIterable<JsonObject>;
}

/** 基于官方 SDK 的默认 bridge；SDK 事件在 adapter 内部归一化为 JSON。 */
export class NativeCodexSdkBridge implements CodexSdkBridge {
  async *run(input: { prompt: string; outputSchema: JsonObject; continuation?: JsonValue; config: CodexSdkConfig; signal: AbortSignal; hostEnvironment?: Record<string, string> }): AsyncIterable<JsonObject> {
    const apiKey = process.env[input.config.apiKeyEnv];
    if (!apiKey) throw new Error(`缺少 ${input.config.apiKeyEnv}`);
    // SDK 会把此环境传给本次 Codex 子进程；短期 token 不写入磁盘或 continuation。
    const codex = new Codex({
      apiKey,
      // CODEX_HOME 控制 CLI 保存 thread 的位置。仅传入本 adapter 的 sessionDirectory，
      // 不让平台管理或读取 Codex 私有 session 格式。
      env: {
        ...input.hostEnvironment,
        ...(input.config.sessionDirectory ? { CODEX_HOME: input.config.sessionDirectory } : {}),
      },
    });
    const continuation = input.continuation;
    const threadId = continuation && typeof continuation === "object" && !Array.isArray(continuation) && typeof (continuation as Record<string, unknown>)["threadId"] === "string"
      ? (continuation as Record<string, string>)["threadId"]
      : undefined;
    const thread = threadId
      ? codex.resumeThread(threadId, threadOptions(input.config))
      : codex.startThread(threadOptions(input.config));
    const streamed = await thread.runStreamed(input.prompt, { outputSchema: input.outputSchema, signal: input.signal });
    for await (const event of streamed.events) yield eventToJson(event);
    if (thread.id) yield { type: "thread_state", threadId: thread.id };
  }
}

export const codexSdkAgentEngineManifest: AgentEngineManifest = {
  engineId: "codex-sdk",
  version: "1.0.0",
  profiles: ["core-v1", "workflow-v1"],
  configSchema: { type: "object", required: ["apiKeyEnv", "workingDirectory"] },
};

export class CodexSdkAgentEngine implements AgentEngine {
  constructor(private readonly config: CodexSdkConfig, private readonly bridge: CodexSdkBridge) {}

  async run(request: AgentRunRequest, host: AgentEngineHost, options: AgentRunOptions): Promise<AgentRunOutcome> {
    const guard = assertRunnable(request, codexSdkAgentEngineManifest, options);
    if (guard) return guard.code === "cancelled" ? { status: "cancelled", failure: guard, contextUsed: [] } : { status: "failed", failure: guard, contextUsed: [] };
    if (!process.env[this.config.apiKeyEnv]) {
      return { status: "failed", failure: { code: "configuration_error", message: `缺少 ${this.config.apiKeyEnv}`, retryable: false }, contextUsed: [] };
    }
    const used: Array<{ materialId: string; version: string }> = [];
    const nativeItems: JsonValue[] = [];
    let sequence = 0;
    const emit = async (type: AgentEngineEvent["type"], summary: JsonObject, native?: JsonValue) => host.emit({ sequence: ++sequence, type, occurredAt: new Date().toISOString(), summary, ...(native === undefined ? {} : { native }) });
    await emit("run_started", { engine: "codex-sdk" });
    try {
      let finalOutput: JsonValue | undefined;
      let threadId: string | undefined;
      const loopback = await createLoopbackHostServer(host);
      const prompt = JSON.stringify({
        task: request.task,
        input: request.input,
        contextCatalog: request.contextCatalog,
        capabilities: request.capabilityCatalog,
        instruction: `Return only JSON conforming to outputSchema. To read listed context or invoke a capability, run node ${JSON.stringify(engineHostCliPath)} context.read '<json>' or node ${JSON.stringify(engineHostCliPath)} capability.invoke '<json>'.`,
      });
      try {
      for await (const item of this.bridge.run({
        prompt,
        outputSchema: request.outputSchema,
        continuation: request.continuation?.state,
        config: this.config,
        signal: options.signal,
        hostEnvironment: { ...process.env as Record<string, string>, ENGINE_HOST_URL: loopback.url, ENGINE_HOST_TOKEN: loopback.token },
      })) {
        if (host.isCancelled() || options.signal.aborted) break;
        const type = typeof item["type"] === "string" ? item["type"] : "native_item";
        nativeItems.push(item);
        if (type === "context_read" && typeof item["materialId"] === "string" && typeof item["version"] === "string") used.push({ materialId: item["materialId"], version: item["version"] });
        if (type === "final_output") finalOutput = item["output"] as JsonValue;
        if (type === "thread_state" && typeof item["threadId"] === "string") threadId = item["threadId"];
        if (type === "agent_message" && typeof item["text"] === "string") {
          try { finalOutput = JSON.parse(item["text"]); } catch { /* outputSchema failure is reported below */ }
        }
        const semanticType = semanticEventType(item);
        if (semanticType) await emit(semanticType, { type }, item);
      }
      } finally {
        await loopback.close();
      }
      if (host.isCancelled() || options.signal.aborted) {
        await emit("run_finished", { status: "cancelled" });
        return { status: "cancelled", failure: { code: "cancelled", message: "运行已取消", retryable: true }, contextUsed: used };
      }
      if (finalOutput === undefined) {
        await emit("error", { code: "invalid_output" });
        await emit("run_finished", { status: "failed" });
        return { status: "failed", failure: { code: "invalid_output", message: "Codex 未返回结构化最终输出", retryable: true, nativePayload: nativeItems }, contextUsed: used };
      }
      await emit("run_finished", { status: "completed" });
      return { status: "completed", output: finalOutput, contextUsed: used, continuation: { engineId: codexSdkAgentEngineManifest.engineId, pluginVersion: codexSdkAgentEngineManifest.version, state: { ...(threadId ? { threadId } : {}), contextReadCount: used.length } } };
    } catch (error) {
      await emit("error", { code: "transient_error" });
      await emit("run_finished", { status: "failed" });
      return { status: "failed", failure: {
        code: "transient_error",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
        nativePayload: {
          items: nativeItems,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack ?? null } : String(error),
        },
      }, contextUsed: used };
    }
  }
}

export function createCodexSdkAgentEnginePlugin(bridge: CodexSdkBridge = new NativeCodexSdkBridge()): AgentEnginePlugin {
  return { manifest: codexSdkAgentEngineManifest, create(config) { return new CodexSdkAgentEngine(config as unknown as CodexSdkConfig, bridge); } };
}

function threadOptions(config: CodexSdkConfig) {
  return {
    model: config.model,
    modelReasoningEffort: config.reasoningEffort as "minimal" | "low" | "medium" | "high" | "xhigh" | "max" | "ultra" | "persistent" | undefined,
    workingDirectory: config.workingDirectory,
    skipGitRepoCheck: true,
    approvalPolicy: "never" as const,
  };
}

function eventToJson(event: ThreadEvent): JsonObject {
  if (event.type === "item.completed" || event.type === "item.updated" || event.type === "item.started") {
    const item = event.item;
    if (item.type === "agent_message") return { type: "agent_message", text: item.text, nativeType: event.type };
    if (item.type === "command_execution") return { type: "native_tool", tool: "command_execution", status: item.status, command: item.command, nativeType: event.type };
    return { type: item.type, nativeType: event.type };
  }
  if (event.type === "thread.started") return { type: "thread_state", threadId: event.thread_id };
  if (event.type === "turn.failed" || event.type === "error") return { type: "error", message: event.type === "error" ? event.message : event.error.message };
  return { type: event.type };
}

/** 将 Codex SDK item 生命周期归一化；thread state 只用于 continuation，不是 UI 事件。 */
function semanticEventType(item: JsonObject): AgentEngineEvent["type"] | null {
  const type = typeof item["type"] === "string" ? item["type"] : "";
  if (type === "thread_state") return null;
  if (type === "error") return "error";
  const nativeType = typeof item["nativeType"] === "string" ? item["nativeType"] : "";
  if (type === "native_tool") {
    if (nativeType === "item.started") return "native_tool_started";
    if (nativeType === "item.completed") return "native_tool_completed";
    return "native_tool_failed";
  }
  return "text_delta";
}
