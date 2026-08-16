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
    expect(prompt).toContain("禁止输出数组、多个 JSON、自然语言 + JSON");
    expect(prompt).toContain("如果要解释原因，只能写在 reasoningSummary 字段里");
    expect(prompt).toContain('"decisionForm"');
    expect(prompt).toContain('"target": "plan_markdown"');
    expect(prompt).toContain("plan_markdown 必须包含这些标题：页面目标、视觉效果、页面结构、界面元素、数据语义、交互行为。");
    expect(prompt).toContain("页面目标：说明这个界面要帮助用户完成什么");
    expect(prompt).toContain("视觉效果：描述整体气质、信息层级和重点反馈");
    expect(prompt).toContain("页面结构：说明界面由哪些主要区域组成");
    expect(prompt).toContain("界面元素：列出用户会看到或操作的关键元素");
    expect(prompt).toContain("数据语义：说明界面围绕哪些业务数据展开");
    expect(prompt).toContain("交互行为：说明用户可以做哪些操作");
    expect(prompt).toContain("askClarification：需要用户补充信息时使用");
    expect(prompt).toContain('"options": [{ "label": "选项文案", "value": "option_value" }]');
    expect(prompt).toContain("每个 option 必须包含 label 和 value");
    expect(prompt).toContain("askUserDecision：需要用户确认 plan 或 candidate 时使用");
    expect(prompt).toContain("getSkillContent：需要获取已启用 Skill 完整内容时使用");
    expect(prompt).toContain("getSkillReferenceContent arguments");
    expect(prompt).toContain('"skill": "已启用 Skill 的 id 或 name"');
    expect(prompt).toContain('"references": ["reference id、reference title，或 *"]');
    expect(prompt).toContain("getCatalogComponentDetails：需要查询组件字段、必填项或枚举时使用");
    expect(prompt).toContain("components 必须是非空字符串数组");
    expect(prompt).toContain("validateA2UI：需要校验候选 A2UI 消息时使用");
    expect(prompt).toContain("messages 必须是非空 A2UI server-to-client 消息数组");
  });

  it("user prompt 用本轮提醒压制自然语言前缀", () => {
    const composer = new ReactPromptComposer(createResourceLedger());

    const prompt = composer.composeUserPrompt(createInput(), [], null);

    expect(prompt).toContain("本轮只输出 JSON object");
    expect(prompt).toContain("不要写“好的”“下面是”“我将”等自然语言前缀");
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
