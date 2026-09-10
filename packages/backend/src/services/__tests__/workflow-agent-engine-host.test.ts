import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentEngineRepository } from "../../repositories/agent-engine.repository.js";
import { cancellationService } from "../cancellation.service.js";
import { streamService } from "../stream.service.js";
import { WorkflowAgentEngineHost } from "../workflow-agent-engine-host.js";

vi.mock("../../repositories/agent-engine.repository.js", () => ({
  agentEngineRepository: { createEvent: vi.fn() },
}));
vi.mock("../cancellation.service.js", () => ({
  cancellationService: { isCancelled: vi.fn() },
}));
vi.mock("../stream.service.js", () => ({
  streamService: { send: vi.fn() },
}));

describe("WorkflowAgentEngineHost", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(cancellationService.isCancelled).mockReturnValue(false);
    vi.mocked(agentEngineRepository.createEvent).mockResolvedValue({} as never);
  });

  function createHost(maxContextBytes = 100, maxEvents = 100) {
    return new WorkflowAgentEngineHost({
      sessionId: "session-a",
      workflowId: "workflow-a",
      agentRunId: "run-a",
      maxContextBytes,
      maxEvents,
      materials: [{
        materialId: "plan",
        version: "v1",
        kind: "workflow_plan",
        title: "Plan",
        summary: "plan summary",
        byteLength: 10,
        readable: true,
        content: { markdown: "# Plan" },
      }],
      capabilities: { echo: async (input) => input },
    });
  }

  it("checks material version and context byte budget, and writes semantic read events", async () => {
    const host = createHost(10);
    await expect(host.readContext({ materialId: "plan", expectedVersion: "v0" })).rejects.toThrow("版本已过期");
    await expect(host.readContext({ materialId: "plan", expectedVersion: "v1" })).resolves.toMatchObject({ materialId: "plan", version: "v1" });
    expect(agentEngineRepository.createEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "context_read", sequence: 1 }));
    expect(streamService.send).toHaveBeenCalledWith("session-a", expect.objectContaining({ event: "agent_engine_event" }));
  });

  it("rejects duplicate callId and cancellation before capability execution", async () => {
    const host = createHost();
    await expect(host.invokeCapability({ callId: "call-1", capability: "echo", input: { ok: true } })).resolves.toEqual({ callId: "call-1", output: { ok: true } });
    await expect(host.invokeCapability({ callId: "call-1", capability: "echo", input: {} })).rejects.toThrow("不可重复");
    vi.mocked(cancellationService.isCancelled).mockReturnValue(true);
    await expect(host.invokeCapability({ callId: "call-2", capability: "echo", input: {} })).rejects.toThrow("已取消");
  });

  it("requires strictly increasing adapter event sequences", async () => {
    const host = createHost();
    await host.emit({ sequence: 1, type: "run_started", occurredAt: new Date().toISOString(), summary: {} });
    await expect(host.emit({ sequence: 1, type: "run_finished", occurredAt: new Date().toISOString(), summary: {} })).rejects.toThrow("严格递增");
  });

  it("assigns a single persisted sequence when Host events interleave adapter events", async () => {
    const host = createHost();
    await host.emit({ sequence: 1, type: "run_started", occurredAt: new Date().toISOString(), summary: {} });
    await host.readContext({ materialId: "plan" });
    await host.emit({ sequence: 2, type: "run_finished", occurredAt: new Date().toISOString(), summary: {} });

    expect(agentEngineRepository.createEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({ sequence: 1, eventType: "run_started" }));
    expect(agentEngineRepository.createEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({ sequence: 2, eventType: "context_read" }));
    expect(agentEngineRepository.createEvent).toHaveBeenNthCalledWith(3, expect.objectContaining({ sequence: 3, eventType: "run_finished" }));
  });

  it("rejects events after the configured event budget", async () => {
    const host = createHost(100, 1);
    await host.emit({ sequence: 1, type: "run_started", occurredAt: new Date().toISOString(), summary: {} });
    await expect(host.emit({ sequence: 2, type: "run_finished", occurredAt: new Date().toISOString(), summary: {} })).rejects.toThrow("预算已耗尽");
  });
});
