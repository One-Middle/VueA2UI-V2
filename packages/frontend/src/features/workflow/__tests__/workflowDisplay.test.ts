/**
 * workflowDisplay 纯逻辑单元测试。
 *
 * 覆盖 issue 08 的核心聚合与展示映射：
 * - 普通消息 / workflow assistant 消息 / workflow action 消息的聚合
 * - 每个 workflow 一条 Workflow Message
 * - action 消息折叠而非独立用户气泡
 * - 表单等待判定与可提交判定
 * - step 状态 → 视觉状态映射
 */

import type {
  AgentWorkflowDetailDto,
  MessageDto,
  WorkflowArtifactDto,
  WorkflowStepDto,
} from "@a2ui-platform/shared";
import { describe, expect, it } from "vitest";
import {
  artifactDisplay,
  buildDisplayItems,
  buildWorkflowTimeline,
  canSubmitClarification,
  canSubmitDecision,
  decisionOptionLabel,
  findActiveWorkflow,
  isWorkflowActionMessage,
  latestArtifact,
  orderedSteps,
  shouldShowClarificationForm,
  shouldShowDecisionForm,
  stepLogAction,
  stepVisualState,
  workflowActionDetails,
  workflowActionFeedbackLabel,
} from "../workflowDisplay";

describe("buildDisplayItems", () => {
  it("renders ordinary user and assistant messages as plain bubbles", () => {
    const user = makeMessage({ id: "u1", role: "user" });
    const assistant = makeMessage({ id: "a1", role: "assistant", workflowId: null });

    const items = buildDisplayItems([user, assistant], []);

    expect(items).toEqual([
      { kind: "message", message: user },
      { kind: "message", message: assistant },
    ]);
  });

  it("groups assistant messages sharing a workflowId into one Workflow Message", () => {
    const first = makeMessage({ id: "a1", role: "assistant", workflowId: "wf-1" });
    const second = makeMessage({ id: "a2", role: "assistant", workflowId: "wf-1" });

    const items = buildDisplayItems([first, second], []);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "workflow",
      workflowId: "wf-1",
      stepLogMessages: [first, second],
    });
  });

  it("keeps separate Workflow Messages for different workflows", () => {
    const wf1 = makeMessage({ id: "a1", role: "assistant", workflowId: "wf-1" });
    const wf2 = makeMessage({ id: "a2", role: "assistant", workflowId: "wf-2" });

    const items = buildDisplayItems([wf1, wf2], []);

    const workflows = items.filter((item) => item.kind === "workflow");
    expect(workflows).toHaveLength(2);
    expect(workflows.map((item) => (item as { workflowId: string }).workflowId)).toEqual(["wf-1", "wf-2"]);
  });

  it("places the Workflow Message at the first relevant workflow assistant message", () => {
    const user = makeMessage({ id: "u1", role: "user" });
    const assistant = makeMessage({ id: "a1", role: "assistant", workflowId: "wf-1" });
    const later = makeMessage({ id: "u2", role: "user" });

    const items = buildDisplayItems([user, assistant, later], []);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ kind: "message", message: user });
    expect(items[1]).toMatchObject({ kind: "workflow", workflowId: "wf-1" });
    expect(items[2]).toMatchObject({ kind: "message", message: later });
  });

  it("folds WorkflowAction user messages into the Workflow Message instead of standalone bubbles", () => {
    const assistant = makeMessage({ id: "a1", role: "assistant", workflowId: "wf-1" });
    const action = makeMessage({
      id: "act1",
      role: "user",
      workflowId: "wf-1",
      metadata: { workflowAction: "submit_decision", payload: { selectedOption: "confirm" } },
    });

    const items = buildDisplayItems([assistant, action], []);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "workflow",
      actionMessages: [action],
    });
  });

  it("does not hide ordinary user-authored natural language messages", () => {
    // 发起 workflow 的首条自然语言消息也有 workflowId，但没有 metadata.workflowAction
    const opener = makeMessage({ id: "u1", role: "user", workflowId: "wf-1" });
    const assistant = makeMessage({ id: "a1", role: "assistant", workflowId: "wf-1" });

    const items = buildDisplayItems([opener, assistant], []);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: "message", message: opener });
    expect(items[1]).toMatchObject({ kind: "workflow" });
  });

  it("attaches the loaded workflow detail to the Workflow Message", () => {
    const assistant = makeMessage({ id: "a1", role: "assistant", workflowId: "wf-1" });
    const workflow = makeWorkflow({ id: "wf-1" });

    const items = buildDisplayItems([assistant], [workflow]);

    expect(items[0]).toMatchObject({ kind: "workflow", workflow });
  });

  it("renders a Workflow Message for a workflow with no messages yet (initial plan waiting state)", () => {
    // 初始 plan 阶段：后端只产出 plan_markdown + decision_form artifact，不产生 assistant 消息
    const opener = makeMessage({ id: "u1", role: "user", workflowId: "wf-1" });
    const workflow = makeWorkflow({ id: "wf-1", status: "awaiting_confirmation" });

    const items = buildDisplayItems([opener], [workflow]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: "message", message: opener });
    expect(items[1]).toMatchObject({ kind: "workflow", workflowId: "wf-1", stepLogMessages: [], actionMessages: [] });
  });

  it("anchors retryable resume generation after the resume user message", () => {
    const oldPlan = makeArtifact({
      id: "art-plan",
      kind: "plan_markdown",
      createdAt: "2026-01-01T00:00:02.000Z",
    });
    const candidate = makeArtifact({
      id: "art-candidate",
      kind: "candidate_a2ui_messages",
      createdAt: "2026-01-01T00:00:06.000Z",
    });
    const action = makeMessage({
      id: "action-confirm",
      role: "user",
      workflowId: "wf-1",
      createdAt: "2026-01-01T00:00:03.000Z",
      metadata: { workflowAction: "submit_decision", payload: { selectedOption: "confirm" } },
    });
    const resume = makeMessage({
      id: "message-resume",
      role: "user",
      workflowId: "wf-1",
      content: "请继续",
      createdAt: "2026-01-01T00:00:04.000Z",
      metadata: { workflowResume: true },
    });
    const agent = makeMessage({
      id: "agent-resume",
      role: "assistant",
      workflowId: "wf-1",
      createdAt: "2026-01-01T00:00:05.000Z",
    });
    const workflow = makeWorkflow({
      id: "wf-1",
      steps: [makeStep({ type: "generate_a2ui", status: "running" })],
      artifacts: [oldPlan, candidate],
    });

    const items = buildDisplayItems([action, resume, agent], [workflow]);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      kind: "workflow",
      segmentId: "wf-1:initial",
      actionMessages: [action],
      timelineArtifacts: [oldPlan],
      showGenerating: false,
    });
    expect(items[1]).toMatchObject({ kind: "message", message: resume });
    expect(items[2]).toMatchObject({
      kind: "workflow",
      segmentId: "wf-1:resume:message-resume",
      stepLogMessages: [agent],
      timelineArtifacts: [candidate],
      showGenerating: true,
    });
  });
});

describe("isWorkflowActionMessage", () => {
  it("recognizes user messages with a workflowAction metadata", () => {
    expect(isWorkflowActionMessage(makeMessage({
      role: "user",
      metadata: { workflowAction: "submit_clarification" },
    }))).toBe(true);
  });

  it("ignores ordinary user messages without workflowAction", () => {
    expect(isWorkflowActionMessage(makeMessage({ role: "user" }))).toBe(false);
  });

  it("ignores assistant messages even with workflowId", () => {
    expect(isWorkflowActionMessage(makeMessage({
      role: "assistant",
      workflowId: "wf-1",
      metadata: { workflowAction: "submit_decision" },
    }))).toBe(false);
  });
});

describe("workflowActionFeedbackLabel", () => {
  it("maps clarification submission", () => {
    expect(workflowActionFeedbackLabel(makeMessage({
      role: "user",
      metadata: { workflowAction: "submit_clarification" },
    }))).toBe("已提交补充信息");
  });

  it("maps decision confirm / revise / reject distinctly", () => {
    const confirm = makeMessage({
      role: "user",
      metadata: { workflowAction: "submit_decision", payload: { selectedOption: "confirm" } },
    });
    const revise = makeMessage({
      role: "user",
      metadata: { workflowAction: "submit_decision", payload: { selectedOption: "revise" } },
    });
    const reject = makeMessage({
      role: "user",
      metadata: { workflowAction: "submit_decision", payload: { selectedOption: "reject" } },
    });

    expect(workflowActionFeedbackLabel(confirm)).toBe("已确认方案");
    expect(workflowActionFeedbackLabel(revise)).toBe("已提交修改意见");
    expect(workflowActionFeedbackLabel(reject)).toBe("已拒绝方案");
  });
});

describe("stepVisualState", () => {
  it("maps completed/confirmed to done, running to active", () => {
    expect(stepVisualState("completed")).toBe("done");
    expect(stepVisualState("confirmed")).toBe("done");
    expect(stepVisualState("running")).toBe("active");
  });

  it("maps awaiting_confirmation to waiting, failed to error", () => {
    expect(stepVisualState("awaiting_confirmation")).toBe("waiting");
    expect(stepVisualState("failed")).toBe("error");
  });

  it("maps pending and skipped to distinct non-active states", () => {
    expect(stepVisualState("pending")).toBe("pending");
    expect(stepVisualState("skipped")).toBe("skipped");
  });
});

describe("findActiveWorkflow", () => {
  it("prefers the non-terminal workflow", () => {
    const completed = makeWorkflow({ id: "wf-done", status: "completed" });
    const active = makeWorkflow({ id: "wf-active", status: "awaiting_confirmation" });

    expect(findActiveWorkflow([completed, active])?.id).toBe("wf-active");
  });

  it("falls back to the latest workflow when all are terminal", () => {
    const completed = makeWorkflow({ id: "wf-done", status: "completed" });

    expect(findActiveWorkflow([completed])?.id).toBe("wf-done");
  });

  it("returns null for an empty list", () => {
    expect(findActiveWorkflow([])).toBeNull();
  });
});

describe("orderedSteps and latestArtifact", () => {
  it("sorts steps by sequence without mutating the source", () => {
    const workflow = makeWorkflow({ id: "wf-1" });
    workflow.steps = [
      makeStep({ id: "s2", type: "generate_a2ui", sequence: 2 }),
      makeStep({ id: "s1", type: "plan", sequence: 1 }),
    ];

    const ordered = orderedSteps(workflow);

    expect(ordered.map((step) => step.id)).toEqual(["s1", "s2"]);
    expect(workflow.steps.map((step) => step.id)).toEqual(["s2", "s1"]);
  });

  it("returns the latest artifact of a given kind by version", () => {
    const workflow = makeWorkflow({ id: "wf-1" });
    workflow.artifacts = [
      makeArtifact({ id: "p1", kind: "plan_markdown", version: 1 }),
      makeArtifact({ id: "p2", kind: "plan_markdown", version: 2 }),
      makeArtifact({ id: "c1", kind: "candidate_a2ui_messages", version: 1 }),
    ];

    expect(latestArtifact(workflow, "plan_markdown")?.id).toBe("p2");
    expect(latestArtifact(workflow, "candidate_a2ui_messages")?.id).toBe("c1");
    expect(latestArtifact(workflow, "validation_report")).toBeNull();
  });
});

describe("inline form gating", () => {
  it("shows clarification form only for a waiting plan step", () => {
    const planStep = makeStep({
      id: "s1",
      type: "plan",
      status: "awaiting_confirmation",
      stageState: "awaiting_clarification",
    });
    const clarification = makeArtifact({ id: "clar", kind: "clarification_form", workflowStepId: "s1" });

    expect(shouldShowClarificationForm(planStep, clarification)).toBe(true);
    expect(shouldShowClarificationForm({ ...planStep, stageState: null }, clarification)).toBe(false);
    expect(shouldShowClarificationForm(null, clarification)).toBe(false);
  });

  it("shows decision form only for a waiting confirmation step", () => {
    const step = makeStep({
      id: "s1",
      type: "plan",
      status: "awaiting_confirmation",
      stageState: "awaiting_plan_confirmation",
    });
    const decision = makeArtifact({ id: "dec", kind: "decision_form", workflowStepId: "s1" });

    expect(shouldShowDecisionForm(step, decision)).toBe(true);
    expect(shouldShowDecisionForm({ ...step, status: "running" }, decision)).toBe(false);
    expect(shouldShowDecisionForm(null, decision)).toBe(false);
  });

  it("enforces required clarification fields", () => {
    const fields = [
      { id: "goal", label: "目标", type: "text" as const, required: true },
      { id: "note", label: "备注", type: "textarea" as const, required: false },
    ];

    expect(canSubmitClarification(fields, { goal: "", note: "" })).toBe(false);
    expect(canSubmitClarification(fields, { goal: "dashboard", note: "" })).toBe(true);
  });

  it("enforces revise comment and requires a selection", () => {
    expect(canSubmitDecision(null, "")).toBe(false);
    expect(canSubmitDecision("confirm", "")).toBe(true);
    expect(canSubmitDecision("revise", "")).toBe(false);
    expect(canSubmitDecision("revise", "调整布局")).toBe(true);
  });
});

describe("decisionOptionLabel", () => {
  it("maps the three decision options to readable labels", () => {
    expect(decisionOptionLabel("confirm")).toBe("确认");
    expect(decisionOptionLabel("revise")).toBe("修改");
    expect(decisionOptionLabel("reject")).toBe("拒绝");
  });
});

describe("stepLogAction", () => {
  it("returns null for non-trace messages (e.g. commit chat message)", () => {
    const message = makeMessage({ role: "assistant", workflowId: "wf-1", kind: "chat", metadata: {} });
    expect(stepLogAction(message)).toEqual({ kind: null, label: "" });
  });

  it("maps a tool_call trace to a tool label", () => {
    const message = makeMessage({
      role: "assistant",
      workflowId: "wf-1",
      kind: "agent_status",
      metadata: { trace: true, actionType: "tool_call", toolName: "validateA2UI" },
    });
    expect(stepLogAction(message)).toEqual({ kind: "tool", label: "validateA2UI" });
  });

  it("maps a final_draft trace to a produce label", () => {
    const message = makeMessage({
      role: "assistant",
      workflowId: "wf-1",
      kind: "agent_status",
      metadata: { trace: true, actionType: "final_draft", finalKind: "plan_markdown" },
    });
    expect(stepLogAction(message)).toEqual({ kind: "produce", label: "plan_markdown" });
  });
});

describe("buildWorkflowTimeline", () => {
  it("merges agent, artifact, and user-action nodes sorted by createdAt", () => {
    const workflow = makeWorkflow({
      artifacts: [
        makeArtifact({ id: "art-plan", kind: "plan_markdown", createdAt: "2026-01-01T00:00:02.000Z" }),
      ],
    });
    const stepLog = [
      makeMessage({ id: "agent-1", role: "assistant", createdAt: "2026-01-01T00:00:01.000Z" }),
    ];
    const actions = [
      makeMessage({
        id: "action-1",
        role: "user",
        createdAt: "2026-01-01T00:00:03.000Z",
        metadata: { workflowAction: "submit_decision" },
      }),
    ];

    const timeline = buildWorkflowTimeline(workflow, stepLog, actions, new Set());

    expect(timeline.map((node) => node.kind)).toEqual(["agent", "artifact", "user-action"]);
  });

  it("excludes waiting artifact ids from the timeline", () => {
    const workflow = makeWorkflow({
      artifacts: [
        makeArtifact({ id: "art-plan", kind: "plan_markdown" }),
        makeArtifact({ id: "art-decision", kind: "decision_form" }),
      ],
    });

    const timeline = buildWorkflowTimeline(workflow, [], [], new Set(["art-decision"]));

    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({ kind: "artifact", artifact: { id: "art-plan" } });
  });
});

describe("workflowActionDetails", () => {
  it("lists clarification answers and additional text", () => {
    const message = makeMessage({
      role: "user",
      metadata: {
        workflowAction: "submit_clarification",
        payload: { answers: { goal: "dashboard", platforms: ["web", "mobile"] }, additionalText: "越快越好" },
      },
    });

    expect(workflowActionDetails(message)).toEqual([
      { label: "goal", value: "dashboard" },
      { label: "platforms", value: "web、mobile" },
      { label: "补充说明", value: "越快越好" },
    ]);
  });

  it("shows revise comment for decision, nothing for confirm", () => {
    const revise = makeMessage({
      role: "user",
      metadata: { workflowAction: "submit_decision", payload: { selectedOption: "revise", comment: "调整布局" } },
    });
    const confirm = makeMessage({
      role: "user",
      metadata: { workflowAction: "submit_decision", payload: { selectedOption: "confirm" } },
    });

    expect(workflowActionDetails(revise)).toEqual([{ label: "修改意见", value: "调整布局" }]);
    expect(workflowActionDetails(confirm)).toEqual([]);
  });
});

describe("artifactDisplay", () => {
  it("maps plan and validation report to foldable display", () => {
    expect(artifactDisplay(makeArtifact({ kind: "plan_markdown", contentText: "# Plan" }))).toMatchObject({
      title: "Markdown Plan v1",
      tagType: "success",
      details: "# Plan",
    });

    expect(artifactDisplay(makeArtifact({ kind: "validation_report", contentJson: { valid: false } }))).toMatchObject({
      title: "Validation Report v1",
      tagType: "error",
      summary: "校验存在错误",
    });
  });

  it("maps candidate to a compact summary", () => {
    expect(artifactDisplay(makeArtifact({
      kind: "candidate_a2ui_messages",
      contentJson: { messages: [{}, {}] },
    }))).toMatchObject({
      summary: "2 条 A2UI messages",
    });
  });

  it("maps clarification and decision forms to question display", () => {
    expect(artifactDisplay(makeArtifact({
      kind: "clarification_form",
      contentJson: { title: "补充需求", description: "请补充", fields: [{ id: "goal", label: "目标" }] },
    }))).toMatchObject({
      title: "补充需求",
      tag: "askClarification",
      details: "- 目标",
    });

    expect(artifactDisplay(makeArtifact({
      kind: "decision_form",
      contentJson: { title: "确认方案", prompt: "是否确认", options: [{ id: "confirm", label: "确认" }] },
    }))).toMatchObject({
      title: "确认方案",
      tag: "askUserDecision",
      summary: "是否确认",
    });
  });
});

// ─── 工厂函数 ──────────────────────────────────────────────

function makeMessage(overrides: Partial<MessageDto> = {}): MessageDto {
  return {
    id: "m1",
    sessionId: "session-a",
    agentRunId: null,
    workflowId: null,
    workflowStepId: null,
    role: "user",
    kind: "chat",
    content: "内容",
    attachments: [],
    a2uiEventIds: [],
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeWorkflow(overrides: Partial<AgentWorkflowDetailDto> = {}): AgentWorkflowDetailDto {
  return {
    id: "wf-1",
    sessionId: "session-a",
    status: "active",
    currentStepType: "plan",
    title: "Workflow",
    intent: "CREATE_UI",
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
    ...overrides,
  };
}

function makeStep(overrides: Partial<WorkflowStepDto> = {}): WorkflowStepDto {
  return {
    id: "s1",
    workflowId: "wf-1",
    sessionId: "session-a",
    type: "plan",
    status: "pending",
    stageState: null,
    sequence: 1,
    attemptCount: 0,
    maxAttempts: 3,
    failureReason: null,
    failureMetadata: {},
    confirmedAt: null,
    confirmedByMessageId: null,
    startedAt: null,
    completedAt: null,
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeArtifact(overrides: Partial<WorkflowArtifactDto> = {}): WorkflowArtifactDto {
  return {
    id: "art-1",
    workflowId: "wf-1",
    workflowStepId: null,
    sessionId: "session-a",
    kind: "plan_markdown",
    version: 1,
    contentText: "plan 内容",
    contentJson: {},
    createdBy: "agent",
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
