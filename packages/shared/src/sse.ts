import type { A2UIEventDto, AgentRunDto, MessageDto, SurfaceSnapshotDto, ToolCallDto } from "./api";

/** Agent 运行阶段。 */
export type AgentRunPhase =
  | "PREPARE_CONTEXT"
  | "GENERATE_DRAFT"
  | "VALIDATE_DRAFT"
  | "REPAIR_DRAFT"
  | "COMMIT"
  | "FAILED";

export type ServerSentEventName =
  | "heartbeat"
  | "agent_run_started"
  | "agent_run_attempt"
  | "agent_run_completed"
  | "assistant_message"
  | "a2ui_messages"
  | "surface_snapshot"
  | "agent_run_failed";

export type PlatformSseEvent =
  | {
      event: "heartbeat";
      data: { time: string };
    }
  | {
      event: "agent_run_started";
      data: { sessionId: string; agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "maxAttempts"> };
    }
  | {
      event: "agent_run_attempt";
      data: {
        sessionId: string;
        agentRunId: string;
        attemptIndex: number;
        phase: AgentRunPhase;
        toolCall?: ToolCallDto;
      };
    }
  | {
      event: "agent_run_completed";
      data: {
        sessionId: string;
        agentRun: Pick<
          AgentRunDto,
          "id" | "status" | "attemptCount" | "assistantMessageId" | "outputSnapshotId" | "completedAt"
        >;
      };
    }
  | {
      event: "assistant_message";
      data: { sessionId: string; message: MessageDto };
    }
  | {
      event: "a2ui_messages";
      data: { sessionId: string; a2uiEvent: A2UIEventDto };
    }
  | {
      event: "surface_snapshot";
      data: { sessionId: string; snapshot: SurfaceSnapshotDto };
    }
  | {
      event: "agent_run_failed";
      data: {
        sessionId: string;
        agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "failureReason">;
        message: MessageDto;
      };
    };
