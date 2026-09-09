import { createServer, type IncomingMessage } from "node:http";
import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { AgentEngineHost, CapabilityInvocation, ReadContextInput } from "@a2ui-platform/agent-engine-spi";

/** 单次 Codex turn 的本地 Host bridge；绝不监听非 loopback 地址。 */
export interface LoopbackHostServer {
  url: string;
  token: string;
  close(): Promise<void>;
}

/**
 * 将 Host 的两个可调用能力暴露为短生命周期 HTTP endpoint。
 * token 由 adapter 随当前 turn 生成，server 在 run 结束后立即关闭。
 */
export async function createLoopbackHostServer(host: AgentEngineHost): Promise<LoopbackHostServer> {
  const token = randomBytes(24).toString("base64url");
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401).end();
      return;
    }
    try {
      const body = await readJson(request);
      const result = request.url === "/context/read"
        ? await host.readContext(body as ReadContextInput)
        : request.url === "/capability/invoke"
          ? await host.invokeCapability(body as CapabilityInvocation)
          : undefined;
      if (result === undefined) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    token,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

/** 限制 request body，避免本地 bridge 被意外用作大 payload 通道。 */
function readJson(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let text = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      text += chunk;
      if (text.length > 1_000_000) reject(new Error("loopback host request 超过 1MB"));
    });
    request.on("error", reject);
    request.on("end", () => {
      try { resolve(JSON.parse(text)); } catch { reject(new Error("loopback host request 不是 JSON")); }
    });
  });
}
