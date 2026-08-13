import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAgentRuntime } from "@a2ui-platform/agent";
import { agentRunRepository } from "../../repositories/agent-run.repository.js";
import { fileRepository } from "../../repositories/file.repository.js";
import { messageRepository } from "../../repositories/message.repository.js";
import { sessionRepository } from "../../repositories/session.repository.js";
import { surfaceSnapshotRepository } from "../../repositories/surface-snapshot.repository.js";
import { toolCallRepository } from "../../repositories/tool-call.repository.js";
import { workflowRepository } from "../../repositories/workflow.repository.js";
import { skillResolverService } from "../skill-resolver.service.js";
import { AppError } from "../../utils/errors.js";
import { streamService } from "../stream.service.js";
import { workflowService } from "../workflow.service.js";

vi.mock("../../repositories/workflow.repository.js", () => ({
  workflowRepository: {
    findActiveBySessionId: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    createStep: vi.fn(),
    updateStep: vi.fn(),
    createArtifact: vi.fn(),
    findWorkflowById: vi.fn(),
    findLatestStep: vi.fn(),
    findLatestArtifact: vi.fn(),
    findWorkflowsBySessionId: vi.fn(),
  },
}));

vi.mock("@a2ui-platform/agent", () => ({
  createAgentRuntime: vi.fn(),
}));

vi.mock("../../repositories/agent-run.repository.js", () => ({
  agentRunRepository: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../repositories/session.repository.js", () => ({
  sessionRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../../repositories/surface-snapshot.repository.js", () => ({
  surfaceSnapshotRepository: {
    findCurrentBySessionId: vi.fn(),
  },
}));

vi.mock("../../repositories/message.repository.js", () => ({
  messageRepository: {
    findBySessionId: vi.fn(),
  },
}));

vi.mock("../../repositories/file.repository.js", () => ({
  fileRepository: {
    findReadyWithContentBySessionId: vi.fn(),
  },
}));

vi.mock("../../repositories/tool-call.repository.js", () => ({
  toolCallRepository: {
    create: vi.fn(),
  },
}));

vi.mock("../skill-resolver.service.js", () => ({
  skillResolverService: {
    resolveForSession: vi.fn(),
  },
}));

vi.mock("../stream.service.js", () => ({
  streamService: { send: vi.fn() },
}));

const now = new Date("2026-01-01T00:00:00.000Z");

function workflowRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "workflow-a",
    sessionId: "session-a",
    status: "active",
    currentStepType: null,
    title: "Generate Dashboard",
    intent: "generate_a2ui",
    completedReason: null,
    failureReason: null,
    metadata: {},
    startedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function stepRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "step-a",
    workflowId: "workflow-a",
    sessionId: "session-a",
    type: "propose",
    status: "awaiting_confirmation",
    sequence: 2,
    attemptCount: 0,
    maxAttempts: 1,
    failureReason: null,
    failureMetadata: {},
    confirmedAt: null,
    confirmedByMessageId: null,
    startedAt: null,
    completedAt: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function artifactRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "artifact-a",
    workflowId: "workflow-a",
    workflowStepId: "step-a",
    sessionId: "session-a",
    kind: "plan_markdown",
    version: 2,
    contentText: "# Plan",
    contentJson: {},
    createdBy: "agent",
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function agentRunRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-workflow",
    sessionId: "session-a",
    workflowId: "workflow-a",
    workflowStepId: "step-propose",
    triggerMessageId: null,
    status: "running",
    intent: "INITIAL_PLANNING",
    modelProvider: "openai-compatible",
    modelName: "test-model",
    modelConfig: {},
    attemptCount: 0,
    maxAttempts: 1,
    inputSnapshotId: null,
    outputSnapshotId: null,
    assistantMessageId: null,
    failureReason: null,
    validationSummary: {},
    tokenUsage: {},
    metadata: {},
    startedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function validPlanMarkdown() {
  return [
    "# A2UI Page Plan",
    "## 页面目标",
    "Generate a sales dashboard.",
    "## 布局结构",
    "Top metrics, filters, and table area.",
    "## 组件清单",
    "Text, Card, Grid, Button.",
    "## Data Model",
    "Use sales, filters, and rows.",
    "## 交互行为",
    "Filter changes update the data model.",
    "## 假设",
    "Use Basic Catalog.",
    "## 风险",
    "Missing fields may require clarification.",
  ].join("\n");
}
function mockRuntimeResult(parsedResult: Record<string, unknown>) {
  return {
    run: vi.fn(),
    runWorkflowTask: vi.fn().mockResolvedValue({
      parsedResult,
      debugMetadata: { rawOutputPreview: "preview" },
      toolCalls: [],
      rawOutputPreview: "preview",
      attemptCount: 1,
      tokenUsage: { totalTokens: 10 },
    }),
  };
}

describe("workflowService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sessionRepository.findById).mockResolvedValue({
      id: "session-a",
      modelProvider: "openai-compatible",
      modelName: "test-model",
      modelConfig: {},
    } as never);
    vi.mocked(surfaceSnapshotRepository.findCurrentBySessionId).mockResolvedValue(null);
    vi.mocked(messageRepository.findBySessionId).mockResolvedValue([]);
    vi.mocked(fileRepository.findReadyWithContentBySessionId).mockResolvedValue([]);
    vi.mocked(skillResolverService.resolveForSession).mockResolvedValue([]);
    vi.mocked(agentRunRepository.create).mockResolvedValue(agentRunRecord() as never);
    vi.mocked(agentRunRepository.update).mockResolvedValue(agentRunRecord() as never);
    vi.mocked(toolCallRepository.create).mockResolvedValue({ id: "tool-call-a" } as never);
    vi.mocked(createAgentRuntime).mockReturnValue(mockRuntimeResult({
      kind: "plan_markdown",
      markdown: validPlanMarkdown(),
    }) as never);
  });

  it("creates a workflow when the session has no active workflow and emits SSE", async () => {
    vi.mocked(workflowRepository.findActiveBySessionId).mockResolvedValue(null);
    vi.mocked(workflowRepository.createWorkflow).mockResolvedValue(workflowRecord() as never);

    const result = await workflowService.createWorkflow({
      sessionId: "session-a",
      title: "Generate Dashboard",
      intent: "generate_a2ui",
    });

    expect(result).toMatchObject({ id: "workflow-a" });
    expect(workflowRepository.createWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      session: { connect: { id: "session-a" } },
      status: "active",
      title: "Generate Dashboard",
      intent: "generate_a2ui",
    }));
    expect(streamService.send).toHaveBeenCalledWith("session-a", expect.objectContaining({
      event: "workflow_started",
    }));
  });

  it("rejects a second active workflow in the same session", async () => {
    vi.mocked(workflowRepository.findActiveBySessionId).mockResolvedValue(workflowRecord({
      id: "workflow-existing",
    }) as never);

    await expect(workflowService.createWorkflow({ sessionId: "session-a" })).rejects.toMatchObject({
      code: "ACTIVE_WORKFLOW_EXISTS",
      statusCode: 409,
    } satisfies Partial<AppError>);

    expect(workflowRepository.createWorkflow).not.toHaveBeenCalled();
  });

  it("creates steps with workflow ordering, updates current step, and emits SSE", async () => {
    vi.mocked(workflowRepository.createStep).mockResolvedValue(stepRecord() as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord({
      currentStepType: "propose",
    }) as never);

    await workflowService.createStep({
      workflowId: "workflow-a",
      sessionId: "session-a",
      type: "propose",
      sequence: 2,
      status: "awaiting_confirmation",
      maxAttempts: 1,
    });

    expect(workflowRepository.createStep).toHaveBeenCalledWith(expect.objectContaining({
      workflow: { connect: { id: "workflow-a" } },
      sessionId: "session-a",
      type: "propose",
      sequence: 2,
      status: "awaiting_confirmation",
      maxAttempts: 1,
    }));
    expect(workflowRepository.updateWorkflow).toHaveBeenCalledWith("workflow-a", {
      currentStepType: "propose",
    });
    expect(streamService.send).toHaveBeenCalledWith("session-a", expect.objectContaining({
      event: "workflow_step_updated",
    }));
  });

  it("updates a step and emits SSE", async () => {
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({
      status: "completed",
      completedAt: now,
    }) as never);

    await workflowService.updateStep({
      workflowId: "workflow-a",
      sessionId: "session-a",
      stepId: "step-a",
      status: "completed",
      completedAt: now,
    });

    expect(workflowRepository.updateStep).toHaveBeenCalledWith("step-a", expect.objectContaining({
      status: "completed",
      completedAt: now,
    }));
    expect(streamService.send).toHaveBeenCalledWith("session-a", expect.objectContaining({
      event: "workflow_step_updated",
    }));
  });

  it("creates versioned workflow artifacts and emits SSE", async () => {
    vi.mocked(workflowRepository.createArtifact).mockResolvedValue(artifactRecord() as never);

    await workflowService.createArtifact({
      workflowId: "workflow-a",
      workflowStepId: "step-a",
      sessionId: "session-a",
      kind: "plan_markdown",
      version: 2,
      contentText: "# Plan",
      createdBy: "agent",
    });

    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      workflow: { connect: { id: "workflow-a" } },
      workflowStep: { connect: { id: "step-a" } },
      sessionId: "session-a",
      kind: "plan_markdown",
      version: 2,
      contentText: "# Plan",
      createdBy: "agent",
    }));
    expect(streamService.send).toHaveBeenCalledWith("session-a", expect.objectContaining({
      event: "workflow_artifact_created",
    }));
  });

  it("completes, fails, and cancels workflows with workflow SSE events", async () => {
    vi.mocked(workflowRepository.updateWorkflow)
      .mockResolvedValueOnce(workflowRecord({ status: "completed", completedReason: "committed" }) as never)
      .mockResolvedValueOnce(workflowRecord({ status: "failed_retryable", failureReason: "invalid output" }) as never)
      .mockResolvedValueOnce(workflowRecord({ status: "cancelled", completedReason: "cancelled" }) as never);

    await workflowService.completeWorkflow({
      workflowId: "workflow-a",
      sessionId: "session-a",
      completedReason: "committed",
    });
    await workflowService.failWorkflow({
      workflowId: "workflow-a",
      sessionId: "session-a",
      failureReason: "invalid output",
      retryable: true,
    });
    await workflowService.cancelWorkflow("workflow-a", "session-a");

    expect(streamService.send).toHaveBeenCalledWith("session-a", expect.objectContaining({
      event: "workflow_completed",
    }));
    expect(streamService.send).toHaveBeenCalledWith("session-a", expect.objectContaining({
      event: "workflow_failed",
    }));
  });

  it("loads multiple historical workflows for a session", async () => {
    vi.mocked(workflowRepository.findWorkflowsBySessionId).mockResolvedValue([
      workflowRecord({ id: "workflow-b", status: "completed" }),
      workflowRecord({ id: "workflow-a", status: "completed" }),
    ] as never);

    const workflows = await workflowService.getSessionWorkflows("session-a");

    expect(workflows).toHaveLength(2);
    expect(workflowRepository.findWorkflowsBySessionId).toHaveBeenCalledWith("session-a");
  });

  it("creates a clarification form when the initial requirement is incomplete", async () => {
    vi.mocked(createAgentRuntime).mockReturnValue(mockRuntimeResult({
      kind: "clarification_request",
      form: {
        title: "Clarification",
        fields: [
          { id: "page_goal", label: "Page goal", type: "textarea", required: true, reason: "Need page goal" },
        ],
      },
    }) as never);
    vi.mocked(workflowRepository.createStep)
      .mockResolvedValueOnce(stepRecord({ id: "step-understand", type: "understand", sequence: 1, status: "completed" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-propose", type: "propose", sequence: 2, status: "running" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-clarify", type: "clarify", sequence: 3, status: "awaiting_confirmation" }) as never);
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({
      id: "step-propose",
      type: "propose",
      status: "completed",
    }) as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord() as never);
    vi.mocked(workflowRepository.createArtifact).mockResolvedValue(artifactRecord({
      kind: "clarification_form",
      workflowStepId: "step-clarify",
    }) as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue(workflowRecord({
      currentStepType: "clarify",
    }) as never);

    const result = await workflowService.startInitialPlanning({
      sessionId: "session-a",
      workflowId: "workflow-a",
      userMessage: "随便做",
    });

    expect(workflowRepository.createStep).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: "understand",
      status: "completed",
    }));
    expect(workflowRepository.createStep).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: "propose",
      status: "running",
    }));
    expect(workflowRepository.createStep).toHaveBeenNthCalledWith(3, expect.objectContaining({
      type: "clarify",
      status: "awaiting_confirmation",
    }));
    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      kind: "clarification_form",
      version: 1,
      createdBy: "agent",
      contentJson: expect.objectContaining({
        fields: [expect.objectContaining({ id: "page_goal", type: "textarea" })],
      }),
    }));
    expect(result).toMatchObject({ currentStepType: "clarify" });
  });

  it("creates a Markdown plan and waits for confirmation when the requirement is clear", async () => {
    vi.mocked(createAgentRuntime).mockReturnValue(mockRuntimeResult({
      kind: "plan_markdown",
      markdown: validPlanMarkdown(),
    }) as never);
    vi.mocked(workflowRepository.createStep)
      .mockResolvedValueOnce(stepRecord({ id: "step-understand", type: "understand", sequence: 1, status: "completed" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-propose", type: "propose", sequence: 2, status: "running" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-confirm", type: "confirm_plan", sequence: 3, status: "awaiting_confirmation" }) as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord() as never);
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({
      id: "step-propose",
      type: "propose",
      status: "completed",
    }) as never);
    vi.mocked(workflowRepository.createArtifact).mockResolvedValue(artifactRecord({
      kind: "plan_markdown",
      workflowStepId: "step-propose",
      version: 1,
    }) as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue(workflowRecord({
      currentStepType: "confirm_plan",
    }) as never);

    const result = await workflowService.startInitialPlanning({
      sessionId: "session-a",
      workflowId: "workflow-a",
      userMessage: "Generate sales dashboard",
    });

    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      kind: "plan_markdown",
      version: 1,
      contentText: expect.stringContaining("## Data Model"),
      createdBy: "agent",
    }));
    expect(workflowRepository.createStep).toHaveBeenLastCalledWith(expect.objectContaining({
      type: "confirm_plan",
      status: "awaiting_confirmation",
      metadata: expect.objectContaining({
        allowedActions: ["confirm_plan", "request_revision"],
      }),
    }));
    expect(result).toMatchObject({ currentStepType: "confirm_plan" });
  });

  it("fails the propose step instead of creating a fake plan when AgentRuntime fails", async () => {
    vi.mocked(createAgentRuntime).mockReturnValue(mockRuntimeResult({
      kind: "failure",
      reason: "model output parse failed",
    }) as never);
    vi.mocked(workflowRepository.createStep)
      .mockResolvedValueOnce(stepRecord({ id: "step-understand", type: "understand", sequence: 1, status: "completed" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-propose", type: "propose", sequence: 2, status: "running" }) as never);
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({
      id: "step-propose",
      type: "propose",
      status: "failed",
      failureReason: "model output parse failed",
    }) as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord({
      status: "failed_retryable",
      failureReason: "model output parse failed",
    }) as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue(workflowRecord({
      status: "failed_retryable",
      currentStepType: "propose",
      failureReason: "model output parse failed",
    }) as never);

    const result = await workflowService.startInitialPlanning({
      sessionId: "session-a",
      workflowId: "workflow-a",
      userMessage: "随便做",
    });

    expect(workflowRepository.updateStep).toHaveBeenCalledWith("step-propose", expect.objectContaining({
      status: "failed",
      failureReason: "model output parse failed",
    }));
    expect(workflowRepository.createArtifact).not.toHaveBeenCalledWith(expect.objectContaining({
      kind: "plan_markdown",
    }));
    expect(result).toMatchObject({
      status: "failed_retryable",
      failureReason: "model output parse failed",
    });
  });

  it("confirms the latest plan confirmation step", async () => {
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(stepRecord({
      id: "step-confirm",
      type: "confirm_plan",
      status: "awaiting_confirmation",
      metadata: { planVersion: 1 },
    }) as never);
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({
      id: "step-confirm",
      type: "confirm_plan",
      status: "confirmed",
      confirmedByMessageId: "message-confirm",
    }) as never);
    vi.mocked(workflowRepository.createStep).mockResolvedValue(stepRecord({
      id: "step-generate",
      type: "generate_a2ui",
      sequence: 4,
      status: "pending",
    }) as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord() as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue({
      ...workflowRecord(),
      steps: [],
      artifacts: [],
      agentRuns: [],
    } as never);

    await workflowService.confirmPlan({
      sessionId: "session-a",
      workflowId: "workflow-a",
      confirmedByMessageId: "message-confirm",
    });

    expect(workflowRepository.updateStep).toHaveBeenCalledWith("step-confirm", expect.objectContaining({
      status: "confirmed",
      confirmedByMessageId: "message-confirm",
      completedAt: expect.any(Date),
    }));
  });

  it("keeps the old plan and creates a new version for a clear natural language revision", async () => {
    vi.mocked(createAgentRuntime).mockReturnValue(mockRuntimeResult({
      kind: "plan_markdown",
      markdown: validPlanMarkdown(),
    }) as never);
    vi.mocked(workflowRepository.findLatestStep)
      .mockResolvedValueOnce(stepRecord({ id: "step-confirm-v1", type: "confirm_plan", sequence: 3, status: "awaiting_confirmation" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-confirm-v1", type: "confirm_plan", sequence: 3 }) as never);
    vi.mocked(workflowRepository.findLatestArtifact).mockResolvedValue(artifactRecord({
      id: "artifact-plan-v1",
      kind: "plan_markdown",
      version: 1,
      contentText: validPlanMarkdown(),
    }) as never);
    vi.mocked(workflowRepository.updateStep)
      .mockResolvedValueOnce(stepRecord({ id: "step-confirm-v1", status: "skipped" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-propose-v2", type: "propose", status: "completed" }) as never);
    vi.mocked(workflowRepository.createStep)
      .mockResolvedValueOnce(stepRecord({ id: "step-propose-v2", type: "propose", sequence: 4, status: "running" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-confirm-v2", type: "confirm_plan", sequence: 5, status: "awaiting_confirmation" }) as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord() as never);
    vi.mocked(workflowRepository.createArtifact).mockResolvedValue(artifactRecord({
      id: "artifact-plan-v2",
      kind: "plan_markdown",
      version: 2,
    }) as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue(workflowRecord({
      currentStepType: "confirm_plan",
    }) as never);

    const result = await workflowService.requestPlanRevision({
      sessionId: "session-a",
      workflowId: "workflow-a",
      revisionMessageId: "message-revision",
      revisionText: "Use four metric cards and add region filter",
    });

    expect(workflowRepository.updateStep).toHaveBeenCalledWith("step-confirm-v1", expect.objectContaining({
      status: "skipped",
    }));
    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      kind: "plan_markdown",
      version: 2,
      contentText: expect.stringContaining("## Data Model"),
      createdBy: "agent",
      metadata: expect.objectContaining({
        previousPlanArtifactId: "artifact-plan-v1",
      }),
    }));
    expect(result).toMatchObject({ currentStepType: "confirm_plan" });
  });
  it("moves confirmed plans into generate_a2ui before candidate generation", async () => {
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(stepRecord({
      id: "step-confirm",
      type: "confirm_plan",
      sequence: 3,
      status: "awaiting_confirmation",
      metadata: { planVersion: 1 },
    }) as never);
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({
      id: "step-confirm",
      type: "confirm_plan",
      status: "confirmed",
    }) as never);
    vi.mocked(workflowRepository.createStep).mockResolvedValue(stepRecord({
      id: "step-generate",
      type: "generate_a2ui",
      sequence: 4,
      status: "pending",
    }) as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord({
      currentStepType: "generate_a2ui",
    }) as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue({
      ...workflowRecord({ currentStepType: "generate_a2ui" }),
      steps: [],
      artifacts: [],
      agentRuns: [],
    } as never);

    await workflowService.confirmPlan({
      sessionId: "session-a",
      workflowId: "workflow-a",
      confirmedByMessageId: "message-confirm",
    });

    expect(workflowRepository.createStep).toHaveBeenCalledWith(expect.objectContaining({
      type: "generate_a2ui",
      sequence: 4,
      status: "pending",
      metadata: expect.objectContaining({
        precondition: "confirmed_plan",
      }),
    }));
  });

  it("records a validated candidate artifact and opens preview", async () => {
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(stepRecord({
      id: "step-generate",
      type: "generate_a2ui",
      sequence: 4,
      status: "running",
      metadata: { gate: "generate_a2ui" },
    }) as never);
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({ status: "completed" }) as never);
    vi.mocked(workflowRepository.createStep)
      .mockResolvedValueOnce(stepRecord({ id: "step-validate", type: "validate", sequence: 5, status: "completed" }) as never)
      .mockResolvedValueOnce(stepRecord({ id: "step-preview", type: "preview", sequence: 6, status: "awaiting_confirmation" }) as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord() as never);
    vi.mocked(workflowRepository.findLatestArtifact).mockResolvedValue(null);
    vi.mocked(workflowRepository.createArtifact).mockResolvedValue(artifactRecord({
      id: "artifact-candidate-v1",
      kind: "candidate_a2ui_messages",
      version: 1,
    }) as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue({
      ...workflowRecord({ currentStepType: "preview" }),
      steps: [],
      artifacts: [],
      agentRuns: [],
    } as never);

    await workflowService.recordCandidateSuccess({
      sessionId: "session-a",
      workflowId: "workflow-a",
      generateStepId: "step-generate",
      agentRunId: "run-candidate",
      assistantMessage: "瀹歌尙鏁撻幋鎰偓娆撯偓?UI",
      a2uiMessages: [],
      validation: {
        valid: true,
        errors: [],
        warnings: [],
        normalizedMessages: [],
      },
    });

    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      kind: "candidate_a2ui_messages",
      version: 1,
      createdBy: "agent",
    }));
    expect(workflowRepository.createStep).toHaveBeenLastCalledWith(expect.objectContaining({
      type: "preview",
      status: "awaiting_confirmation",
      metadata: expect.objectContaining({
        candidateArtifactId: "artifact-candidate-v1",
      }),
    }));
  });

  it("records validation report artifacts when candidate generation fails", async () => {
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(stepRecord({
      id: "step-generate",
      type: "generate_a2ui",
      sequence: 4,
      status: "running",
      metadata: { gate: "generate_a2ui" },
    }) as never);
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({ status: "failed" }) as never);
    vi.mocked(workflowRepository.findLatestArtifact).mockResolvedValue(null);
    vi.mocked(workflowRepository.createArtifact).mockResolvedValue(artifactRecord({
      kind: "validation_report",
      version: 1,
    }) as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue({
      ...workflowRecord({ currentStepType: "generate_a2ui" }),
      steps: [],
      artifacts: [],
      agentRuns: [],
    } as never);

    await workflowService.recordCandidateFailure({
      sessionId: "session-a",
      workflowId: "workflow-a",
      generateStepId: "step-generate",
      agentRunId: "run-candidate",
      failureReason: "A2UI validation failed",
      validation: {
        valid: false,
        errors: [{ code: "A2UI_STRUCTURE", message: "缂佹挻鐎柨娆掝嚖" }],
        warnings: [],
        normalizedMessages: [],
      },
    });

    expect(workflowRepository.updateStep).toHaveBeenCalledWith("step-generate", expect.objectContaining({
      status: "failed",
      failureReason: "A2UI validation failed",
    }));
    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(expect.objectContaining({
      kind: "validation_report",
      version: 1,
      createdBy: "backend",
    }));
  });

  it("confirms only validated candidate artifacts for commit", async () => {
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(stepRecord({
      id: "step-preview",
      type: "preview",
      sequence: 6,
      status: "awaiting_confirmation",
      metadata: { candidateArtifactId: "artifact-candidate-v1" },
    }) as never);
    vi.mocked(workflowRepository.findLatestArtifact).mockResolvedValue(artifactRecord({
      id: "artifact-candidate-v1",
      kind: "candidate_a2ui_messages",
      version: 1,
      contentJson: {
        messages: [{
          version: "v0.9",
          createSurface: { surfaceId: "main", catalogId: "basic" },
        }],
        validation: { valid: true, errors: [], warnings: [], normalizedMessages: [] },
      },
    }) as never);
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(stepRecord({ status: "confirmed" }) as never);
    vi.mocked(workflowRepository.createStep).mockResolvedValue(stepRecord({
      id: "step-commit",
      type: "commit",
      sequence: 7,
      status: "running",
    }) as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(workflowRecord() as never);

    const result = await workflowService.confirmCandidateCommit({
      sessionId: "session-a",
      workflowId: "workflow-a",
      confirmedByMessageId: "message-confirm",
    });

    expect(result.candidateArtifact).toMatchObject({ id: "artifact-candidate-v1" });
    expect(workflowRepository.createStep).toHaveBeenCalledWith(expect.objectContaining({
      type: "commit",
      status: "running",
      metadata: expect.objectContaining({
        candidateArtifactId: "artifact-candidate-v1",
      }),
    }));
  });

  it("rejects unvalidated candidate artifacts for commit", async () => {
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(stepRecord({
      id: "step-preview",
      type: "preview",
      status: "awaiting_confirmation",
    }) as never);
    vi.mocked(workflowRepository.findLatestArtifact).mockResolvedValue(artifactRecord({
      id: "artifact-candidate-v1",
      kind: "candidate_a2ui_messages",
      contentJson: {
        messages: [],
        validation: { valid: false, errors: [{ code: "X", message: "bad" }], warnings: [], normalizedMessages: [] },
      },
    }) as never);

    await expect(workflowService.confirmCandidateCommit({
      sessionId: "session-a",
      workflowId: "workflow-a",
      confirmedByMessageId: "message-confirm",
    })).rejects.toMatchObject({
      code: "CANDIDATE_NOT_VALIDATED",
    } satisfies Partial<AppError>);
  });
});
