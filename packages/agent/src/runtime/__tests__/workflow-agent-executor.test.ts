import { describe, expect, it } from "vitest";
import type { ModelClient, ModelResponse } from "../../model/model-client.js";
import { ReactPromptComposer } from "../react-prompt-composer.js";
import { ToolRegistry } from "../tool-registry.js";
import { WorkflowAgentExecutor } from "../workflow-agent-executor.js";
import { createResourceLedger, hasSkill, type ResourceLedger } from "../resource-ledger.js";
import type {
  AgentCapabilities,
  AgentTraceEvent,
  ReactAgentRunInput,
} from "../react-agent-types.js";

const CATALOG_ID = "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json";

function createInput(overrides: Partial<ReactAgentRunInput> = {}): ReactAgentRunInput {
  const capabilities: AgentCapabilities = {
    allowedTools: ["askClarification", "askUserDecision", "getSkillContent"],
    catalogId: CATALOG_ID,
    catalogVersion: "v0.9",
    rendererVersion: "0.1.0",
  };

  return {
    runId: "run-1",
    sessionId: "session-1",
    workflowId: "workflow-1",
    workflowStepId: "step-1",
    goal: {
      task: "plan",
      expectedResult: ["clarification_form", "plan_markdown"],
      description: "生成方案",
    },
    facts: [],
    currentDraft: null,
    capabilities,
    limits: { maxIterations: 8 },
    ...overrides,
  };
}

class FakeModelClient {
  private responses: string[];
  public callCount = 0;

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async generate(): Promise<ModelResponse> {
    const content = this.responses.shift();
    if (content === undefined) {
      throw new Error("没有更多 mock response");
    }
    this.callCount++;
    return {
      content,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };
  }
}

function createToolRegistry(
  capabilities: AgentCapabilities,
  ledger: ResourceLedger = createResourceLedger(),
): ToolRegistry {
  return new ToolRegistry(capabilities, {
    getSkillContent: (idOrName) => ({
      id: idOrName,
      name: "Skill",
      content: "skill content",
      references: [],
    }),
    resourceLedger: ledger,
  });
}

function createExecutor(
  model: FakeModelClient,
  capabilities: AgentCapabilities,
  onTraceEvent?: (event: AgentTraceEvent) => void,
  ledger: ResourceLedger = createResourceLedger(),
) {
  return new WorkflowAgentExecutor({
    modelClient: model as unknown as ModelClient,
    promptComposer: new ReactPromptComposer(ledger),
    toolRegistry: createToolRegistry(capabilities, ledger),
    onTraceEvent,
  });
}

const FULL_PLAN_MARKDOWN = [
  "## 页面目标",
  "生成课程表页面",
  "## 布局结构",
  "三栏布局",
  "## 组件清单",
  "Column、Text",
  "## Data Model",
  "无",
  "## 交互行为",
  "无",
  "## 假设",
  "无",
  "## 风险",
  "无",
].join("\n");

describe("WorkflowAgentExecutor", () => {
  it("parse error 后追加 observation 并在下一轮 give_up", async () => {
    const model = new FakeModelClient([
      "这不是 JSON",
      JSON.stringify({ type: "give_up", reasoningSummary: "r", reason: "无法继续", recoverable: true }),
    ]);
    const executor = createExecutor(model, createInput().capabilities);

    const result = await executor.execute(createInput());

    expect(result.status).toBe("failed");
    expect(model.callCount).toBe(2);
    expect(result.trace.iterations).toHaveLength(2);
    expect(result.trace.iterations[0]!.observationSummary).toBeDefined();
  });

  it("artifact-producing 工具（askClarification）结束 executor 并返回 completed", async () => {
    const model = new FakeModelClient([
      JSON.stringify({
        type: "tool_call",
        reasoningSummary: "需要澄清",
        tool: "askClarification",
        arguments: {
          title: "请补充",
          fields: [
            { id: "q1", label: "页面目标", type: "textarea", required: true, reason: "用于确定信息架构" },
          ],
        },
      }),
    ]);
    const executor = createExecutor(model, createInput().capabilities);

    const result = await executor.execute(createInput());

    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.final.kind).toBe("clarification_form");
    }
    expect(model.callCount).toBe(1);
  });

  it("final_draft 校验失败（plan 缺 decisionForm）保留 currentDraft 并继续循环", async () => {
    const model = new FakeModelClient([
      JSON.stringify({
        type: "final_draft",
        reasoningSummary: "产出方案",
        finalKind: "plan_markdown",
        draft: { markdown: FULL_PLAN_MARKDOWN },
      }),
      JSON.stringify({ type: "give_up", reasoningSummary: "r", reason: "放弃", recoverable: false }),
    ]);
    const executor = createExecutor(model, createInput().capabilities);

    const result = await executor.execute(createInput());

    expect(result.status).toBe("failed");
    expect(model.callCount).toBe(2);
    expect(result.trace.iterations[0]!.finalValidation).toMatchObject({ valid: false });
  });

  it("final_draft 中 clarification option 非法时进入校验失败循环", async () => {
    const model = new FakeModelClient([
      JSON.stringify({
        type: "final_draft",
        reasoningSummary: "需要澄清投票模式",
        finalKind: "clarification_form",
        draft: {
          fields: [
            {
              id: "vote_mode",
              label: "投票模式",
              type: "radio",
              required: true,
              reason: "用于确定协作流程",
              options: [{ label: "匿名投票" }],
            },
          ],
        },
      }),
      JSON.stringify({ type: "give_up", reasoningSummary: "r", reason: "放弃", recoverable: false }),
    ]);
    const executor = createExecutor(model, createInput().capabilities);

    const result = await executor.execute(createInput());

    expect(result.status).toBe("failed");
    expect(model.callCount).toBe(2);
    expect(result.trace.iterations[0]!.finalValidation).toMatchObject({ valid: false });
    expect(result.trace.iterations[0]!.finalValidation?.error).toContain("label 和 value");
  });

  it("normal tool call 追加 observation 后继续循环", async () => {
    const model = new FakeModelClient([
      JSON.stringify({
        type: "tool_call",
        reasoningSummary: "获取 skill",
        tool: "getSkillContent",
        arguments: { skill: "skill-1" },
      }),
      JSON.stringify({ type: "give_up", reasoningSummary: "r", reason: "放弃", recoverable: true }),
    ]);
    const executor = createExecutor(model, createInput().capabilities);

    const result = await executor.execute(createInput());

    expect(result.status).toBe("failed");
    expect(model.callCount).toBe(2);
    expect(result.trace.iterations[0]!.toolName).toBe("getSkillContent");
    expect(result.trace.iterations[0]!.observationSummary).toBeDefined();
  });

  it("finalKind 不匹配期望产物时进入校验失败循环", async () => {
    const model = new FakeModelClient([
      JSON.stringify({
        type: "final_draft",
        reasoningSummary: "产出候选",
        finalKind: "candidate_a2ui_messages",
        draft: { messages: [] },
      }),
      JSON.stringify({ type: "give_up", reasoningSummary: "r", reason: "放弃", recoverable: false }),
    ]);
    // goal 期望 clarification_form / plan_markdown，candidate_a2ui_messages 不匹配
    const executor = createExecutor(model, createInput().capabilities);

    const result = await executor.execute(createInput());

    expect(result.status).toBe("failed");
    expect(result.trace.iterations[0]!.finalValidation).toMatchObject({ valid: false });
  });

  it("达到 maxIterations 后返回 failed", async () => {
    const model = new FakeModelClient(["无效输出 1", "无效输出 2"]);
    const executor = createExecutor(model, createInput().capabilities);

    const result = await executor.execute(createInput({ limits: { maxIterations: 2 } }));

    expect(result.status).toBe("failed");
    expect(result.trace.iterations).toHaveLength(2);
    if (result.status === "failed") {
      expect(result.failure.recoverable).toBe(true);
    }
  });

  it("每轮迭代通过 onTraceEvent 回调输出 trace 事件", async () => {
    const model = new FakeModelClient([
      JSON.stringify({
        type: "tool_call",
        reasoningSummary: "需要澄清",
        tool: "askClarification",
        arguments: {
          fields: [{ id: "q1", label: "问题", type: "text", required: true, reason: "需要" }],
        },
      }),
    ]);
    const events: AgentTraceEvent[] = [];
    const executor = createExecutor(model, createInput().capabilities, (event) => {
      events.push(event);
    });

    await executor.execute(createInput());

    const types = events.map((e) => e.type);
    expect(types).toContain("iteration_started");
    expect(types).toContain("model_action");
    expect(types).toContain("tool_call");
    // trace 事件携带 session/run 关联字段
    expect(events.every((e) => e.sessionId === "session-1" && e.agentRunId === "run-1")).toBe(true);
  });

  it("同一 Resource Ledger 在多次 ReAct 迭代间共享（重复披露被去重）", async () => {
    const ledger = createResourceLedger();
    const model = new FakeModelClient([
      JSON.stringify({
        type: "tool_call",
        reasoningSummary: "首次获取 skill",
        tool: "getSkillContent",
        arguments: { skill: "skill-1" },
      }),
      JSON.stringify({
        type: "tool_call",
        reasoningSummary: "重复获取 skill",
        tool: "getSkillContent",
        arguments: { skill: "skill-1" },
      }),
      JSON.stringify({ type: "give_up", reasoningSummary: "r", reason: "放弃", recoverable: true }),
    ]);
    const executor = createExecutor(model, createInput().capabilities, undefined, ledger);

    await executor.execute(createInput());

    // 两次 getSkillContent 命中同一 ledger，只记录一次
    expect(hasSkill(ledger, "skill-1")).toBe(true);
    expect(model.callCount).toBe(3);
  });
});
