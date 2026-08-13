/**
 * SSE（Server-Sent Events）事件类型定义。
 *
 * 职责：
 * - 定义 Agent 运行阶段枚举（AgentRunPhase）。
 * - 定义 SSE 事件名称联合类型（ServerSentEventName）。
 * - 定义平台 SSE 事件的完整类型结构（PlatformSseEvent）。
 *
 * 不负责：SSE 连接的建立与维护、事件发送逻辑。
 */

import type {
  A2UIEventDto,
  AgentRunDto,
  AgentWorkflowDto,
  MessageDto,
  SurfaceSnapshotDto,
  ToolCallDto,
  WorkflowArtifactDto,
  WorkflowStepDto,
} from "./api";

/** Agent 运行阶段。 */
export type AgentRunPhase =
  | "PREPARE_CONTEXT"
  | "GENERATE_DRAFT"
  | "VALIDATE_DRAFT"
  | "REPAIR_DRAFT"
  | "COMMIT"
  | "FAILED";

/** SSE 事件名称，对应后端推送的各类事件。 */
export type ServerSentEventName =
  | "heartbeat"
  | "agent_run_started"
  | "agent_run_attempt"
  | "agent_run_completed"
  | "assistant_message"
  | "a2ui_messages"
  | "surface_snapshot"
  | "agent_run_failed"
  | "workflow_started"
  | "workflow_step_updated"
  | "workflow_artifact_created"
  | "workflow_completed"
  | "workflow_failed";

/** 平台 SSE 事件的完整类型联合，按 event 字段区分数据载荷。 */
export type PlatformSseEvent =
  | {
      /** 心跳事件 */
      event: "heartbeat";
      data: { time: string };
    }
  | {
      /** Agent 运行开始事件 */
      event: "agent_run_started";
      data: { sessionId: string; agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "maxAttempts"> };
    }
  | {
      /** Agent 运行单次尝试事件 */
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
      /** Agent 运行完成事件 */
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
      /** AI 辅助回复消息事件 */
      event: "assistant_message";
      data: { sessionId: string; message: MessageDto };
    }
  | {
      /** A2UI 消息事件（携带校验通过的 A2UI 消息） */
      event: "a2ui_messages";
      data: { sessionId: string; a2uiEvent: A2UIEventDto };
    }
  | {
      /** Surface 快照事件 */
      event: "surface_snapshot";
      data: { sessionId: string; snapshot: SurfaceSnapshotDto };
    }
  | {
      /** Agent 运行失败事件 */
      event: "agent_run_failed";
      data: {
        sessionId: string;
        agentRun: Pick<AgentRunDto, "id" | "status" | "attemptCount" | "failureReason">;
        message: MessageDto;
      };
    }
  | {
      /** Agent Workflow 开始事件 */
      event: "workflow_started";
      data: { sessionId: string; workflow: AgentWorkflowDto };
    }
  | {
      /** Workflow Step 更新事件 */
      event: "workflow_step_updated";
      data: { sessionId: string; workflowId: string; step: WorkflowStepDto };
    }
  | {
      /** Workflow Artifact 创建事件 */
      event: "workflow_artifact_created";
      data: { sessionId: string; workflowId: string; artifact: WorkflowArtifactDto };
    }
  | {
      /** Agent Workflow 完成事件 */
      event: "workflow_completed";
      data: { sessionId: string; workflow: AgentWorkflowDto };
    }
  | {
      /** Agent Workflow 失败事件 */
      event: "workflow_failed";
      data: { sessionId: string; workflow: AgentWorkflowDto; failedStep?: WorkflowStepDto };
    };
