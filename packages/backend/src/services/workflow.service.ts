/**
 * Agent Workflow 鎸佷箙鍖栫紪鎺掓湇鍔°€? *
 * 鑱岃矗锛? * - 鍒涘缓銆佹帹杩涖€佸け璐ャ€佸彇娑堝拰瀹屾垚 session 涓嬬殑 workflow銆? * - 鍒涘缓骞舵洿鏂?workflow step锛屼繚瀛?workflow artifact銆? * - 鍦?service 灞傚畧浣忓悓涓€ session 鍙厑璁镐竴涓繘琛屼腑 workflow 鐨勭害鏉熴€? * - 鎺ㄩ€?workflow 绾?SSE 浜嬩欢锛屼緵鍓嶇鎭㈠ timeline銆? *
 * 寮曠敤锛? * - workflow.repository
 * - stream.service
 * - utils/errors
 * 琚紩鐢細
 * - 鍚庣画 WorkflowService API 涓?sendMessage 缂栨帓鍏ュ彛銆? * 娉ㄦ剰锛? * - 鏈湇鍔℃殏涓嶈皟鐢?Agent Runtime锛屼篃涓嶆彁浜?A2UI event/snapshot銆? */
import type {
  A2UIServerMessage,
  AgentRunInput,
  AgentWorkflowTaskInput,
  AgentWorkflowTaskResult,
  AgentWorkflowDto,
  IAgentRuntime,
  JsonObject,
  ParsedAgentResult,
  ToolCallRecord,
  ValidateA2UIResult,
  WorkflowArtifactDto,
  WorkflowArtifactKind,
  WorkflowStepDto,
  WorkflowStepStatus,
  WorkflowStepType,
} from "@a2ui-platform/shared";
import { createAgentRuntime } from "@a2ui-platform/agent";
import type { Prisma } from "@prisma/client";
import { config } from "../config.js";
import { agentRunRepository } from "../repositories/agent-run.repository.js";
import { fileRepository } from "../repositories/file.repository.js";
import { messageRepository } from "../repositories/message.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { surfaceSnapshotRepository } from "../repositories/surface-snapshot.repository.js";
import { toolCallRepository } from "../repositories/tool-call.repository.js";
import { workflowRepository } from "../repositories/workflow.repository.js";
import { conflict } from "../utils/errors.js";
import { skillResolverService } from "./skill-resolver.service.js";
import { streamService } from "./stream.service.js";

/** 鍒涘缓 Agent Workflow 鐨勮緭鍏ュ弬鏁般€?*/
export type CreateWorkflowInput = {
  sessionId: string;
  title?: string;
  intent?: string;
  metadata?: Prisma.InputJsonValue;
};

export type CreateWorkflowStepInput = {
  workflowId: string;
  sessionId: string;
  type: WorkflowStepType;
  sequence: number;
  status?: WorkflowStepStatus;
  maxAttempts?: number;
  metadata?: Prisma.InputJsonValue;
};

export type UpdateWorkflowStepInput = {
  stepId: string;
  sessionId: string;
  workflowId: string;
  status?: WorkflowStepStatus;
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

export type ConfirmPlanInput = {
  sessionId: string;
  workflowId: string;
  confirmedByMessageId: string;
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
 * 灏嗘湭鐭ュ€煎畨鍏ㄨ浆鎹负 JsonObject銆? *
 * 浠呭綋鍊间负闈炴暟缁勭殑鏅€氬璞℃椂杩斿洖鍘熷€硷紝鍚﹀垯杩斿洖绌哄璞°€? * 鐢ㄤ簬瀹夊叏灞曞紑 Prisma 杩斿洖鐨?Json 瀛楁銆? */
function toJsonObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
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
    throw conflict("Session 涓嶅瓨鍦紝鏃犳硶鍒涘缓 workflow AgentRun", "SESSION_NOT_FOUND", {
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
  userMessage: string;
  clarificationAnswers?: JsonObject;
  previousPlanMarkdown?: string | null;
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
  const runtime = buildAgentRuntime();
  const toolCallTasks: Array<Promise<void>> = [];
  const result = await runtime.runWorkflowTask(
    {
      ...agentInput,
      workflowId: input.workflowId,
      workflowStepId: input.workflowStepId,
      gate: input.gate,
      task: input.task,
      clarificationAnswers: input.clarificationAnswers,
      previousPlanMarkdown: input.previousPlanMarkdown,
      revisionText: input.revisionText,
      workflowContext: input.workflowContext,
    },
    (record) => {
      toolCallTasks.push(recordRuntimeToolCall(run.id, input.sessionId, record));
    },
  );
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
    },
    completedAt: new Date(),
  });

  return { runId: run.id, result };
}

function getPlanValidationFailure(markdown: string): string | null {
  const required = ["页面目标", "布局结构", "组件清单", "Data Model", "交互行为", "假设", "风险"];
  const missing = required.filter((heading) => {
    const pattern = new RegExp(`^#{1,6}\\s+${heading}\\s*$`, "im");
    return !pattern.test(markdown);
  });
  return missing.length > 0 ? `Markdown plan 缺少必要标题：${missing.join("、")}` : null;
}

function resultFailureReason(result: ParsedAgentResult): string {
  return result.kind === "failure" ? result.reason : `当前 gate 不接受 Agent result: ${result.kind}`;
}

/**
 * 灏?Prisma AgentWorkflow 瀹炰綋杞崲涓?AgentWorkflowDto銆? *
 * Date 瀛楁杞负 ISO 瀛楃涓诧紝metadata 閫氳繃 toJsonObject 瀹夊叏杞崲銆? */
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
 * 灏?Prisma WorkflowStep 瀹炰綋杞崲涓?WorkflowStepDto銆? */
function toStepDto(step: {
  id: string;
  workflowId: string;
  sessionId: string;
  type: string;
  status: string;
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
 * 灏?Prisma WorkflowArtifact 瀹炰綋杞崲涓?WorkflowArtifactDto銆? */
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
   * 鍒涘缓 session 涓嬬殑鏂?Agent Workflow銆?   *
   * @param input - 鍒涘缓鍙傛暟锛屽寘鍚?sessionId銆佸彲閫夋爣棰樺拰鎰忓浘
   * @returns 鏂板缓鐨?workflow 璁板綍
   */
  async createWorkflow(input: CreateWorkflowInput) {
    const activeWorkflow = await workflowRepository.findActiveBySessionId(input.sessionId);
    if (activeWorkflow) {
      throw conflict("褰撳墠浼氳瘽宸叉湁杩涜涓殑 Agent Workflow", "ACTIVE_WORKFLOW_EXISTS", {
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
   * 鍒涘缓 workflow step銆?   *
   * @param input - step 鍒涘缓鍙傛暟
   * @returns 鏂板缓鐨?workflow step
   */
  async createStep(input: CreateWorkflowStepInput) {
    const step = await workflowRepository.createStep({
      workflow: { connect: { id: input.workflowId } },
      sessionId: input.sessionId,
      type: input.type,
      sequence: input.sequence,
      status: input.status ?? "pending",
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
   * 鏇存柊 workflow step 骞舵帹閫?timeline 浜嬩欢銆?   *
   * @param input - step 鏇存柊鍙傛暟
   * @returns 鏇存柊鍚庣殑 workflow step
   */
  async updateStep(input: UpdateWorkflowStepInput) {
    const step = await workflowRepository.updateStep(input.stepId, {
      status: input.status,
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
   * 鍒涘缓 workflow artifact銆?   *
   * @param input - artifact 鍒涘缓鍙傛暟
   * @returns 鏂板缓鐨?workflow artifact
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
   * 瀹屾垚 workflow銆?   *
   * @param input - 瀹屾垚鍙傛暟
   * @returns 鏇存柊鍚庣殑 workflow
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
   * 鏍囪 workflow 澶辫触銆?   *
   * @param input - 澶辫触鍙傛暟
   * @returns 鏇存柊鍚庣殑 workflow
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
   * 鍙栨秷 workflow銆?   *
   * @param workflowId - Workflow ID
   * @param sessionId - Session ID
   * @returns 鏇存柊鍚庣殑 workflow
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
   * 鏌ヨ session 鐨?workflow 鍘嗗彶銆?   *
   * @param sessionId - 浼氳瘽 ID
   * @returns workflow 鍘嗗彶锛屽寘鍚?steps 涓?artifacts
   */
  getSessionWorkflows(sessionId: string) {
    return workflowRepository.findWorkflowsBySessionId(sessionId)
      .then((workflows) => workflows.map(toWorkflowDetailDto));
  },

  /**
   * 鏌ヨ鍗曚釜 workflow 璇︽儏銆?   *
   * @param workflowId - Workflow ID
   * @returns workflow 璇︽儏锛屼笉瀛樺湪鏃惰繑鍥?null
   */
  async getWorkflowById(workflowId: string) {
    const workflow = await workflowRepository.findWorkflowById(workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 鏌ヨ session 褰撳墠杩涜涓殑 workflow銆?   *
   * @param sessionId - 浼氳瘽 ID
   * @returns 褰撳墠 active workflow锛屼笉瀛樺湪鏃惰繑鍥?null
   */
  getActiveWorkflow(sessionId: string) {
    return workflowRepository.findActiveBySessionId(sessionId);
  },

  /**
   * 鍚姩绗竴娈电敤鎴峰彲瑙佽鍒掓祦绋嬨€?   *
   * @param input - 鍖呭惈 session銆亀orkflow 鍜岀敤鎴峰師濮嬮渶姹?   * @returns 褰撳墠 workflow 璇︽儏
   */
  async startInitialPlanning(input: StartPlanningInput) {
    const now = new Date();
    const understandStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "understand",
      sequence: 1,
      status: "completed",
      maxAttempts: 1,
      metadata: { userMessage: input.userMessage },
    });

    const proposeStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "propose",
      sequence: 2,
      status: "running",
      maxAttempts: 1,
      metadata: {
        gate: "propose",
        allowedOutput: ["clarification_form", "plan_markdown"],
        previousStepId: understandStep.id,
      },
    });

    const { runId, result } = await runWorkflowTask({
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: proposeStep.id,
      task: "initial_planning",
      gate: "propose",
      userMessage: input.userMessage,
      workflowContext: {
        understandStepId: understandStep.id,
      },
    });

    if (result.parsedResult.kind === "clarification_request") {
      await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: proposeStep.id,
        status: "completed",
        completedAt: now,
        metadata: {
          ...(toJsonObject(proposeStep.metadata)),
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
      });

      const clarifyStep = await this.createStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        type: "clarify",
        sequence: 3,
        status: "awaiting_confirmation",
        maxAttempts: 1,
        metadata: {
          gate: "clarify",
          allowedOutput: "clarification_form",
          previousStepId: understandStep.id,
          agentRunId: runId,
        },
      });

      await this.createArtifact({
        workflowId: input.workflowId,
        workflowStepId: clarifyStep.id,
        sessionId: input.sessionId,
        kind: "clarification_form",
        version: 1,
        contentJson: {
          ...result.parsedResult.form,
          additionalInstructions: {
            id: "additional_instructions",
            type: "textarea",
            label: "鍏朵粬鑷劧璇█琛ュ厖",
            required: false,
          },
        } as unknown as Prisma.InputJsonValue,
        createdBy: "agent",
        metadata: {
          agentRunId: runId,
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
        stepId: proposeStep.id,
        status: "failed",
        failureReason,
        failureMetadata: {
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
        completedAt: now,
        metadata: {
          ...(toJsonObject(proposeStep.metadata)),
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

    const planFailure = getPlanValidationFailure(result.parsedResult.markdown);
    if (planFailure) {
      const failedStep = await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: proposeStep.id,
        status: "failed",
        failureReason: planFailure,
        failureMetadata: {
          agentRunId: runId,
          validation: "markdown_plan_required_headings",
        },
        completedAt: now,
        metadata: {
          ...(toJsonObject(proposeStep.metadata)),
          agentRunId: runId,
        },
      });
      await this.failWorkflow({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        failureReason: planFailure,
        failedStep: toStepDto(failedStep),
        retryable: true,
      });
      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: proposeStep.id,
      status: "completed",
      completedAt: now,
      metadata: {
        ...(toJsonObject(proposeStep.metadata)),
        agentRunId: runId,
        parsedResultKind: result.parsedResult.kind,
      },
    });

    await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: proposeStep.id,
      sessionId: input.sessionId,
      kind: "plan_markdown",
      version: 1,
      contentText: result.parsedResult.markdown,
      createdBy: "agent",
      metadata: {
        agentRunId: runId,
      },
    });

    await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "confirm_plan",
      sequence: 3,
      status: "awaiting_confirmation",
      maxAttempts: 1,
      metadata: {
        gate: "confirm_plan",
        allowedActions: ["confirm_plan", "request_revision"],
        enteredAt: now.toISOString(),
        planVersion: 1,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 鍦?confirm_plan 闃舵纭褰撳墠 plan銆?   *
   * @param input - 纭鍙傛暟
   * @returns 褰撳墠 workflow 璇︽儏
   */
  async confirmPlan(input: ConfirmPlanInput) {
    const latestConfirmStep = await workflowRepository.findLatestStep(input.workflowId, "confirm_plan");
    if (!latestConfirmStep || latestConfirmStep.status !== "awaiting_confirmation") {
      throw conflict("褰撳墠 workflow 娌℃湁绛夊緟纭鐨?plan", "PLAN_CONFIRMATION_NOT_AVAILABLE", {
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
   * 鍦ㄧ‘璁ら樁娈电敤鑷劧璇█璇锋眰淇敼 plan銆?   *
   * @param input - 淇敼璇锋眰鍙傛暟
   * @returns 褰撳墠 workflow 璇︽儏
   */
  async requestPlanRevision(input: RequestPlanRevisionInput) {
    const latestConfirmStep = await workflowRepository.findLatestStep(input.workflowId, "confirm_plan");
    if (!latestConfirmStep || latestConfirmStep.status !== "awaiting_confirmation") {
      throw conflict("当前 workflow 没有可修改的待确认 plan", "PLAN_REVISION_NOT_AVAILABLE", {
        workflowId: input.workflowId,
      });
    }

    const latestPlan = await workflowRepository.findLatestArtifact(input.workflowId, "plan_markdown");
    const nextVersion = (latestPlan?.version ?? 0) + 1;
    const latestStep = await workflowRepository.findLatestStep(input.workflowId);
    const nextSequence = (latestStep?.sequence ?? latestConfirmStep.sequence) + 1;

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: latestConfirmStep.id,
      status: "skipped",
      completedAt: new Date(),
      metadata: {
        ...(toJsonObject(latestConfirmStep.metadata)),
        supersededByRevisionMessageId: input.revisionMessageId,
        revisionText: input.revisionText,
      },
    });

    const proposeStep = await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "propose",
      sequence: nextSequence,
      status: "running",
      maxAttempts: 1,
      metadata: {
        gate: "propose",
        revisionMessageId: input.revisionMessageId,
        previousPlanArtifactId: latestPlan?.id ?? null,
        planVersion: nextVersion,
      },
    });

    const { runId, result } = await runWorkflowTask({
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: proposeStep.id,
      task: "revise_plan",
      gate: "propose",
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
        stepId: proposeStep.id,
        status: "completed",
        completedAt: new Date(),
        metadata: {
          ...(toJsonObject(proposeStep.metadata)),
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
      });

      const clarifyStep = await this.createStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        type: "clarify",
        sequence: nextSequence + 1,
        status: "awaiting_confirmation",
        maxAttempts: 1,
        metadata: {
          gate: "clarify",
          revisionMessageId: input.revisionMessageId,
          planVersion: nextVersion,
          agentRunId: runId,
        },
      });

      await this.createArtifact({
        workflowId: input.workflowId,
        workflowStepId: clarifyStep.id,
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
        stepId: proposeStep.id,
        status: "failed",
        failureReason,
        failureMetadata: {
          agentRunId: runId,
          parsedResultKind: result.parsedResult.kind,
        },
        completedAt: new Date(),
        metadata: {
          ...(toJsonObject(proposeStep.metadata)),
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

    const planFailure = getPlanValidationFailure(result.parsedResult.markdown);
    if (planFailure) {
      const failedStep = await this.updateStep({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        stepId: proposeStep.id,
        status: "failed",
        failureReason: planFailure,
        failureMetadata: {
          agentRunId: runId,
          validation: "markdown_plan_required_headings",
        },
        completedAt: new Date(),
        metadata: {
          ...(toJsonObject(proposeStep.metadata)),
          agentRunId: runId,
        },
      });
      await this.failWorkflow({
        workflowId: input.workflowId,
        sessionId: input.sessionId,
        failureReason: planFailure,
        failedStep: toStepDto(failedStep),
        retryable: true,
      });
      const workflow = await workflowRepository.findWorkflowById(input.workflowId);
      return workflow ? toWorkflowDetailDto(workflow) : null;
    }

    await this.updateStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      stepId: proposeStep.id,
      status: "completed",
      completedAt: new Date(),
      metadata: {
        ...(toJsonObject(proposeStep.metadata)),
        agentRunId: runId,
        parsedResultKind: result.parsedResult.kind,
      },
    });

    await this.createArtifact({
      workflowId: input.workflowId,
      workflowStepId: proposeStep.id,
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

    await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "confirm_plan",
      sequence: nextSequence + 1,
      status: "awaiting_confirmation",
      maxAttempts: 1,
      metadata: {
        gate: "confirm_plan",
        allowedActions: ["confirm_plan", "request_revision"],
        revisionMessageId: input.revisionMessageId,
        planVersion: nextVersion,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },
  /**
   * 璁板綍 Candidate A2UI 鐢熸垚鎴愬姛锛屽苟鎺ㄨ繘鍒?preview 闃舵銆?   *
   * 娉ㄦ剰锛氳繖閲屽彧淇濆瓨 candidate artifact锛屼笉鎻愪氦姝ｅ紡 A2UI event 鎴?surface snapshot銆?   *
   * @param input - Candidate 鐢熸垚鎴愬姛鍙傛暟
   * @returns 褰撳墠 workflow 璇︽儏
   */
  async recordCandidateSuccess(input: RecordCandidateSuccessInput) {
    const generateStep = await workflowRepository.findLatestStep(input.workflowId, "generate_a2ui");
    if (!generateStep || generateStep.id !== input.generateStepId) {
      throw conflict("褰撳墠 workflow 娌℃湁鍙畬鎴愮殑 Candidate 鐢熸垚闃舵", "CANDIDATE_GENERATION_STEP_NOT_AVAILABLE", {
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

    const latestCandidate = await workflowRepository.findLatestArtifact(input.workflowId, "candidate_a2ui_messages");
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
      },
    });

    await this.createStep({
      workflowId: input.workflowId,
      sessionId: input.sessionId,
      type: "preview",
      sequence: generateStep.sequence + 2,
      status: "awaiting_confirmation",
      metadata: {
        gate: "preview",
        allowedActions: ["confirm_commit", "request_revision"],
        candidateArtifactId: candidateArtifact.id,
        candidateVersion: version,
      },
    });

    const workflow = await workflowRepository.findWorkflowById(input.workflowId);
    return workflow ? toWorkflowDetailDto(workflow) : null;
  },

  /**
   * 璁板綍 Candidate A2UI 鐢熸垚澶辫触锛屼繚瀛?validation report 骞舵爣璁板け璐?step銆?   *
   * @param input - Candidate 鐢熸垚澶辫触鍙傛暟
   * @returns 褰撳墠 workflow 璇︽儏
   */
  async recordCandidateFailure(input: RecordCandidateFailureInput) {
    const generateStep = await workflowRepository.findLatestStep(input.workflowId, "generate_a2ui");
    if (!generateStep || generateStep.id !== input.generateStepId) {
      throw conflict("褰撳墠 workflow 娌℃湁鍙け璐ヨ褰曠殑 Candidate 鐢熸垚闃舵", "CANDIDATE_GENERATION_STEP_NOT_AVAILABLE", {
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
   * 纭鎻愪氦褰撳墠 preview 涓殑 Candidate A2UI銆?   *
   * 娉ㄦ剰锛氳繖閲屼粎鍋?WorkflowStageGate 鏍￠獙骞惰褰曠‘璁?commit step锛屼笉鎵ц姝ｅ紡 A2UI 浜嬪姟鎻愪氦銆?   *
   * @param input - Candidate 鎻愪氦纭鍙傛暟
   * @returns 宸茬‘璁ょ殑 candidate artifact 涓?commit step
   */
  async confirmCandidateCommit(input: ConfirmCandidateCommitInput) {
    const latestPreviewStep = await workflowRepository.findLatestStep(input.workflowId, "preview");
    if (!latestPreviewStep || latestPreviewStep.status !== "awaiting_confirmation") {
      throw conflict("褰撳墠 workflow 娌℃湁绛夊緟纭鎻愪氦鐨?preview", "PREVIEW_CONFIRMATION_NOT_AVAILABLE", {
        workflowId: input.workflowId,
      });
    }

    const previewMetadata = toJsonObject(latestPreviewStep.metadata);
    const candidateArtifact = await workflowRepository.findLatestArtifact(input.workflowId, "candidate_a2ui_messages");
    if (!candidateArtifact || (input.candidateArtifactId && candidateArtifact.id !== input.candidateArtifactId)) {
      throw conflict("褰撳墠 workflow 娌℃湁鍙彁浜ょ殑 Candidate A2UI", "CANDIDATE_ARTIFACT_NOT_AVAILABLE", {
        workflowId: input.workflowId,
        candidateArtifactId: input.candidateArtifactId ?? previewMetadata["candidateArtifactId"] ?? null,
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
