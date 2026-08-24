import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAgentRuntime, validateA2UI } from "@a2ui-platform/agent";
import type { AgentRunTraceSummaryDto } from "@a2ui-platform/shared";
import { agentRunRepository } from "../../repositories/agent-run.repository.js";
import { fileRepository } from "../../repositories/file.repository.js";
import { messageRepository } from "../../repositories/message.repository.js";
import { sessionRepository } from "../../repositories/session.repository.js";
import { surfaceSnapshotRepository } from "../../repositories/surface-snapshot.repository.js";
import { toolCallRepository } from "../../repositories/tool-call.repository.js";
import { workflowRepository } from "../../repositories/workflow.repository.js";
import { skillResolverService } from "../skill-resolver.service.js";
import { streamService } from "../stream.service.js";
import { workflowService } from "../workflow.service.js";

vi.mock("@a2ui-platform/agent", () => ({
  createAgentRuntime: vi.fn(),
  validateA2UI: vi.fn(),
}));

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

vi.mock("../../repositories/workflow.repository.js", () => ({
  workflowRepository: {
    findActiveBySessionId: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    createStep: vi.fn(),
    updateStep: vi.fn(),
    createArtifact: vi.fn(),
    findWorkflowById: vi.fn(),
    findById: vi.fn(),
    findLatestStep: vi.fn(),
    findStepById: vi.fn(),
    findLatestArtifact: vi.fn(),
    findArtifactById: vi.fn(),
    findWorkflowsBySessionId: vi.fn(),
  },
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
    unsetCurrent: vi.fn(),
  },
}));

vi.mock("../../repositories/message.repository.js", () => ({
  messageRepository: {
    findBySessionId: vi.fn(),
    create: vi.fn(),
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

vi.mock("../snapshot.service.js", () => ({
  snapshotService: {
    computeFromEvents: vi.fn(),
    getCounts: vi.fn(),
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
    currentStepType: "plan",
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
    id: "step-plan",
    workflowId: "workflow-a",
    sessionId: "session-a",
    type: "plan",
    status: "awaiting_confirmation",
    stageState: null,
    sequence: 1,
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
    workflowStepId: "step-plan",
    sessionId: "session-a",
    kind: "plan_markdown",
    version: 1,
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
    workflowStepId: "step-plan",
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

function mockRuntimeResult(
  parsedResult: Record<string, unknown>,
  traceSummary?: AgentRunTraceSummaryDto | null,
) {
  vi.mocked(createAgentRuntime).mockReturnValue({
    run: vi.fn(),
    runWorkflowTask: vi.fn().mockResolvedValue({
      parsedResult,
      debugMetadata: { rawOutputPreview: "preview" },
      toolCalls: [],
      rawOutputPreview: "preview",
      attemptCount: 1,
      tokenUsage: { totalTokens: 10 },
      ...(traceSummary ? { traceSummary } : {}),
    }),
  } as never);
}

describe("workflowService new workflow contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sessionRepository.findById).mockResolvedValue({
      id: "session-a",
      modelProvider: "openai-compatible",
      modelName: "test-model",
      modelConfig: {},
    } as never);
    vi.mocked(
      surfaceSnapshotRepository.findCurrentBySessionId,
    ).mockResolvedValue(null);
    vi.mocked(messageRepository.findBySessionId).mockResolvedValue([]);
    vi.mocked(fileRepository.findReadyWithContentBySessionId).mockResolvedValue(
      [],
    );
    vi.mocked(skillResolverService.resolveForSession).mockResolvedValue([]);
    vi.mocked(agentRunRepository.create).mockResolvedValue(
      agentRunRecord() as never,
    );
    vi.mocked(agentRunRepository.update).mockResolvedValue(
      agentRunRecord() as never,
    );
    vi.mocked(toolCallRepository.create).mockResolvedValue({
      id: "tool-call-a",
    } as never);
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue({
      ...workflowRecord(),
      steps: [],
      artifacts: [],
      agentRuns: [],
    } as never);
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(
      workflowRecord() as never,
    );
    vi.mocked(workflowRepository.createStep).mockResolvedValue(
      stepRecord({ status: "running" }) as never,
    );
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(
      stepRecord() as never,
    );
    vi.mocked(workflowRepository.createArtifact).mockResolvedValue(
      artifactRecord() as never,
    );
    vi.mocked(workflowRepository.findLatestArtifact).mockResolvedValue(null);
  });

  it("stores clarification_form on the plan step when Agent asks for clarification", async () => {
    mockRuntimeResult({
      kind: "clarification_request",
      form: {
        title: "补充需求",
        description: "需要信息",
        fields: [
          {
            id: "goal",
            label: "目标",
            type: "textarea",
            required: true,
            reason: "规划页面",
          },
        ],
      },
    });

    await workflowService.startInitialPlanning({
      sessionId: "session-a",
      workflowId: "workflow-a",
      userMessage: "做一个销售看板",
    });

    expect(workflowRepository.createStep).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "plan",
        status: "running",
      }),
    );
    expect(workflowRepository.updateStep).toHaveBeenCalledWith(
      "step-plan",
      expect.objectContaining({
        status: "awaiting_confirmation",
        stageState: "awaiting_clarification",
      }),
    );
    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "clarification_form",
        workflowStep: { connect: { id: "step-plan" } },
      }),
    );
  });

  it("persists each ReAct reasoningSummary as an agent_status message and pushes assistant_message", async () => {
    vi.mocked(messageRepository.create).mockResolvedValue({
      id: "msg-trace-1",
      sessionId: "session-a",
      agentRunId: "run-workflow",
      workflowId: "workflow-a",
      workflowStepId: "step-plan",
      role: "assistant",
      kind: "agent_status",
      content: "[产出 plan_markdown] 生成方案",
      attachments: [],
      a2uiEventIds: [],
      metadata: {},
      createdAt: now,
    } as never);

    mockRuntimeResult(
      {
        kind: "plan_markdown",
        markdown: "# Plan",
        decisionForm: {
          title: "确认方案",
          prompt: "是否确认",
          guidance: "确认后生成",
          target: "plan_markdown",
          options: [{ id: "confirm", label: "确认" }],
        },
      },
      {
        iterations: [
          {
            index: 1,
            reasoningSummary: "生成方案",
            actionType: "final_draft",
            finalKind: "plan_markdown",
            durationMs: 10,
          },
          {
            index: 2,
            reasoningSummary: "调用校验工具",
            actionType: "tool_call",
            toolName: "validateA2UI",
            durationMs: 20,
          },
        ],
      },
    );

    await workflowService.startInitialPlanning({
      sessionId: "session-a",
      workflowId: "workflow-a",
      userMessage: "做一个销售看板",
    });

    // 每轮 ReAct 落一条 agent_status 消息，关联 workflow / step
    expect(messageRepository.create).toHaveBeenCalledTimes(2);
    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "assistant",
        kind: "agent_status",
        workflow: { connect: { id: "workflow-a" } },
        workflowStep: { connect: { id: "step-plan" } },
      }),
    );
    // 落库后实时推送 assistant_message
    expect(streamService.send).toHaveBeenCalledWith(
      "session-a",
      expect.objectContaining({
        event: "assistant_message",
      }),
    );
  });

  it("marks the plan step failed on Runtime failure and does not create fake artifacts", async () => {
    mockRuntimeResult({
      kind: "failure",
      reason: "parse failed",
      recoverable: true,
    });

    await workflowService.startInitialPlanning({
      sessionId: "session-a",
      workflowId: "workflow-a",
      userMessage: "做一个销售看板",
    });

    expect(workflowRepository.updateStep).toHaveBeenCalledWith(
      "step-plan",
      expect.objectContaining({
        status: "failed",
        failureReason: "parse failed",
      }),
    );
    expect(workflowRepository.createArtifact).not.toHaveBeenCalled();
    expect(workflowRepository.updateWorkflow).toHaveBeenCalledWith(
      "workflow-a",
      expect.objectContaining({
        status: "failed_retryable",
        failureReason: "parse failed",
      }),
    );
  });

  it("resumes a retryable failed plan step from a follow-up message", async () => {
    mockRuntimeResult({
      kind: "plan_markdown",
      markdown: "# 新方案",
      decisionForm: {
        title: "确认方案",
        prompt: "是否继续？",
        target: "plan_markdown",
        options: [{ id: "confirm", label: "确认" }],
      },
    });
    const failedPlanStep = stepRecord({
      id: "step-plan",
      type: "plan",
      status: "failed",
      attemptCount: 1,
      failureReason: "API 失败",
      completedAt: now,
    });
    vi.mocked(workflowRepository.findWorkflowById)
      .mockResolvedValueOnce({
        ...workflowRecord({
          status: "failed_retryable",
          failureReason: "API 失败",
        }),
        steps: [failedPlanStep],
        artifacts: [],
        agentRuns: [],
      } as never)
      .mockResolvedValue({
        ...workflowRecord({ status: "running", currentStepType: "plan" }),
        steps: [
          stepRecord({ id: "step-plan", status: "awaiting_confirmation" }),
        ],
        artifacts: [],
        agentRuns: [],
      } as never);
    vi.mocked(workflowRepository.findStepById).mockResolvedValue(
      failedPlanStep as never,
    );

    const result = await workflowService.resumeFailedStepFromMessage({
      sessionId: "session-a",
      workflowId: "workflow-a",
      messageId: "message-resume",
      userMessage: "继续",
    });

    expect(workflowRepository.updateWorkflow).toHaveBeenCalledWith(
      "workflow-a",
      expect.objectContaining({
        status: "running",
        currentStepType: "plan",
        failureReason: null,
      }),
    );
    expect(workflowRepository.updateStep).toHaveBeenCalledWith(
      "step-plan",
      expect.objectContaining({
        status: "running",
        attemptCount: 2,
        failureReason: null,
        completedAt: null,
        metadata: expect.objectContaining({
          resumeMessageId: "message-resume",
        }),
      }),
    );
    expect(agentRunRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowStep: { connect: { id: "step-plan" } },
        triggerMessageId: "message-resume",
      }),
    );
    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "plan_markdown",
        workflowStep: { connect: { id: "step-plan" } },
      }),
    );
    expect(result.agentRun).toMatchObject({
      id: "run-workflow",
      status: "committed",
    });
  });

  it("resumes a retryable failed generate step without creating another generate step", async () => {
    const failedGenerateStep = stepRecord({
      id: "step-generate",
      type: "generate_a2ui",
      status: "failed",
      sequence: 2,
      attemptCount: 1,
      failureReason: "API 失败",
      completedAt: now,
    });
    vi.mocked(workflowRepository.findWorkflowById)
      .mockResolvedValueOnce({
        ...workflowRecord({
          status: "failed_retryable",
          currentStepType: "generate_a2ui",
        }),
        steps: [failedGenerateStep],
        artifacts: [artifactRecord({ id: "plan-a", kind: "plan_markdown" })],
        agentRuns: [],
      } as never)
      .mockResolvedValue({
        ...workflowRecord({
          status: "running",
          currentStepType: "generate_a2ui",
        }),
        steps: [failedGenerateStep],
        artifacts: [],
        agentRuns: [],
      } as never);
    vi.mocked(workflowRepository.findStepById).mockResolvedValue(
      failedGenerateStep as never,
    );
    const executeSpy = vi
      .spyOn(workflowService, "executeGenerateA2UI")
      .mockResolvedValue();

    await workflowService.resumeFailedStepFromMessage({
      sessionId: "session-a",
      workflowId: "workflow-a",
      messageId: "message-resume",
      userMessage: "继续生成",
    });

    expect(workflowRepository.createStep).not.toHaveBeenCalled();
    expect(workflowRepository.updateStep).toHaveBeenCalledWith(
      "step-generate",
      expect.objectContaining({
        status: "running",
        attemptCount: 2,
        failureReason: null,
        completedAt: null,
      }),
    );
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowStepId: "step-generate",
        triggerMessageId: "message-resume",
      }),
    );
  });

  it("interrupts a running workflow as a resumable stopped workflow", async () => {
    const runningStep = stepRecord({ id: "step-plan", status: "running" });
    const runningRun = agentRunRecord({ id: "run-running", status: "running" });
    const interruptedStep = stepRecord({
      id: "step-plan",
      status: "interrupted",
      completedAt: now,
      metadata: {
        interruptionReason: "user_cancelled",
        interruptedAgentRunId: "run-running",
      },
    });
    const interruptedWorkflow = workflowRecord({
      status: "interrupted",
      metadata: {
        interruptionReason: "user_cancelled",
        interruptedStepId: "step-plan",
        interruptedAgentRunId: "run-running",
      },
    });
    const cancelledRun = agentRunRecord({
      id: "run-running",
      status: "cancelled",
      failureReason: "用户已停止运行",
      completedAt: now,
    });
    vi.mocked(workflowRepository.findWorkflowById)
      .mockResolvedValueOnce({
        ...workflowRecord({ status: "running" }),
        steps: [runningStep],
        artifacts: [],
        agentRuns: [runningRun],
      } as never)
      .mockResolvedValueOnce({
        ...interruptedWorkflow,
        steps: [interruptedStep],
        artifacts: [],
        agentRuns: [cancelledRun],
      } as never);
    vi.mocked(agentRunRepository.update).mockResolvedValue(
      cancelledRun as never,
    );
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(
      interruptedStep as never,
    );
    vi.mocked(workflowRepository.updateWorkflow).mockResolvedValue(
      interruptedWorkflow as never,
    );

    const result = await workflowService.interruptWorkflow(
      "workflow-a",
      "session-a",
    );

    expect(agentRunRepository.update).toHaveBeenCalledWith(
      "run-running",
      expect.objectContaining({
        status: "cancelled",
        failureReason: "用户已停止运行",
      }),
    );
    expect(workflowRepository.updateStep).toHaveBeenCalledWith(
      "step-plan",
      expect.objectContaining({
        status: "interrupted",
        stageState: null,
        metadata: expect.objectContaining({
          interruptionReason: "user_cancelled",
          interruptedAgentRunId: "run-running",
        }),
      }),
    );
    expect(workflowRepository.updateWorkflow).toHaveBeenCalledWith(
      "workflow-a",
      expect.objectContaining({
        status: "interrupted",
        completedAt: null,
        completedReason: null,
        metadata: expect.objectContaining({
          interruptionReason: "user_cancelled",
          interruptedStepId: "step-plan",
          interruptedAgentRunId: "run-running",
        }),
      }),
    );
    expect(streamService.send).toHaveBeenCalledWith(
      "session-a",
      expect.objectContaining({
        event: "workflow_interrupted",
      }),
    );
    expect(result.workflow).toMatchObject({
      id: "workflow-a",
      status: "interrupted",
    });
    expect(result.step).toMatchObject({
      id: "step-plan",
      status: "interrupted",
    });
    expect(result.agentRun).toMatchObject({
      id: "run-running",
      status: "cancelled",
    });
  });

  it("resumes an interrupted plan step from a follow-up message", async () => {
    const interruptedPlanStep = stepRecord({
      id: "step-plan",
      type: "plan",
      status: "interrupted",
      attemptCount: 1,
      completedAt: now,
    });
    vi.mocked(workflowRepository.findWorkflowById).mockResolvedValue({
      ...workflowRecord({ status: "interrupted", currentStepType: "plan" }),
      steps: [interruptedPlanStep],
      artifacts: [],
      agentRuns: [],
    } as never);
    const resumeSpy = vi
      .spyOn(workflowService, "resumePlanStepFromMessage")
      .mockResolvedValue({
        workflow: {
          ...workflowRecord({ status: "running", currentStepType: "plan" }),
          steps: [stepRecord({ id: "step-plan", status: "running" })],
          artifacts: [],
          agentRuns: [],
        },
        agentRun: { id: "run-resume", status: "running" },
      } as never);

    const result = await workflowService.resumeInterruptedWorkflowFromMessage({
      sessionId: "session-a",
      workflowId: "workflow-a",
      messageId: "message-resume",
      userMessage: "继续",
    });

    expect(resumeSpy).toHaveBeenCalledWith({
      sessionId: "session-a",
      workflowId: "workflow-a",
      workflowStepId: "step-plan",
      messageId: "message-resume",
      userMessage: "继续",
    });
    expect(result.agentRun).toMatchObject({
      id: "run-resume",
      status: "running",
    });
  });

  it("submits plan decision confirm through submit_decision and creates generate_a2ui", async () => {
    vi.mocked(workflowRepository.findArtifactById).mockResolvedValue(
      artifactRecord({
        id: "decision-plan",
        kind: "decision_form",
        workflowStepId: "step-plan",
      }) as never,
    );
    vi.mocked(workflowRepository.findStepById).mockResolvedValue(
      stepRecord({
        id: "step-plan",
        type: "plan",
        status: "awaiting_confirmation",
        stageState: "awaiting_plan_confirmation",
      }) as never,
    );
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(
      stepRecord({ sequence: 1 }) as never,
    );
    vi.mocked(workflowRepository.createStep).mockResolvedValueOnce(
      stepRecord({
        id: "step-generate",
        type: "generate_a2ui",
        sequence: 2,
        status: "pending",
      }) as never,
    );
    const executeSpy = vi
      .spyOn(workflowService, "executeGenerateA2UI")
      .mockResolvedValue();

    await workflowService.submitDecision({
      sessionId: "session-a",
      workflowId: "workflow-a",
      artifactId: "decision-plan",
      submittedByMessageId: "message-confirm",
      selectedOption: "confirm",
    });

    expect(workflowRepository.updateStep).toHaveBeenCalledWith(
      "step-plan",
      expect.objectContaining({
        status: "completed",
        stageState: null,
        confirmedByMessageId: "message-confirm",
      }),
    );
    expect(workflowRepository.createStep).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "generate_a2ui",
        status: "pending",
      }),
    );
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowStepId: "step-generate",
        triggerMessageId: "message-confirm",
      }),
    );
  });

  it("submit_decision reject records rejection without advancing the step", async () => {
    vi.mocked(workflowRepository.findArtifactById).mockResolvedValue(
      artifactRecord({
        id: "decision-plan",
        kind: "decision_form",
        workflowStepId: "step-plan",
      }) as never,
    );
    vi.mocked(workflowRepository.findStepById).mockResolvedValue(
      stepRecord({
        id: "step-plan",
        type: "plan",
        status: "awaiting_confirmation",
        stageState: "awaiting_plan_confirmation",
      }) as never,
    );

    await workflowService.submitDecision({
      sessionId: "session-a",
      workflowId: "workflow-a",
      artifactId: "decision-plan",
      submittedByMessageId: "message-reject",
      selectedOption: "reject",
    });

    expect(workflowRepository.updateStep).toHaveBeenCalledWith(
      "step-plan",
      expect.objectContaining({
        metadata: expect.objectContaining({
          lastRejectedDecisionArtifactId: "decision-plan",
          lastRejectedByMessageId: "message-reject",
        }),
      }),
    );
    expect(workflowRepository.createStep).not.toHaveBeenCalled();
  });

  it("submit_decision revise on plan delegates to a new plan revision", async () => {
    vi.mocked(workflowRepository.findArtifactById).mockResolvedValue(
      artifactRecord({
        id: "decision-plan",
        kind: "decision_form",
        workflowStepId: "step-plan",
      }) as never,
    );
    vi.mocked(workflowRepository.findStepById).mockResolvedValue(
      stepRecord({
        id: "step-plan",
        type: "plan",
        status: "awaiting_confirmation",
        stageState: "awaiting_plan_confirmation",
      }) as never,
    );
    const revisionSpy = vi
      .spyOn(workflowService, "requestPlanRevision")
      .mockResolvedValue({
        ...workflowRecord(),
        steps: [],
        artifacts: [],
        agentRuns: [],
      } as never);

    await workflowService.submitDecision({
      sessionId: "session-a",
      workflowId: "workflow-a",
      artifactId: "decision-plan",
      submittedByMessageId: "message-revise",
      selectedOption: "revise",
      comment: "调整布局",
    });

    expect(revisionSpy).toHaveBeenCalledWith({
      sessionId: "session-a",
      workflowId: "workflow-a",
      revisionMessageId: "message-revise",
      revisionText: "调整布局",
    });
  });

  it("submit_decision confirm on preview creates commit and submits exact candidate", async () => {
    vi.mocked(workflowRepository.findArtifactById).mockResolvedValue(
      artifactRecord({
        id: "decision-preview",
        kind: "decision_form",
        workflowStepId: "step-preview",
        contentJson: { targetArtifactId: "candidate-a" },
      }) as never,
    );
    vi.mocked(workflowRepository.findStepById).mockResolvedValue(
      stepRecord({
        id: "step-preview",
        type: "preview",
        status: "awaiting_confirmation",
        stageState: "awaiting_preview_confirmation",
      }) as never,
    );
    const candidateArtifact = artifactRecord({
      id: "candidate-a",
      kind: "candidate_a2ui_messages",
      contentJson: { messages: [], validation: { valid: true } },
    });
    const commitStep = stepRecord({ id: "step-commit", type: "commit" });
    const confirmSpy = vi
      .spyOn(workflowService, "confirmCandidateCommit")
      .mockResolvedValue({
        candidateArtifact,
        commitStep,
      } as never);
    const commitSpy = vi
      .spyOn(workflowService, "commitExactCandidate")
      .mockResolvedValue();

    await workflowService.submitDecision({
      sessionId: "session-a",
      workflowId: "workflow-a",
      artifactId: "decision-preview",
      submittedByMessageId: "message-confirm",
      selectedOption: "confirm",
    });

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateArtifactId: "candidate-a",
      }),
    );
    expect(commitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        commitStepId: "step-commit",
        candidateArtifact,
      }),
    );
  });

  it("submit_decision revise on preview returns to plan iteration", async () => {
    vi.mocked(workflowRepository.findArtifactById).mockResolvedValue(
      artifactRecord({
        id: "decision-preview",
        kind: "decision_form",
        workflowStepId: "step-preview",
      }) as never,
    );
    vi.mocked(workflowRepository.findStepById).mockResolvedValue(
      stepRecord({
        id: "step-preview",
        type: "preview",
        status: "awaiting_confirmation",
        stageState: "awaiting_preview_confirmation",
      }) as never,
    );
    const previewRevisionSpy = vi
      .spyOn(workflowService, "requestPreviewRevision")
      .mockResolvedValue({
        ...workflowRecord(),
        steps: [],
        artifacts: [],
        agentRuns: [],
      } as never);

    await workflowService.submitDecision({
      sessionId: "session-a",
      workflowId: "workflow-a",
      artifactId: "decision-preview",
      submittedByMessageId: "message-revise",
      selectedOption: "revise",
      comment: "改为双栏",
    });

    expect(previewRevisionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        previewStepId: "step-preview",
        decisionArtifactId: "decision-preview",
        revisionText: "改为双栏",
      }),
    );
  });

  it("recordCandidateSuccess writes validation report, candidate artifact and opens preview decision", async () => {
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(
      stepRecord({
        id: "step-generate",
        type: "generate_a2ui",
        status: "running",
        sequence: 2,
      }) as never,
    );
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(
      stepRecord({ status: "completed" }) as never,
    );
    vi.mocked(workflowRepository.createStep).mockResolvedValue(
      stepRecord({
        id: "step-validate",
        type: "validate",
        sequence: 3,
      }) as never,
    );
    vi.mocked(workflowRepository.createArtifact)
      .mockResolvedValueOnce(
        artifactRecord({
          id: "validation-a",
          kind: "validation_report",
        }) as never,
      )
      .mockResolvedValueOnce(
        artifactRecord({
          id: "candidate-a",
          kind: "candidate_a2ui_messages",
        }) as never,
      );
    const previewSpy = vi
      .spyOn(workflowService, "createPreviewDecision")
      .mockResolvedValue(
        stepRecord({
          id: "step-preview",
          type: "preview",
        }) as never,
      );

    await workflowService.recordCandidateSuccess({
      sessionId: "session-a",
      workflowId: "workflow-a",
      generateStepId: "step-generate",
      agentRunId: "run-workflow",
      assistantMessage: "candidate",
      a2uiMessages: [],
      validation: {
        valid: true,
        errors: [],
        warnings: [],
        normalizedMessages: [],
      },
    });

    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "validation_report",
      }),
    );
    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "candidate_a2ui_messages",
      }),
    );
    expect(previewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateArtifact: expect.objectContaining({ id: "candidate-a" }),
        validationReportArtifactId: "validation-a",
      }),
    );
  });

  it("validation failure writes validation_report and does not write candidate artifact", async () => {
    vi.mocked(workflowRepository.findLatestStep).mockResolvedValue(
      stepRecord({
        id: "step-generate",
        type: "generate_a2ui",
        status: "running",
      }) as never,
    );
    vi.mocked(workflowRepository.updateStep).mockResolvedValue(
      stepRecord({ status: "failed" }) as never,
    );
    vi.mocked(workflowRepository.createArtifact).mockResolvedValue(
      artifactRecord({
        kind: "validation_report",
      }) as never,
    );

    await workflowService.recordCandidateFailure({
      sessionId: "session-a",
      workflowId: "workflow-a",
      generateStepId: "step-generate",
      agentRunId: "run-workflow",
      failureReason: "validate failed",
      validation: {
        valid: false,
        errors: [{ code: "A2UI", message: "bad" }],
        warnings: [],
        normalizedMessages: [],
      },
    });

    expect(workflowRepository.createArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "validation_report",
        createdBy: "backend",
      }),
    );
    expect(workflowRepository.createArtifact).not.toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "candidate_a2ui_messages",
      }),
    );
  });

  it("uses backend validateA2UI before saving candidate artifacts", async () => {
    vi.mocked(validateA2UI).mockReturnValue({
      valid: false,
      errors: [{ code: "A2UI", message: "bad" }],
      warnings: [],
      normalizedMessages: [],
    });

    expect(validateA2UI).toBeDefined();
  });

  it("passes workflow metadata resourceLedger snapshot into the runtime", async () => {
    const snapshot = {
      skills: [
        { key: "skill:skill-1", skillId: "skill-1", name: "课程表规范" },
      ],
      skillReferences: [],
    };
    vi.mocked(workflowRepository.findById).mockResolvedValue(
      workflowRecord({
        metadata: { resourceLedger: snapshot },
      }) as never,
    );

    const runWorkflowTask = vi.fn().mockResolvedValue({
      parsedResult: {
        kind: "clarification_request",
        form: {
          fields: [
            {
              id: "q1",
              label: "目标",
              type: "text",
              required: true,
              reason: "规划",
            },
          ],
        },
      },
      debugMetadata: {},
      toolCalls: [],
      rawOutputPreview: "",
      attemptCount: 1,
    });
    vi.mocked(createAgentRuntime).mockReturnValue({
      run: vi.fn(),
      runWorkflowTask,
    } as never);

    await workflowService.startInitialPlanning({
      sessionId: "session-a",
      workflowId: "workflow-a",
      userMessage: "做一个销售看板",
    });

    expect(runWorkflowTask).toHaveBeenCalledWith(
      expect.objectContaining({ resourceLedger: snapshot }),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("writes the returned resourceLedger snapshot back to workflow metadata", async () => {
    const returned = {
      skills: [
        { key: "skill:skill-1", skillId: "skill-1", name: "课程表规范" },
      ],
      skillReferences: [],
    };
    vi.mocked(workflowRepository.findById).mockResolvedValue(
      workflowRecord({
        metadata: { keepMe: "x" },
      }) as never,
    );

    vi.mocked(createAgentRuntime).mockReturnValue({
      run: vi.fn(),
      runWorkflowTask: vi.fn().mockResolvedValue({
        parsedResult: {
          kind: "clarification_request",
          form: {
            fields: [
              {
                id: "q1",
                label: "目标",
                type: "text",
                required: true,
                reason: "规划",
              },
            ],
          },
        },
        debugMetadata: {},
        toolCalls: [],
        rawOutputPreview: "",
        attemptCount: 1,
        resourceLedger: returned,
      }),
    } as never);

    await workflowService.startInitialPlanning({
      sessionId: "session-a",
      workflowId: "workflow-a",
      userMessage: "做一个销售看板",
    });

    // 保留 metadata 中无关字段，同时写回 resourceLedger
    expect(workflowRepository.updateWorkflow).toHaveBeenCalledWith(
      "workflow-a",
      expect.objectContaining({
        metadata: { keepMe: "x", resourceLedger: returned },
      }),
    );
  });
});
