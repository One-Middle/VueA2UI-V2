import type { AgentRunInput, AgentRunResult } from "@a2ui-platform/shared";
import { config } from "./config.js";

/**
 * Mock Agent Run——在真实模型可用前，返回固定的 A2UI 示例页面。
 * 输入输出类型与真实 agent 调用接口完全对齐。
 */
export async function mockAgentRun(input: AgentRunInput): Promise<AgentRunResult> {
  return {
    status: "COMMITTED",
    assistantMessage: "已生成一个简单页面。",
    a2uiMessages: [
      { version: "v0.9", createSurface: { surfaceId: "main", catalogId: config.catalog.id } },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "main",
          components: [
            { id: "root", component: "Column", children: ["title", "desc", "btn-row"] },
            { id: "title", component: "Text", text: "Hello A2UI", usageHint: "h1" },
            { id: "desc", component: "Text", text: "这是一个由 A2UI 生成的示例页面。", usageHint: "body" },
            { id: "btn-row", component: "Row", children: ["btn", "btn2"] },
            { id: "btn", component: "Button", child: "btn-text" },
            { id: "btn-text", component: "Text", text: "确认" },
            { id: "btn2", component: "Button", child: "btn2-text" },
            { id: "btn2-text", component: "Text", text: "取消" },
          ],
        },
      },
    ],
    attemptCount: 1,
    validation: { valid: true, errors: [], warnings: [], normalizedMessages: [] },
  };
}
