import { describe, expect, it } from "vitest";
import type { AgentRunInput, ToolCallRecord } from "@a2ui-platform/shared";
import { AgentContextBuilder } from "../context/context-builder.js";
import { PromptComposer } from "../prompts/prompt-composer.js";
import { parseComponentInfoRequest } from "./component-info-request-parser.js";
import { parseSkillInfoRequest } from "./skill-info-request-parser.js";
import { AgentRuntime } from "./agent-runtime.js";
import type { ModelClient, ModelResponse } from "../model/model-client.js";

function createInput(
  enabledSkills: AgentRunInput["enabledSkills"] = [],
): AgentRunInput {
  return {
    sessionId: "session-1",
    userMessage: "生成一个课程表页面",
    recentMessages: [],
    uploadedFiles: [],
    enabledSkills,
    currentSnapshot: null,
    catalogId: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
    catalogVersion: "v0.9",
    rendererVersion: "0.1.0",
    model: {
      provider: "mock",
      name: "mock-model",
      config: {},
    },
  };
}

class FakeModelClient {
  private responses: string[];
  public prompts: Array<{ system: string; user: string }> = [];

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async generate(
    messages: Array<{ role: string; content: string }>,
  ): Promise<ModelResponse> {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const user = messages.find((m) => m.role === "user")?.content ?? "";
    this.prompts.push({ system, user });

    const content = this.responses.shift();
    if (!content) throw new Error("没有更多 mock response");
    return {
      content,
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    };
  }
}

describe("Agent 渐进式组件披露", () => {
  it("初始 Prompt 包含工作流和组件摘要，不直接注入旧协议指南", () => {
    const composer = new PromptComposer();
    const context = new AgentContextBuilder().buildContext(createInput());

    const { systemPrompt } = composer.composeInitial(context);

    expect(systemPrompt).toContain(
      "理解用户需求 -> 向用户确认自己的理解 -> 开始生成 -> 校验 -> 提交",
    );
    expect(systemPrompt).toContain("componentInfoRequest");
    expect(systemPrompt).toContain("- Text:");
    expect(systemPrompt).not.toContain("## A2UI v0.9 协议生成指南");
    expect(systemPrompt).not.toContain("### 5. 消息类型");
    expect(systemPrompt).not.toContain('- Text: { "id": "..."');
    expect(systemPrompt).not.toContain('- Button: { "id": "..."');
  });

  it("组件详情 Prompt 只注入已请求组件详情", () => {
    const composer = new PromptComposer();
    const context = new AgentContextBuilder().buildContext(createInput());

    const { systemPrompt } = composer.composeInitial(context, {
      componentDetails: "### Column\n字段：\n- children: string[]，必填",
    });

    expect(systemPrompt).toContain("### Column");
    expect(systemPrompt).toContain("children");
    expect(systemPrompt).not.toContain("### Button\n字段");
  });

  it("后端未传入 Skill 时，初始 Prompt 仍包含 A2UI 基础 Skill 摘要但不包含完整内容", () => {
    const composer = new PromptComposer();
    const context = new AgentContextBuilder().buildContext(createInput());

    const { userPrompt } = composer.composeInitial(context);

    expect(userPrompt).toContain("builtin:a2ui-v0.9-generation");
    expect(userPrompt).toContain("A2UI v0.9 组件消息生成");
    expect(userPrompt).toContain("当用户要求创建或修改 UI 时必须使用");
    expect(userPrompt).not.toContain("## 4. 消息类型");
    expect(userPrompt).not.toContain("生成新 UI 时必须先 createSurface");
  });

  it("初始 Prompt 只包含 Skill 摘要，不包含完整内容", () => {
    const composer = new PromptComposer();
    const context = new AgentContextBuilder().buildContext(
      createInput([
        {
          id: "skill-1",
          name: "课程表规范",
          description: "生成课程表时使用",
          content: "必须使用三栏布局，这是完整 Skill 内容。",
        },
      ]),
    );

    const { userPrompt } = composer.composeInitial(context);

    expect(userPrompt).toContain("skill-1");
    expect(userPrompt).toContain("课程表规范");
    expect(userPrompt).toContain("生成课程表时使用");
    expect(userPrompt).toContain("builtin:a2ui-v0.9-generation");
    expect(userPrompt).not.toContain("必须使用三栏布局，这是完整 Skill 内容。");
  });

  it("可解析合法 componentInfoRequest", () => {
    const result = parseComponentInfoRequest(
      JSON.stringify({
        assistantMessage: "需要查看组件详情后再生成。",
        componentInfoRequest: {
          components: ["Column", "Text", "Card"],
          reason: "需要布局、文本和卡片容器字段",
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.components).toEqual(["Column", "Text", "Card"]);
      expect(result.request.reason).toBe("需要布局、文本和卡片容器字段");
    }
  });

  it("可解析合法 skillInfoRequest", () => {
    const result = parseSkillInfoRequest(
      JSON.stringify({
        assistantMessage: "需要查看 Skill 后再生成。",
        skillInfoRequest: {
          skills: ["skill-1", "课程表规范"],
          reason: "需要遵循课程表规则",
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.skills).toEqual(["skill-1", "课程表规范"]);
      expect(result.request.reason).toBe("需要遵循课程表规则");
    }
  });

  it("拒绝空 Skill 请求", () => {
    const result = parseSkillInfoRequest(
      JSON.stringify({
        assistantMessage: "需要查看 Skill 后再生成。",
        skillInfoRequest: {
          skills: [],
        },
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("拒绝空组件请求", () => {
    const result = parseComponentInfoRequest(
      JSON.stringify({
        assistantMessage: "需要查看组件详情后再生成。",
        componentInfoRequest: {
          components: [],
        },
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("Runtime 首轮请求组件详情，补充后生成并校验最终 A2UI", async () => {
    const finalOutput = {
      assistantMessage: "已生成课程表页面。",
      a2uiMessages: [
        {
          version: "v0.9",
          createSurface: {
            surfaceId: "main",
            catalogId:
              "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
          },
        },
        {
          version: "v0.9",
          updateComponents: {
            surfaceId: "main",
            components: [
              {
                id: "root",
                component: "Column",
                children: ["title"],
              },
              {
                id: "title",
                component: "Text",
                text: "我的课程表",
                usageHint: "h1",
              },
            ],
          },
        },
      ],
    };

    const fakeModel = new FakeModelClient([
      JSON.stringify({
        assistantMessage: "需要查看组件详情后再生成。",
        componentInfoRequest: {
          components: ["Column", "Text"],
          reason: "需要布局和标题字段",
        },
      }),
      JSON.stringify(finalOutput),
    ]);
    const runtime = new AgentRuntime(
      fakeModel as unknown as ModelClient,
      new PromptComposer(),
      new AgentContextBuilder(),
    );
    const toolCalls: ToolCallRecord[] = [];

    const result = await runtime.run(createInput(), (record) => {
      toolCalls.push(record);
    });

    expect(result.status).toBe("COMMITTED");
    expect(fakeModel.prompts).toHaveLength(2);
    expect(fakeModel.prompts[1]!.system).toContain("### Column");
    expect(fakeModel.prompts[1]!.system).toContain("### Text");
    expect(
      toolCalls.some(
        (record) => record.toolName === "getCatalogComponentDetails",
      ),
    ).toBe(true);
    expect(toolCalls.some((record) => record.toolName === "validateA2UI")).toBe(
      true,
    );
  });

  it("Runtime 可在无会话 Skill 时披露 A2UI 基础 Skill", async () => {
    const finalOutput = {
      assistantMessage: "我理解你需要一个课程表页面，已生成基础课程表 UI。",
      a2uiMessages: [
        {
          version: "v0.9",
          createSurface: {
            surfaceId: "main",
            catalogId:
              "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
          },
        },
        {
          version: "v0.9",
          updateComponents: {
            surfaceId: "main",
            components: [
              {
                id: "root",
                component: "Column",
                children: ["title"],
              },
              {
                id: "title",
                component: "Text",
                text: "我的课程表",
                usageHint: "h1",
              },
            ],
          },
        },
      ],
    };

    const fakeModel = new FakeModelClient([
      JSON.stringify({
        assistantMessage: "需要查看 A2UI 生成 Skill 后再生成。",
        skillInfoRequest: {
          skills: ["builtin:a2ui-v0.9-generation"],
          reason: "需要遵循 A2UI v0.9 生成规范",
        },
      }),
      JSON.stringify(finalOutput),
    ]);
    const runtime = new AgentRuntime(
      fakeModel as unknown as ModelClient,
      new PromptComposer(),
      new AgentContextBuilder(),
    );
    const toolCalls: ToolCallRecord[] = [];

    const result = await runtime.run(createInput(), (record) => {
      toolCalls.push(record);
    });

    expect(result.status).toBe("COMMITTED");
    expect(fakeModel.prompts).toHaveLength(2);
    expect(fakeModel.prompts[0]!.user).not.toContain("## 4. 消息类型");
    expect(fakeModel.prompts[1]!.system).toContain("# A2UI v0.9 组件消息生成");
    expect(fakeModel.prompts[1]!.system).toContain("## 4. 消息类型");
    expect(
      toolCalls.some(
        (record) =>
          record.toolName === "getSkillContent" &&
          record.status === "succeeded",
      ),
    ).toBe(true);
  });

  it("Runtime 首轮请求 Skill 内容，补充后生成并记录 getSkillContent", async () => {
    const finalOutput = {
      assistantMessage: "已按课程表规范生成页面。",
      a2uiMessages: [
        {
          version: "v0.9",
          createSurface: {
            surfaceId: "main",
            catalogId:
              "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
          },
        },
        {
          version: "v0.9",
          updateComponents: {
            surfaceId: "main",
            components: [
              {
                id: "root",
                component: "Column",
                children: ["title"],
              },
              {
                id: "title",
                component: "Text",
                text: "我的课程表",
                usageHint: "h1",
              },
            ],
          },
        },
      ],
    };

    const fakeModel = new FakeModelClient([
      JSON.stringify({
        assistantMessage: "需要查看 Skill 后再生成。",
        skillInfoRequest: {
          skills: ["skill-1"],
          reason: "需要遵循课程表规则",
        },
      }),
      JSON.stringify(finalOutput),
    ]);
    const runtime = new AgentRuntime(
      fakeModel as unknown as ModelClient,
      new PromptComposer(),
      new AgentContextBuilder(),
    );
    const toolCalls: ToolCallRecord[] = [];

    const result = await runtime.run(
      createInput([
        {
          id: "skill-1",
          name: "课程表规范",
          description: "生成课程表时使用",
          content: "完整 Skill 内容：课程表必须包含标题。",
        },
      ]),
      (record) => {
        toolCalls.push(record);
      },
    );

    expect(result.status).toBe("COMMITTED");
    expect(fakeModel.prompts).toHaveLength(2);
    expect(fakeModel.prompts[0]!.user).not.toContain("完整 Skill 内容");
    expect(fakeModel.prompts[1]!.system).toContain("完整 Skill 内容：课程表必须包含标题。");
    expect(
      toolCalls.some(
        (record) =>
          record.toolName === "getSkillContent" &&
          record.phase === "GENERATE_DRAFT",
      ),
    ).toBe(true);
  });
});
