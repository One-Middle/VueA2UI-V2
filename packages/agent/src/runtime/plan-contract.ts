/**
 * Workflow Plan 的 Markdown 契约定义。
 *
 * 职责：
 * - 统一维护 plan_markdown 必须包含的标题。
 * - 提供标题说明、Markdown 骨架和缺失标题检测。
 *
 * 被引用：
 * - react-prompt-composer、tool-registry、workflow-task-parser、agent-runtime。
 * 注意：
 * - Plan 只描述页面效果与行为契约，不承载具体 A2UI 组件实现方案。
 */

/** plan_markdown 必须包含的标题，顺序即推荐展示顺序。 */
export const REQUIRED_PLAN_HEADINGS = [
  "页面目标",
  "视觉效果",
  "页面结构",
  "界面元素",
  "数据语义",
  "交互行为",
] as const;

/** 每个 Plan 标题下应覆盖的内容说明。 */
export const PLAN_HEADING_DESCRIPTIONS: Record<(typeof REQUIRED_PLAN_HEADINGS)[number], string> = {
  页面目标: "说明这个界面要帮助用户完成什么，以及完成后的理想结果。",
  视觉效果: "描述整体气质、信息层级和重点反馈，让用户能判断风格是否符合预期。",
  页面结构: "说明界面由哪些主要区域组成，以及这些区域的先后关系。",
  界面元素: "列出用户会看到或操作的关键元素，关注它们承担的作用。",
  数据语义: "说明界面围绕哪些业务数据展开，以及这些数据之间有什么关系。",
  交互行为: "说明用户可以做哪些操作，以及每个操作后界面应该如何变化。",
};

/** 用于 prompt 示例的最小 Markdown Plan 骨架。 */
export const PLAN_MARKDOWN_SKELETON = REQUIRED_PLAN_HEADINGS
  .map((heading) => `## ${heading}\\n...`)
  .join("\\n");

/** 生成标题列表文案。 */
export function formatPlanHeadingList(): string {
  return REQUIRED_PLAN_HEADINGS.join("、");
}

/** 生成每个标题的简短说明。 */
export function formatPlanHeadingGuide(): string {
  return REQUIRED_PLAN_HEADINGS
    .map((heading) => `- ${heading}：${PLAN_HEADING_DESCRIPTIONS[heading]}`)
    .join("\n");
}

/**
 * 返回 plan markdown 中缺失的必需标题。
 *
 * @param markdown - plan markdown 文本
 * @returns 缺失的标题列表（空数组表示齐全）。
 */
export function getMissingPlanHeadings(markdown: string): string[] {
  return REQUIRED_PLAN_HEADINGS.filter((heading) => {
    const pattern = new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\s*$`, "im");
    return !pattern.test(markdown);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
