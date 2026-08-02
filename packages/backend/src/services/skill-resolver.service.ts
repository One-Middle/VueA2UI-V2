/**
 * Skill Resolver：统一决定一次 Agent run 可用的 Skill。
 *
 * 职责：
 * - 合并平台自动启用 Skill 与当前 session 启用 Skill。
 * - 统一转换为 AgentRunInput.enabledSkills。
 * - 去重并稳定排序，保证 Agent Runtime 只消费已经解析好的 Skill 列表。
 *
 * 不负责：
 * - Agent Runtime 内的渐进披露。
 * - 前端 Skill 管理 UI。
 */

import type { AgentRunInput, JsonObject } from "@a2ui-platform/shared";
import { getPlatformAutoEnabledSkills } from "@a2ui-platform/agent";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { sessionSkillRepository } from "../repositories/session-skill.repository.js";

type ResolvedSkill = AgentRunInput["enabledSkills"][number];
type PlatformSkillSource = "code" | "db";

export const skillResolverService = {
  /**
   * 解析当前会话在一次 Agent run 中可用的 Skill。
   *
   * @param sessionId - 当前会话 ID
   * @returns 已合并平台自动 Skill 与会话启用 Skill 的列表
   */
  async resolveForSession(sessionId: string): Promise<ResolvedSkill[]> {
    const platformSkills = await resolvePlatformSkills(config.skills.platformSource);
    const sessionSkills = await sessionSkillRepository.findBySessionId(sessionId);
    const enabledSessionSkills = sessionSkills
      .filter((sessionSkill) => sessionSkill.enabled && sessionSkill.skill.isActive)
      .map((sessionSkill): ResolvedSkill => ({
        id: sessionSkill.skill.id,
        name: sessionSkill.skill.name,
        description: sessionSkill.skill.description,
        content: sessionSkill.skill.content,
        sourceType: sessionSkill.skill.sourceType,
        metadata: sessionSkill.skill.metadata as JsonObject,
        references: extractSkillReferences(sessionSkill.skill.metadata),
      }));

    return mergeResolvedSkills([...platformSkills, ...enabledSessionSkills]);
  },
};

/**
 * 根据配置解析平台自动 Skill。
 *
 * 开发环境通常使用 code 来源，便于修改代码种子后快速生效；
 * 生产环境通常使用 db 来源，保证运行内容可审计、可版本化。
 *
 * @param source - 平台 Skill 来源
 * @returns 平台自动启用 Skill 列表
 */
async function resolvePlatformSkills(
  source: PlatformSkillSource,
): Promise<ResolvedSkill[]> {
  if (source === "code") {
    return getPlatformAutoEnabledSkills().map((skill) =>
      withPlatformSourceMetadata(skill, "code"),
    );
  }

  const skills = await prisma.skill.findMany({
    where: {
      sourceType: "platform",
      isActive: true,
      deletedAt: null,
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  const runtimeEnabledSkills = skills
    .filter((skill) => isRuntimeEnabledPlatformSkill(skill.metadata))
    .map((skill): ResolvedSkill => ({
      id: getStablePlatformSkillId(skill.metadata) ?? skill.id,
      name: skill.name,
      description: skill.description,
      content: skill.content,
      sourceType: skill.sourceType,
      metadata: {
        ...(toJsonObject(skill.metadata) ?? {}),
        platformSkillSource: "db",
      },
      references: extractSkillReferences(skill.metadata),
    }));

  if (runtimeEnabledSkills.length === 0) {
    throw new Error(
      "No runtime-enabled platform skills found in database. Run pnpm skill:sync or set PLATFORM_SKILL_SOURCE=code for development.",
    );
  }

  return runtimeEnabledSkills;
}

function mergeResolvedSkills(skills: ResolvedSkill[]): ResolvedSkill[] {
  const result: ResolvedSkill[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const skill of skills) {
    if (seenIds.has(skill.id) || seenNames.has(skill.name)) {
      continue;
    }
    seenIds.add(skill.id);
    seenNames.add(skill.name);
    result.push(skill);
  }

  return result;
}

/**
 * 给 code 来源的平台 Skill 标记实际运行来源，方便调试和前端展示。
 *
 * @param skill - 平台 Skill 定义
 * @param source - 实际来源
 * @returns 带来源 metadata 的 Skill
 */
function withPlatformSourceMetadata(
  skill: ResolvedSkill,
  source: PlatformSkillSource,
): ResolvedSkill {
  return {
    ...skill,
    metadata: {
      ...(skill.metadata ?? {}),
      platformSkillSource: source,
    },
  };
}

/**
 * 判断数据库中的 platform Skill 是否需要自动进入 Agent run。
 *
 * @param metadata - Skill.metadata 字段
 * @returns true 表示应自动启用
 */
function isRuntimeEnabledPlatformSkill(metadata: unknown): boolean {
  const obj = toJsonObject(metadata);
  return obj?.["runtimeEnabled"] === true || obj?.["runtimeAutoEnabled"] === true;
}

/**
 * 获取平台 Skill 的稳定 ID。
 *
 * @param metadata - Skill.metadata 字段
 * @returns metadata 中记录的 builtinId/stableKey
 */
function getStablePlatformSkillId(metadata: unknown): string | null {
  const obj = toJsonObject(metadata);
  const builtinId = obj?.["builtinId"];
  const stableKey = obj?.["stableKey"];
  if (typeof builtinId === "string" && builtinId.trim()) return builtinId;
  if (typeof stableKey === "string" && stableKey.trim()) return stableKey;
  return null;
}

/**
 * 将未知 metadata 安全转换为 JSON 对象。
 *
 * @param value - 原始 metadata
 * @returns 可展开的 JSON 对象，无法转换时返回 null
 */
function toJsonObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
}

function extractSkillReferences(
  metadata: unknown,
): AgentRunInput["enabledSkills"][number]["references"] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const references = (metadata as { references?: unknown }).references;
  if (!Array.isArray(references)) {
    return [];
  }
  return references
    .filter((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const ref = item as Record<string, unknown>;
      return (
        typeof ref.id === "string" &&
        ref.id.trim().length > 0 &&
        typeof ref.title === "string" &&
        ref.title.trim().length > 0 &&
        typeof ref.content === "string" &&
        ref.content.trim().length > 0
      );
    })
    .map((item) => {
      const ref = item as {
        id: string;
        title: string;
        content: string;
        description?: string | null;
      };
      return {
        id: ref.id.trim(),
        title: ref.title.trim(),
        content: ref.content,
        description: ref.description ?? null,
      };
    });
}
