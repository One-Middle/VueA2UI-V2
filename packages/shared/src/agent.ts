import type { A2UIServerMessage, JsonObject, SurfaceSnapshotData } from "./a2ui";

export interface ValidationIssue {
  code: string;
  path?: string;
  message: string;
}

export interface ValidateA2UIInput {
  messages: A2UIServerMessage[];
  catalogId: string;
  currentSnapshot?: SurfaceSnapshotData | null;
}

export interface ValidateA2UIResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  normalizedMessages: A2UIServerMessage[];
}

export interface AgentRunInput {
  sessionId: string;
  userMessage: string;
  recentMessages: Array<{ role: string; content: string }>;
  uploadedFiles: Array<{ id: string; originalName: string; content: string }>;
  enabledSkills: Array<{ id: string; name: string; content: string }>;
  currentSnapshot: SurfaceSnapshotData | null;
  catalogId: string;
  catalogVersion: string;
  rendererVersion: string;
  model: {
    provider: string;
    name: string;
    config: JsonObject;
  };
}

export type AgentRunResult =
  | {
      status: "COMMITTED";
      assistantMessage: string;
      a2uiMessages: A2UIServerMessage[];
      attemptCount: number;
      validation: ValidateA2UIResult;
      tokenUsage?: JsonObject;
    }
  | {
      status: "TEXT_ONLY";
      assistantMessage: string;
      a2uiMessages: [];
      attemptCount: number;
      tokenUsage?: JsonObject;
    }
  | {
      status: "FAILED";
      assistantMessage: string;
      attemptCount: number;
      validation?: ValidateA2UIResult;
      failureReason: string;
    };

export interface ToolCallRecord {
  toolName: string;
  status: "running" | "succeeded" | "failed";
  attemptIndex: number;
  inputSummary: JsonObject;
  output?: JsonObject;
  errorMessage?: string;
  durationMs?: number;
}
