import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentRunRepository } from "../../repositories/agent-run.repository.js";
import { messageRepository } from "../../repositories/message.repository.js";
import { sessionRepository } from "../../repositories/session.repository.js";
import { messageService } from "../message.service.js";
import { workflowService } from "../workflow.service.js";

vi.mock("../../repositories/message.repository.js", () => ({
  messageRepository: {
    create: vi.fn(),
    findBySessionId: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("../../repositories/agent-run.repository.js", () => ({
  agentRunRepository: {
    create: vi.fn(),
  },
}));

vi.mock("../../repositories/session.repository.js", () => ({
  sessionRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("../workflow.service.js", () => ({
  workflowService: {
    getActiveWorkflow: vi.fn(),
    createWorkflow: vi.fn(),
    startInitialPlanning: vi.fn(),
    requestPlanRevision: vi.fn(),
  },
}));

const now = new Date("2026-01-01T00:00:00.000Z");

function sessionRecord() {
  return {
    id: "session-a",
    status: "active",
    modelProvider: "openai-compatible",
    modelName: "test-model",
    modelConfig: {},
  };
}

function messageRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "message-a",
    sessionId: "session-a",
    agentRunId: null,
    workflowId: null,
    workflowStepId: null,
    role: "user",
    kind: "chat",
    content: "hello",
    attachments: [],
    a2uiEventIds: [],
    metadata: {},
    createdAt: now,
    ...overrides,
  };
}

function workflowRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "workflow-a",
    status: "active",
    currentStepType: null,
    ...overrides,
  };
}

describe("messageService.createUserMessageAndAgentRun", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes a message to the active workflow without creating an agent run", async () => {
    vi.mocked(sessionRepository.findById).mockResolvedValue(sessionRecord() as never);
    vi.mocked(workflowService.getActiveWorkflow).mockResolvedValue(workflowRecord() as never);
    vi.mocked(messageRepository.create).mockResolvedValue(messageRecord({ workflowId: "workflow-a" }) as never);

    const result = await messageService.createUserMessageAndAgentRun("session-a", "继续修改方案");

    expect(messageRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      workflow: { connect: { id: "workflow-a" } },
      content: "继续修改方案",
    }));
    expect(agentRunRepository.create).not.toHaveBeenCalled();
    expect(workflowService.startInitialPlanning).not.toHaveBeenCalled();
    expect(workflowService.requestPlanRevision).not.toHaveBeenCalled();
    expect(result.agentRun).toBeNull();
    expect(result.workflow).toMatchObject({ id: "workflow-a", status: "active" });
  });

  it("starts a workflow for A2UI generation intent", async () => {
    vi.mocked(sessionRepository.findById).mockResolvedValue(sessionRecord() as never);
    vi.mocked(workflowService.getActiveWorkflow).mockResolvedValue(null);
    vi.mocked(workflowService.createWorkflow).mockResolvedValue(workflowRecord({ id: "workflow-new" }) as never);
    vi.mocked(workflowService.startInitialPlanning).mockResolvedValue(workflowRecord({
      id: "workflow-new",
      currentStepType: "confirm_plan",
    }) as never);
    vi.mocked(messageRepository.create).mockResolvedValue(messageRecord({ workflowId: "workflow-new" }) as never);

    const result = await messageService.createUserMessageAndAgentRun("session-a", "生成一个数据看板", [], {
      intent: "CREATE_UI",
    });

    expect(workflowService.createWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "session-a",
      intent: "CREATE_UI",
    }));
    expect(workflowService.startInitialPlanning).toHaveBeenCalledWith({
      sessionId: "session-a",
      workflowId: "workflow-new",
      userMessage: "生成一个数据看板",
    });
    expect(agentRunRepository.create).not.toHaveBeenCalled();
    expect(result.workflow).toMatchObject({ id: "workflow-new", currentStepType: "confirm_plan" });
  });

  it("treats natural language at confirm_plan as a plan revision", async () => {
    vi.mocked(sessionRepository.findById).mockResolvedValue(sessionRecord() as never);
    vi.mocked(workflowService.getActiveWorkflow).mockResolvedValue(workflowRecord({
      currentStepType: "confirm_plan",
    }) as never);
    vi.mocked(workflowService.requestPlanRevision).mockResolvedValue(workflowRecord({
      currentStepType: "clarify",
    }) as never);
    vi.mocked(messageRepository.create).mockResolvedValue(messageRecord({
      id: "message-revision",
      workflowId: "workflow-a",
    }) as never);

    const result = await messageService.createUserMessageAndAgentRun("session-a", "把筛选条件改成下拉框");

    expect(workflowService.requestPlanRevision).toHaveBeenCalledWith({
      sessionId: "session-a",
      workflowId: "workflow-a",
      revisionMessageId: "message-revision",
      revisionText: "把筛选条件改成下拉框",
    });
    expect(agentRunRepository.create).not.toHaveBeenCalled();
    expect(result.workflow).toMatchObject({ id: "workflow-a", currentStepType: "clarify" });
  });

  it("keeps ordinary messages on the existing lightweight agent run path", async () => {
    vi.mocked(sessionRepository.findById).mockResolvedValue(sessionRecord() as never);
    vi.mocked(workflowService.getActiveWorkflow).mockResolvedValue(null);
    vi.mocked(messageRepository.create).mockResolvedValue(messageRecord({ content: "你好" }) as never);
    vi.mocked(agentRunRepository.create).mockResolvedValue({
      id: "run-a",
      status: "pending",
    } as never);

    const result = await messageService.createUserMessageAndAgentRun("session-a", "你好");

    expect(workflowService.createWorkflow).not.toHaveBeenCalled();
    expect(agentRunRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      triggerMessageId: "message-a",
      status: "pending",
    }));
    expect(result.agentRun).toMatchObject({ id: "run-a", status: "pending" });
    expect(result.workflow).toBeUndefined();
  });
});
