CREATE TABLE "agent_engine_bindings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workflow_id" UUID NOT NULL,
  "session_id" UUID NOT NULL, "engine_id" TEXT NOT NULL, "plugin_version" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}', "config_fingerprint" TEXT NOT NULL,
  "continuation" JSONB, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "agent_engine_bindings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_engine_bindings_workflow_id_key" UNIQUE ("workflow_id"),
  CONSTRAINT "agent_engine_bindings_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "agent_workflows"("id") ON DELETE CASCADE,
  CONSTRAINT "agent_engine_bindings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE
);
CREATE INDEX "agent_engine_bindings_session_id_engine_id_idx" ON "agent_engine_bindings"("session_id", "engine_id");
CREATE INDEX "agent_engine_bindings_engine_id_plugin_version_idx" ON "agent_engine_bindings"("engine_id", "plugin_version");

CREATE TABLE "agent_engine_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "agent_run_id" UUID NOT NULL,
  "session_id" UUID NOT NULL, "workflow_id" UUID, "sequence" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL, "occurred_at" TIMESTAMPTZ NOT NULL,
  "summary" JSONB NOT NULL DEFAULT '{}', "native_summary" JSONB,
  "failure_native_payload_encrypted" TEXT, "payload_expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "agent_engine_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_engine_events_agent_run_id_sequence_key" UNIQUE ("agent_run_id", "sequence"),
  CONSTRAINT "agent_engine_events_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "agent_engine_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "agent_engine_events_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "agent_workflows"("id") ON DELETE SET NULL
);
CREATE INDEX "agent_engine_events_agent_run_id_created_at_idx" ON "agent_engine_events"("agent_run_id", "created_at");
CREATE INDEX "agent_engine_events_workflow_id_created_at_idx" ON "agent_engine_events"("workflow_id", "created_at");
CREATE INDEX "agent_engine_events_payload_expires_at_idx" ON "agent_engine_events"("payload_expires_at");
