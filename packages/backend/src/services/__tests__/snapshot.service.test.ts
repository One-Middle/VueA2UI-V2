import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { a2uiEventRepository } from "../../repositories/a2ui-event.repository.js";
import { snapshotService } from "../snapshot.service.js";

vi.mock("../../repositories/a2ui-event.repository.js", () => ({
  a2uiEventRepository: { findBySessionId: vi.fn() },
}));

describe("snapshotService.computeFromEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the caller transaction so newly committed events are visible", async () => {
    const tx = {} as Prisma.TransactionClient;
    vi.mocked(a2uiEventRepository.findBySessionId).mockResolvedValue([{
      status: "committed",
      sequence: 1,
      messages: [{
        version: "v0.9",
        createSurface: { surfaceId: "main", catalogId: "basic" },
      }],
    }] as never);

    const snapshot = await snapshotService.computeFromEvents("session-a", tx);

    expect(a2uiEventRepository.findBySessionId).toHaveBeenCalledWith(
      "session-a",
      { limit: 1000 },
      tx,
    );
    expect(snapshot.surfaces.main).toMatchObject({ surfaceId: "main", catalogId: "basic" });
  });
});
