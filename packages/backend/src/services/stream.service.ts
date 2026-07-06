import type { Response } from "express";
import type { PlatformSseEvent } from "@a2ui-platform/shared";
import { logger } from "../logger.js";

interface SseClient {
  id: string;
  res: Response;
}

/**
 * SSE 连接管理器。
 * 维护 sessionId → 客户端列表 的映射，支持多客户端和心跳。
 */
class StreamService {
  private clients = new Map<string, SseClient[]>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private streamSequence = 0;

  /**
   * 建立 SSE 连接。
   */
  connect(sessionId: string, res: Response): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // 发送初始连接确认
    this.sendRaw(res, "connected", { sessionId, time: new Date().toISOString() });

    const client: SseClient = { id: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, res };

    const existing = this.clients.get(sessionId) ?? [];
    existing.push(client);
    this.clients.set(sessionId, existing);

    logger.info({ sessionId, clientCount: existing.length }, "SSE client connected");

    // 客户端断开时清理
    res.on("close", () => {
      this.removeClient(sessionId, client.id);
    });

    // 启动心跳（如果尚未启动）
    this.ensureHeartbeat();
  }

  /**
   * 向指定 session 的所有客户端发送事件。
   */
  send(sessionId: string, event: PlatformSseEvent): void {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) return;

    const data = JSON.stringify(event.data);
    for (const client of clients) {
      this.sendRaw(client.res, event.event, event.data);
    }
  }

  /**
   * 断开指定 session 的所有连接。
   */
  disconnectAll(sessionId: string): void {
    const clients = this.clients.get(sessionId);
    if (!clients) return;
    for (const client of clients) {
      try {
        client.res.end();
      } catch {
        // 忽略关闭错误
      }
    }
    this.clients.delete(sessionId);
    logger.info({ sessionId }, "All SSE clients disconnected for session");
  }

  /**
   * 发送心跳。
   */
  private sendHeartbeat(): void {
    const data = JSON.stringify({ time: new Date().toISOString() });
    for (const [, clients] of this.clients) {
      for (const client of clients) {
        try {
          client.res.write(`event: heartbeat\ndata: ${data}\n\n`);
        } catch {
          this.removeClientByRef(client);
        }
      }
    }
  }

  private sendRaw(res: Response, event: string, data: unknown): void {
    this.streamSequence++;
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    res.write(`id: ${this.streamSequence}\nevent: ${event}\ndata: ${payload}\n\n`);
  }

  private removeClient(sessionId: string, clientId: string): void {
    const clients = this.clients.get(sessionId);
    if (!clients) return;
    const filtered = clients.filter((c) => c.id !== clientId);
    if (filtered.length === 0) {
      this.clients.delete(sessionId);
    } else {
      this.clients.set(sessionId, filtered);
    }
    logger.info({ sessionId, clientId }, "SSE client disconnected");
    this.stopHeartbeatIfEmpty();
  }

  private removeClientByRef(client: SseClient): void {
    for (const [sessionId, clients] of this.clients) {
      const idx = clients.indexOf(client);
      if (idx !== -1) {
        clients.splice(idx, 1);
        if (clients.length === 0) {
          this.clients.delete(sessionId);
        }
        break;
      }
    }
    this.stopHeartbeatIfEmpty();
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 20_000);
    // 允许进程退出
    this.heartbeatInterval.unref?.();
  }

  private stopHeartbeatIfEmpty(): void {
    if (this.clients.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const streamService = new StreamService();
