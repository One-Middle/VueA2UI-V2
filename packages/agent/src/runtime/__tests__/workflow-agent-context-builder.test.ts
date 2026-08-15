import { describe, expect, it } from "vitest";
import type { AgentWorkflowTaskInput } from "@a2ui-platform/shared";
import { WorkflowAgentContextBuilder } from "../workflow-agent-context-builder.js";

const CATALOG_ID = "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json";

function createTaskInput(overrides: Partial<AgentWorkflowTaskInput> = {}): AgentWorkflowTaskInput {
  return {
    sessionId: "session-1",
    workflowId: "workflow-1",
    workflowStepId: "step-1",
    gate: "plan",
    task: "plan",
    userMessage: "生成一个课程表页面",
    recentMessages: [],
    currentSnapshot: null,
    enabledSkills: [],
    uploadedFiles: [],
    catalogId: CATALOG_ID,
    catalogVersion: "v0.9",
    rendererVersion: "0.1.0",
    model: {
      provider: "mock",
      name: "mock-model",
      config: {},
    },
    availableTools: ["askClarification", "askUserDecision", "getSkillContent"],
    ...overrides,
  };
}

describe("WorkflowAgentContextBuilder", () => {
  it("默认使用 20 次 ReAct 最大迭代次数", () => {
    const input = new WorkflowAgentContextBuilder().build({
      runId: "run-1",
      input: createTaskInput(),
    });

    expect(input.limits.maxIterations).toBe(20);
  });

  it("允许调用方覆盖最大迭代次数", () => {
    const input = new WorkflowAgentContextBuilder().build({
      runId: "run-1",
      input: createTaskInput(),
      maxIterations: 3,
    });

    expect(input.limits.maxIterations).toBe(3);
  });
});
