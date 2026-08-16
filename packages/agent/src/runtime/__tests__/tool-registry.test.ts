import { describe, expect, it } from "vitest";
import { ToolRegistry } from "../tool-registry.js";
import {
  createResourceLedger,
  hasSkill,
  hasSkillReference,
  listSkillReferences,
  listSkills,
  type ResourceLedger,
} from "../resource-ledger.js";
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

function createRegistry(
  capabilities: AgentCapabilities,
  ledger: ResourceLedger = createResourceLedger(),
): ToolRegistry {
  return new ToolRegistry(capabilities, {
    getSkillContent: (idOrName) => ({
      id: idOrName,
      name: "Skill",
      content: "skill content",
      references: [{ id: "ref-1", title: "视觉规范", content: "reference content" }],
    }),
    resourceLedger: ledger,
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

  it("getSkillContent 首次披露写入 ledger，observation 不含正文", async () => {
    const ledger = createResourceLedger();
    const registry = createRegistry(createCapabilities(), ledger);

    const result = await registry.execute("getSkillContent", { skill: "skill-1" });

    expect(result.status).toBe("completed");
    expect(hasSkill(ledger, "skill-1")).toBe(true);
    if (result.status === "completed") {
      const serialized = JSON.stringify(result.observation.details ?? {});
      // 正文与 reference 正文均不应出现在 observation 详情中
      expect(serialized).not.toContain("skill content");
      expect(serialized).not.toContain("reference content");
    }
  });

  it("getSkillContent 重复请求返回 completed 且不重复披露", async () => {
    const ledger = createResourceLedger();
    const registry = createRegistry(createCapabilities(), ledger);

    await registry.execute("getSkillContent", { skill: "skill-1" });
    const result = await registry.execute("getSkillContent", { skill: "skill-1" });

    expect(result.status).toBe("completed");
    expect(listSkills(ledger)).toHaveLength(1);
    if (result.status === "completed") {
      expect(result.observation.message).toContain("Working Resources");
    }
  });

  it("getSkillReferenceContent 首次披露 reference，observation 不含正文", async () => {
    const ledger = createResourceLedger();
    const registry = createRegistry(createCapabilities(), ledger);

    const result = await registry.execute("getSkillReferenceContent", {
      skill: "skill-1",
      references: ["ref-1"],
    });

    expect(result.status).toBe("completed");
    expect(hasSkillReference(ledger, "skill-1", "ref-1")).toBe(true);
    if (result.status === "completed") {
      const serialized = JSON.stringify(result.observation.details ?? {});
      expect(serialized).not.toContain("reference content");
    }
  });

  it("getSkillReferenceContent 重复请求返回 completed 且不重复披露", async () => {
    const ledger = createResourceLedger();
    const registry = createRegistry(createCapabilities(), ledger);

    await registry.execute("getSkillReferenceContent", {
      skill: "skill-1",
      references: ["ref-1"],
    });
    const result = await registry.execute("getSkillReferenceContent", {
      skill: "skill-1",
      references: ["ref-1"],
    });

    expect(result.status).toBe("completed");
    expect(listSkillReferences(ledger)).toHaveLength(1);
    if (result.status === "completed") {
      expect(result.observation.message).toContain("Working Resources");
    }
  });

  it("getSkillReferenceContent 通配符 * 披露全部 reference", async () => {
    const ledger = createResourceLedger();
    const registry = createRegistry(createCapabilities(), ledger);

    const result = await registry.execute("getSkillReferenceContent", {
      skill: "skill-1",
      references: ["*"],
    });

    expect(result.status).toBe("completed");
    expect(listSkillReferences(ledger)).toHaveLength(1);
    expect(hasSkillReference(ledger, "skill-1", "ref-1")).toBe(true);
  });

  it("getSkillReferenceContent 部分重复时只披露新增 reference", async () => {
    const ledger = createResourceLedger();
    const registry = new ToolRegistry(createCapabilities(), {
      getSkillContent: () => ({
        id: "skill-1",
        name: "Skill",
        content: "skill content",
        references: [
          { id: "ref-1", title: "视觉规范", content: "reference-1 content" },
          { id: "ref-2", title: "交互规范", content: "reference-2 content" },
        ],
      }),
      resourceLedger: ledger,
    });

    // 先披露 ref-1，再批量请求 ref-1 + ref-2
    await registry.execute("getSkillReferenceContent", {
      skill: "skill-1",
      references: ["ref-1"],
    });
    const result = await registry.execute("getSkillReferenceContent", {
      skill: "skill-1",
      references: ["ref-1", "ref-2"],
    });

    expect(result.status).toBe("completed");
    // 只新增 ref-2
    expect(listSkillReferences(ledger)).toHaveLength(2);
    if (result.status === "completed") {
      const serialized = JSON.stringify(result.observation.details ?? {});
      expect(serialized).toContain("ref-2");
      expect(serialized).not.toContain("reference-2 content");
      expect(result.observation.message).toContain("跳过");
    }
  });
});
