import { describe, expect, it } from "vitest";
import type { AgentWorkflowTaskInput, ResourceLedgerSnapshot } from "@a2ui-platform/shared";
import { AgentContextBuilder } from "../../context/context-builder.js";
import { PromptComposer } from "../../prompts/prompt-composer.js";
import type { ModelClient, ModelResponse } from "../../model/model-client.js";
import { AgentRuntime } from "../agent-runtime.js";
import { referenceKey, skillKey } from "../resource-ledger.js";

const CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";

function createInput(overrides: Partial<AgentWorkflowTaskInput> = {}): AgentWorkflowTaskInput {
  return {
    sessionId: "session-1",
    workflowId: "workflow-1",
    workflowStepId: "step-1",
    gate: "plan",
    task: "plan",
    userMessage: "生成一个课程表页面",
    recentMessages: [],
    currentSnapshot: null,
    enabledSkills: [
      {
        id: "skill-1",
        name: "课程表规范",
        content: "skill full content",
        references: [{ id: "ref-1", title: "视觉规范", content: "reference full content" }],
      },
    ],
    uploadedFiles: [],
    catalogId: CATALOG_ID,
    catalogVersion: "v0.9",
    rendererVersion: "0.1.0",
    model: { provider: "mock", name: "mock-model", config: {} },
    availableTools: ["getSkillContent", "getSkillReferenceContent"],
    ...overrides,
  };
}

class FakeModelClient {
  private responses: string[];

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async generate(): Promise<ModelResponse> {
    const content = this.responses.shift();
    if (content === undefined) {
      throw new Error("没有更多 mock response");
    }
    return {
      content,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };
  }
}

function createRuntime(model: FakeModelClient): AgentRuntime {
  return new AgentRuntime(
    model as unknown as ModelClient,
    new PromptComposer(),
    new AgentContextBuilder(),
  );
}

const GIVE_UP = JSON.stringify({
  type: "give_up",
  reasoningSummary: "r",
  reason: "放弃",
  recoverable: true,
});

describe("AgentRuntime runWorkflowTask Resource Ledger", () => {
  it("返回脱水后的 Resource Ledger Snapshot，并记录 hydration 丢弃资源到 debug metadata", async () => {
    const snapshot: ResourceLedgerSnapshot = {
      skills: [
        { key: skillKey("skill-1"), skillId: "skill-1", name: "课程表规范" },
        { key: skillKey("skill-missing"), skillId: "skill-missing", name: "缺失 Skill" },
      ],
      skillReferences: [
        {
          key: referenceKey("skill-1", "ref-missing"),
          skillId: "skill-1",
          skillName: "课程表规范",
          referenceId: "ref-missing",
          title: "缺失 Reference",
        },
      ],
    };

    const runtime = createRuntime(new FakeModelClient([GIVE_UP]));

    const result = await runtime.runWorkflowTask(
      createInput({ resourceLedger: snapshot }),
    );

    // 只保留能 hydrate 的 skill-1；丢弃缺失的 skill 与 reference 到 debug metadata
    expect(result.resourceLedger?.skills).toEqual([
      { key: skillKey("skill-1"), skillId: "skill-1", name: "课程表规范" },
    ]);
    expect(result.resourceLedger?.skillReferences).toEqual([]);

    const dropped = result.debugMetadata["resourceLedgerDropped"] as Array<{
      key: string;
      kind: string;
      skillId: string;
      referenceId?: string;
    }>;
    expect(dropped).toHaveLength(2);
    expect(dropped[0]).toMatchObject({ kind: "skill", skillId: "skill-missing" });
    expect(dropped[1]).toMatchObject({ kind: "skill_reference", referenceId: "ref-missing" });
  });

  it("无 snapshot 输入时返回空 ledger snapshot", async () => {
    const runtime = createRuntime(new FakeModelClient([GIVE_UP]));

    const result = await runtime.runWorkflowTask(createInput());

    expect(result.resourceLedger?.skills).toEqual([]);
    expect(result.resourceLedger?.skillReferences).toEqual([]);
    expect(result.debugMetadata["resourceLedgerDropped"]).toEqual([]);
  });

  it("运行中披露的 Skill 会进入返回的 snapshot", async () => {
    const runtime = createRuntime(
      new FakeModelClient([
        JSON.stringify({
          type: "tool_call",
          reasoningSummary: "获取 skill",
          tool: "getSkillContent",
          arguments: { skill: "skill-1" },
        }),
        GIVE_UP,
      ]),
    );

    const result = await runtime.runWorkflowTask(createInput());

    expect(result.resourceLedger?.skills).toEqual([
      { key: skillKey("skill-1"), skillId: "skill-1", name: "课程表规范" },
    ]);
  });
});
