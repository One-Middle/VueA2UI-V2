/**
 * ReAct Agent 运行时 Resource Ledger。
 *
 * 职责：
 * - 以 map 结构承载当前 workflow 已披露的 Skill / Skill Reference 正文（运行时工作记忆）。
 * - 从 Resource Ledger Snapshot 与 enabledSkills 执行 hydration，恢复带正文的运行时 ledger。
 * - 把运行时 ledger 脱水（dehydrate）为不含正文的 Snapshot。
 * - 提供披露（record）与去重（has）辅助函数，供 ToolRegistry 使用。
 *
 * 引用：
 * - @a2ui-platform/shared（ResourceLedgerSnapshot 等共享契约类型）。
 * 被引用：
 * - tool-registry（写入与去重）、react-prompt-composer（渲染 Working Resources）、
 *   agent-runtime（hydrate / dehydrate）。
 * 注意：
 * - hydration 找不到的资源会被静默丢弃并记录到 debug 诊断，不作为 Agent Observation 注入模型。
 * - 运行时 ledger 只存正文，不负责持久化；持久化通过 Snapshot 完成。
 */

import type {
  AgentRunInput,
  ResourceLedgerSkillEntry,
  ResourceLedgerSkillReferenceEntry,
  ResourceLedgerSnapshot,
} from "@a2ui-platform/shared";

/** 运行时已披露 Skill 资源（含正文）。 */
export interface RuntimeSkillResource {
  /** 资源键，格式 `skill:<skillId>`。 */
  key: string;
  skillId: string;
  name: string;
  content: string;
}

/** 运行时已披露 Skill Reference 资源（含正文）。 */
export interface RuntimeSkillReferenceResource {
  /** 资源键，格式 `reference:<skillId>:<referenceId>`。 */
  key: string;
  skillId: string;
  skillName: string;
  referenceId: string;
  title: string;
  content: string;
}

/** 运行时 Resource Ledger：按资源键索引，Map 保留披露顺序。 */
export interface ResourceLedger {
  /** key 为 `skill:<skillId>`。 */
  skills: Map<string, RuntimeSkillResource>;
  /** key 为 `reference:<skillId>:<referenceId>`。 */
  skillReferences: Map<string, RuntimeSkillReferenceResource>;
}

/** hydration 时无法从 enabledSkills 解析而被丢弃的资源。 */
export interface DroppedResource {
  /** 原 snapshot 中的资源键。 */
  key: string;
  /** 被丢弃资源的种类。 */
  kind: "skill" | "skill_reference";
  skillId: string;
  referenceId?: string;
}

/** hydration 结果：恢复后的 ledger 与被丢弃资源的诊断。 */
export interface HydrationResult {
  ledger: ResourceLedger;
  dropped: DroppedResource[];
}

/** 生成 Skill 资源键。 */
export function skillKey(skillId: string): string {
  return `skill:${skillId}`;
}

/** 生成 Skill Reference 资源键。 */
export function referenceKey(skillId: string, referenceId: string): string {
  return `reference:${skillId}:${referenceId}`;
}

/** 创建空的运行时 Resource Ledger。 */
export function createResourceLedger(): ResourceLedger {
  return { skills: new Map(), skillReferences: new Map() };
}

/**
 * 根据 Snapshot 与当前 enabledSkills 恢复运行时 ledger。
 *
 * Snapshot 中无法解析的 Skill / Reference 会被静默丢弃并记录到 dropped，
 * 由调用方写入 debug metadata，不作为 Agent Observation。
 *
 * @param snapshot - 上一 task 遗留的 Resource Ledger Snapshot（可为空）。
 * @param enabledSkills - 当前 session 已启用的 Skill 列表（正文的权威来源）。
 * @returns 恢复后的 ledger 与被丢弃资源诊断。
 */
export function hydrateResourceLedger(
  snapshot: ResourceLedgerSnapshot | undefined,
  enabledSkills: AgentRunInput["enabledSkills"],
): HydrationResult {
  const ledger = createResourceLedger();
  const dropped: DroppedResource[] = [];

  if (!snapshot) {
    return { ledger, dropped };
  }

  for (const entry of snapshot.skills) {
    const skill = enabledSkills.find((s) => s.id === entry.skillId);
    if (!skill) {
      dropped.push({ key: entry.key, kind: "skill", skillId: entry.skillId });
      continue;
    }
    ledger.skills.set(entry.key, {
      key: entry.key,
      skillId: skill.id,
      name: skill.name,
      content: skill.content,
    });
  }

  for (const entry of snapshot.skillReferences) {
    const skill = enabledSkills.find((s) => s.id === entry.skillId);
    const reference = skill?.references?.find((r) => r.id === entry.referenceId);
    if (!skill || !reference) {
      dropped.push({
        key: entry.key,
        kind: "skill_reference",
        skillId: entry.skillId,
        referenceId: entry.referenceId,
      });
      continue;
    }
    ledger.skillReferences.set(entry.key, {
      key: entry.key,
      skillId: skill.id,
      skillName: skill.name,
      referenceId: reference.id,
      title: reference.title,
      content: reference.content,
    });
  }

  return { ledger, dropped };
}

/** 把运行时 ledger 脱水为不含正文的 Snapshot。 */
export function dehydrateResourceLedger(ledger: ResourceLedger): ResourceLedgerSnapshot {
  return {
    skills: [...ledger.skills.values()].map(toSkillEntry),
    skillReferences: [...ledger.skillReferences.values()].map(toReferenceEntry),
  };
}

/** 判断 Skill 是否已披露。 */
export function hasSkill(ledger: ResourceLedger, skillId: string): boolean {
  return ledger.skills.has(skillKey(skillId));
}

/** 判断 Skill Reference 是否已披露。 */
export function hasSkillReference(
  ledger: ResourceLedger,
  skillId: string,
  referenceId: string,
): boolean {
  return ledger.skillReferences.has(referenceKey(skillId, referenceId));
}

/**
 * 把新披露的 Skill 写入 ledger。
 *
 * @returns 是否为新披露（已存在时返回 false，不覆盖）。
 */
export function recordSkill(
  ledger: ResourceLedger,
  skill: { id: string; name: string; content: string },
): boolean {
  const key = skillKey(skill.id);
  if (ledger.skills.has(key)) {
    return false;
  }
  ledger.skills.set(key, {
    key,
    skillId: skill.id,
    name: skill.name,
    content: skill.content,
  });
  return true;
}

/**
 * 把新披露的 Skill Reference 写入 ledger（自动跳过已存在的）。
 *
 * @returns 本次实际新增的资源列表（不含已存在的）。
 */
export function recordSkillReferences(
  ledger: ResourceLedger,
  skill: { id: string; name: string },
  references: Array<{ id: string; title: string; content: string }>,
): RuntimeSkillReferenceResource[] {
  const disclosed: RuntimeSkillReferenceResource[] = [];
  for (const reference of references) {
    const key = referenceKey(skill.id, reference.id);
    if (ledger.skillReferences.has(key)) {
      continue;
    }
    const resource: RuntimeSkillReferenceResource = {
      key,
      skillId: skill.id,
      skillName: skill.name,
      referenceId: reference.id,
      title: reference.title,
      content: reference.content,
    };
    ledger.skillReferences.set(key, resource);
    disclosed.push(resource);
  }
  return disclosed;
}

/** 按披露顺序返回已披露的 Skill 资源。 */
export function listSkills(ledger: ResourceLedger): RuntimeSkillResource[] {
  return [...ledger.skills.values()];
}

/** 按披露顺序返回已披露的 Skill Reference 资源。 */
export function listSkillReferences(ledger: ResourceLedger): RuntimeSkillReferenceResource[] {
  return [...ledger.skillReferences.values()];
}

function toSkillEntry(resource: RuntimeSkillResource): ResourceLedgerSkillEntry {
  return { key: resource.key, skillId: resource.skillId, name: resource.name };
}

function toReferenceEntry(
  resource: RuntimeSkillReferenceResource,
): ResourceLedgerSkillReferenceEntry {
  return {
    key: resource.key,
    skillId: resource.skillId,
    skillName: resource.skillName,
    referenceId: resource.referenceId,
    title: resource.title,
  };
}
