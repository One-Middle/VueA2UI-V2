import { describe, expect, it, vi } from "vitest";
import { connectStream } from "../stream";

describe("connectStream", () => {
  it("parses an SSE frame split across reader chunks", async () => {
    const completed = vi.fn();
    const payload = {
      sessionId: "session-a",
      agentRun: {
        id: "run-a",
        status: "committed",
        attemptCount: 1,
        assistantMessageId: "message-a",
        outputSnapshotId: null,
        completedAt: "2026-01-01T00:00:01.000Z",
      },
    };
    const chunks = [
      "id: 1\nevent: agent_run_completed\n",
      `data: ${JSON.stringify(payload)}\n\n`,
    ];

    vi.stubGlobal("fetch", vi.fn(async () => makeStreamResponse(chunks)));

    const connection = connectStream("session-a", {
      agent_run_completed: completed,
    });

    await vi.waitFor(() => {
      expect(completed).toHaveBeenCalledWith(payload);
    });

    connection.close();
    vi.unstubAllGlobals();
  });
});

function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    ok: true,
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) {
              return { done: true, value: undefined };
            }
            const value = encoder.encode(chunks[index]);
            index += 1;
            return { done: false, value };
          },
        };
      },
    },
  } as unknown as Response;
}
