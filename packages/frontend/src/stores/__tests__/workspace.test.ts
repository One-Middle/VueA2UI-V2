import type { AgentWorkflowDetailDto, MessageDto, SessionDetailResponse, SessionDto, SurfaceSnapshotDto } from "@a2ui-platform/shared";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../services/api";
import { connectStream, type StreamHandlers } from "../../services/stream";
import { useRendererStore } from "../renderer";
import { useWorkspaceStore } from "../workspace";

vi.mock("../../services/api", () => ({
  getSession: vi.fn(),
  listMessages: vi.fn(() => Promise.resolve({ items: [], pageInfo: { nextCursor: null, hasMore: false } })),
  listFiles: vi.fn(() => Promise.resolve({ items: [] })),
  listAgentRuns: vi.fn(() => Promise.resolve({ items: [], pageInfo: { nextCursor: null, hasMore: false } })),
  listWorkflows: vi.fn(() => Promise.resolve({ items: [] })),
  listA2UIEvents: vi.fn(() => Promise.resolve({ items: [], pageInfo: { nextCursor: null, hasMore: false } })),
  listSnapshots: vi.fn(() => Promise.resolve({ items: [], pageInfo: { nextCursor: null, hasMore: false } })),
  sendMessage: vi.fn(),
  sendWorkflowAction: vi.fn(),
}));

vi.mock("../../services/stream", () => ({
  connectStream: vi.fn(() => ({ close: vi.fn() })),
}));

describe("workspace store session restore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("restores renderer messages from the current session snapshot", async () => {
    vi.mocked(api.getSession).mockResolvedValue(makeSessionDetail("session-a", "surface-a"));

    const workspace = useWorkspaceStore();
    const renderer = useRendererStore();

    workspace.setActiveSessionId("session-a");

    await vi.waitFor(() => {
      expect(renderer.messagesForRenderer).toHaveLength(3);
    });

    expect(renderer.revision).toBeGreaterThan(0);
    expect(renderer.messagesForRenderer[0]).toMatchObject({
      createSurface: { surfaceId: "surface-a" },
    });
    expect(renderer.messagesForRenderer[1]).toMatchObject({
      updateComponents: { surfaceId: "surface-a" },
    });
    expect(renderer.messagesForRenderer[2]).toMatchObject({
      updateDataModel: {
        surfaceId: "surface-a",
        path: "/",
        value: { title: "surface-a 标题" },
      },
    });
  });

  it("ignores a stale snapshot response after switching sessions", async () => {
    const first = deferred<SessionDetailResponse>();
    const second = deferred<SessionDetailResponse>();
    vi.mocked(api.getSession)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const workspace = useWorkspaceStore();
    const renderer = useRendererStore();

    workspace.setActiveSessionId("session-a");
    const revisionAfterFirstReset = renderer.revision;
    workspace.setActiveSessionId("session-b");
    expect(renderer.revision).toBeGreaterThan(revisionAfterFirstReset);
    second.resolve(makeSessionDetail("session-b", "surface-b"));

    await vi.waitFor(() => {
      expect(renderer.messagesForRenderer[0]).toMatchObject({
        createSurface: { surfaceId: "surface-b" },
      });
    });

    first.resolve(makeSessionDetail("session-a", "surface-a"));
    await Promise.resolve();

    expect(renderer.messagesForRenderer[0]).toMatchObject({
      createSurface: { surfaceId: "surface-b" },
    });
  });

  it("ignores stale list responses and late renderer events from the previous session", async () => {
    const firstMessages = deferred<{ items: MessageDto[]; pageInfo: { nextCursor: null; hasMore: false } }>();
    vi.mocked(api.listMessages)
      .mockReturnValueOnce(firstMessages.promise)
      .mockResolvedValueOnce({ items: [], pageInfo: { nextCursor: null, hasMore: false } });
    vi.mocked(api.getSession).mockResolvedValue({
      session: makeSession("session-a"),
      enabledSkillIds: [],
      currentSnapshot: null,
    });

    const workspace = useWorkspaceStore();
    const renderer = useRendererStore();
    workspace.setActiveSessionId("session-a");
    const oldHandlers = vi.mocked(connectStream).mock.calls.at(-1)?.[1] as StreamHandlers;
    workspace.setActiveSessionId("session-b");

    firstMessages.resolve({
      items: [{
        id: "stale-message",
        sessionId: "session-a",
        agentRunId: null,
        workflowId: null,
        workflowStepId: null,
        role: "user",
        kind: "chat",
        content: "旧会话消息",
        attachments: [],
        a2uiEventIds: [],
        metadata: {},
        createdAt: "2026-01-01T00:00:00.000Z",
      }],
      pageInfo: { nextCursor: null, hasMore: false },
    });
    oldHandlers.surface_snapshot?.({
      sessionId: "session-a",
      snapshot: makeSnapshot("session-a", "stale-surface"),
    });
    await Promise.resolve();

    expect(workspace.messages).toEqual([]);
    expect(renderer.messagesForRenderer).toEqual([]);
  });

  it("clears generating state when a text-only agent run completes", async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      session: makeSession("session-a"),
      enabledSkillIds: [],
      currentSnapshot: null,
    });

    const workspace = useWorkspaceStore();
    workspace.setActiveSessionId("session-a");

    const handlers = vi.mocked(connectStream).mock.calls.at(-1)?.[1] as StreamHandlers;
    handlers.agent_run_started?.({
      sessionId: "session-a",
      agentRun: {
        id: "run-text-only",
        status: "running",
        attemptCount: 0,
        maxAttempts: 3,
      },
    });

    expect(workspace.isGenerating).toBe(true);

    handlers.agent_run_completed?.({
      sessionId: "session-a",
      agentRun: {
        id: "run-text-only",
        status: "committed",
        attemptCount: 1,
        assistantMessageId: "message-a",
        outputSnapshotId: null,
        completedAt: "2026-01-01T00:00:01.000Z",
      },
    });

    expect(workspace.isGenerating).toBe(false);
    expect(workspace.agentRuns[0]).toMatchObject({
      id: "run-text-only",
      status: "committed",
      assistantMessageId: "message-a",
      outputSnapshotId: null,
    });
  });

  it("restores renderer messages when a surface_snapshot SSE event arrives", async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      session: makeSession("session-a"),
      enabledSkillIds: [],
      currentSnapshot: null,
    });

    const workspace = useWorkspaceStore();
    const renderer = useRendererStore();
    workspace.setActiveSessionId("session-a");

    const handlers = vi.mocked(connectStream).mock.calls.at(-1)?.[1] as StreamHandlers;
    handlers.surface_snapshot?.({
      sessionId: "session-a",
      snapshot: makeSnapshot("session-a", "surface-live"),
    });

    expect(renderer.messagesForRenderer).toHaveLength(3);
    expect(renderer.messagesForRenderer[0]).toMatchObject({
      createSurface: { surfaceId: "surface-live" },
    });
    expect(renderer.messagesForRenderer[1]).toMatchObject({
      updateComponents: { surfaceId: "surface-live" },
    });
    expect(workspace.surfaceSnapshots).toHaveLength(1);
  });

  it("stores runtime tool calls from agent_run_attempt SSE events", async () => {
    vi.mocked(api.getSession).mockResolvedValue({
      session: makeSession("session-a"),
      enabledSkillIds: [],
      currentSnapshot: null,
    });

    const workspace = useWorkspaceStore();
    workspace.setActiveSessionId("session-a");

    const handlers = vi.mocked(connectStream).mock.calls.at(-1)?.[1] as StreamHandlers;
    handlers.agent_run_started?.({
      sessionId: "session-a",
      agentRun: {
        id: "run-skill",
        status: "running",
        attemptCount: 0,
        maxAttempts: 3,
      },
    });
    handlers.agent_run_attempt?.({
      sessionId: "session-a",
      agentRunId: "run-skill",
      attemptIndex: 1,
      phase: "GENERATE_DRAFT",
      toolCall: {
        id: "tool-1",
        agentRunId: "run-skill",
        sessionId: "session-a",
        toolName: "getSkillContent",
        status: "succeeded",
        attemptIndex: 1,
        inputSummary: {
          requestedSkills: ["skill-1"],
        },
        output: {
          disclosedSkills: [{ id: "skill-1", name: "课程表规范" }],
        },
        errorMessage: null,
        durationMs: 3,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(workspace.runtimeToolCalls).toHaveLength(1);
    expect(workspace.runtimeToolCalls[0]).toMatchObject({
      toolName: "getSkillContent",
      status: "succeeded",
      output: {
        disclosedSkills: [{ id: "skill-1", name: "课程表规范" }],
      },
    });
  });

  it("submits clarification form with submit_clarification payload", async () => {
    vi.mocked(api.sendWorkflowAction).mockResolvedValue({
      workflow: makeWorkflow(),
      message: makeMessage("message-clarification"),
    });

    const workspace = useWorkspaceStore();
    workspace.activeSessionId = "session-a";

    await workspace.submitWorkflowClarification("artifact-clarification", { goal: "dashboard" }, "更多背景");

    expect(api.sendWorkflowAction).toHaveBeenCalledWith("session-a", {
      action: "submit_clarification",
      artifactId: "artifact-clarification",
      message: "更多背景",
      payload: {
        answers: { goal: "dashboard" },
        additionalText: "更多背景",
      },
    });
    expect(workspace.messages[0]).toMatchObject({ id: "message-clarification" });
  });

  it("submits decision form with submit_decision payload", async () => {
    vi.mocked(api.sendWorkflowAction).mockResolvedValue({
      workflow: makeWorkflow(),
      message: makeMessage("message-decision"),
    });

    const workspace = useWorkspaceStore();
    workspace.activeSessionId = "session-a";

    await workspace.submitWorkflowDecision("artifact-decision", "revise", "调整布局");

    expect(api.sendWorkflowAction).toHaveBeenCalledWith("session-a", {
      action: "submit_decision",
      artifactId: "artifact-decision",
      message: "调整布局",
      payload: {
        selectedOption: "revise",
        comment: "调整布局",
      },
    });
    expect(workspace.messages[0]).toMatchObject({ id: "message-decision" });
  });

  it("updates workflow state when sendMessage resumes a running workflow", async () => {
    vi.mocked(api.sendMessage).mockResolvedValue({
      message: {
        id: "message-resume",
        role: "user",
        content: "继续",
      },
      agentRun: {
        id: "run-resume",
        status: "running",
      },
      workflow: {
        id: "workflow-a",
        status: "running",
        currentStepType: "plan",
      },
      streamUrl: "/api/sessions/session-a/stream",
    });
    vi.mocked(api.listMessages).mockResolvedValue({
      items: [makeMessage("message-resume")],
      pageInfo: { nextCursor: null, hasMore: false },
    });

    const workspace = useWorkspaceStore();
    workspace.activeSessionId = "session-a";
    workspace.workflows = [{
      ...makeWorkflow(),
      status: "failed_retryable",
      failureReason: "API 失败",
    }];

    await workspace.sendMessage("继续");

    expect(api.sendMessage).toHaveBeenCalledWith("session-a", expect.objectContaining({
      content: "继续",
    }));
    expect(workspace.workflows[0]).toMatchObject({
      id: "workflow-a",
      status: "running",
      currentStepType: "plan",
    });
    expect(workspace.isGenerating).toBe(true);
    expect(workspace.messages[0]).toMatchObject({ id: "message-resume" });
  });

  it("does not keep generating state for a synchronously completed workflow resume", async () => {
    vi.mocked(api.sendMessage).mockResolvedValue({
      message: {
        id: "message-resume",
        role: "user",
        content: "继续",
      },
      agentRun: {
        id: "run-resume",
        status: "committed",
      },
      workflow: {
        id: "workflow-a",
        status: "awaiting_confirmation",
        currentStepType: "plan",
      },
      streamUrl: "/api/sessions/session-a/stream",
    });

    const workspace = useWorkspaceStore();
    workspace.activeSessionId = "session-a";

    await workspace.sendMessage("继续");

    expect(workspace.isGenerating).toBe(false);
    expect(workspace.workflows[0]).toMatchObject({
      id: "workflow-a",
      status: "awaiting_confirmation",
      currentStepType: "plan",
    });
  });
});

function makeSessionDetail(sessionId: string, surfaceId: string): SessionDetailResponse {
  return {
    session: makeSession(sessionId),
    enabledSkillIds: [],
    currentSnapshot: makeSnapshot(sessionId, surfaceId),
  };
}

function makeSession(sessionId: string): SessionDto {
  return {
    id: sessionId,
    title: sessionId,
    description: null,
    status: "active",
    catalogId: "basic",
    catalogVersion: "v0.9",
    rendererVersion: "0.1.0",
    modelProvider: "test",
    modelName: "test-model",
    currentSnapshotId: "snapshot-1",
    lastAgentRunId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeSnapshot(sessionId: string, surfaceId: string): SurfaceSnapshotDto {
  return {
    id: `snapshot-${surfaceId}`,
    sessionId,
    a2uiEventId: "event-1",
    agentRunId: "run-1",
    sequence: 1,
    isCurrent: true,
    catalogId: "basic",
    catalogVersion: "v0.9",
    rendererVersion: "0.1.0",
    surfaceCount: 1,
    componentCount: 1,
    summary: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    snapshot: {
      version: "v0.9",
      surfaces: {
        [surfaceId]: {
          surfaceId,
          catalogId: "basic",
          components: {
            root: {
              id: "root",
              component: "Text",
              text: { path: "/title" },
            },
          },
          dataModel: {
            title: `${surfaceId} 标题`,
          },
        },
      },
    },
  };
}

function makeWorkflow(): AgentWorkflowDetailDto {
  return {
    id: "workflow-a",
    sessionId: "session-a",
    status: "active",
    currentStepType: "plan",
    title: "Workflow",
    intent: "generate_a2ui",
    completedReason: null,
    failureReason: null,
    metadata: {},
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    steps: [],
    artifacts: [],
    agentRuns: [],
  };
}

function makeMessage(id: string): MessageDto {
  return {
    id,
    sessionId: "session-a",
    agentRunId: null,
    workflowId: "workflow-a",
    workflowStepId: null,
    role: "user",
    kind: "chat",
    content: id,
    attachments: [],
    a2uiEventIds: [],
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
