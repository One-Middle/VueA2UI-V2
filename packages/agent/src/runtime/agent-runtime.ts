import type { AgentRunInput, AgentRunResult } from "@a2ui-platform/shared";

export class AgentRuntime {
  async run(input: AgentRunInput): Promise<AgentRunResult> {
    return {
      status: "TEXT_ONLY",
      assistantMessage: `已收到需求：${input.userMessage}`,
      a2uiMessages: [],
      attemptCount: 0
    };
  }
}
