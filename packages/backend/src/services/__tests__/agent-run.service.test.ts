import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../db.js";
import { a2uiEventRepository } from "../../repositories/a2ui-event.repository.js";
import { surfaceSnapshotRepository } from "../../repositories/surface-snapshot.repository.js";
import { streamService } from "../stream.service.js";
import { snapshotService } from "../snapshot.service.js";
import { agentRunService } from "../agent-run.service.js";

vi.mock("../../db.js", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("../../repositories/a2ui-event.repository.js", () => ({
  a2uiEventRepository: {
    getNextSequence: vi.fn(),
  },
}));

vi.mock("../../repositories/surface-snapshot.repository.js", () => ({
  surfaceSnapshotRepository: {
    unsetCurrent: vi.fn(),
  },
}));

vi.mock("../snapshot.service.js", () => ({
  snapshotService: {
    computeFromEvents: vi.fn(),
    getCounts: vi.fn(),
  },
}));

vi.mock("../stream.service.js", () => ({
  streamService: { send: vi.fn() },
}));

vi.mock("../../config.js", () => ({
  config: {
    catalog: {
      id: "basic",
      version: "0.1.0",
      rendererVersion: "0.1.0",
    },
    openai: {
      baseUrl: "http://localhost",
      apiKey: "test",
      model: "test-model",
      temperature: 0.2,
      maxTokens: 8192,
      timeoutMs: 60000,
    },
  },
}));

vi.mock("@a2ui-platform/agent", () => ({
  createAgentRuntime: vi.fn(),
}));

describe("agentRunService.commitWorkflowCandidate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("commits the exact stored candidate artifact through the official event and snapshot boundary", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const tx = {
      message: {
        create: vi.fn().mockResolvedValue({
          id: "message-assistant",
          sessionId: "session-a",
          agentRunId: null,
          workflowId: "workflow-a",
          workflowStepId: "step-commit",
          role: "assistant",
          kind: "chat",
          content: "已提交",
          attachments: [],
          a2uiEventIds: [],
          metadata: {},
          createdAt: now,
        }),
        update: vi.fn(),
      },
      a2UIEvent: {
        create: vi.fn().mockResolvedValue({
          id: "event-a",
          sessionId: "session-a",
          agentRunId: null,
          messageId: "message-assistant",
          sequence: 1,
          status: "committed",
          catalogId: "basic",
          catalogVersion: "0.1.0",
          rendererVersion: "0.1.0",
          surfaceIds: ["main"],
          messages: [],
          validationResult: {},
          createdAt: now,
        }),
      },
      surfaceSnapshot: {
        create: vi.fn().mockResolvedValue({
          id: "snapshot-a",
          sessionId: "session-a",
          a2uiEventId: "event-a",
          agentRunId: null,
          sequence: 1,
          isCurrent: true,
          catalogId: "basic",
          catalogVersion: "0.1.0",
          rendererVersion: "0.1.0",
          surfaceCount: 1,
          componentCount: 0,
          snapshot: { version: "v0.9", surfaces: {} },
          summary: "已提交",
          createdAt: now,
        }),
      },
      session: { update: vi.fn() },
      workflowStep: { update: vi.fn() },
      agentWorkflow: {
        update: vi.fn().mockResolvedValue({
          id: "workflow-a",
          sessionId: "session-a",
          status: "completed",
          currentStepType: "commit",
          title: "生成页面",
          intent: "CREATE_UI",
          completedReason: "committed",
          failureReason: null,
          metadata: {},
          startedAt: now,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never) as never);
    vi.mocked(a2uiEventRepository.getNextSequence).mockResolvedValue(1);
    vi.mocked(snapshotService.computeFromEvents).mockResolvedValue({ version: "v0.9", surfaces: {} } as never);
    vi.mocked(snapshotService.getCounts).mockReturnValue({ surfaceCount: 1, componentCount: 0 });
    vi.mocked(surfaceSnapshotRepository.unsetCurrent).mockResolvedValue(undefined);

    const messages = [{
      version: "v0.9",
      createSurface: { surfaceId: "main", catalogId: "basic" },
    }] as const;

    await agentRunService.commitWorkflowCandidate({
      sessionId: "session-a",
      workflowId: "workflow-a",
      workflowStepId: "step-commit",
      confirmedByMessageId: "message-confirm",
      candidateArtifact: {
        id: "artifact-candidate",
        version: 2,
        contentText: "已提交",
        contentJson: {
          messages,
          validation: { valid: true, errors: [], warnings: [], normalizedMessages: messages },
        },
      },
    });

    expect(tx.a2UIEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        messages,
        metadata: expect.objectContaining({
          candidateArtifactId: "artifact-candidate",
          workflowId: "workflow-a",
        }),
      }),
    }));
    expect(tx.surfaceSnapshot.create).toHaveBeenCalled();
    expect(tx.agentWorkflow.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "completed",
        completedReason: "committed",
      }),
    }));
    expect(streamService.send).toHaveBeenCalledWith("session-a", expect.objectContaining({
      event: "workflow_completed",
    }));
  });
});
