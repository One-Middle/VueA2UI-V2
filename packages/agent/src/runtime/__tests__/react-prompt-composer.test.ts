import { describe, expect, it } from "vitest";
import type { AgentObservation, ReactAgentRunInput } from "../react-agent-types.js";
import { ReactPromptComposer } from "../react-prompt-composer.js";
import {
  createResourceLedger,
  recordSkill,
  recordSkillReferences,
} from "../resource-ledger.js";

const CATALOG_ID = "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json";

function createInput(): ReactAgentRunInput {
  return {
    runId: "run-1",
    sessionId: "session-1",
    workflowId: "workflow-1",
    workflowStepId: "step-1",
    goal: {
      task: "plan",
      expectedResult: ["plan_markdown"],
      description: "生成方案",
    },
    facts: [],
    currentDraft: null,
    capabilities: {
      allowedTools: ["getSkillContent", "getSkillReferenceContent"],
      catalogId: CATALOG_ID,
      catalogVersion: "v0.9",
      rendererVersion: "0.1.0",
    },
    limits: { maxIterations: 10 },
  };
}

describe("ReactPromptComposer 输出契约", () => {
  it("system prompt 明确 JSON envelope、plan decisionForm 与 reference 工具参数", () => {
    const composer = new ReactPromptComposer(createResourceLedger());

    const prompt = composer.composeSystemPrompt(createInput());

    expect(prompt).toContain("第一个非空字符必须是 {");
    expect(prompt).toContain("最后一个非空字符必须是 }");
    expect(prompt).toContain("不要输出 ```json 代码块");
    expect(prompt).toContain('"decisionForm"');
    expect(prompt).toContain('"target": "plan_markdown"');
    expect(prompt).toContain("getSkillReferenceContent arguments");
    expect(prompt).toContain('"skill": "已启用 Skill 的 id 或 name"');
    expect(prompt).toContain('"references": ["reference id、reference title，或 *"]');
  });

  it("Capabilities 中结构化展示 skill reference 标识", () => {
    const composer = new ReactPromptComposer(createResourceLedger());
    const input: ReactAgentRunInput = {
      ...createInput(),
      capabilities: {
        ...createInput().capabilities,
        skillReferences: [
          {
            skillId: "builtin:a2ui-v0.9-generation",
            skillName: "A2UI v0.9 组件消息生成",
            referenceId: "a2ui-generation-standards",
            title: "A2UI 标准生成规则",
          },
        ],
      },
    };

    const prompt = composer.composeUserPrompt(input, [], null);

    expect(prompt).toContain("skillId: builtin:a2ui-v0.9-generation");
    expect(prompt).toContain("skillName: A2UI v0.9 组件消息生成");
    expect(prompt).toContain("referenceId: a2ui-generation-standards");
    expect(prompt).toContain("referenceTitle: A2UI 标准生成规则");
  });
});

describe("ReactPromptComposer Working Resources", () => {
  it("无已披露资源时不渲染 Working Resources 分区", () => {
    const composer = new ReactPromptComposer(createResourceLedger());

    const prompt = composer.composeUserPrompt(createInput(), [], null);

    expect(prompt).not.toContain("Working Resources");
  });

  it("Skill 渲染在 Skill Reference 之前，且各自保留披露顺序", () => {
    const ledger = createResourceLedger();
    recordSkill(ledger, { id: "skill-a", name: "SkillA", content: "content A" });
    recordSkillReferences(ledger, { id: "skill-a", name: "SkillA" }, [
      { id: "ref-1", title: "视觉规范", content: "reference content 1" },
    ]);
    recordSkill(ledger, { id: "skill-b", name: "SkillB", content: "content B" });

    const composer = new ReactPromptComposer(ledger);
    const prompt = composer.composeUserPrompt(createInput(), [], null);

    expect(prompt).toContain("## Working Resources");
    expect(prompt).toContain("content A");
    expect(prompt).toContain("content B");
    expect(prompt).toContain("reference content 1");

    // 技能组在前，且 SkillA 先于 SkillB；引用组在技能组之后
    const indexA = prompt.indexOf("SkillA");
    const indexB = prompt.indexOf("SkillB");
    const indexRef = prompt.indexOf("视觉规范");
    expect(indexA).toBeGreaterThan(-1);
    expect(indexB).toBeGreaterThan(-1);
    expect(indexRef).toBeGreaterThan(-1);
    expect(indexA).toBeLessThan(indexB);
    expect(indexB).toBeLessThan(indexRef);
  });
});

describe("ReactPromptComposer observation 渲染", () => {
  it("不再盲目序列化 observation 详情，只保留白名单小字段", () => {
    const composer = new ReactPromptComposer(createResourceLedger());
    const observations: AgentObservation[] = [
      {
        kind: "tool_result",
        message: "已获取 Skill",
        details: {
          skillId: "skill-1",
          name: "课程表规范",
          content: "这是一段不应注入观察历史的超大 Skill 正文",
        },
      },
    ];

    const prompt = composer.composeUserPrompt(createInput(), observations, null);

    expect(prompt).toContain("skillId: skill-1");
    expect(prompt).toContain("name: 课程表规范");
    expect(prompt).not.toContain("超大 Skill 正文");
  });

  it("校验类白名单字段（valid/errors）仍可渲染", () => {
    const composer = new ReactPromptComposer(createResourceLedger());
    const observations: AgentObservation[] = [
      {
        kind: "tool_result",
        message: "A2UI 校验未通过",
        details: {
          valid: false,
          errors: [{ code: "A2UI_STRUCTURE", path: "$.messages[0]", message: "缺少 version" }],
        },
      },
    ];

    const prompt = composer.composeUserPrompt(createInput(), observations, null);

    expect(prompt).toContain("valid: false");
    expect(prompt).toContain("A2UI_STRUCTURE");
    expect(prompt).toContain("缺少 version");
  });
});
