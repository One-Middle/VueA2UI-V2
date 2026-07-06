import type { A2UIServerMessage, SurfaceSnapshotData, SurfaceState } from "@a2ui-platform/shared";
import { a2uiEventRepository } from "../repositories/a2ui-event.repository.js";
import { A2UI_VERSION } from "@a2ui-platform/shared";

/**
 * 快照计算服务——从所有 committed a2ui_events 按 sequence 回放，
 * 重建完整的 Surface 状态。
 */
export const snapshotService = {
  /**
   * 从所有 committed events 按 sequence 回放，构建完整 SurfaceSnapshotData。
   */
  async computeFromEvents(sessionId: string): Promise<SurfaceSnapshotData> {
    const events = await a2uiEventRepository.findBySessionId(sessionId, { limit: 1000 });
    // 过滤出已 committed 的事件
    const committedEvents = events.filter((e) => e.status === "committed");
    // 按 sequence 升序排列
    committedEvents.sort((a, b) => a.sequence - b.sequence);

    const surfaces: Record<string, SurfaceState> = {};

    for (const event of committedEvents) {
      const messages = event.messages as unknown as A2UIServerMessage[];
      for (const msg of messages) {
        this.applyMessage(msg, surfaces);
      }
    }

    return {
      version: A2UI_VERSION,
      surfaces,
    };
  },

  /**
   * 将单条 A2UI 消息应用到 surfaces map。
   */
  applyMessage(
    msg: A2UIServerMessage,
    surfaces: Record<string, SurfaceState>
  ): void {
    if ("createSurface" in msg && msg.createSurface) {
      const { surfaceId, catalogId, theme, sendDataModel } = msg.createSurface;
      surfaces[surfaceId] = {
        surfaceId,
        catalogId,
        theme,
        sendDataModel,
        components: {},
        dataModel: {},
      };
    }

    if ("updateComponents" in msg && msg.updateComponents) {
      const { surfaceId, components } = msg.updateComponents;
      const surface = surfaces[surfaceId];
      if (!surface) return; // 忽略不存在的 surface（防御性处理）
      for (const comp of components) {
        surface.components[comp.id] = comp;
      }
    }

    if ("updateDataModel" in msg && msg.updateDataModel) {
      const { surfaceId, value } = msg.updateDataModel;
      const surface = surfaces[surfaceId];
      if (!surface) return;
      if (value !== undefined) {
        surface.dataModel = value;
      }
    }

    if ("deleteSurface" in msg && msg.deleteSurface) {
      delete surfaces[msg.deleteSurface.surfaceId];
    }
  },

  /**
   * 统计 snapshot 中的 surface 数和 component 数。
   */
  getCounts(snapshot: SurfaceSnapshotData): { surfaceCount: number; componentCount: number } {
    let componentCount = 0;
    for (const surface of Object.values(snapshot.surfaces) as SurfaceState[]) {
      componentCount += Object.keys(surface.components).length;
    }
    return {
      surfaceCount: Object.keys(snapshot.surfaces).length,
      componentCount,
    };
  },
};
