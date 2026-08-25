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

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => makeStreamResponse(chunks)),
    );

    const connection = connectStream("session-a", {
      agent_run_completed: completed,
    });

    await vi.waitFor(() => {
      expect(completed).toHaveBeenCalledWith(payload);
    });

    connection.close();
    vi.unstubAllGlobals();
  });

  it("dispatches connected lifecycle when a connected frame arrives", async () => {
    const connected = vi.fn();
    const chunks = [
      "id: 1\nevent: connected\n",
      `data: ${JSON.stringify({ sessionId: "session-a", time: "2026-01-01T00:00:00.000Z" })}\n\n`,
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => makeStreamResponse(chunks)),
    );

    const connection = connectStream("session-a", {
      onConnected: connected,
    });

    await vi.waitFor(() => {
      expect(connected).toHaveBeenCalledWith({
        reconnect: false,
        lastEventId: "1",
      });
    });

    connection.close();
    vi.unstubAllGlobals();
  });

  it("marks connected lifecycle as reconnect after a failed attempt", async () => {
    vi.useFakeTimers();
    const connected = vi.fn();
    const reconnecting = vi.fn();
    const chunks = [
      "id: 2\nevent: connected\n",
      `data: ${JSON.stringify({ sessionId: "session-a", time: "2026-01-01T00:00:03.000Z" })}\n\n`,
    ];
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(makeStreamResponse(chunks));
    vi.stubGlobal("fetch", fetchMock);

    const connection = connectStream("session-a", {
      onConnected: connected,
      onReconnecting: reconnecting,
    });

    await vi.waitFor(() => {
      expect(reconnecting).toHaveBeenCalledWith(1);
    });

    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => {
      expect(connected).toHaveBeenCalledWith({
        reconnect: true,
        lastEventId: "2",
      });
    });

    connection.close();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reconnects when the response stream ends", async () => {
    vi.useFakeTimers();
    const connected = vi.fn();
    const reconnecting = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeStreamResponse([
          "id: 1\nevent: connected\n",
          `data: ${JSON.stringify({ sessionId: "session-a", time: "2026-01-01T00:00:00.000Z" })}\n\n`,
        ]),
      )
      .mockResolvedValueOnce(
        makeStreamResponse([
          "id: 2\nevent: connected\n",
          `data: ${JSON.stringify({ sessionId: "session-a", time: "2026-01-01T00:00:03.000Z" })}\n\n`,
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const connection = connectStream("session-a", {
      onConnected: connected,
      onReconnecting: reconnecting,
    });

    await vi.waitFor(() => {
      expect(connected).toHaveBeenCalledWith({
        reconnect: false,
        lastEventId: "1",
      });
      expect(reconnecting).toHaveBeenCalledWith(1);
    });

    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => {
      expect(connected).toHaveBeenCalledWith({
        reconnect: true,
        lastEventId: "2",
      });
    });

    connection.close();
    vi.useRealTimers();
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
