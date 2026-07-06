/**
 * SSE 客户端
 *
 * 使用 fetch + ReadableStream 连接服务器推送事件流，
 * 支持自动重连和 Last-Event-ID 恢复。
 */

import type { PlatformSseEvent, ServerSentEventName } from "@a2ui-platform/shared";

/** SSE 事件处理器映射 */
export type StreamHandlers = {
  [E in PlatformSseEvent["event"]]?: (data: Extract<PlatformSseEvent, { event: E }>["data"]) => void;
} & {
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
  onClosed?: () => void;
};

/** SSE 连接控制器 */
export interface StreamConnection {
  /** 主动关闭连接，停止重连 */
  close(): void;
}

/** 默认最大重试次数 */
const MAX_RETRIES = 5;

/** 重连延迟（毫秒） */
const RECONNECT_DELAY_MS = 3000;

/**
 * 连接 SSE 流
 * @param sessionId 会话 ID
 * @param handlers 事件处理器
 * @returns 连接控制器，可调用 close() 主动关闭
 */
export function connectStream(sessionId: string, handlers: StreamHandlers): StreamConnection {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
  const url = `${baseUrl}/sessions/${sessionId}/stream`;

  let lastEventId: string | null = null;
  let retryCount = 0;
  let aborted = false;
  let abortController: AbortController | null = null;

  const connect = async () => {
    // 如果已主动关闭，不再重连
    if (aborted) return;

    abortController = new AbortController();

    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    };
    if (lastEventId) {
      headers["Last-Event-ID"] = lastEventId;
    }

    try {
      const res = await fetch(url, {
        headers,
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`SSE 连接失败，HTTP ${res.status}`);
      }

      // 连接成功，重置重试计数
      retryCount = 0;

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE 帧
        const lines = buffer.split("\n");
        // 保留最后一个可能不完整的行
        buffer = lines.pop() ?? "";

        let currentEvent: string | null = null;
        let currentData: string | null = null;
        let currentId: string | null = null;

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            currentData = line.slice(6);
          } else if (line.startsWith("id: ")) {
            currentId = line.slice(4).trim();
          } else if (line === "") {
            // 空行表示一帧结束
            if (currentEvent && currentData) {
              try {
                const parsedData = JSON.parse(currentData);
                if (currentId) {
                  lastEventId = currentId;
                }

                // 调用对应事件处理器
                const handler = (handlers as Record<string, ((data: unknown) => void) | undefined>)[currentEvent];
                if (handler) {
                  handler(parsedData);
                }
              } catch {
                // JSON 解析失败，忽略此帧
              }
            }

            // 重置
            currentEvent = null;
            currentData = null;
            currentId = null;
          }
        }
      }
    } catch (err: unknown) {
      if (aborted) return;

      const error = err instanceof Error ? err : new Error(String(err));
      handlers.onError?.(error);

      // 尝试重连
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        handlers.onReconnecting?.(retryCount);
        await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
        connect();
      } else {
        handlers.onClosed?.();
      }
    }
  };

  // 启动连接
  connect();

  return {
    close() {
      aborted = true;
      abortController?.abort();
    },
  };
}
