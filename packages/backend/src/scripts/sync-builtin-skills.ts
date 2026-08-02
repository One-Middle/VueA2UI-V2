/**
 * 内置 Skill 同步脚本。
 *
 * 职责：
 * - 从 @a2ui-platform/agent 的 skills/ 注册表读取所有内置 Skill 定义
 * - platform Skill 从代码种子读取，builtin 示例 Skill 从 .md 读取
 * - 按 name + sourceType 匹配已有数据库记录
 * - 已有 → 更新 content + 版本号 +1 + isActive=true + 恢复软删除
 * - 不存在 → 创建新记录
 * - 文件缺失或内容为空 → skip
 *
 * 用法：pnpm skill:sync
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUILTIN_SKILLS,
  getPlatformAutoEnabledSkills,
} from "@a2ui-platform/agent";
import { prisma } from "../db.js";

// ─── 路径解析 ──────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
// packages/backend/src/scripts/ → packages/agent/src/skills/
const skillsDir = resolve(__dirname, "../../../agent/src/skills");

// ─── 类型 ──────────────────────────────────────────────

interface FrontmatterMeta {
  name?: string;
  description?: string;
  version?: number;
}

interface LocalSkillDefinition {
  name: string;
  description: string | null;
  content: string;
  version: number;
  metadata: Record<string, unknown>;
}

interface SyncResult {
  created: string[];
  updated: string[];
  skipped: Array<{ name: string; reason: string }>;
}

// ─── Frontmatter 解析 ──────────────────────────────────

/**
 * 解析 .md 文件中的 frontmatter 和 body。
 * Frontmatter 格式：
 * ---
 * name: "显示名称"
 * description: "描述"
 * version: 1
 * ---
 */
function parseFrontmatter(raw: string): FrontmatterMeta & { content: string } {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("---")) {
    return { content: trimmed };
  }

  const secondSep = trimmed.indexOf("---", 3);
  if (secondSep === -1) {
    return { content: trimmed };
  }

  const fmBlock = trimmed.slice(3, secondSep).trim();
  const body = trimmed.slice(secondSep + 3).trim();

  const meta: Record<string, string> = {};
  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // 去除首尾引号包裹
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return {
    name: meta["name"],
    description: meta["description"],
    version: meta["version"] ? parseInt(meta["version"], 10) : undefined,
    content: body,
  };
}

// ─── 同步逻辑 ──────────────────────────────────────────

async function syncBuiltinSkills(): Promise<SyncResult> {
  const result: SyncResult = { created: [], updated: [], skipped: [] };
  const platformSkillsById = new Map(
    getPlatformAutoEnabledSkills().map((skill) => [skill.id, skill]),
  );

  for (const meta of BUILTIN_SKILLS) {
    const definition = loadLocalSkillDefinition(meta, platformSkillsById);
    if (!definition.ok) {
      result.skipped.push({
        name: meta.name,
        reason: definition.reason,
      });
      console.info(`  [SKIP] ${meta.name} — ${definition.reason}`);
      continue;
    }

    const { name, description, content, version } = definition.skill;

    if (!content.trim()) {
      result.skipped.push({
        name,
        reason: "Skill 内容为空",
      });
      console.info(`  [SKIP] ${name} — 内容为空`);
      continue;
    }

    const metadata = {
      ...definition.skill.metadata,
      builtinId: meta.id,
      sourceFile: meta.file,
      frontendVisible: meta.frontendVisible ?? true,
      editable: meta.editable ?? true,
      runtimeEnabled: meta.runtimeEnabled ?? false,
    };

    // platform Skill 首次迁移时可能已有旧 sourceType=builtin 记录，按 name 接管旧记录。
    // 其他本地 Skill 继续按 name + sourceType 匹配，避免和手工 Skill 混淆。
    const existing = await prisma.skill.findFirst({
      where:
        meta.sourceType === "platform"
          ? { name }
          : { name, sourceType: meta.sourceType },
    });

    if (existing) {
      await prisma.skill.update({
        where: { id: existing.id },
        data: {
          description,
          content,
          sourceType: meta.sourceType,
          version: existing.version + 1,
          isActive: true,
          metadata,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });
      result.updated.push(name);
      console.info(
        `  [UPDATED] ${name} (v${existing.version} → v${existing.version + 1})`,
      );
    } else {
      await prisma.skill.create({
        data: {
          name,
          description,
          content,
          sourceType: meta.sourceType,
          version,
          isActive: true,
          metadata,
        },
      });
      result.created.push(name);
      console.info(`  [CREATED] ${name} (v${version})`);
    }
  }

  return result;
}

function loadLocalSkillDefinition(
  meta: (typeof BUILTIN_SKILLS)[number],
  platformSkillsById: Map<string, ReturnType<typeof getPlatformAutoEnabledSkills>[number]>,
):
  | { ok: true; skill: LocalSkillDefinition }
  | { ok: false; reason: string } {
  if (meta.sourceType === "platform") {
    const skill = platformSkillsById.get(meta.id);
    if (!skill) {
      return { ok: false, reason: `platform 代码种子不存在: ${meta.id}` };
    }
    return {
      ok: true,
      skill: {
        name: skill.name,
        description: skill.description ?? meta.description ?? null,
        content: skill.content,
        version: meta.version ?? 1,
        metadata: toMetadataObject(skill.metadata),
      },
    };
  }

  const filePath = resolve(skillsDir, meta.file);
  if (!existsSync(filePath)) {
    return { ok: false, reason: `文件不存在: ${filePath}` };
  }

  const raw = readFileSync(filePath, "utf-8");
  const parsed = parseFrontmatter(raw);
  return {
    ok: true,
    skill: {
      name: parsed.name ?? meta.name,
      description: parsed.description ?? meta.description ?? null,
      content: parsed.content,
      version: parsed.version ?? meta.version ?? 1,
      metadata: {},
    },
  };
}

function toMetadataObject(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as Record<string, unknown>;
}

// ─── 入口 ──────────────────────────────────────────────

console.info("=== 内置 Skill 同步 ===\n");
console.info(`Skills 目录: ${skillsDir}`);
console.info(`注册 Skill 数: ${BUILTIN_SKILLS.length}\n`);

syncBuiltinSkills()
  .then((result) => {
    const total =
      result.created.length + result.updated.length + result.skipped.length;
    console.info(
      `\n同步完成：${result.created.length} 新建，${result.updated.length} 更新，${result.skipped.length} 跳过（共 ${total} 项）`,
    );
    if (result.skipped.length > 0) {
      for (const s of result.skipped) {
        console.info(`  跳过: ${s.name} — ${s.reason}`);
      }
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("同步失败:", err);
    process.exit(1);
  });
