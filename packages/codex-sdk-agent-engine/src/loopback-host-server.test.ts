import { afterEach, describe, expect, it, vi } from "vitest";
import { createLoopbackHostServer, type LoopbackHostServer } from "./loopback-host-server.js";

describe("Codex loopback host server", () => {
  let server: LoopbackHostServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it("only accepts its short-lived bearer token and forwards generic context calls", async () => {
    const host = {
      listContext: vi.fn(),
      readContext: vi.fn().mockResolvedValue({ materialId: "plan", version: "v1", content: { markdown: "# plan" }, byteLength: 6 }),
      invokeCapability: vi.fn(),
      emit: vi.fn(),
      isCancelled: vi.fn().mockReturnValue(false),
    };
    server = await createLoopbackHostServer(host);

    const denied = await fetch(`${server.url}/context/read`, { method: "POST" });
    expect(denied.status).toBe(401);

    const accepted = await fetch(`${server.url}/context/read`, {
      method: "POST",
      headers: { authorization: `Bearer ${server.token}`, "content-type": "application/json" },
      body: JSON.stringify({ materialId: "plan", expectedVersion: "v1" }),
    });
    expect(accepted.status).toBe(200);
    expect(host.readContext).toHaveBeenCalledWith({ materialId: "plan", expectedVersion: "v1" });
    await expect(accepted.json()).resolves.toMatchObject({ materialId: "plan", version: "v1" });
  });
});
