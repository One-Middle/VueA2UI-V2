import type {
  AgentEngineEvent,
  AgentEngineHost,
  CapabilityInvocation,
  CapabilityResult,
  ContextMaterial,
  ContextMaterialDescriptor,
  JsonObject,
  JsonValue,
  ReadContextInput,
} from "@a2ui-platform/agent-engine-spi";
import type { Prisma } from "@prisma/client";
import { config } from "../config.js";
import { agentEngineRepository } from "../repositories/agent-engine.repository.js";
import { cancellationService } from "./cancellation.service.js";
import { encryptEnginePayload } from "./agent-engine-crypto.js";
import { streamService } from "./stream.service.js";

export type WorkflowContextMaterial = ContextMaterialDescriptor & {
  content: JsonValue;
};

export type WorkflowCapabilityHandler = (
  input: JsonValue,
) => Promise<JsonValue> | JsonValue;

/**
 * Backend 对 SPI 的实现。它是 workflow/数据库/SSE 的唯一交界点；任何 adapter
 * 只会看到 AgentEngineHost，因而不需要导入平台私有模块。
 */
export class WorkflowAgentEngineHost implements AgentEngineHost {
  private readonly materials = new Map<string, WorkflowContextMaterial>();
  private readonly callIds = new Set<string>();
  /** 平台持久化/SSE 使用的全局 run 序列，包含 Host 自己产生的事件。 */
  private persistedSequence = 0;
  /** adapter 提供的源序列；只用于校验单一 adapter 流自身的顺序。 */
  private adapterSequence = 0;
  private bytesRead = 0;

  constructor(
    private readonly input: {
      sessionId: string;
      workflowId: string;
      agentRunId: string;
      materials: WorkflowContextMaterial[];
      capabilities?: Record<string, WorkflowCapabilityHandler>;
      maxContextBytes: number;
      /** 单次 run 允许持久化的语义事件上限，防止异常 adapter 无限输出。 */
      maxEvents: number;
    },
  ) {
    for (const material of input.materials) this.materials.set(material.materialId, material);
  }

  async listContext(): Promise<ContextMaterialDescriptor[]> {
    return [...this.materials.values()].map(({ content: _content, ...descriptor }) => descriptor);
  }

  async readContext(input: ReadContextInput): Promise<ContextMaterial> {
    this.assertNotCancelled();
    const material = this.materials.get(input.materialId);
    if (!material || !material.readable) throw new Error("请求的 context material 不存在或不可读取");
    if (input.expectedVersion && input.expectedVersion !== material.version) {
      throw new Error("请求的 context material 版本已过期");
    }
    if (input.maxBytes !== undefined && material.byteLength > input.maxBytes) {
      throw new Error("请求的 context material 超过 adapter 声明的读取上限");
    }
    if (this.bytesRead + material.byteLength > this.input.maxContextBytes) {
      throw new Error("context 读取预算已耗尽");
    }
    this.bytesRead += material.byteLength;
    await this.persistEvent({
      type: "context_read",
      occurredAt: new Date().toISOString(),
      summary: { materialId: material.materialId, version: material.version, byteLength: material.byteLength },
    });
    return {
      materialId: material.materialId,
      version: material.version,
      content: material.content,
      byteLength: material.byteLength,
    };
  }

  async invokeCapability(input: CapabilityInvocation): Promise<CapabilityResult> {
    this.assertNotCancelled();
    if (this.callIds.has(input.callId)) throw new Error("capability callId 不可重复使用");
    this.callIds.add(input.callId);
    const handler = this.input.capabilities?.[input.capability];
    if (!handler) throw new Error(`未提供 capability：${input.capability}`);
    await this.persistEvent({
      type: "capability_started",
      occurredAt: new Date().toISOString(),
      summary: { callId: input.callId, capability: input.capability },
    });
    try {
      const output = await handler(input.input);
      await this.persistEvent({
        type: "capability_completed",
        occurredAt: new Date().toISOString(),
        summary: { callId: input.callId, capability: input.capability },
      });
      return { callId: input.callId, output };
    } catch (error) {
      await this.persistEvent({
        type: "capability_failed",
        occurredAt: new Date().toISOString(),
        summary: {
          callId: input.callId,
          capability: input.capability,
          message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  async emit(event: AgentEngineEvent): Promise<void> {
    this.assertNotCancelled();
    if (event.sequence <= this.adapterSequence) throw new Error("adapter event sequence 必须严格递增");
    this.adapterSequence = event.sequence;
    await this.persistEvent(event);
  }

  /**
   * Host 与 adapter 都能产生日志事件。由 Host 分配最终 sequence，避免一次
   * context/capability 调用插入到 adapter 流中时与 adapter 的源 sequence 冲突。
   */
  private async persistEvent(event: Omit<AgentEngineEvent, "sequence"> | AgentEngineEvent): Promise<void> {
    const sequence = this.persistedSequence + 1;
    if (sequence > this.input.maxEvents) throw new Error("agent engine event 预算已耗尽");
    this.persistedSequence = sequence;
    const nativeSummary = summarizeNative(event.native);
    await agentEngineRepository.createEvent({
      agentRun: { connect: { id: this.input.agentRunId } },
      session: { connect: { id: this.input.sessionId } },
      workflow: { connect: { id: this.input.workflowId } },
      sequence,
      eventType: event.type,
      occurredAt: new Date(event.occurredAt),
      summary: event.summary as unknown as Prisma.InputJsonValue,
      nativeSummary: nativeSummary as unknown as Prisma.InputJsonValue,
    });
    streamService.send(this.input.sessionId, {
      event: "agent_engine_event",
      data: {
        sessionId: this.input.sessionId,
        agentRunId: this.input.agentRunId,
        sequence,
        type: event.type,
        occurredAt: event.occurredAt,
        summary: event.summary as Record<string, unknown>,
        nativeSummary: nativeSummary as Record<string, unknown> | null,
      },
    });
  }

  async persistFailureNativePayload(payload: JsonValue): Promise<void> {
    if (!config.agentEngine.payloadEncryptionKey) return;
    if (this.persistedSequence + 1 > this.input.maxEvents) {
      throw new Error("agent engine event 预算已耗尽");
    }
    const encrypted = encryptEnginePayload(payload, config.agentEngine.payloadEncryptionKey);
    await agentEngineRepository.createEvent({
      agentRun: { connect: { id: this.input.agentRunId } },
      session: { connect: { id: this.input.sessionId } },
      workflow: { connect: { id: this.input.workflowId } },
      sequence: this.persistedSequence + 1,
      eventType: "error",
      occurredAt: new Date(),
      summary: { retainedNativePayload: true },
      failureNativePayloadEncrypted: encrypted,
      payloadExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    this.persistedSequence += 1;
  }

  isCancelled(): boolean {
    return cancellationService.isCancelled(this.input.agentRunId);
  }

  private assertNotCancelled(): void {
    if (this.isCancelled()) throw new Error("AgentRun 已取消，拒绝继续读取或调用 capability");
  }
}

function summarizeNative(native: JsonValue | undefined): JsonObject | null {
  if (!native || typeof native !== "object" || Array.isArray(native)) return native === undefined ? null : { type: typeof native };
  const source = native as JsonObject;
  const summary: JsonObject = {};
  for (const key of ["type", "name", "status", "id", "callId"]) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") summary[key] = value;
  }
  return summary;
}
