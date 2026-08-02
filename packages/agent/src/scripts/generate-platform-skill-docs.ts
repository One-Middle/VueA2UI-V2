/**
 * 平台 Skill 文档镜像生成脚本。
 *
 * 职责：
 * - 从平台 Skill 的 TS 权威定义生成同名目录下的 SKILL.md
 * - 将 Skill.references 生成到 references/*.md
 *
 * 不负责：
 * - 运行时 Skill 注入，运行时仍由后端 Skill Resolver 决定
 * - 数据库同步，数据库同步见 backend 的 sync-builtin-skills 脚本
 *
 * 注意：
 * - 生成文件只是开发期可读镜像，不是平台 Skill 的权威源。
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformAutoEnabledSkills } from "../skills/platform-skills.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = resolve(__dirname, "../skills");

/** 生成所有平台 Skill 的 Markdown 镜像。 */
async function generatePlatformSkillDocs(): Promise<void> {
  const skills = getPlatformAutoEnabledSkills();

  for (const skill of skills) {
    const skillFolderName = toSafePathSegment(
      skill.id.replace(/^builtin:/, ""),
    );
    const skillDir = resolve(skillsDir, skillFolderName);
    const referencesDir = resolve(skillDir, "references");

    await mkdir(skillDir, { recursive: true });
    await writeFile(resolve(skillDir, "SKILL.md"), buildSkillMarkdown(skill), {
      encoding: "utf-8",
    });

    await rm(referencesDir, { recursive: true, force: true });
    await mkdir(referencesDir, { recursive: true });

    for (const reference of skill.references ?? []) {
      await writeFile(
        resolve(referencesDir, `${toSafePathSegment(reference.id)}.md`),
        buildReferenceMarkdown(skill.name, reference),
        { encoding: "utf-8" },
      );
    }

    console.info(
      `[generated] ${skill.name}: ${skillFolderName}/SKILL.md, ${skill.references?.length ?? 0} references`,
    );
  }
}

function buildSkillMarkdown(
  skill: ReturnType<typeof getPlatformAutoEnabledSkills>[number],
): string {
  const references = skill.references ?? [];
  const lines = [
    "<!--",
    "自动生成文件，请勿手动修改。",
    "权威源：packages/agent/src/skills/*.ts",
    "生成命令：pnpm --filter @a2ui-platform/agent skill:docs",
    "-->",
    "",
    "---",
    `name: "${escapeFrontmatterValue(skill.name)}"`,
    `description: "${escapeFrontmatterValue(skill.description ?? "")}"`,
    `sourceType: "${escapeFrontmatterValue(skill.sourceType ?? "platform")}"`,
    "---",
    "",
    skill.content.trim(),
  ];

  if (references.length > 0) {
    lines.push("", "## References", "");
    for (const reference of references) {
      const fileName = `${toSafePathSegment(reference.id)}.md`;
      lines.push(
        `- [${reference.title}](./references/${fileName})：${reference.description ?? ""}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildReferenceMarkdown(
  skillName: string,
  reference: NonNullable<
    ReturnType<typeof getPlatformAutoEnabledSkills>[number]["references"]
  >[number],
): string {
  return [
    "<!--",
    "自动生成文件，请勿手动修改。",
    "权威源：packages/agent/src/skills/*.ts",
    "生成命令：pnpm --filter @a2ui-platform/agent skill:docs",
    "-->",
    "",
    "---",
    `skill: "${escapeFrontmatterValue(skillName)}"`,
    `id: "${escapeFrontmatterValue(reference.id)}"`,
    `title: "${escapeFrontmatterValue(reference.title)}"`,
    `description: "${escapeFrontmatterValue(reference.description ?? "")}"`,
    "---",
    "",
    reference.content.trim(),
    "",
  ].join("\n");
}

function toSafePathSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    throw new Error(`无法生成安全路径片段: ${value}`);
  }
  return normalized;
}

function escapeFrontmatterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

generatePlatformSkillDocs().catch((error) => {
  console.error("平台 Skill 文档镜像生成失败:", error);
  process.exit(1);
});
