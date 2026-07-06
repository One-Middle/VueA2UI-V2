import type { RendererActionRequest, RendererErrorRequest, RendererEventDto } from "@a2ui-platform/shared";
import type { Prisma } from "@prisma/client";
import { logger } from "../logger.js";
import { rendererEventRepository } from "../repositories/renderer-event.repository.js";

/**
 * Renderer 事件记录服务——存储前端 Renderer 上报的 action/error。
 */
export const rendererEventService = {
  /**
   * 记录 renderer action。
   */
  async recordAction(
    sessionId: string,
    payload: RendererActionRequest
  ): Promise<{ event: RendererEventDto }> {
    const actionPayload = "action" in payload ? payload.action : null;
    const event = await rendererEventRepository.create({
      session: { connect: { id: sessionId } },
      eventType: "action",
      surfaceId: actionPayload?.surfaceId ?? "",
      sourceComponentId: actionPayload?.sourceComponentId ?? null,
      name: actionPayload?.name ?? null,
      payload: payload as unknown as Prisma.InputJsonValue,
      handled: false,
      metadata: {},
    });

    logger.info({ sessionId, eventId: event.id }, "Renderer action 已记录");
    return {
      event: {
        id: event.id,
        eventType: event.eventType as RendererEventDto["eventType"],
        handled: event.handled,
      },
    };
  },

  /**
   * 记录 renderer error。
   */
  async recordError(
    sessionId: string,
    payload: RendererErrorRequest
  ): Promise<{ event: RendererEventDto }> {
    const errorPayload = "error" in payload ? payload.error : null;
    const event = await rendererEventRepository.create({
      session: { connect: { id: sessionId } },
      eventType: "error",
      surfaceId: errorPayload?.surfaceId ?? "",
      sourceComponentId: null,
      name: errorPayload?.code ?? null,
      payload: payload as unknown as Prisma.InputJsonValue,
      handled: false,
      metadata: {},
    });

    logger.info({ sessionId, eventId: event.id }, "Renderer error 已记录");
    return {
      event: {
        id: event.id,
        eventType: event.eventType as RendererEventDto["eventType"],
        handled: event.handled,
      },
    };
  },
};
