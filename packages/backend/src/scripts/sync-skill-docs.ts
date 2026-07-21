/**
 * 数据库 Skill 文档镜像同步脚本。
 *
 * 职责：
 * - 从数据库读取未软删除的 Skill 记录
 * - 将 Skill 内容和 metadata.references 输出为后端目录下的 Markdown 文档
 * - 生成索引文件，方便开发时快速查看当前数据库中的 Skill 快照
 *
 * 不负责：
 * - 将文档内容反向写回数据库
 * - 读取任意本地 Skill 文件或执行 Skill 脚本
 *
 * 注意：
 * - 数据库仍是 Skill 的事实来源，本目录只是开发期可读镜像。
 * - 每次同步会重建 packages/backend/skill-docs/generated 目录，避免残留旧 Skill。
 */

import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SkillReference } from "@a2ui-platform/shared";
import { prisma } from "../db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "../..");
const docsRoot = resolve(backendRoot, "skill-docs");
const generatedRoot = resolve(docsRoot, "generated");

interface SkillDocRecord {
  id: string;
  name: string;
  description: string | null;
  content: string;
  sourceType: string;
  version: number;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface WrittenSkillDoc {
  skill: SkillDocRecord;
  folderName: string;
  references: SkillReference[];
}

/** 将数据库 metadata 中的 references 规范化为可写入文档的数组。 */
function normalizeSkillReferences(metadata: unknown): SkillReference[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const references = (metadata as { references?: unknown }).references;
  if (!Array.isArray(references)) {
    return [];
  }

  return references
    .filter((item): item is SkillReference => {
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
    .map((ref) => ({
      id: ref.id.trim(),
      title: ref.title.trim(),
      content: ref.content,
      description: ref.description ?? null,
    }));
}

/** 将数据库 ID、名称或标题转换为稳定的本地文档路径片段。 */
function toSafePathSegment(value: string): string {
  const normalized = value
    .trim()
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "untitled";
}

/** 转义 Markdown 表格单元格中的竖线和换行。 */
function escapeTableCell(value: string | null | undefined): string {
  return (value?.trim() || "-").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** 构建单个 Skill 的 Markdown 主文档。 */
function buildSkillMarkdown(skill: SkillDocRecord, references: SkillReference[]): string {
  const lines = [
    "---",
    `id: "${skill.id}"`,
    `name: "${skill.name.replace(/"/g, '\\"')}"`,
    `sourceType: "${skill.sourceType}"`,
    `version: ${skill.version}`,
    `isActive: ${skill.isActive}`,
    `createdAt: "${skill.createdAt.toISOString()}"`,
    `updatedAt: "${skill.updatedAt.toISOString()}"`,
    "---",
    "",
    `# ${skill.name}`,
    "",
    "## 元信息",
    "",
    `- ID：\`${skill.id}\``,
    `- 来源：\`${skill.sourceType}\``,
    `- 版本：v${skill.version}`,
    `- 状态：${skill.isActive ? "可用" : "禁用"}`,
    `- 创建时间：${skill.createdAt.toISOString()}`,
    `- 更新时间：${skill.updatedAt.toISOString()}`,
    "",
    "## 描述",
    "",
    skill.description?.trim() || "（无描述）",
    "",
    "## References",
    "",
  ];

  if (references.length === 0) {
    lines.push("（无 Reference）", "");
  } else {
    lines.push("| ID | 标题 | 描述 | 文档 |", "| --- | --- | --- | --- |");
    for (const ref of references) {
      const fileName = `${toSafePathSegment(ref.id)}.md`;
      lines.push(
        `| \`${escapeTableCell(ref.id)}\` | ${escapeTableCell(ref.title)} | ${escapeTableCell(ref.description)} | [${fileName}](./references/${fileName}) |`,
      );
    }
    lines.push("");
  }

  lines.push("## Skill Content", "", skill.content.trim() || "（内容为空）", "");
  return lines.join("\n");
}

/** 构建单个 Reference 的 Markdown 文档。 */
function buildReferenceMarkdown(skill: SkillDocRecord, reference: SkillReference): string {
  return [
    "---",
    `skillId: "${skill.id}"`,
    `skillName: "${skill.name.replace(/"/g, '\\"')}"`,
    `referenceId: "${reference.id.replace(/"/g, '\\"')}"`,
    `title: "${reference.title.replace(/"/g, '\\"')}"`,
    "---",
    "",
    `# ${reference.title}`,
    "",
    "## 所属 Skill",
    "",
    `- Skill：${skill.name}`,
    `- Skill ID：\`${skill.id}\``,
    `- Reference ID：\`${reference.id}\``,
    "",
    "## 描述",
    "",
    reference.description?.trim() || "（无描述）",
    "",
    "## Reference Content",
    "",
    reference.content.trim() || "（内容为空）",
    "",
  ].join("\n");
}

/** 构建总索引文档。 */
function buildIndexMarkdown(writtenDocs: WrittenSkillDoc[]): string {
  const lines = [
    "# 数据库 Skill 文档镜像",
    "",
    "> 本目录由 `pnpm --filter @a2ui-platform/backend skill:docs` 生成。数据库是事实来源，请不要把这里当作反向导入入口。",
    "",
    `同步时间：${new Date().toISOString()}`,
    "",
    "## Skill 列表",
    "",
    "| 名称 | 来源 | 版本 | 状态 | References | 文档 |",
    "| --- | --- | --- | --- | ---: | --- |",
  ];

  for (const item of writtenDocs) {
    const status = item.skill.isActive ? "可用" : "禁用";
    lines.push(
      `| ${escapeTableCell(item.skill.name)} | \`${escapeTableCell(item.skill.sourceType)}\` | v${item.skill.version} | ${status} | ${item.references.length} | [README.md](./generated/${item.folderName}/README.md) |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

/** 重建 generated 目录并写入所有 Skill 文档。 */
async function syncSkillDocs(): Promise<WrittenSkillDoc[]> {
  const skills = await prisma.skill.findMany({
    where: { deletedAt: null },
    orderBy: [{ sourceType: "asc" }, { name: "asc" }],
  });

  await mkdir(docsRoot, { recursive: true });
  if (existsSync(generatedRoot)) {
    await rm(generatedRoot, { recursive: true, force: true });
  }
  await mkdir(generatedRoot, { recursive: true });

  const writtenDocs: WrittenSkillDoc[] = [];
  const usedFolderNames = new Set<string>();

  for (const skill of skills) {
    const references = normalizeSkillReferences(skill.metadata);
    const baseFolderName = `${toSafePathSegment(skill.name)}--${skill.id.slice(0, 8)}`;
    let folderName = baseFolderName;
    let duplicateIndex = 2;
    while (usedFolderNames.has(folderName)) {
      folderName = `${baseFolderName}-${duplicateIndex}`;
      duplicateIndex += 1;
    }
    usedFolderNames.add(folderName);

    const skillDir = resolve(generatedRoot, folderName);
    const referencesDir = resolve(skillDir, "references");
    await mkdir(referencesDir, { recursive: true });

    await writeFile(
      resolve(skillDir, "README.md"),
      buildSkillMarkdown(skill, references),
      "utf-8",
    );

    for (const reference of references) {
      await writeFile(
        resolve(referencesDir, `${toSafePathSegment(reference.id)}.md`),
        buildReferenceMarkdown(skill, reference),
        "utf-8",
      );
    }

    writtenDocs.push({ skill, folderName, references });
  }

  await writeFile(resolve(docsRoot, "README.md"), buildIndexMarkdown(writtenDocs), "utf-8");
  return writtenDocs;
}

console.info("=== 数据库 Skill 文档镜像同步 ===\n");
console.info(`输出目录：${docsRoot}`);

syncSkillDocs()
  .then(async (writtenDocs) => {
    await prisma.$disconnect();
    const referenceCount = writtenDocs.reduce(
      (sum, item) => sum + item.references.length,
      0,
    );
    console.info(
      `同步完成：${writtenDocs.length} 个 Skill，${referenceCount} 个 Reference。`,
    );
    process.exit(0);
  })
  .catch(async (err) => {
    await prisma.$disconnect();
    console.error("同步失败：", err);
    process.exit(1);
  });
