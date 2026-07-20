import type {
  JsonObject,
  ExportSessionDto,
  A2UIServerMessage,
  SurfaceSnapshotDto,
} from "@a2ui-platform/shared";
import { logger } from "../logger.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { messageRepository } from "../repositories/message.repository.js";
import { fileRepository } from "../repositories/file.repository.js";
import { skillRepository } from "../repositories/skill.repository.js";
import { sessionSkillRepository } from "../repositories/session-skill.repository.js";
import { agentRunRepository } from "../repositories/agent-run.repository.js";
import { toolCallRepository } from "../repositories/tool-call.repository.js";
import { a2uiEventRepository } from "../repositories/a2ui-event.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";
import { notFound } from "../utils/errors.js";

/**
 * 导出服务——支持全量导出、JSONL 格式和快照导出。
 */
export const exportService = {
  /**
   * 导出完整的会话数据（所有关联表）。
   */
  async exportSession(sessionId: string): Promise<ExportSessionDto> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) throw notFound("Session", sessionId);

    const messages = await messageRepository.findBySessionId(sessionId, { limit: 1000 });
    const uploadedFiles = await fileRepository.findBySessionId(sessionId);
    const agentRuns = await agentRunRepository.findBySessionId(sessionId);
    const a2uiEvents = await a2uiEventRepository.findBySessionId(sessionId, { limit: 1000 });
    const surfaceSnapshots = await surfaceSnapshotRepository.findBySessionId(sessionId);

    // 收集所有 skills（从 sessionSkills 中找出所有 skill ID，再逐个查询）
    const sessionSkills = await sessionSkillRepository.findBySessionId(sessionId);
    const skillIds = sessionSkills.map((ss) => ss.skillId);
    const skills = [];
    for (const sid of skillIds) {
      const skill = await skillRepository.findById(sid);
      if (skill) {
        skills.push({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          content: skill.content,
          references: extractSkillReferences(skill.metadata),
          sourceType: skill.sourceType,
          version: skill.version,
          isActive: skill.isActive,
          createdAt: skill.createdAt.toISOString(),
          updatedAt: skill.updatedAt.toISOString(),
        });
      }
    }

    // 收集所有 tool calls
    const allToolCalls = [];
    for (const run of agentRuns) {
      const tcs = await toolCallRepository.findByAgentRunId(run.id);
      allToolCalls.push(
        ...tcs.map((tc) => ({
          id: tc.id,
          agentRunId: tc.agentRunId,
          sessionId: tc.sessionId,
          toolName: tc.toolName,
          status: tc.status as "running" | "succeeded" | "failed",
          attemptIndex: tc.attemptIndex,
          inputSummary: tc.inputSummary as unknown as JsonObject,
          output: tc.output as unknown as JsonObject | null,
          errorMessage: tc.errorMessage,
          durationMs: tc.durationMs,
          createdAt: tc.createdAt.toISOString(),
        }))
      );
    }

    logger.info({ sessionId }, "正在导出会话");

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        status: session.status as ExportSessionDto["session"]["status"],
        catalogId: session.catalogId,
        catalogVersion: session.catalogVersion,
        rendererVersion: session.rendererVersion,
        modelProvider: session.modelProvider,
        modelName: session.modelName,
        currentSnapshotId: session.currentSnapshotId,
        lastAgentRunId: session.lastAgentRunId,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      messages: messages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        agentRunId: m.agentRunId,
        role: m.role as "user" | "assistant" | "system" | "tool",
        kind: m.kind as "chat",
        content: m.content,
        attachments: m.attachments as ExportSessionDto["messages"][0]["attachments"],
        a2uiEventIds: m.a2uiEventIds as string[],
        metadata: m.metadata as ExportSessionDto["messages"][0]["metadata"],
        createdAt: m.createdAt.toISOString(),
      })),
      uploadedFiles: uploadedFiles.map((f) => ({
        id: f.id,
        sessionId: f.sessionId,
        originalName: f.originalName,
        mimeType: f.mimeType,
        extension: f.extension as ".txt",
        sizeBytes: f.sizeBytes,
        encoding: f.encoding,
        status: f.status as "ready",
        createdAt: f.createdAt.toISOString(),
      })),
      skills,
      sessionSkills: sessionSkills.map((ss) => ({
        sessionId: ss.sessionId,
        skillId: ss.skillId,
        enabled: ss.enabled,
      })),
      agentRuns: agentRuns.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        triggerMessageId: r.triggerMessageId,
        status: r.status as "pending" | "running" | "committed" | "failed" | "cancelled",
        intent: r.intent,
        modelProvider: r.modelProvider,
        modelName: r.modelName,
        attemptCount: r.attemptCount,
        maxAttempts: r.maxAttempts,
        inputSnapshotId: r.inputSnapshotId,
        outputSnapshotId: r.outputSnapshotId,
        assistantMessageId: r.assistantMessageId,
        failureReason: r.failureReason,
        validationSummary: r.validationSummary as unknown as JsonObject,
        tokenUsage: r.tokenUsage as unknown as JsonObject,
        startedAt: r.startedAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      toolCalls: allToolCalls,
      a2uiEvents: a2uiEvents.map((e) => ({
        id: e.id,
        sessionId: e.sessionId,
        agentRunId: e.agentRunId,
        messageId: e.messageId,
        sequence: e.sequence,
        status: e.status as "committed",
        catalogId: e.catalogId,
        catalogVersion: e.catalogVersion,
        rendererVersion: e.rendererVersion,
        surfaceIds: e.surfaceIds,
        messages: e.messages as unknown as A2UIServerMessage[],
        validationResult: e.validationResult as unknown as JsonObject,
        createdAt: e.createdAt.toISOString(),
      })),
      surfaceSnapshots: surfaceSnapshots.map((s) => ({
        id: s.id,
        sessionId: s.sessionId,
        a2uiEventId: s.a2uiEventId,
        agentRunId: s.agentRunId,
        sequence: s.sequence,
        isCurrent: s.isCurrent,
        catalogId: s.catalogId,
        catalogVersion: s.catalogVersion,
        rendererVersion: s.rendererVersion,
        surfaceCount: s.surfaceCount,
        componentCount: s.componentCount,
        snapshot: s.snapshot as unknown as SurfaceSnapshotDto["snapshot"],
        summary: s.summary,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  },

  /**
   * 按 sequence 展开 events 中的 messages，每行一条 A2UI 消息，输出为 JSONL 字符串。
   */
  async exportA2UIJSONL(sessionId: string): Promise<string> {
    const events = await a2uiEventRepository.findBySessionId(sessionId, { limit: 1000 });
    const committedEvents = events
      .filter((e) => e.status === "committed")
      .sort((a, b) => a.sequence - b.sequence);

    const lines: string[] = [];
    for (const event of committedEvents) {
      const messages = event.messages as unknown as A2UIServerMessage[];
      for (const msg of messages) {
        lines.push(JSON.stringify(msg));
      }
    }

    logger.info({ sessionId, lineCount: lines.length }, "已生成 JSONL 导出");
    return lines.join("\n");
  },

  /**
   * 导出当前 snapshot 为 JSON 字符串。
   */
  async exportSnapshot(sessionId: string): Promise<string> {
    const currentSnapshot = await surfaceSnapshotRepository.findCurrentBySessionId(sessionId);
    if (!currentSnapshot) {
      throw notFound("SurfaceSnapshot (current)", sessionId);
    }
    return JSON.stringify(currentSnapshot.snapshot, null, 2);
  },
};

function extractSkillReferences(metadata: unknown): ExportSessionDto["skills"][number]["references"] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const references = (metadata as { references?: unknown }).references;
  if (!Array.isArray(references)) {
    return [];
  }
  return references
    .filter((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const ref = item as Record<string, unknown>;
      return (
        typeof ref.id === "string" &&
        ref.id.trim().length > 0 &&
        typeof ref.title === "string" &&
        ref.title.trim().length > 0 &&
        typeof ref.content === "string" &&
        ref.content.trim().length > 0
      );
    })
    .map((item) => {
      const ref = item as {
        id: string;
        title: string;
        content: string;
        description?: string | null;
      };
      return {
        id: ref.id.trim(),
        title: ref.title.trim(),
        content: ref.content,
        description: ref.description ?? null,
      };
    });
}
