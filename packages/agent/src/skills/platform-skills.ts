/**
 * 平台 Skill 提供器。
 *
 * 职责：
 * - 向后端 Skill Resolver 提供平台内置 Skill 定义。
 * - 为平台 Skill 附加统一 metadata，后续可据此控制前端展示和可编辑性。
 *
 * 注意：
 * - Agent Runtime 不会自动注入这里的 Skill。
 * - 后端必须通过统一 Skill Resolver 将平台 Skill 放入 AgentRunInput.enabledSkills。
 */

import type { AgentRunInput } from "@a2ui-platform/shared";
import type { SkillReference } from "@a2ui-platform/shared";
import { A2UI_GENERATION_SKILL } from "./a2ui-v0.9-generation.js";
import { BUILTIN_SKILLS } from "./registry.js";

export type PlatformSkill = AgentRunInput["enabledSkills"][number];

const PLATFORM_SKILL_CONTENT: Record<string, PlatformSkill> = {
  [A2UI_GENERATION_SKILL.id]: A2UI_GENERATION_SKILL,
};

/** 返回所有平台自动启用 Skill。调用方负责再与 session/workspace Skill 合并。 */
export function getPlatformAutoEnabledSkills(): PlatformSkill[] {
  return BUILTIN_SKILLS.filter(
    (meta) => meta.sourceType === "platform" && meta.runtimeEnabled,
  ).map((meta) => {
    const skill = PLATFORM_SKILL_CONTENT[meta.id];
    if (!skill) {
      throw new Error(`Platform skill content not registered: ${meta.id}`);
    }

    return {
      ...skill,
      id: meta.id,
      name: skill.name || meta.name,
      description: skill.description ?? meta.description ?? null,
      references: skill.references ?? [],
      sourceType: meta.sourceType,
      metadata: {
        builtinId: meta.id,
        sourceFile: meta.file,
        generatedDocPath: `packages/agent/src/skills/${meta.id.replace(/^builtin:/, "")}/SKILL.md`,
        frontendVisible: meta.frontendVisible ?? false,
        editable: meta.editable ?? false,
        userEnableable: false,
        runtimeEnabled: true,
        references: toMetadataReferences(skill.references ?? []),
      },
    };
  });
}

function toMetadataReferences(references: SkillReference[]) {
  return references.map((reference) => ({
    id: reference.id,
    title: reference.title,
    description: reference.description ?? null,
    content: reference.content,
  }));
}
