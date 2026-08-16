/**
 * Agent Workflow 持久化编排服务。
 *
 * 职责：
 * - 创建、推进、失败、取消和完成 session 下的 workflow。
 * - 创建并更新 workflow step，保存 workflow artifact。
 * - 在 service 层守住同一 session 只允许一个进行中 workflow 的约束。
 * - 推送 workflow 经 SSE 事件，供前端恢复 timeline。
 *
 * 引用：
 * - workflow.repository
 * - stream.service
 * - utils/errors
 * 被引用：
 * - 后续 WorkflowService API 与 sendMessage 编排入口。
 * 注意：
 * - 本服务暂不调用 Agent Runtime，也不提交 A2UI event/snapshot。
 */
import type {
  A2UIServerMessage,
  A2UIEventDto,
  AgentRunInput,
  AgentWorkflowTaskInput,
  AgentWorkflowTaskResult,
  AgentWorkflowDto,
  IAgentRuntime,
  JsonObject,
  MessageDto,
  ParsedAgentResult,
  ResourceLedgerSnapshot,
  SurfaceSnapshotDto,
  ToolCallRecord,
  ValidateA2UIResult,
  WorkflowArtifactDto,
  WorkflowArtifactKind,
  WorkflowDecisionOption,
  WorkflowStageState,
  WorkflowStepDto,
  WorkflowStepStatus,
  WorkflowStepType,
} from "@a2ui-platform/shared";
import { createAgentRuntime, validateA2UI } from "@a2ui-platform/agent";
import type { Prisma } from "@prisma/client";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { a2uiEventRepository } from "../repositories/a2ui-event.repository.js";
import { agentRunRepository } from "../repositories/agent-run.repository.js";
import { fileRepository } from "../repositories/file.repository.js";
import { messageRepository } from "../repositories/message.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";
import { toolCallRepository } from "../repositories/tool-call.repository.js";
import { workflowRepository } from "../repositories/workflow.repository.js";
import { logger } from "../logger.js";
import { conflict } from "../utils/errors.js";
import { skillResolverService } from "./skill-resolver.service.js";
import { snapshotService } from "./snapshot.service.js";
import { streamService } from "./stream.service.js";

/** 创建 Agent Workflow 的输入参数。 */
export type CreateWorkflowInput = {
  sessionId: string;
  title?: string;
  intent?: string;
  metadata?: Prisma.InputJsonValue;
};

export type CreateWorkflowStepInput = {
  workflowId: string;
  sessionId: string;
  type: WorkflowStepType | string;
  sequence: number;
  status?: WorkflowStepStatus;
  stageState?: WorkflowStageState;
  maxAttempts?: number;
  metadata?: Prisma.InputJsonValue;
};

export type UpdateWorkflowStepInput = {
  stepId: string;
  sessionId: string;
  workflowId: string;
  status?: WorkflowStepStatus;
  stageState?: WorkflowStageState;
  attemptCount?: number;
  failureReason?: string | null;
  failureMetadata?: Prisma.InputJsonValue;
  confirmedAt?: Date | null;
  confirmedByMessageId?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
};

export type CreateWorkflowArtifactInput = {
  workflowId: string;
  workflowStepId?: string;
  sessionId: string;
  kind: WorkflowArtifactKind;
  version?: number;
  contentText?: string;
  contentJson?: Prisma.InputJsonValue;
  createdBy?: string;
  metadata?: Prisma.InputJsonValue;
};

export type CompleteWorkflowInput = {
  workflowId: string;
  sessionId: string;
  completedReason?: string;
  metadata?: Prisma.InputJsonValue;
};

export type FailWorkflowInput = {
  workflowId: string;
  sessionId: string;
  failureReason: string;
  failedStep?: WorkflowStepDto;
  retryable?: boolean;
  metadata?: Prisma.InputJsonValue;
};

export type StartPlanningInput = {
  sessionId: string;
  workflowId: string;
  userMessage: string;
};

export type RequestPlanRevisionInput = {
  sessionId: string;
  workflowId: string;
  revisionMessageId: string;
  revisionText: string;
};

export type RequestPreviewRevisionInput = {
  sessionId: string;
  workflowId: string;
  revisionMessageId: string;
  revisionText: string;
  previewStepId: string;
  decisionArtifactId: string;
};

export type ConfirmPlanInput = {
  sessionId: string;
  workflowId: string;
  confirmedByMessageId: string;
};

export type SubmitClarificationInput = {
  sessionId: string;
  workflowId: string;
  artifactId: string;
  submittedByMessageId: string;
  answers: Record<string, unknown>;
  additionalText?: string;
};

export type SubmitDecisionInput = {
  sessionId: string;
  workflowId: string;
  artifactId: string;
  submittedByMessageId: string;
  selectedOption: WorkflowDecisionOption;
  comment?: string;
};

export type ExecuteGenerateA2UIInput = {
  sessionId: string;
  workflowId: string;
  workflowStepId: string;
  triggerMessageId: string;
  planMarkdown?: string;
};

export type RecordCandidateSuccessInput = {
  sessionId: string;
  workflowId: string;
  generateStepId: string;
  agentRunId: string;
  assistantMessage: string;
  a2uiMessages: A2UIServerMessage[];
  validation: ValidateA2UIResult;
  tokenUsage?: JsonObject;
};

export type RecordCandidateFailureInput = {
  sessionId: string;
  workflowId: string;
  generateStepId: string;
  agentRunId: string;
  failureReason: string;
  validation?: ValidateA2UIResult;
};

export type ConfirmCandidateCommitInput = {
  sessionId: string;
  workflowId: string;
  confirmedByMessageId: string;
  candidateArtifactId?: string;
};

/**
 * 将未知值安全转换为 JsonObject。
 *
 * 仅当值为非数组的普通对象时返回原值，否则返回空对象。
 * 用于安全展开 Prisma 返回的 Json 字段。
 */
function toJsonObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

/**
 * 判断 candidate artifact 是否属于最新确认的 plan 且未被标记失效。
 *
 * 用于 submitDecision 与 commitExactCandidate 的双重 freshness guard。
 */
function isCandidateFresh(
  candidate: { id: string; metadata: unknown },
  latestPlan: { id: string } | null,
): boolean {
  const metadata = toJsonObject(candidate.metadata);
  if (metadata["invalidated"] === true) return false;
  if (!latestPlan) return false;
  return metadata["planArtifactId"] === latestPlan.id;
}

function buildAgentRuntime(): IAgentRuntime {
  return createAgentRuntime({
    baseUrl: config.openai.baseUrl,
    apiKey: config.openai.apiKey,
    model: config.openai.model,
    temperature: config.openai.temperature,
    maxTokens: config.openai.maxTokens,
    timeoutMs: config.openai.timeoutMs,
  });
}

async function recordRuntimeToolCall(
  agentRunId: string,
  sessionId: string,
  record: ToolCallRecord,
): Promise<void> {
  await toolCallRepository.create({
    agentRun: { connect: { id: agentRunId } },
    sessionId,
    toolName: record.toolName,
    status: record.status,
    attemptIndex: record.attemptIndex,
    inputSummary: record.inputSummary as Prisma.InputJsonValue,
    output: (record.output ?? {}) as Prisma.InputJsonValue,
    errorMessage: record.errorMessage ?? null,
    durationMs: record.durationMs ?? null,
  });
}

async function buildAgentInput(sessionId: string, userMessage: string): Promise<AgentRunInput> {
  const currentSnapshot = await surfaceSnapshotRepository.findCurrentBySessionId(sessionId);
  const recentMessages = await messageRepository.findBySessionId(sessionId, { limit: 20 });
  const uploadedFiles = await fileRepository.findReadyWithContentBySessionId(sessionId);
  const enabledSkills = await skillResolverService.resolveForSession(sessionId);

  return {
    sessionId,
    userMessage,
    recentMessages: recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    uploadedFiles: uploadedFiles.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      content: file.content,
    })),
    enabledSkills,
    currentSnapshot: currentSnapshot ? (currentSnapshot.snapshot as AgentRunInput["currentSnapshot"]) : null,
    catalogId: config.catalog.id,
    catalogVersion: config.catalog.version,
    rendererVersion: config.catalog.rendererVersion,
    model: {
      provider: "openai-compatible",
      name: config.openai.model,
      config: {},
    },
  };
}

async function createWorkflowTaskRun(input: {
  sessionId: string;
  workflowId: string;
  workflowStepId: string;
  triggerMessageId?: string | null;
  intent: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const session = await sessionRepository.findById(input.sessionId);
  if (!session) {
    throw conflict("Session 不存在，无法创建 workflow AgentRun", "SESSION_NOT_FOUND", {
      sessionId: input.sessionId,
    });
  }

  return agentRunRepository.create({
    session: { connect: { id: input.sessionId } },
    workflow: { connect: { id: input.workflowId } },
    workflowStep: { connect: { id: input.workflowStepId } },
    triggerMessageId: input.triggerMessageId ?? null,
    status: "running",
    intent: input.intent,
    modelProvider: session.modelProvider,
    modelName: session.modelName,
    modelConfig: session.modelConfig as unknown as Prisma.InputJsonValue,
    attemptCount: 0,
    maxAttempts: 1,
    metadata: input.metadata ?? {},
    startedAt: new Date(),
  });
}

async function runWorkflowTask(input: {
  sessionId: string;
  workflowId: string;
  workflowStepId: string;
  task: AgentWorkflowTaskInput["task"];
  gate: WorkflowStepType;
  stageState?: AgentWorkflowTaskInput["stageState"];
  availableTools?: AgentWorkflowTaskInput["availableTools"];
  userMessage: string;
  clarificationAnswers?: JsonObject;
  previousPlanMarkdown?: string | null;
  previousCandidate?: JsonObject | null;
  revisionText?: string | null;
  workflowContext?: JsonObject;
}): Promise<{ runId: string; result: AgentWorkflowTaskResult }> {
  const run = await createWorkflowTaskRun({
    sessionId: input.sessionId,
    workflowId: input.workflowId,
    workflowStepId: input.workflowStepId,
    intent: input.task === "revise_plan" ? "REVISE_PLAN" : "INITIAL_PLANNING",
    metadata: {
      task: input.task,
      gate: input.gate,
      previousPlanMarkdown: input.previousPlanMarkdown ?? null,
      revisionText: input.revisionText ?? null,
    },
  });

  const agentInput = await buildAgentInput(input.sessionId, input.userMessage);

  // 读取上一 task 遗留的 Resource Ledger Snapshot，供 Runtime hydrate 后复用已披露资源。
  const workflow = await workflowRepository.findById(input.workflowId);
  const workflowMetadata = toJsonObject(workflow?.metadata);
  const resourceLedger = workflowMetadata["resourceLedger"] as ResourceLedgerSnapshot | undefined;

  const runtime = buildAgentRuntime();
  const toolCallTasks: Array<Promise<void>> = [];
  let result: AgentWorkflowTaskResult;
  try {
    result = await runtime.runWorkflowTask(
      {
        ...agentInput,
        workflowId: input.workflowId,
        workflowStepId: input.workflowStepId,
        agentRunId: run.id,
        gate: input.gate,
        stepType: input.gate,
        stageState: input.stageState ?? null,
        task: input.task,
        availableTools: input.availableTools ?? [
          "askClarification",
          "askUserDecision",
          "getSkillContent",
          "getSkillReferenceContent",
          "getCatalogComponentDetails",
        ],
        clarificationAnswers: input.clarificationAnswers,
        previousPlanMarkdown: input.previousPlanMarkdown,
        previousCandidate: input.previousCandidate,
        revisionText: input.revisionText,
        workflowContext: input.workflowContext,
        ...(resourceLedger ? { resourceLedger } : {}),
      },
      (record) => {
        toolCallTasks.push(recordRuntimeToolCall(run.id, input.sessionId, record));
      },
      (event) => {
        streamService.send(input.sessionId, {
          event: "agent_trace_event",
          data: event,
        });
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, runId: run.id, workflowId: input.workflowId, workflowStepId: input.workflowStepId }, "Workflow Agent runtime 执行异常");
    result = {
      parsedResult: {
        kind: "failure",
        reason: `Workflow Agent runtime 执行异常：${message}`,
        recoverable: true,
        details: {
          errorType: "runtime_exception",
          task: input.task,
          gate: input.gate,
        },
      },
      debugMetadata: {
        task: input.task,
        gate: input.gate,
        runtimeException: {
          message,
          stack: err instanceof Error ? err.stack ?? null : null,
        },
      },
      toolCalls: [],
      rawOutputPreview: "",
      attemptCount: 1,
      tokenUsage: {},
    };
  }
  await Promise.all(toolCallTasks);

  await agentRunRepository.update(run.id, {
    status: result.parsedResult.kind === "failure" ? "failed" : "committed",
    attemptCount: result.attemptCount,
    failureReason: result.parsedResult.kind === "failure" ? result.parsedResult.reason : null,
    tokenUsage: (result.tokenUsage ?? {}) as Prisma.InputJsonValue,
    metadata: {
      ...(run.metadata as JsonObject),
      debug: {
        ...result.debugMetadata,
        rawOutputPreview: result.rawOutputPreview,
      },
      parsedResultKind: result.parsedResult.kind,
      ...(result.traceSummary
        ? {
            traceSummary: JSON.parse(
              JSON.stringify(result.traceSummary),
            ) as Prisma.InputJsonValue,
          }
        : {}),
    },
    completedAt: new Date(),
  });

  // 把 Runtime 返回的更新后 Resource Ledger Snapshot 写回 workflow metadata，
  // 供同一 workflow 的下一次 task 复用；保留 metadata 中其余无关字段。
  if (result.resourceLedger) {
    await workflowRepository.updateWorkflow(input.workflowId, {
      metadata: {
        ...workflowMetadata,
        resourceLedger: result.resourceLedger as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return { runId: run.id, result };
}

function resultFailureReason(result: ParsedAgentResult): string {
  return result.kind === "failure" ? result.reason : `当前 gate 不接受 Agent result: ${result.kind}`;
}

function extractSurfaceIds(messages: A2UIServerMessage[]): string[] {
  const surfaceIds = new Set<string>();
  for (const message of messages) {
    if ("createSurface" in message && message.createSurface) {
      surfaceIds.add(message.createSurface.surfaceId);
    }
    if ("updateComponents" in message && message.updateComponents) {
      surfaceIds.add(message.updateComponents.surfaceId);
    }
    if ("updateDataModel" in message && message.updateDataModel) {
      surfaceIds.add(message.updateDataModel.surfaceId);
    }
    if ("deleteSurface" in message && message.deleteSurface) {
      surfaceIds.add(message.deleteSurface.surfaceId);
    }
  }
  return [...surfaceIds];
}

/**
 * 将 Prisma AgentWorkflow 实体转换为 AgentWorkflowDto。
 *
 * Date 字段转为 ISO 字符串，metadata 通过 toJsonObject 安全转换。
 */
function toWorkflowDto(workflow: {
  id: string;
  sessionId: string;
  status: string;
  currentStepType: string | null;
  title: string | null;
  intent: string | null;
  completedReason: string | null;
  failureReason: string | null;
  metadata: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AgentWorkflowDto {
  return {
    id: workflow.id,
    sessionId: workflow.sessionId,
    status: workflow.status as AgentWorkflowDto["status"],
    currentStepType: workflow.currentStepType as AgentWorkflowDto["currentStepType"],
    title: workflow.title,
    intent: workflow.intent,
    completedReason: workflow.completedReason,
    failureReason: workflow.failureReason,
    metadata: toJsonObject(workflow.metadata),
    startedAt: workflow.startedAt?.toISOString() ?? null,
    completedAt: workflow.completedAt?.toISOString() ?? null,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  };
}

/**
 * 将 Prisma WorkflowStep 实体转换为 WorkflowStepDto。
 */
function toStepDto(step: {
  id: string;
  workflowId: string;
  sessionId: string;
  type: string;
  status: string;
  stageState: string | null;
  sequence: number;
  attemptCount: number;
  maxAttempts: number;
  failureReason: string | null;
  failureMetadata: unknown;
  confirmedAt: Date | null;
  confirmedByMessageId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowStepDto {
  return {
    id: step.id,
    workflowId: step.workflowId,
    sessionId: step.sessionId,
    type: step.type as WorkflowStepDto["type"],
    status: step.status as WorkflowStepDto["status"],
    stageState: step.stageState as WorkflowStepDto["stageState"],
    sequence: step.sequence,
    attemptCount: step.attemptCount,
    maxAttempts: step.maxAttempts,
    failureReason: step.failureReason,
    failureMetadata: toJsonObject(step.failureMetadata),
    confirmedAt: step.confirmedAt?.toISOString() ?? null,
    confirmedByMessageId: step.confirmedByMessageId,
    startedAt: step.startedAt?.toISOString() ?? null,
    completedAt: step.completedAt?.toISOString() ?? null,
    metadata: toJsonObject(step.metadata),
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString(),
  };
}

/**
 * 将 Prisma WorkflowArtifact 实体转换为 WorkflowArtifactDto。
 */
function toArtifactDto(artifact: {
  id: string;
  workflowId: string;
  workflowStepId: string | null;
  sessionId: string;
  kind: string;
  version: number;
  contentText: string | null;
  contentJson: unknown;
  createdBy: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowArtifactDto {
  return {
    id: artifact.id,
    workflowId: artifact.workflowId,
    workflowStepId: artifact.workflowStepId,
    sessionId: artifact.sessionId,
    kind: artifact.kind as WorkflowArtifactDto["kind"],
    version: artifact.version,
    contentText: artifact.contentText,
    contentJson: toJsonObject(artifact.contentJson),
    createdBy: artifact.createdBy as WorkflowArtifactDto["createdBy"],
    metadata: toJsonObject(artifact.metadata),
    createdAt: artifact.createdAt.toISOString(),
    updatedAt: artifact.updatedAt.toISOString(),
  };
}

function toWorkflowDetailDto(workflow: {
  id: string;
  sessionId: string;
  status: string;
  currentStepType: string | null;
  title: string | null;
  intent: string | null;
  completedReason: string | null;
  failureReason: string | null;
  metadata: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  steps?: Parameters<typeof toStepDto>[0][];
  artifacts?: Parameters<typeof toArtifactDto>[0][];
  agentRuns?: Array<{
    id: string;
    sessionId: string;
    workflowId: string | null;
    workflowStepId: string | null;
    triggerMessageId: string | null;
    status: string;
    intent: string | null;
    modelProvider: string;
    modelName: string;
    attemptCount: number;
    maxAttempts: number;
    inputSnapshotId: string | null;
    outputSnapshotId: string | null;
    assistantMessageId: string | null;
    failureReason: string | null;
    validationSummary: unknown;
    tokenUsage: unknown;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }>;
}) {
  return {
    ...toWorkflowDto(workflow),
    steps: (workflow.steps ?? []).map(toStepDto),
    artifacts: (workflow.artifacts ?? []).map(toArtifactDto),
    agentRuns: (workflow.agentRuns ?? []).map((run) => ({
      id: run.id,
      sessionId: run.sessionId,
      workflowId: run.workflowId,
      workflowStepId: run.workflowStepId,
      triggerMessageId: run.triggerMessageId,
      status: run.status as "pending" | "running" | "committed" | "failed" | "cancelled",
      intent: run.intent,
      modelProvider: run.modelProvider,
      modelName: run.modelName,
      attemptCount: run.attemptCount,
      maxAttempts: run.maxAttempts,
      inputSnapshotId: run.inputSnapshotId,
      outputSnapshotId: run.outputSnapshotId,
      assistantMessageId: run.assistantMessageId,
      failureReason: run.failureReason,
      validationSummary: toJsonObject(run.validationSummary),
      tokenUsage: toJsonObject(run.tokenUsage),
      startedAt: run.startedAt?.toISOString() ?? null,
      completedAt: run.completedAt?.toISOString() ?? null,
      createdAt: run.createdAt.toISOString(),
    })),
  };
}

export const workflowService = {
  /**
   * 创建 session 下的新 Agent Workflow。
   *
   * @param input - 创建参数，包含 sessionId、可选标题和意图
   * @returns 新建的 workflow 记录
   */
  async createWorkflow(input: CreateWorkflowInput) {
    const activeWorkflow = await workflowRepository.findActiveBySessionId(input.sessionId);
    if (activeWorkflow) {
      throw conflict("当前会话已有进行中的 Agent Workflow", "ACTIVE_WORKFLOW_EXISTS", {
        sessionId: input.sessionId,
        workflowId: activeWorkflow.id,
      });
    }

    const workflow = await workflowRepository.createWorkflow({
      session: { connect: { id: input.sessionId } },
      status: "active",
      title: input.title,
      intent: input.intent,
      metadata: input.metadata ?? {},
      startedAt: new Date(),
    });

    streamService.send(input.sessionId, {
      event: "workflow_started",
      data: { sessionId: input.sessionId, workflow: toWorkflowDto(workflow) },
    });

    return workflow;
  },

  /**
   * 创建 workflow step。
   *
   * @param input - step 创建参数
   * @returns 新建的 workflow step
   */
  async createStep(input: CreateWorkflowStepInput) {
    const step = await workflowRepository.createStep({
      workflow: { connect: { id: input.workflowId } },
      sessionId: input.sessionId,
      type: input.type,
      sequence: input.sequence,
      status: input.status ?? "pending",
      stageState: input.stageState ?? null,
      maxAttempts: input.maxAttempts ?? 3,
      metadata: input.metadata ?? {},
    });

    await workflowRepository.updateWorkflow(input.workflowId, {
      currentStepType: input.type,
    });

    streamService.send(input.sessionId, {
      event: "workflow_step_updated",
      data: { sessionId: input.sessionId, workflowId: input.workflowId, step: toStepDto(step) },
    });

    return step;
  },

  /**
   * 更新 workflow step 并推送 timeline 事件。
   *
   * @param input - step 更新参数
   * @returns 更新后的 workflow step
   */
  async updateStep(input: UpdateWorkflowStepInput) {
    const step = await workflowRepository.updateStep(input.stepId, {
      status: input.status,
      stageState: input.stageState,
      attemptCount: input.attemptCount,
      failureReason: input.failureReason,
      failureMetadata: input.failureMetadata,
      confirmedAt: input.confirmedAt,
      confirmedByMessageId: input.confirmedByMessageId,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      metadata: input.metadata,
    });

    streamService.send(input.sessionId, {
      event: "workflow_step_updated",
      data: { sessionId: input.sessionId, workflowId: input.workflowId, step: toStepDto(step) },
    });

    return step;
  },

  /**
   * 创建 workflow artifact。
   *
   * @param input - artifact 创建参数
   * @returns 新建的 workflow artifact
   */
  async createArtifact(input: CreateWorkflowArtifactInput) {
    const artifact = await workflowRepository.createArtifact({
      workflow: { connect: { id: input.workflowId } },
      workflowStep: input.workflowStepId ? { connect: { id: input.workflowStepId } } : undefined,
      sessionId: input.sessionId,
      kind: input.kind,
      version: input.version ?? 1,
      contentText: input.contentText,
      contentJson: input.contentJson ?? {},
      createdBy: input.createdBy ?? "agent",
      metadata: input.metadata ?? {},
    });

    streamService.send(input.sessionId, {
      event: "workflow_artifact_created",
      data: { sessionId: input.sessionId, workflowId: input.workflowId, artifact: toArtifactDto(artifact) },
    });

    return artifact;
  },

  /**
   * 完成 workflow。
   *
   * @param input - 完成参数
   * @returns 更新后的 workflow
   */
  async completeWorkflow(input: CompleteWorkflowInput) {
    const workflow = await workflowRepository.updateWorkflow(input.workflowId, {
      status: "completed",
      completedReason: input.completedReason ?? "completed",
      completedAt: new Date(),
      metadata: input.metadata,
    });

    streamService.send(input.sessionId, {
      event: "workflow_completed",
      data: { sessionId: input.sessionId, workflow: toWorkflowDto(workflow) },
    });

    return workflow;
  },

  /**
   * 标记 workflow 失败。
   *
   * @param input - 失败参数
   * @returns 更新后的 workflow
   */
  async failWorkflow(input: FailWorkflowInput) {
    const workflow = await workflowRepository.updateWorkflow(input.workflowId, {
      status: input.retryable ? "failed_retryable" : "failed",
      failureReason: input.failureReason,
      metadata: input.metadata,
      completedAt: input.retryable ? undefined : new Date(),
    });

    streamService.send(input.sessionId, {
      event: "workflow_failed",
      data: { sessionId: input.sessionId, workflow: toWorkflowDto(workflow), failedStep: input.failedStep },
    });

    return workflow;
  },

  /**
   * 取消 workflow。
   *
   * @param workflowId - Workflow ID
   * @param sessionId - Session ID
   * @returns 更新后的 workflow
   */
  async cancelWorkflow(workflowId: string, sessionId: string) {
    const workflow = await workflowRepository.updateWorkflow(workflowId, {
      status: "cancelled",
      completedReason: "cancelled",
      completedAt: new Date(),
    });

    streamService.send(sessionId, {
      event: "workflow_completed",
      data: { sessionId, workflow: toWorkflowDto(workflow) },
    });

    return workflow;
  },

  /**
   * 查询 session 的 workflow 历史。
   *
   * @param sessionId - 会话 ID
   * @returns workflow 历史，包含 steps 与 artifacts
   */
  getSessionWorkflows(sessionId: string) {
    return workflowRepository.findWorkflowsBySessionId(sessionId)
      .then((workflows) => workflows.map(toWorkflowDetailDto));
  },

  /**
   * 查询单个 workflow 详情。
   *
   * @param workflowId - Workflow ID
   * @returns workflow 详情，不存在时返回 null
   */
  async getWorkflowById(workflowId: string) {
    const workflow = await workflowRepository.findWorkflowById(workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 查询 session 当前进行中的 workflow。
   *
   * @param sessionId - 会话 ID
   * @returns 当前 active workflow，不存在时返回 null
   */
  getActiveWorkflow(sessionId: string) {
    return workflowRepository.findActiveBySessionId(sessionId);
  },

  /**
   * 启动第一阶段用户可见规划流程。
   *
   * @param input - 包含 session、workflow 和用户原始需求
   * @returns 当前 workflow 详情
   */
  async startInitialPlanning(input: StartPlanningInput) {
    const now = new Date();
    const planStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "plan",
      sequence: 1,
      status: "running",
      stageState: null,
      maxAttempts: 1,
      metadata: {
        gate: "plan",
        allowedOutput: ["clarification_form", "plan_markdown", "decision_form"],
        userMessage: input.userMessage,
      },
    });

    const { runId, result } = await runWorkflowTask({
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      task: "plan",
      gate: "plan",
      userMessage: input.userMessage,
      workflowContext: {
        planStepId: planStep.id,
      },
    });

    if (result.parsedResult.kind === "clarification_request") {
      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: planStep.id,
        status: "awaiting_confirmation",
        stageState: "awaiting_clarification",
        metadata: {
          ...(toJsonObject(planStep.metadata)),
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
      });

      await this.createArtifact({
        workflowId: input.workflowId,
        workflowStepId: planStep.id,
        sessionId: input.sessionId,
        kind: "clarification_form",
        version: 1,
        contentJson: {
          ...result.parsedResult.form,
          additionalInstructions: {
            id: "additional_instructions",
            type: "textarea",
            label: "其他自然语言补充",
            required: false,
          },
        } as unknown as Prisma.InputJsonValue,
        createdBy: "agent",
        metadata: {
          agentRunId: runId,
          source: "askClarification",
          toolCallId: result.toolCalls.find((call) => call.toolName === "askClarification")?.toolCallId ?? null,
        },
      });

      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    if (result.parsedResult.kind !== "plan_markdown") {
      const failureReason = resultFailureReason(result.parsedResult);
      const failedStep = await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: planStep.id,
        status: "failed",
        stageState: null,
        failureReason,
        failureMetadata: {
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
        completedAt: now,
        metadata: {
          ...(toJsonObject(planStep.metadata)),
          agentRunId: runId,
        },
      });
      await this.failWorkflow({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        failureReason,
        failedStep: toStepDto(failedStep),
        retryable: true,
      });
      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: planStep.id,
      status: "awaiting_confirmation",
      stageState: "awaiting_plan_confirmation",
      metadata: {
        ...(toJsonObject(planStep.metadata)),
        agentRunId: runId,
        parsedResultKind: result.parsedResult.kind,
      },
    });

    const planArtifact = await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      sessionId: input.sessionId,
      kind: "plan_markdown",
      version: 1,
      contentText: result.parsedResult.markdown,
      createdBy: "agent",
      metadata: {
        agentRunId: runId,
      },
    });

    await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      sessionId: input.sessionId,
      kind: "decision_form",
      version: 1,
      contentJson: {
        ...result.parsedResult.decisionForm,
        targetArtifactId: planArtifact.id,
      } as unknown as Prisma.InputJsonValue,
      createdBy: "agent",
      metadata: {
        source: "askUserDecision",
        agentRunId: runId,
        toolCallId: result.toolCalls.find((call) => call.toolName === "askUserDecision")?.toolCallId ?? null,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 在 confirm_plan 阶段确认当前 plan。
   *
   * @param input - 确认参数
   * @returns 当前 workflow 详情
   */
  /**
   * 提交 plan 阶段的 clarification form，并重新运行真实 Agent plan task。
   *
   * 注意：本方法只接受当前 plan step 的 awaiting_clarification 状态，不会用后端模板补 plan。
   *
   * @param input - 澄清表单提交参数，包含 artifact、答案和用户消息 ID
   * @returns 更新后的 workflow 详情
   */
  async submitClarification(input: SubmitClarificationInput) {
    const artifact = await workflowRepository.findArtifactById(input.artifactId);
    if (!artifact || artifact.workflowId !== input.workflowId || artifact.kind !== "clarification_form") {
      throw conflict("提交的 clarification artifact 不属于当前 workflow", "CLARIFICATION_ARTIFACT_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        artifactId: input.artifactId,
      });
    }

    if (!artifact.workflowStepId) {
      throw conflict("clarification artifact 缺少关联的 workflow step", "CLARIFICATION_STEP_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        artifactId: input.artifactId,
      });
    }

    const planStep = await workflowRepository.findStepById(artifact.workflowStepId);
    if (
      !planStep ||
      planStep.workflowId !== input.workflowId ||
      planStep.type !== "plan" ||
      planStep.status !== "awaiting_confirmation" ||
      planStep.stageState !== "awaiting_clarification"
    ) {
      throw conflict("当前 workflow 不在等待澄清的 plan 状态", "PLAN_CLARIFICATION_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        artifactId: input.artifactId,
      });
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: planStep.id,
      status: "running",
      stageState: null,
      metadata: {
        ...(toJsonObject(planStep.metadata)),
        submittedClarificationArtifactId: input.artifactId,
        submittedClarificationMessageId: input.submittedByMessageId,
      },
    });

    const latestPlan = await workflowRepository.findLatestArtifact(input.workflowId, "plan_markdown");
    const latestClarification = await workflowRepository.findLatestArtifact(input.workflowId, "clarification_form");
    const latestDecision = await workflowRepository.findLatestArtifact(input.workflowId, "decision_form");
    const nextPlanVersion = (latestPlan?.version ?? 0) + 1;
    const nextClarificationVersion = (latestClarification?.version ?? 0) + 1;
    const nextDecisionVersion = (latestDecision?.version ?? 0) + 1;

    const { runId, result } = await runWorkflowTask({
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      task: "plan",
      gate: "plan",
      userMessage: input.additionalText?.trim() || "用户提交了澄清答案",
      clarificationAnswers: input.answers as JsonObject,
      workflowContext: {
        clarificationArtifactId: input.artifactId,
        submittedByMessageId: input.submittedByMessageId,
      },
    });

    if (result.parsedResult.kind === "clarification_request") {
      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: planStep.id,
        status: "awaiting_confirmation",
        stageState: "awaiting_clarification",
        metadata: {
          ...(toJsonObject(planStep.metadata)),
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
          submittedClarificationArtifactId: input.artifactId,
          submittedClarificationMessageId: input.submittedByMessageId,
        },
      });

      await this.createArtifact({
        workflowId: input.workflowId,
        workflowStepId: planStep.id,
        sessionId: input.sessionId,
        kind: "clarification_form",
        version: nextClarificationVersion,
        contentJson: {
          ...result.parsedResult.form,
          additionalInstructions: {
            id: "additional_instructions",
            type: "textarea",
            label: "其他自然语言补充",
            required: false,
          },
        } as unknown as Prisma.InputJsonValue,
        createdBy: "agent",
        metadata: {
          agentRunId: runId,
          source: "askClarification",
          toolCallId: result.toolCalls.find((call) => call.toolName === "askClarification")?.toolCallId ?? null,
          previousClarificationArtifactId: input.artifactId,
        },
      });

      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    if (result.parsedResult.kind !== "plan_markdown") {
      const failureReason = resultFailureReason(result.parsedResult);
      const failedStep = await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: planStep.id,
        status: "failed",
        stageState: null,
        failureReason,
        failureMetadata: {
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
        completedAt: new Date(),
        metadata: {
          ...(toJsonObject(planStep.metadata)),
          agentRunId: runId,
          submittedClarificationArtifactId: input.artifactId,
          submittedClarificationMessageId: input.submittedByMessageId,
        },
      });
      await this.failWorkflow({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        failureReason,
        failedStep: toStepDto(failedStep),
        retryable: true,
      });
      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: planStep.id,
      status: "awaiting_confirmation",
      stageState: "awaiting_plan_confirmation",
      metadata: {
        ...(toJsonObject(planStep.metadata)),
        agentRunId: runId,
        parsedResultKind: result.parsedResult.kind,
        submittedClarificationArtifactId: input.artifactId,
        submittedClarificationMessageId: input.submittedByMessageId,
      },
    });

    const planArtifact = await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      sessionId: input.sessionId,
      kind: "plan_markdown",
      version: nextPlanVersion,
      contentText: result.parsedResult.markdown,
      createdBy: "agent",
      metadata: {
        agentRunId: runId,
        clarificationArtifactId: input.artifactId,
        submittedByMessageId: input.submittedByMessageId,
      },
    });

    await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      sessionId: input.sessionId,
      kind: "decision_form",
      version: nextDecisionVersion,
      contentJson: {
        ...result.parsedResult.decisionForm,
        targetArtifactId: planArtifact.id,
      } as unknown as Prisma.InputJsonValue,
      createdBy: "agent",
      metadata: {
        source: "askUserDecision",
        agentRunId: runId,
        toolCallId: result.toolCalls.find((call) => call.toolName === "askUserDecision")?.toolCallId ?? null,
        targetArtifactId: planArtifact.id,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 提交 decision form 的三选一结果，并由当前 step/stageState 做门禁。
   *
   * 注意：confirm 不接受 comment；revise 必须有 comment；reject 只记录停留，不推进 workflow。
   *
   * @param input - decision 表单提交参数
   * @returns 更新后的 workflow 详情
   */
  async submitDecision(input: SubmitDecisionInput) {
    const artifact = await workflowRepository.findArtifactById(input.artifactId);
    if (!artifact || artifact.workflowId !== input.workflowId || artifact.kind !== "decision_form") {
      throw conflict("提交的 decision artifact 不属于当前 workflow", "DECISION_ARTIFACT_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        artifactId: input.artifactId,
      });
    }

    if (!artifact.workflowStepId) {
      throw conflict("decision artifact 缺少关联的 workflow step", "DECISION_STEP_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        artifactId: input.artifactId,
      });
    }

    const step = await workflowRepository.findStepById(artifact.workflowStepId);
    if (!step || step.workflowId !== input.workflowId || step.status !== "awaiting_confirmation") {
      throw conflict("当前 workflow 不在等待 decision 的状态", "DECISION_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        artifactId: input.artifactId,
      });
    }

    if (input.selectedOption === "reject") {
      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: step.id,
        metadata: {
          ...(toJsonObject(step.metadata)),
          lastRejectedDecisionArtifactId: input.artifactId,
          lastRejectedByMessageId: input.submittedByMessageId,
        },
      });
      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    if (step.type === "plan" && step.stageState === "awaiting_plan_confirmation") {
      if (input.selectedOption === "revise") {
        return this.requestPlanRevision({
          sessionId: input.sessionId,
          workflowId: input.workflowId,
          revisionMessageId: input.submittedByMessageId,
          revisionText: input.comment ?? "",
        });
      }

      const latestStep = await workflowRepository.findLatestStep(input.workflowId);
      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: step.id,
        status: "completed",
        stageState: null,
        confirmedAt: new Date(),
        confirmedByMessageId: input.submittedByMessageId,
        completedAt: new Date(),
        metadata: {
          ...(toJsonObject(step.metadata)),
          confirmedDecisionArtifactId: input.artifactId,
          confirmedByMessageId: input.submittedByMessageId,
        },
      });

      const generateStep = await this.createStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        type: "generate_a2ui",
        sequence: (latestStep?.sequence ?? step.sequence) + 1,
        status: "pending",
        metadata: {
          gate: "generate_a2ui",
          precondition: "confirmed_plan",
          confirmedPlanStepId: step.id,
          decisionArtifactId: input.artifactId,
          confirmedByMessageId: input.submittedByMessageId,
        },
      });

      void this.executeGenerateA2UI({
        sessionId: input.sessionId,
        workflowId: input.workflowId,
        workflowStepId: generateStep.id,
        triggerMessageId: input.submittedByMessageId,
      });

      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    if (step.type === "preview" && step.stageState === "awaiting_preview_confirmation") {
      if (input.selectedOption === "revise") {
        return this.requestPreviewRevision({
          sessionId: input.sessionId,
          workflowId: input.workflowId,
          revisionMessageId: input.submittedByMessageId,
          revisionText: input.comment ?? "",
          previewStepId: step.id,
          decisionArtifactId: input.artifactId,
        });
      }

      const decisionContent = toJsonObject(artifact.contentJson);
      const confirmed = await this.confirmCandidateCommit({
        sessionId: input.sessionId,
        workflowId: input.workflowId,
        confirmedByMessageId: input.submittedByMessageId,
        candidateArtifactId: typeof decisionContent["targetArtifactId"] === "string" ? decisionContent["targetArtifactId"] : undefined,
      });
      await this.commitExactCandidate({
        sessionId: input.sessionId,
        workflowId: input.workflowId,
        commitStepId: confirmed.commitStep.id,
        confirmedByMessageId: input.submittedByMessageId,
        candidateArtifact: confirmed.candidateArtifact,
      });
      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    throw conflict("decision artifact 与当前 step/stageState 不匹配", "DECISION_STAGE_STATE_MISMATCH", {
      workflowId: input.workflowId,
      artifactId: input.artifactId,
      stepType: step.type,
      stageState: step.stageState,
    });
  },

  async confirmPlan(input: ConfirmPlanInput) {
    const latestConfirmStep = await workflowRepository.findLatestStep(input.workflowId, "confirm_plan");
    if (!latestConfirmStep || latestConfirmStep.status !== "awaiting_confirmation") {
      throw conflict("当前 workflow 没有等待确认的 plan", "PLAN_CONFIRMATION_NOT_AVAILABLE", {
        workflowId: input.workflowId,
      });
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: latestConfirmStep.id,
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedByMessageId: input.confirmedByMessageId,
      completedAt: new Date(),
      metadata: {
        ...(toJsonObject(latestConfirmStep.metadata)),
        confirmedByMessageId: input.confirmedByMessageId,
      },
    });

    await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "generate_a2ui",
      sequence: latestConfirmStep.sequence + 1,
      status: "pending",
      metadata: {
        gate: "generate_a2ui",
        precondition: "confirmed_plan",
        confirmedPlanStepId: latestConfirmStep.id,
        confirmedByMessageId: input.confirmedByMessageId,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 在确认阶段用自然语言请求修改 plan。
   *
   * @param input - 修改请求参数
   * @returns 当前 workflow 详情
   */
  /**
   * 从 preview revise 回到新的 plan iteration。
   *
   * 注意：旧 plan、candidate 与 validation artifact 都保留；新 plan 通过真实 Agent 重新生成。
   *
   * @param input - preview revise 的用户意见与关联 artifact
   * @returns 更新后的 workflow 详情
   */
  async requestPreviewRevision(input: RequestPreviewRevisionInput) {
    const previewStep = await workflowRepository.findStepById(input.previewStepId);
    if (
      !previewStep ||
      previewStep.workflowId !== input.workflowId ||
      previewStep.type !== "preview" ||
      previewStep.status !== "awaiting_confirmation" ||
      previewStep.stageState !== "awaiting_preview_confirmation"
    ) {
      throw conflict("当前 workflow 不在可修改的 preview 等待态", "PREVIEW_REVISION_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        previewStepId: input.previewStepId,
      });
    }

    const latestPlan = await workflowRepository.findLatestArtifact(input.workflowId, "plan_markdown");
    const latestCandidate = await workflowRepository.findLatestArtifact(input.workflowId, "candidate_a2ui_messages");
    const latestValidation = await workflowRepository.findLatestArtifact(input.workflowId, "validation_report");
    const latestStep = await workflowRepository.findLatestStep(input.workflowId);
    const nextSequence = (latestStep?.sequence ?? previewStep.sequence) + 1;
    const nextVersion = (latestPlan?.version ?? 0) + 1;

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: previewStep.id,
      status: "skipped",
      stageState: null,
      completedAt: new Date(),
      metadata: {
        ...(toJsonObject(previewStep.metadata)),
        supersededByRevisionMessageId: input.revisionMessageId,
        revisionText: input.revisionText,
      },
    });

    // 标记旧 candidate 失效：保留历史但禁止 commit
    if (latestCandidate) {
      await workflowRepository.updateArtifact(latestCandidate.id, {
        metadata: {
          ...(toJsonObject(latestCandidate.metadata)),
          invalidated: true,
          supersededByRevisionMessageId: input.revisionMessageId,
        },
      });
    }

    const planStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "plan",
      sequence: nextSequence,
      status: "running",
      stageState: null,
      maxAttempts: 1,
      metadata: {
        gate: "plan",
        source: "preview_revision",
        revisionMessageId: input.revisionMessageId,
        decisionArtifactId: input.decisionArtifactId,
        previousPlanArtifactId: latestPlan?.id ?? null,
        previousCandidateArtifactId: latestCandidate?.id ?? null,
        previousValidationReportArtifactId: latestValidation?.id ?? null,
        planVersion: nextVersion,
      },
    });

    const { runId, result } = await runWorkflowTask({
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      task: "revise_plan",
      gate: "plan",
      userMessage: input.revisionText,
      previousPlanMarkdown: latestPlan?.contentText ?? null,
      previousCandidate: latestCandidate ? toJsonObject(latestCandidate.contentJson) : null,
      revisionText: input.revisionText,
      workflowContext: {
        source: "preview_revision",
        revisionMessageId: input.revisionMessageId,
        decisionArtifactId: input.decisionArtifactId,
        previousPlanArtifactId: latestPlan?.id ?? null,
        previousCandidateArtifactId: latestCandidate?.id ?? null,
        previousValidationReportArtifactId: latestValidation?.id ?? null,
        previousValidation: latestValidation ? toJsonObject(latestValidation.contentJson) : null,
      },
    });

    if (result.parsedResult.kind === "clarification_request") {
      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: planStep.id,
        status: "awaiting_confirmation",
        stageState: "awaiting_clarification",
        metadata: {
          ...(toJsonObject(planStep.metadata)),
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
      });

      const latestClarification = await workflowRepository.findLatestArtifact(input.workflowId, "clarification_form");
      await this.createArtifact({
        workflowId: input.workflowId,
        workflowStepId: planStep.id,
        sessionId: input.sessionId,
        kind: "clarification_form",
        version: (latestClarification?.version ?? 0) + 1,
        contentJson: {
          ...result.parsedResult.form,
          additionalInstructions: {
            id: "additional_instructions",
            type: "textarea",
            label: "其他自然语言补充",
            required: false,
          },
        } as unknown as Prisma.InputJsonValue,
        createdBy: "agent",
        metadata: {
          agentRunId: runId,
          source: "askClarification",
          toolCallId: result.toolCalls.find((call) => call.toolName === "askClarification")?.toolCallId ?? null,
          revisionMessageId: input.revisionMessageId,
        },
      });

      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    if (result.parsedResult.kind !== "plan_markdown") {
      const failureReason = resultFailureReason(result.parsedResult);
      const failedStep = await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: planStep.id,
        status: "failed",
        stageState: null,
        failureReason,
        failureMetadata: {
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
        completedAt: new Date(),
      });
      await this.failWorkflow({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        failureReason,
        failedStep: toStepDto(failedStep),
        retryable: true,
      });
      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: planStep.id,
      status: "awaiting_confirmation",
      stageState: "awaiting_plan_confirmation",
      metadata: {
        ...(toJsonObject(planStep.metadata)),
        agentRunId: runId,
        parsedResultKind: result.parsedResult.kind,
      },
    });

    const planArtifact = await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      sessionId: input.sessionId,
      kind: "plan_markdown",
      version: nextVersion,
      contentText: result.parsedResult.markdown,
      createdBy: "agent",
      metadata: {
        agentRunId: runId,
        previousPlanArtifactId: latestPlan?.id ?? null,
        previousCandidateArtifactId: latestCandidate?.id ?? null,
        revisionMessageId: input.revisionMessageId,
      },
    });

    const latestDecision = await workflowRepository.findLatestArtifact(input.workflowId, "decision_form");
    await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      sessionId: input.sessionId,
      kind: "decision_form",
      version: (latestDecision?.version ?? 0) + 1,
      contentJson: {
        ...result.parsedResult.decisionForm,
        targetArtifactId: planArtifact.id,
      } as unknown as Prisma.InputJsonValue,
      createdBy: "agent",
      metadata: {
        source: "askUserDecision",
        agentRunId: runId,
        toolCallId: result.toolCalls.find((call) => call.toolName === "askUserDecision")?.toolCallId ?? null,
        revisionMessageId: input.revisionMessageId,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  async requestPlanRevision(input: RequestPlanRevisionInput) {
    const latestPlanStep = await workflowRepository.findLatestStep(input.workflowId, "plan");
    if (
      !latestPlanStep ||
      latestPlanStep.status !== "awaiting_confirmation" ||
      latestPlanStep.stageState !== "awaiting_plan_confirmation"
    ) {
      throw conflict("当前 workflow 没有可修改的待确认 plan", "PLAN_REVISION_NOT_AVAILABLE", {
        workflowId: input.workflowId,
      });
    }

    const latestPlan = await workflowRepository.findLatestArtifact(input.workflowId, "plan_markdown");
    const nextVersion = (latestPlan?.version ?? 0) + 1;
    const latestStep = await workflowRepository.findLatestStep(input.workflowId);
    const nextSequence = (latestStep?.sequence ?? latestPlanStep.sequence) + 1;

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: latestPlanStep.id,
      status: "skipped",
      stageState: null,
      completedAt: new Date(),
      metadata: {
        ...(toJsonObject(latestPlanStep.metadata)),
        supersededByRevisionMessageId: input.revisionMessageId,
        revisionText: input.revisionText,
      },
    });

    const planStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "plan",
      sequence: nextSequence,
      status: "running",
      stageState: null,
      maxAttempts: 1,
      metadata: {
        gate: "plan",
        revisionMessageId: input.revisionMessageId,
        previousPlanArtifactId: latestPlan?.id ?? null,
        planVersion: nextVersion,
      },
    });

    const { runId, result } = await runWorkflowTask({
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      task: "revise_plan",
      gate: "plan",
      userMessage: latestPlan?.contentText ?? input.revisionText,
      previousPlanMarkdown: latestPlan?.contentText ?? null,
      revisionText: input.revisionText,
      workflowContext: {
        revisionMessageId: input.revisionMessageId,
        previousPlanArtifactId: latestPlan?.id ?? null,
        planVersion: nextVersion,
      },
    });

    if (result.parsedResult.kind === "clarification_request") {
      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: planStep.id,
        status: "awaiting_confirmation",
        stageState: "awaiting_clarification",
        metadata: {
          ...(toJsonObject(planStep.metadata)),
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
      });

      await this.createArtifact({
        workflowId: input.workflowId,
        workflowStepId: planStep.id,
        sessionId: input.sessionId,
        kind: "clarification_form",
        version: nextVersion,
        contentJson: {
          ...result.parsedResult.form,
          additionalInstructions: {
            id: "additional_instructions",
            type: "textarea",
            label: "其他自然语言补充",
            required: false,
          },
        } as unknown as Prisma.InputJsonValue,
        createdBy: "agent",
        metadata: {
          agentRunId: runId,
          source: "askClarification",
          toolCallId: result.toolCalls.find((call) => call.toolName === "askClarification")?.toolCallId ?? null,
          revisionMessageId: input.revisionMessageId,
        },
      });

      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    if (result.parsedResult.kind !== "plan_markdown") {
      const failureReason = resultFailureReason(result.parsedResult);
      const failedStep = await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: planStep.id,
        status: "failed",
        stageState: null,
        failureReason,
        failureMetadata: {
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
        completedAt: new Date(),
        metadata: {
          ...(toJsonObject(planStep.metadata)),
          agentRunId: runId,
        },
      });
      await this.failWorkflow({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        failureReason,
        failedStep: toStepDto(failedStep),
        retryable: true,
      });
      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: planStep.id,
      status: "awaiting_confirmation",
      stageState: "awaiting_plan_confirmation",
      metadata: {
        ...(toJsonObject(planStep.metadata)),
        agentRunId: runId,
        parsedResultKind: result.parsedResult.kind,
      },
    });

    const planArtifact = await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      sessionId: input.sessionId,
      kind: "plan_markdown",
      version: nextVersion,
      contentText: result.parsedResult.markdown,
      createdBy: "agent",
      metadata: {
        agentRunId: runId,
        previousPlanArtifactId: latestPlan?.id ?? null,
        revisionMessageId: input.revisionMessageId,
      },
    });

    await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: planStep.id,
      sessionId: input.sessionId,
      kind: "decision_form",
      version: nextVersion,
      contentJson: {
        ...result.parsedResult.decisionForm,
        targetArtifactId: planArtifact.id,
      } as unknown as Prisma.InputJsonValue,
      createdBy: "agent",
      metadata: {
        source: "askUserDecision",
        agentRunId: runId,
        toolCallId: result.toolCalls.find((call) => call.toolName === "askUserDecision")?.toolCallId ?? null,
        revisionMessageId: input.revisionMessageId,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },
  /**
   * 记录 Candidate A2UI 生成成功，并推进到 preview 阶段。
   *
   * 注意：这里只保存 candidate artifact，不提交正式 A2UI event 或 surface snapshot。
   *
   * @param input - Candidate 生成成功参数
   * @returns 当前 workflow 详情
   */
  /**
   * 执行已确认 plan 的 Candidate A2UI 生成与校验流程。
   *
   * 注意：generate 阶段只消费 Parsed Agent Result；validate 通过前不会保存 candidate artifact，
   * 也不会提交正式 A2UI event 或 surface snapshot。
   *
   * @param input - generate step、触发消息和可选 plan 内容
   */
  /**
   * 基于已校验 candidate 创建 preview 决策表单。
   *
   * @param input - candidate artifact 与 preview step 序号上下文
   * @returns 创建出的 preview step
   */
  async createPreviewDecision(input: {
    sessionId: string;
    workflowId: string;
    sequence: number;
    candidateArtifact: {
      id: string;
      version: number;
      contentText: string | null;
      contentJson: unknown;
    };
    validationReportArtifactId?: string | null;
    sourceAgentRunId?: string | null;
  }) {
    const previewStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "preview",
      sequence: input.sequence,
      status: "running",
      stageState: null,
      metadata: {
        gate: "preview",
        candidateArtifactId: input.candidateArtifact.id,
        candidateVersion: input.candidateArtifact.version,
        validationReportArtifactId: input.validationReportArtifactId ?? null,
        sourceAgentRunId: input.sourceAgentRunId ?? null,
      },
    });

    const { runId, result } = await runWorkflowTask({
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: previewStep.id,
      task: "preview_decision",
      gate: "preview",
      userMessage: [
        "请为已通过 validate 的 Candidate A2UI 生成用户决策表单。",
        "必须调用 askUserDecision，target 必须是 candidate_a2ui_messages。",
        "",
        JSON.stringify(toJsonObject(input.candidateArtifact.contentJson), null, 2),
      ].join("\n"),
      availableTools: ["askUserDecision"],
      workflowContext: {
        candidateArtifactId: input.candidateArtifact.id,
        candidateVersion: input.candidateArtifact.version,
        validationReportArtifactId: input.validationReportArtifactId ?? null,
      },
    });

    if (
      result.parsedResult.kind !== "decision_form" ||
      result.parsedResult.form.target !== "candidate_a2ui_messages"
    ) {
      const failureReason = result.parsedResult.kind === "decision_form"
        ? "preview decision_form target 必须是 candidate_a2ui_messages"
        : resultFailureReason(result.parsedResult);
      const failedStep = await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: previewStep.id,
        status: "failed",
        stageState: null,
        failureReason,
        failureMetadata: {
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
        completedAt: new Date(),
      });
      await this.failWorkflow({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        failureReason,
        failedStep: toStepDto(failedStep),
        retryable: true,
      });
      return previewStep;
    }

    const latestDecision = await workflowRepository.findLatestArtifact(input.workflowId, "decision_form");
    await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: previewStep.id,
      sessionId: input.sessionId,
      kind: "decision_form",
      version: (latestDecision?.version ?? 0) + 1,
      contentJson: {
        ...result.parsedResult.form,
        targetArtifactId: input.candidateArtifact.id,
      } as unknown as Prisma.InputJsonValue,
      createdBy: "agent",
      metadata: {
        source: "askUserDecision",
        agentRunId: runId,
        toolCallId: result.toolCalls.find((call) => call.toolName === "askUserDecision")?.toolCallId ?? null,
        targetArtifactId: input.candidateArtifact.id,
      },
    });

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: previewStep.id,
      status: "awaiting_confirmation",
      stageState: "awaiting_preview_confirmation",
      metadata: {
        ...(toJsonObject(previewStep.metadata)),
        agentRunId: runId,
        parsedResultKind: result.parsedResult.kind,
      },
    });

    return previewStep;
  },

  async executeGenerateA2UI(input: ExecuteGenerateA2UIInput): Promise<void> {
    setImmediate(() => {
      void (async () => {
        try {
      const latestPlanStep = await workflowRepository.findLatestStep(input.workflowId, "plan");
      const latestPlan = await workflowRepository.findLatestArtifact(input.workflowId, "plan_markdown");
      const generateStep = await workflowRepository.findStepById(input.workflowStepId);

      if (
        !latestPlanStep ||
        latestPlanStep.status !== "completed" ||
        !latestPlan?.contentText ||
        !generateStep ||
        generateStep.workflowId !== input.workflowId ||
        generateStep.type !== "generate_a2ui"
      ) {
        const failedStep = generateStep
          ? await this.updateStep({
            workflowId: input.workflowId,
            sessionId: input.sessionId,
            stepId: generateStep.id,
            status: "failed",
            failureReason: "generate_a2ui 缺少已确认 plan",
            completedAt: new Date(),
          })
          : undefined;
        await this.failWorkflow({
          workflowId: input.workflowId,
          sessionId: input.sessionId,
          failureReason: "generate_a2ui 缺少已确认 plan",
          failedStep: failedStep ? toStepDto(failedStep) : undefined,
          retryable: true,
        });
        return;
      }

      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: generateStep.id,
        status: "running",
        startedAt: new Date(),
        metadata: {
          ...(toJsonObject(generateStep.metadata)),
          gate: "generate_a2ui",
          triggerMessageId: input.triggerMessageId,
          planArtifactId: latestPlan.id,
        },
      });

      const { runId, result } = await runWorkflowTask({
        sessionId: input.sessionId,
        workflowId: input.workflowId,
        workflowStepId: generateStep.id,
        task: "generate_a2ui",
        gate: "generate_a2ui",
        userMessage: [
          "请根据已确认 Markdown plan 生成 Candidate A2UI messages。",
          "只输出 candidate_a2ui_messages Parsed Agent Result；不要提交正式 A2UI event 或 snapshot。",
          "",
          input.planMarkdown ?? latestPlan.contentText,
        ].join("\n"),
        previousPlanMarkdown: input.planMarkdown ?? latestPlan.contentText,
        availableTools: [
          "getSkillContent",
          "getSkillReferenceContent",
          "getCatalogComponentDetails",
        ],
        workflowContext: {
          planStepId: latestPlanStep.id,
          planArtifactId: latestPlan.id,
          triggerMessageId: input.triggerMessageId,
        },
      });

      if (result.parsedResult.kind !== "candidate_a2ui_messages") {
        const failureReason = resultFailureReason(result.parsedResult);
        const failedStep = await this.updateStep({
          workflowId: input.workflowId,
          sessionId: input.sessionId,
          stepId: generateStep.id,
          status: "failed",
          failureReason,
          failureMetadata: {
            agentRunId: runId,
            parsedResultKind: result.parsedResult.kind,
          },
          completedAt: new Date(),
          metadata: {
            ...(toJsonObject(generateStep.metadata)),
            agentRunId: runId,
            planArtifactId: latestPlan.id,
          },
        });
        await this.failWorkflow({
          workflowId: input.workflowId,
          sessionId: input.sessionId,
          failureReason,
          failedStep: toStepDto(failedStep),
          retryable: true,
        });
        return;
      }

      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: generateStep.id,
        status: "completed",
        completedAt: new Date(),
        metadata: {
          ...(toJsonObject(generateStep.metadata)),
          agentRunId: runId,
          planArtifactId: latestPlan.id,
          messageCount: result.parsedResult.messages.length,
        },
      });

      const validateStep = await this.createStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        type: "validate",
        sequence: generateStep.sequence + 1,
        status: "running",
        metadata: {
          gate: "validate",
          agentRunId: runId,
          generateStepId: generateStep.id,
        },
      });

      const validateStartTime = Date.now();
      const validation = validateA2UI({
        messages: result.parsedResult.messages,
        catalogId: config.catalog.id,
      });
      await recordRuntimeToolCall(runId, input.sessionId, {
        toolName: "validateA2UI",
        status: validation.valid ? "succeeded" : "failed",
        attemptIndex: result.attemptCount,
        inputSummary: {
          messageCount: result.parsedResult.messages.length,
          catalogId: config.catalog.id,
          catalogVersion: config.catalog.version,
        },
        output: validation as unknown as JsonObject,
        durationMs: Date.now() - validateStartTime,
        phase: "VALIDATE_DRAFT",
      });

      const latestReport = await workflowRepository.findLatestArtifact(input.workflowId, "validation_report");
      const validationReportArtifact = await this.createArtifact({
        workflowId: input.workflowId,
        workflowStepId: validateStep.id,
        sessionId: input.sessionId,
        kind: "validation_report",
        version: (latestReport?.version ?? 0) + 1,
        contentText: validation.valid ? "Candidate A2UI 校验通过" : "Candidate A2UI 校验失败",
        contentJson: validation as unknown as Prisma.InputJsonValue,
        createdBy: "backend",
        metadata: {
          agentRunId: runId,
          generateStepId: generateStep.id,
        },
      });

      await agentRunRepository.update(runId, {
        status: validation.valid ? "committed" : "failed",
        failureReason: validation.valid ? null : "Candidate A2UI 未通过 validateA2UI 校验",
        validationSummary: validation as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      });

      if (!validation.valid) {
        const failedStep = await this.updateStep({
          workflowId: input.workflowId,
          sessionId: input.sessionId,
          stepId: validateStep.id,
          status: "failed",
          failureReason: "Candidate A2UI 未通过 validateA2UI 校验",
          failureMetadata: validation as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
          metadata: {
            ...(toJsonObject(validateStep.metadata)),
            valid: false,
            errorCount: validation.errors.length,
            warningCount: validation.warnings.length,
          },
        });
        await this.failWorkflow({
          workflowId: input.workflowId,
          sessionId: input.sessionId,
          failureReason: "Candidate A2UI 未通过 validateA2UI 校验",
          failedStep: toStepDto(failedStep),
          retryable: true,
        });
        return;
      }

      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: validateStep.id,
        status: "completed",
        completedAt: new Date(),
        metadata: {
          ...(toJsonObject(validateStep.metadata)),
          valid: true,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length,
        },
      });

      const latestCandidate = await workflowRepository.findLatestArtifact(input.workflowId, "candidate_a2ui_messages");
      const version = (latestCandidate?.version ?? 0) + 1;
      const candidateArtifact = await this.createArtifact({
        workflowId: input.workflowId,
        workflowStepId: validateStep.id,
        sessionId: input.sessionId,
        kind: "candidate_a2ui_messages",
        version,
        contentText: result.parsedResult.assistantMessage ?? "Candidate A2UI messages",
        contentJson: {
          messages: result.parsedResult.messages,
          validation,
        } as unknown as Prisma.InputJsonValue,
        createdBy: "agent",
        metadata: {
          agentRunId: runId,
          validateStepId: validateStep.id,
          planArtifactId: latestPlan.id,
        },
      });

      await this.createPreviewDecision({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        sequence: generateStep.sequence + 2,
        candidateArtifact,
        validationReportArtifactId: validationReportArtifact.id,
        sourceAgentRunId: runId,
      });
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          const generateStep = await workflowRepository.findStepById(input.workflowStepId);
          const failedStep = generateStep
            ? await this.updateStep({
              workflowId: input.workflowId,
              sessionId: input.sessionId,
              stepId: generateStep.id,
              status: "failed",
              failureReason: reason,
              completedAt: new Date(),
            })
            : undefined;
          await this.failWorkflow({
            workflowId: input.workflowId,
            sessionId: input.sessionId,
            failureReason: reason,
            failedStep: failedStep ? toStepDto(failedStep) : undefined,
            retryable: true,
          });
        }
      })();
    });
  },

  async recordCandidateSuccess(input: RecordCandidateSuccessInput) {
    const generateStep = await workflowRepository.findLatestStep(input.workflowId, "generate_a2ui");
    if (!generateStep || generateStep.id !== input.generateStepId) {
      throw conflict("当前 workflow 没有可完成的 Candidate 生成阶段", "CANDIDATE_GENERATION_STEP_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        generateStepId: input.generateStepId,
      });
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: input.generateStepId,
      status: "completed",
      completedAt: new Date(),
      metadata: {
        ...(toJsonObject(generateStep.metadata)),
        agentRunId: input.agentRunId,
        messageCount: input.a2uiMessages.length,
      },
    });

    const validateStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "validate",
      sequence: generateStep.sequence + 1,
      status: "completed",
      metadata: {
        gate: "validate",
        agentRunId: input.agentRunId,
        valid: input.validation.valid,
        errorCount: input.validation.errors.length,
        warningCount: input.validation.warnings.length,
      },
    });

    const latestReport = await workflowRepository.findLatestArtifact(input.workflowId, "validation_report");
    const validationReportArtifact = await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: validateStep.id,
      sessionId: input.sessionId,
      kind: "validation_report",
      version: (latestReport?.version ?? 0) + 1,
      contentText: input.validation.valid ? "Candidate A2UI 校验通过" : "Candidate A2UI 校验失败",
      contentJson: input.validation as unknown as Prisma.InputJsonValue,
      createdBy: "backend",
      metadata: {
        agentRunId: input.agentRunId,
        generateStepId: input.generateStepId,
      },
    });

    if (!input.validation.valid) {
      throw conflict("Candidate A2UI 未通过 validateA2UI 校验，不能保存 candidate artifact", "CANDIDATE_VALIDATION_FAILED", {
        workflowId: input.workflowId,
        generateStepId: input.generateStepId,
      });
    }

    const latestCandidate = await workflowRepository.findLatestArtifact(input.workflowId, "candidate_a2ui_messages");
    const latestPlan = await workflowRepository.findLatestArtifact(input.workflowId, "plan_markdown");
    const version = (latestCandidate?.version ?? 0) + 1;
    const candidateArtifact = await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: validateStep.id,
      sessionId: input.sessionId,
      kind: "candidate_a2ui_messages",
      version,
      contentText: input.assistantMessage,
      contentJson: {
        messages: input.a2uiMessages,
        validation: input.validation,
      } as unknown as Prisma.InputJsonValue,
      createdBy: "agent",
      metadata: {
        agentRunId: input.agentRunId,
        tokenUsage: input.tokenUsage ?? {},
        planArtifactId: latestPlan?.id ?? null,
      },
    });

    await this.createPreviewDecision({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      sequence: generateStep.sequence + 2,
      candidateArtifact,
      validationReportArtifactId: validationReportArtifact.id,
      sourceAgentRunId: input.agentRunId,
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 记录 Candidate A2UI 生成失败，保存 validation report 并标记失败 step。
   *
   * @param input - Candidate 生成失败参数
   * @returns 当前 workflow 详情
   */
  async recordCandidateFailure(input: RecordCandidateFailureInput) {
    const generateStep = await workflowRepository.findLatestStep(input.workflowId, "generate_a2ui");
    if (!generateStep || generateStep.id !== input.generateStepId) {
      throw conflict("当前 workflow 没有可失败记录的 Candidate 生成阶段", "CANDIDATE_GENERATION_STEP_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        generateStepId: input.generateStepId,
      });
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: input.generateStepId,
      status: "failed",
      failureReason: input.failureReason,
      failureMetadata: input.validation as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
      metadata: {
        ...(toJsonObject(generateStep.metadata)),
        agentRunId: input.agentRunId,
      },
    });

    const latestReport = await workflowRepository.findLatestArtifact(input.workflowId, "validation_report");
    await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: input.generateStepId,
      sessionId: input.sessionId,
      kind: "validation_report",
      version: (latestReport?.version ?? 0) + 1,
      contentText: input.failureReason,
      contentJson: {
        failureReason: input.failureReason,
        validation: input.validation ?? {},
      } as unknown as Prisma.InputJsonValue,
      createdBy: "backend",
      metadata: {
        agentRunId: input.agentRunId,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 确认提交当前 preview 中的 Candidate A2UI。
   *
   * 注意：这里仅做 WorkflowStageGate 校验并记录确认 commit step，不执行正式 A2UI 事务提交。
   *
   * @param input - Candidate 提交确认参数
   * @returns 已确认的 candidate artifact 与 commit step
   */
  /**
   * 提交 exact stored candidate artifact，创建正式 A2UI event 与 current snapshot。
   *
   * 注意：本方法不调用 Agent Runtime，不接受 raw Agent Output，只读取已保存且已校验通过的 candidate artifact。
   *
   * @param input - commit step 与 candidate artifact
   */
  async commitExactCandidate(input: {
    sessionId: string;
    workflowId: string;
    commitStepId: string;
    confirmedByMessageId: string;
    candidateArtifact: {
      id: string;
      version: number;
      contentText: string | null;
      contentJson: unknown;
      metadata: unknown;
    };
  }): Promise<void> {
    // 最终 freshness guard：提交前再次确认 candidate 属于最新确认的 plan
    const latestPlan = await workflowRepository.findLatestArtifact(input.workflowId, "plan_markdown");
    if (!isCandidateFresh(input.candidateArtifact, latestPlan)) {
      throw conflict("Candidate 已失效，不属于最新确认的 plan", "CANDIDATE_STALE", {
        workflowId: input.workflowId,
        candidateArtifactId: input.candidateArtifact.id,
        latestPlanArtifactId: latestPlan?.id ?? null,
      });
    }

    const content = toJsonObject(input.candidateArtifact.contentJson);
    const validation = toJsonObject(content["validation"]);
    const messages = content["messages"];
    if (validation["valid"] !== true || !Array.isArray(messages)) {
      throw conflict("Candidate artifact 缺少通过校验的 A2UI messages", "CANDIDATE_NOT_VALIDATED", {
        workflowId: input.workflowId,
        candidateArtifactId: input.candidateArtifact.id,
      });
    }

    const a2uiMessages = messages as unknown as A2UIServerMessage[];
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const assistantMessage = await tx.message.create({
        data: {
          sessionId: input.sessionId,
          workflowId: input.workflowId,
          workflowStepId: input.commitStepId,
          role: "assistant",
          kind: "chat",
          content: input.candidateArtifact.contentText ?? "已提交 Candidate A2UI。",
          attachments: [],
          a2uiEventIds: [],
          metadata: {
            candidateArtifactId: input.candidateArtifact.id,
            candidateVersion: input.candidateArtifact.version,
          },
        },
      });

      const sequence = await a2uiEventRepository.getNextSequence(input.sessionId, tx);
      const a2uiEvent = await tx.a2UIEvent.create({
        data: {
          sessionId: input.sessionId,
          messageId: assistantMessage.id,
          sequence,
          status: "committed",
          catalogId: config.catalog.id,
          catalogVersion: config.catalog.version,
          rendererVersion: config.catalog.rendererVersion,
          surfaceIds: extractSurfaceIds(a2uiMessages),
          messages: a2uiMessages as unknown as Prisma.InputJsonValue,
          validationResult: validation as unknown as Prisma.InputJsonValue,
          metadata: {
            workflowId: input.workflowId,
            workflowStepId: input.commitStepId,
            candidateArtifactId: input.candidateArtifact.id,
          },
        },
      });

      await tx.message.update({
        where: { id: assistantMessage.id },
        data: { a2uiEventIds: [a2uiEvent.id] },
      });

      const snapshotData = await snapshotService.computeFromEvents(input.sessionId, tx);
      const { surfaceCount, componentCount } = snapshotService.getCounts(snapshotData);
      await surfaceSnapshotRepository.unsetCurrent(input.sessionId, tx);

      const snapshot = await tx.surfaceSnapshot.create({
        data: {
          sessionId: input.sessionId,
          a2uiEventId: a2uiEvent.id,
          sequence,
          isCurrent: true,
          catalogId: config.catalog.id,
          catalogVersion: config.catalog.version,
          rendererVersion: config.catalog.rendererVersion,
          surfaceCount,
          componentCount,
          snapshot: snapshotData as unknown as Prisma.InputJsonValue,
          summary: assistantMessage.content,
          metadata: {
            workflowId: input.workflowId,
            workflowStepId: input.commitStepId,
            candidateArtifactId: input.candidateArtifact.id,
          },
        },
      });

      await tx.session.update({
        where: { id: input.sessionId },
        data: {
          currentSnapshotId: snapshot.id,
        },
      });

      await tx.workflowStep.update({
        where: { id: input.commitStepId },
        data: {
          status: "completed",
          completedAt: new Date(),
          metadata: {
            gate: "commit",
            committed: true,
            confirmedByMessageId: input.confirmedByMessageId,
            candidateArtifactId: input.candidateArtifact.id,
            candidateVersion: input.candidateArtifact.version,
            a2uiEventId: a2uiEvent.id,
            snapshotId: snapshot.id,
            assistantMessageId: assistantMessage.id,
          },
        },
      });

      const completedWorkflow = await tx.agentWorkflow.update({
        where: { id: input.workflowId },
        data: {
          status: "completed",
          currentStepType: "commit",
          completedReason: "committed",
          completedAt: new Date(),
          metadata: {
            committed: true,
            confirmedByMessageId: input.confirmedByMessageId,
            candidateArtifactId: input.candidateArtifact.id,
            candidateVersion: input.candidateArtifact.version,
            a2uiEventId: a2uiEvent.id,
            snapshotId: snapshot.id,
            assistantMessageId: assistantMessage.id,
          },
        },
      });

      streamService.send(input.sessionId, {
        event: "assistant_message",
        data: {
          sessionId: input.sessionId,
          message: {
            id: assistantMessage.id,
            sessionId: assistantMessage.sessionId,
            agentRunId: assistantMessage.agentRunId,
            workflowId: assistantMessage.workflowId,
            workflowStepId: assistantMessage.workflowStepId,
            role: assistantMessage.role as MessageDto["role"],
            kind: assistantMessage.kind as MessageDto["kind"],
            content: assistantMessage.content,
            attachments: assistantMessage.attachments as MessageDto["attachments"],
            a2uiEventIds: [a2uiEvent.id],
            metadata: assistantMessage.metadata as MessageDto["metadata"],
            createdAt: assistantMessage.createdAt.toISOString(),
          },
        },
      });
      streamService.send(input.sessionId, {
        event: "a2ui_messages",
        data: {
          sessionId: input.sessionId,
          a2uiEvent: {
            id: a2uiEvent.id,
            sessionId: a2uiEvent.sessionId,
            agentRunId: a2uiEvent.agentRunId,
            messageId: a2uiEvent.messageId,
            sequence: a2uiEvent.sequence,
            status: a2uiEvent.status as A2UIEventDto["status"],
            catalogId: a2uiEvent.catalogId,
            catalogVersion: a2uiEvent.catalogVersion,
            rendererVersion: a2uiEvent.rendererVersion,
            surfaceIds: a2uiEvent.surfaceIds,
            messages: a2uiEvent.messages as unknown as A2UIEventDto["messages"],
            validationResult: a2uiEvent.validationResult as A2UIEventDto["validationResult"],
            createdAt: a2uiEvent.createdAt.toISOString(),
          },
        },
      });
      streamService.send(input.sessionId, {
        event: "surface_snapshot",
        data: {
          sessionId: input.sessionId,
          snapshot: {
            id: snapshot.id,
            sessionId: snapshot.sessionId,
            a2uiEventId: snapshot.a2uiEventId,
            agentRunId: snapshot.agentRunId,
            sequence: snapshot.sequence,
            isCurrent: snapshot.isCurrent,
            catalogId: snapshot.catalogId,
            catalogVersion: snapshot.catalogVersion,
            rendererVersion: snapshot.rendererVersion,
            surfaceCount: snapshot.surfaceCount,
            componentCount: snapshot.componentCount,
            snapshot: snapshot.snapshot as unknown as SurfaceSnapshotDto["snapshot"],
            summary: snapshot.summary,
            createdAt: snapshot.createdAt.toISOString(),
          },
        },
      });
      streamService.send(input.sessionId, {
        event: "workflow_completed",
        data: { sessionId: input.sessionId, workflow: toWorkflowDto(completedWorkflow) },
      });
    });
  },

  async confirmCandidateCommit(input: ConfirmCandidateCommitInput) {
    const latestPreviewStep = await workflowRepository.findLatestStep(input.workflowId, "preview");
    if (!latestPreviewStep || latestPreviewStep.status !== "awaiting_confirmation") {
      throw conflict("当前 workflow 没有等待确认提交的 preview", "PREVIEW_CONFIRMATION_NOT_AVAILABLE", {
        workflowId: input.workflowId,
      });
    }

    const previewMetadata = toJsonObject(latestPreviewStep.metadata);
    const candidateArtifact = await workflowRepository.findLatestArtifact(input.workflowId, "candidate_a2ui_messages");
    if (!candidateArtifact || (input.candidateArtifactId && candidateArtifact.id !== input.candidateArtifactId)) {
      throw conflict("当前 workflow 没有可提交的 Candidate A2UI", "CANDIDATE_ARTIFACT_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        candidateArtifactId: input.candidateArtifactId ?? previewMetadata["candidateArtifactId"] ?? null,
      });
    }

    // 早期 freshness guard：candidate 必须属于最新确认的 plan 且未被失效
    const latestPlan = await workflowRepository.findLatestArtifact(input.workflowId, "plan_markdown");
    if (!isCandidateFresh(candidateArtifact, latestPlan)) {
      throw conflict("Candidate 已失效，不属于最新确认的 plan", "CANDIDATE_STALE", {
        workflowId: input.workflowId,
        candidateArtifactId: candidateArtifact.id,
        latestPlanArtifactId: latestPlan?.id ?? null,
      });
    }

    const content = toJsonObject(candidateArtifact.contentJson);
    const validation = toJsonObject(content["validation"]);
    if (validation["valid"] !== true || !Array.isArray(content["messages"])) {
      throw conflict("Candidate A2UI 未通过校验，不能提交", "CANDIDATE_NOT_VALIDATED", {
        workflowId: input.workflowId,
        candidateArtifactId: candidateArtifact.id,
      });
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: latestPreviewStep.id,
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedByMessageId: input.confirmedByMessageId,
      completedAt: new Date(),
      metadata: {
        ...previewMetadata,
        confirmedByMessageId: input.confirmedByMessageId,
      },
    });

    const commitStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "commit",
      sequence: latestPreviewStep.sequence + 1,
      status: "running",
      maxAttempts: 1,
      metadata: {
        gate: "commit",
        candidateArtifactId: candidateArtifact.id,
        candidateVersion: candidateArtifact.version,
        confirmedByMessageId: input.confirmedByMessageId,
      },
    });

    return { candidateArtifact, commitStep };
  },
};
