/**
 * Builtin Skill 注册表。
 *
 * 职责：
 * - 声明所有内置 Skill 的元数据（名称、文件名、描述、版本）
 * - 作为 sync-builtin-skills 脚本的唯一数据源
 *
 * 不负责：具体 Skill 内容（见对应的 .md 文件）、数据库操作
 */

export interface BuiltinSkillMeta {
  /** Skill 显示名称 */
  name: string;
  /** .md 文件名（相对于 skills 目录） */
  file: string;
  /** 默认描述（可被 frontmatter 中的 description 覆盖） */
  description?: string;
  /** 默认版本号（可被 frontmatter 中的 version 覆盖，默认 1） */
  version?: number;
}

/**
 * 所有内置 Skill 的定义列表。
 * 添加新 Skill 时只需在此数组中追加一个条目。
 */
export const BUILTIN_SKILLS: BuiltinSkillMeta[] = [
  {
    name: "A2UI v0.9 组件消息生成",
    file: "a2ui-v0.9-generation.md",
    description:
      "用于生成、修改或修复合法 A2UI v0.9 server-to-client 组件消息；当用户要求创建或修改 UI 时必须使用。",
    version: 1,
  },
  {
    name: "Hello World",
    file: "hello-world.md",
    description: "一个简单的示例 Skill，用于生成欢迎页或入门介绍页面。",
    version: 1,
  },
];
