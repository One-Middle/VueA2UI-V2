import { describe, expect, it } from "vitest";
import type { AgentRunInput, ResourceLedgerSnapshot } from "@a2ui-platform/shared";
import {
  createResourceLedger,
  dehydrateResourceLedger,
  hasSkill,
  hasSkillReference,
  hydrateResourceLedger,
  listSkillReferences,
  listSkills,
  recordSkill,
  recordSkillReferences,
  referenceKey,
  skillKey,
} from "../resource-ledger.js";

function enabledSkill(
  overrides: Partial<AgentRunInput["enabledSkills"][number]> = {},
): AgentRunInput["enabledSkills"][number] {
  return {
    id: "skill-1",
    name: "课程表规范",
    content: "skill full content",
    references: [
      { id: "ref-1", title: "视觉规范", content: "reference full content" },
    ],
    ...overrides,
  };
}

function snapshot(overrides: Partial<ResourceLedgerSnapshot> = {}): ResourceLedgerSnapshot {
  return {
    skills: [{ key: skillKey("skill-1"), skillId: "skill-1", name: "课程表规范" }],
    skillReferences: [
      {
        key: referenceKey("skill-1", "ref-1"),
        skillId: "skill-1",
        skillName: "课程表规范",
        referenceId: "ref-1",
        title: "视觉规范",
      },
    ],
    ...overrides,
  };
}

describe("resource-ledger", () => {
  it("创建空 ledger", () => {
    const ledger = createResourceLedger();
    expect(listSkills(ledger)).toHaveLength(0);
    expect(listSkillReferences(ledger)).toHaveLength(0);
  });

  it("从 snapshot 与 enabledSkills hydrate 出带正文的 ledger", () => {
    const { ledger, dropped } = hydrateResourceLedger(snapshot(), [enabledSkill()]);

    expect(dropped).toHaveLength(0);
    expect(hasSkill(ledger, "skill-1")).toBe(true);
    expect(hasSkillReference(ledger, "skill-1", "ref-1")).toBe(true);
    expect(listSkills(ledger)[0]!.content).toBe("skill full content");
    expect(listSkillReferences(ledger)[0]!.content).toBe("reference full content");
  });

  it("无 snapshot 时 hydrate 得到空 ledger", () => {
    const { ledger, dropped } = hydrateResourceLedger(undefined, [enabledSkill()]);

    expect(listSkills(ledger)).toHaveLength(0);
    expect(dropped).toHaveLength(0);
  });

  it("hydrate 丢弃无法解析的 Skill 并记录诊断", () => {
    const { ledger, dropped } = hydrateResourceLedger(snapshot(), []);

    expect(listSkills(ledger)).toHaveLength(0);
    expect(dropped).toHaveLength(2);
    expect(dropped[0]).toMatchObject({ kind: "skill", skillId: "skill-1" });
    expect(dropped[1]).toMatchObject({ kind: "skill_reference", referenceId: "ref-1" });
  });

  it("hydrate 丢弃 Skill 存在但 Reference 缺失的条目", () => {
    const { ledger, dropped } = hydrateResourceLedger(
      snapshot(),
      [enabledSkill({ references: [] })],
    );

    expect(hasSkill(ledger, "skill-1")).toBe(true);
    expect(listSkillReferences(ledger)).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toMatchObject({ kind: "skill_reference", referenceId: "ref-1" });
  });

  it("dehydrate 回不含正文的 snapshot", () => {
    const ledger = createResourceLedger();
    recordSkill(ledger, { id: "skill-1", name: "课程表规范", content: "skill full content" });
    recordSkillReferences(ledger, { id: "skill-1", name: "课程表规范" }, [
      { id: "ref-1", title: "视觉规范", content: "reference full content" },
    ]);

    const result = dehydrateResourceLedger(ledger);

    expect(result.skills).toEqual([
      { key: skillKey("skill-1"), skillId: "skill-1", name: "课程表规范" },
    ]);
    expect(result.skillReferences).toEqual([
      {
        key: referenceKey("skill-1", "ref-1"),
        skillId: "skill-1",
        skillName: "课程表规范",
        referenceId: "ref-1",
        title: "视觉规范",
      },
    ]);
    // snapshot 不含正文
    expect(JSON.stringify(result)).not.toContain("skill full content");
    expect(JSON.stringify(result)).not.toContain("reference full content");
  });

  it("recordSkill 对已存在 Skill 返回 false 且不覆盖", () => {
    const ledger = createResourceLedger();
    expect(recordSkill(ledger, { id: "skill-1", name: "A", content: "first" })).toBe(true);
    expect(recordSkill(ledger, { id: "skill-1", name: "B", content: "second" })).toBe(false);
    expect(listSkills(ledger)[0]!.content).toBe("first");
  });

  it("recordSkillReferences 跳过已披露 reference", () => {
    const ledger = createResourceLedger();
    const first = recordSkillReferences(ledger, { id: "skill-1", name: "S" }, [
      { id: "ref-1", title: "T1", content: "c1" },
    ]);
    const second = recordSkillReferences(ledger, { id: "skill-1", name: "S" }, [
      { id: "ref-1", title: "T1", content: "c1" },
      { id: "ref-2", title: "T2", content: "c2" },
    ]);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(listSkillReferences(ledger)).toHaveLength(2);
  });
});
