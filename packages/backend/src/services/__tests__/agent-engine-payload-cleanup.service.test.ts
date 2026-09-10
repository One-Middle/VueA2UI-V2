import { afterEach, describe, expect, it, vi } from "vitest";
import { agentEngineRepository } from "../../repositories/agent-engine.repository.js";
import { agentEnginePayloadCleanupService } from "../agent-engine-payload-cleanup.service.js";

vi.mock("../../repositories/agent-engine.repository.js", () => ({
  agentEngineRepository: { clearExpiredPayloads: vi.fn() },
}));
vi.mock("../../logger.js", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

describe("agentEnginePayloadCleanupService", () => {
  afterEach(() => {
    agentEnginePayloadCleanupService.stop();
    vi.restoreAllMocks();
  });

  it("only delegates cleanup of expired encrypted payloads to the repository", async () => {
    vi.mocked(agentEngineRepository.clearExpiredPayloads).mockResolvedValue({ count: 2 } as never);
    const now = new Date("2026-09-08T00:00:00.000Z");
    await expect(agentEnginePayloadCleanupService.runOnce(now)).resolves.toBe(2);
    expect(agentEngineRepository.clearExpiredPayloads).toHaveBeenCalledWith(now);
  });
});
