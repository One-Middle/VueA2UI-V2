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
  it("初始 Prompt 只包含组件摘要和请求格式，不包含旧的完整字段速查表", () => {
    const composer = new PromptComposer();
    const context = new AgentContextBuilder().buildContext(createInput());

    const { systemPrompt } = composer.composeInitial(context);

    expect(systemPrompt).toContain("componentInfoRequest");
    expect(systemPrompt).toContain("- Text:");
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
