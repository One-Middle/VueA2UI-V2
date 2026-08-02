/**
 * Builtin Skill 注册表。
 *
 * 职责：
 * - 声明所有本地 Skill 的元数据（ID、名称、文件名、来源、展示/编辑策略）
 * - 作为 sync-builtin-skills 脚本的唯一数据源
 *
 * 不负责：具体 Skill 内容（见对应的 .md/.ts 文件）、数据库操作
 */

export interface BuiltinSkillMeta {
  /** Skill 稳定 ID。platform/builtin 前缀保留给平台本地 Skill。 */
  id: string;
  /** Skill 显示名称 */
  name: string;
  /** 源文件名（相对于 skills 目录）。platform 通常是 .ts，builtin 示例可为 .md。 */
  file: string;
  /** 本地 Skill 来源类型：platform 为运行时强依赖，builtin 为可同步内置示例/模板。 */
  sourceType: "platform" | "builtin";
  /** 默认描述（可被 frontmatter 中的 description 覆盖） */
  description?: string;
  /** 默认版本号（可被 frontmatter 中的 version 覆盖，默认 1） */
  version?: number;
  /** 是否由 Agent Runtime 默认启用并参与披露。 */
  runtimeEnabled?: boolean;
  /** 是否默认在前端 Skill 列表展示。 */
  frontendVisible?: boolean;
  /** 是否允许在前端修改。 */
  editable?: boolean;
}

/**
 * 所有内置 Skill 的定义列表。
 * 添加新 Skill 时只需在此数组中追加一个条目。
 */
export const BUILTIN_SKILLS: BuiltinSkillMeta[] = [
  {
    id: "builtin:a2ui-v0.9-generation",
    name: "A2UI v0.9 组件消息生成",
    file: "a2ui-v0.9-generation.ts",
    sourceType: "platform",
    description:
      "用于生成、修改或修复合法 A2UI v0.9 server-to-client 组件消息；当用户要求创建或修改 UI 时必须使用。",
    version: 1,
    runtimeEnabled: true,
    frontendVisible: false,
    editable: false,
  },
  {
    id: "builtin:hello-world",
    name: "Hello World",
    file: "hello-world.md",
    sourceType: "builtin",
    description: "一个简单的示例 Skill，用于生成欢迎页或入门介绍页面。",
    version: 1,
    runtimeEnabled: false,
    frontendVisible: true,
    editable: true,
  },
];
