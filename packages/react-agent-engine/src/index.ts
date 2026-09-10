import { createAgentRuntime } from "@a2ui-platform/agent";
import type { AgentRuntimeFactoryConfig, AgentWorkflowTaskInput, IAgentRuntime } from "@a2ui-platform/shared";
import {
  assertRunnable,
  type AgentEngine,
  type AgentEngineHost,
  type AgentEngineManifest,
  type AgentEnginePlugin,
  type AgentRunOptions,
  type AgentRunOutcome,
  type AgentRunRequest,
  type ContextUsed,
  type JsonObject,
  type JsonValue,
} from "@a2ui-platform/agent-engine-spi";

export interface ReactEngineConfig extends AgentRuntimeFactoryConfig {}

export const reactAgentEngineManifest: AgentEngineManifest = {
  engineId: "react",
  version: "1.0.0",
  profiles: ["core-v1", "workflow-v1"],
  configSchema: { type: "object" },
};

/** 将既有 ReAct Runtime 包装为 SPI adapter 的迁移桥。 */
export class ReactAgentEngine implements AgentEngine {
  constructor(private readonly runtime: IAgentRuntime) {}

  async run(request: AgentRunRequest, host: AgentEngineHost, options: AgentRunOptions): Promise<AgentRunOutcome> {
    const guard = assertRunnable(request, reactAgentEngineManifest, options);
    if (guard) return guard.code === "cancelled" ? { status: "cancelled", failure: guard, contextUsed: [] } : { status: "failed", failure: guard, contextUsed: [] };
    let sequence = 0;
    const emit = (type: "run_started" | "native_tool_completed" | "text_delta" | "run_finished" | "error", summary: JsonObject) =>
      host.emit({ sequence: ++sequence, type, occurredAt: new Date().toISOString(), summary });
    await emit("run_started", { engine: "react" });
    try {
      const { taskInput, contextUsed } = await hydrateLegacyTaskInput(request, host);
      const pendingEvents: Array<Promise<void>> = [];
      const result = await this.runtime.runWorkflowTask(
        taskInput,
        (toolCall) => {
          pendingEvents.push(emit("native_tool_completed", {
            toolName: toolCall.toolName,
            status: toolCall.status,
            attemptIndex: toolCall.attemptIndex,
          }));
        },
        (trace) => {
          pendingEvents.push(emit("text_delta", {
            traceType: trace.type,
            iterationIndex: trace.iterationIndex,
            ...(trace.toolName ? { toolName: trace.toolName } : {}),
            ...(trace.finalKind ? { finalKind: trace.finalKind } : {}),
          }));
        },
      );
      await Promise.all(pendingEvents);
      if (host.isCancelled() || options.signal.aborted) {
        const failure = { code: "cancelled" as const, message: "运行已取消", retryable: true };
        return { status: "cancelled", failure, contextUsed };
      }
      // output 只能包含 task schema 规定的最终 artifact。旧 ReAct 的工具记录、
      // trace 与 ledger 是运行诊断，迁移期也必须经 diagnostics 而非 output 传递。
      const output = result.parsedResult as unknown as JsonObject;
      await emit("run_finished", { status: "completed", attempts: result.attemptCount });
      return {
        status: "completed",
        output,
        contextUsed,
        diagnostics: {
          legacyDebugMetadata: result.debugMetadata as unknown as JsonObject,
          legacyToolCalls: result.toolCalls as unknown as JsonObject["legacyToolCalls"],
          legacyRawOutputPreview: result.rawOutputPreview,
          legacyAttemptCount: result.attemptCount,
          legacyTokenUsage: (result.tokenUsage ?? {}) as unknown as JsonObject,
          legacyTraceSummary: (result.traceSummary ?? null) as unknown as JsonObject["legacyTraceSummary"],
          legacyResourceLedger: (result.resourceLedger ?? null) as unknown as JsonObject["legacyResourceLedger"],
        },
      };
    } catch (error) {
      const failure = { code: "internal_error" as const, message: error instanceof Error ? error.message : String(error), retryable: true };
      await emit("error", { code: failure.code });
      return { status: "failed", failure, contextUsed: [] };
    }
  }
}

/**
 * ReAct 是迁移 adapter，旧 Runtime 仍要求一个聚合对象。聚合工作只在 adapter
 * 内完成：Backend 不把旧对象作为 SPI request.input 传递，也不泄漏给其他引擎。
 */
async function hydrateLegacyTaskInput(
  request: AgentRunRequest,
  host: AgentEngineHost,
): Promise<{ taskInput: AgentWorkflowTaskInput; contextUsed: ContextUsed[] }> {
  if (!request.contextCatalog.some((item) => item.materialId === "workflow.task")) {
    // 仅兼容直接使用 adapter 的旧调用方；平台生产路径始终提供 context catalog。
    return { taskInput: request.input as unknown as AgentWorkflowTaskInput, contextUsed: [] };
  }

  const values = new Map<string, JsonValue>();
  const contextUsed: ContextUsed[] = [];
  for (const descriptor of request.contextCatalog) {
    if (!descriptor.readable) continue;
    const material = await host.readContext({
      materialId: descriptor.materialId,
      expectedVersion: descriptor.version,
    });
    values.set(material.materialId, material.content);
    contextUsed.push({ materialId: material.materialId, version: material.version });
  }

  const task = objectValue(values.get("workflow.task"));
  const catalog = objectValue(values.get("catalog.descriptor"));
  const value = <T>(id: string, fallback: T) => (values.get(id) ?? fallback) as T;
  return {
    taskInput: {
      sessionId: stringValue(task["sessionId"]),
      userMessage: stringValue(task["userMessage"]),
      recentMessages: value("conversation.recent", []),
      uploadedFiles: value("documents.uploaded", []),
      enabledSkills: value("skills.enabled", []),
      currentSnapshot: value("ui.snapshot.current", null),
      catalogId: stringValue(catalog["catalogId"]),
      catalogVersion: stringValue(catalog["catalogVersion"]),
      rendererVersion: stringValue(catalog["rendererVersion"]),
      model: objectValue(task["model"]) as AgentWorkflowTaskInput["model"],
      workflowId: stringValue(task["workflowId"]),
      workflowStepId: stringValue(task["workflowStepId"]),
      agentRunId: stringValue(task["agentRunId"]) || undefined,
      task: stringValue(task["task"]) as AgentWorkflowTaskInput["task"],
      gate: stringValue(task["gate"]) as AgentWorkflowTaskInput["gate"],
      stepType: (typeof task["stepType"] === "string" ? task["stepType"] : undefined) as AgentWorkflowTaskInput["stepType"],
      stageState: (typeof task["stageState"] === "string" ? task["stageState"] : null) as AgentWorkflowTaskInput["stageState"],
      availableTools: value("workflow.available_tools", []),
      clarificationAnswers: objectValue(task["clarificationAnswers"]),
      revisionText: typeof task["revisionText"] === "string" ? task["revisionText"] : null,
      previousPlanMarkdown: stringOrNull(values.get("workflow.plan.previous")),
      previousCandidate: objectValue(values.get("workflow.candidate.previous")),
      workflowContext: objectValue(values.get("workflow.context")),
      resourceLedger: objectValue(values.get("workflow.resource_ledger")) as unknown as AgentWorkflowTaskInput["resourceLedger"],
    },
    contextUsed,
  };
}

function objectValue(value: JsonValue | undefined): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function stringValue(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function stringOrNull(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export function createReactAgentEnginePlugin(runtimeFactory = createAgentRuntime): AgentEnginePlugin {
  return {
    manifest: reactAgentEngineManifest,
    create(config) {
      return new ReactAgentEngine(runtimeFactory(config as unknown as ReactEngineConfig));
    },
  };
}
