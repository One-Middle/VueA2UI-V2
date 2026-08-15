import { describe, expect, it } from "vitest";
import { ToolRegistry } from "../tool-registry.js";
import type { AgentCapabilities } from "../react-agent-types.js";

const CATALOG_ID = "https://a2ui.org/specification/v0.9/catalogs/basic/catalog.json";

function createCapabilities(overrides: Partial<AgentCapabilities> = {}): AgentCapabilities {
  return {
    allowedTools: [
      "askClarification",
      "askUserDecision",
      "getSkillContent",
      "getSkillReferenceContent",
      "getCatalogComponentDetails",
      "validateA2UI",
    ],
    catalogId: CATALOG_ID,
    catalogVersion: "v0.9",
    rendererVersion: "0.1.0",
    ...overrides,
  };
}

function createRegistry(capabilities: AgentCapabilities): ToolRegistry {
  return new ToolRegistry(capabilities, {
    getSkillContent: (idOrName) => ({
      id: idOrName,
      name: "Skill",
      content: "skill content",
      references: [{ id: "ref-1", title: "视觉规范", content: "reference content" }],
    }),
  });
}

describe("ToolRegistry", () => {
  it("未授权工具返回不可恢复失败", async () => {
    const registry = createRegistry(createCapabilities({ allowedTools: [] }));

    const result = await registry.execute("getSkillContent", { skill: "skill-1" });

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.recoverable).toBe(false);
    }
  });

  it("askClarification 成功返回 clarification_form final artifact", async () => {
    const registry = createRegistry(createCapabilities());

    const result = await registry.execute("askClarification", {
      title: "请补充",
      fields: [{ id: "q1", label: "页面目标", type: "textarea", required: true, reason: "用于确定信息架构" }],
    });

    expect(result.status).toBe("final_artifact");
    if (result.status === "final_artifact") {
      expect(result.artifact.kind).toBe("clarification_form");
    }
  });

  it("askUserDecision 成功返回 decision_form final artifact", async () => {
    const registry = createRegistry(createCapabilities());

    const result = await registry.execute("askUserDecision", {
      title: "确认方案",
      prompt: "是否确认？",
      guidance: "确认后进入生成",
      target: "plan_markdown",
      options: [
        { id: "confirm", label: "确认" },
        { id: "revise", label: "修改" },
        { id: "reject", label: "拒绝" },
      ],
    });

    expect(result.status).toBe("final_artifact");
    if (result.status === "final_artifact") {
      expect(result.artifact.kind).toBe("decision_form");
    }
  });

  it("askClarification 参数非法返回 recoverable 失败", async () => {
    const registry = createRegistry(createCapabilities());

    const result = await registry.execute("askClarification", { fields: [] });

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.recoverable).toBe(true);
    }
  });

  it("askClarification 选择项格式非法时返回 recoverable 失败而不是抛异常", async () => {
    const registry = createRegistry(createCapabilities());

    const result = await registry.execute("askClarification", {
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
    });

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.recoverable).toBe(true);
      expect(result.observation.message).toContain("label 和 value");
    }
  });

  it("askUserDecision 选项格式非法时返回 recoverable 失败而不是抛异常", async () => {
    const registry = createRegistry(createCapabilities());

    const result = await registry.execute("askUserDecision", {
      title: "确认方案",
      prompt: "是否确认？",
      guidance: "确认后进入生成",
      target: "plan_markdown",
      options: [
        { id: "confirm", label: "确认" },
        { id: "revise" },
        { id: "reject", label: "拒绝" },
      ],
    });

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.recoverable).toBe(true);
      expect(result.observation.message).toContain("缺少 label");
    }
  });

  it("getSkillContent 返回 completed observation", async () => {
    const registry = createRegistry(createCapabilities());

    const result = await registry.execute("getSkillContent", { skill: "skill-1" });

    expect(result.status).toBe("completed");
  });

  it("getSkillContent 参数非法返回 recoverable 失败", async () => {
    const registry = createRegistry(createCapabilities());

    const result = await registry.execute("getSkillContent", {});

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.recoverable).toBe(true);
    }
  });

  it("validateA2UI 返回结构化 observation", async () => {
    const registry = createRegistry(createCapabilities());

    const result = await registry.execute("validateA2UI", { messages: [] });

    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.observation.kind).toBe("tool_result");
    }
  });
});
