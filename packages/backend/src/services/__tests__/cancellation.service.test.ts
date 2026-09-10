import { afterEach, describe, expect, it } from "vitest";
import { cancellationService } from "../cancellation.service.js";

describe("cancellationService", () => {
  const runId = "run-cancellation-test";

  afterEach(() => {
    cancellationService.unregister(runId);
  });

  it("aborts the SPI signal together with its in-memory cancellation marker", () => {
    const token = cancellationService.register(runId);

    cancellationService.cancel(runId, "user_cancelled");

    expect(cancellationService.isCancelled(runId)).toBe(true);
    expect(token.abortController.signal.aborted).toBe(true);
    expect(token.abortController.signal.reason).toBe("user_cancelled");
  });
});
