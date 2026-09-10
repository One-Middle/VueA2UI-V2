/**
 * MessageProcessor 类：A2UI 服务端消息处理器。
 *
 * 遍历 A2UIServerMessage[]，根据消息类型分派到 SurfaceGroupModel：
 *   - createSurface → surfaceGroup.getOrCreate()
 *   - updateComponents → surfaceModel.updateComponents()
 *   - updateDataModel → surfaceModel.updateDataModel()
 *   - deleteSurface → surfaceGroup.delete()
 *
 * 只接受 version === "v0.9" 的消息。
 * 目标 surface 不存在时忽略该消息（记录 warning）。
 */

import type { A2UIServerMessage } from "@a2ui-platform/shared";
import { SurfaceGroupModel } from "./surface-model";
import { logger } from "../logger.js";

/** 消息处理结果 */
export interface ProcessMessagesResult {
  /** 成功接受并处理的消息数 */
  accepted: number;
  /** 本次处理涉及的 surfaceId 列表 */
  surfaceIds: string[];
}

export class MessageProcessor {
  private _surfaceGroup: SurfaceGroupModel;

  constructor(surfaceGroup: SurfaceGroupModel) {
    this._surfaceGroup = surfaceGroup;
  }

  /**
   * 处理一批 A2UI 服务端消息。
   * @param msgs 待处理的消息数组
   * @returns 接受的记录数和涉及的 surfaceIds
   */
  processMessages(msgs: A2UIServerMessage[]): ProcessMessagesResult {
    let accepted = 0;
    const surfaceIds = new Set<string>();

    logger.info(`处理 A2UI 消息 → ${msgs.length}条`);

    for (const msg of msgs) {
      // 只接受 v0.9 消息
      if (msg.version !== "v0.9") {
        logger.warn(`忽略非 v0.9 版本消息: ${msg.version}`);
        continue;
      }

      let handled = false;

      // ── createSurface ──────────────────────────────────
      if ("createSurface" in msg && msg.createSurface) {
        const payload = msg.createSurface;
        const surface = this._surfaceGroup.getOrCreate(
          payload.surfaceId,
          payload.catalogId
        );
        surface.createSurface();
        surfaceIds.add(payload.surfaceId);
        logger.info(`创建 Surface → surfaceId=${payload.surfaceId}, catalogId=${payload.catalogId}`);
        handled = true;
      }

      // ── updateComponents ───────────────────────────────
      if ("updateComponents" in msg && msg.updateComponents) {
        const { surfaceId, components } = msg.updateComponents;
        const surface = this._surfaceGroup.get(surfaceId);
        if (surface) {
          surface.updateComponents(components);
          surfaceIds.add(surfaceId);
          logger.debug(`更新组件 → surfaceId=${surfaceId}, ${components.length}个`);
          handled = true;
        } else {
          logger.warn(`updateComponents 目标 surface 不存在: "${surfaceId}"`);
        }
      }

      // ── updateDataModel ────────────────────────────────
      if ("updateDataModel" in msg && msg.updateDataModel) {
        const { surfaceId, path, value } = msg.updateDataModel;
        const surface = this._surfaceGroup.get(surfaceId);
        if (surface) {
          surface.updateDataModel(path, value ?? null);
          surfaceIds.add(surfaceId);
          logger.debug(`更新数据模型 → surfaceId=${surfaceId}, path=${path}`);
          handled = true;
        } else {
          logger.warn(`updateDataModel 目标 surface 不存在: "${surfaceId}"`);
        }
      }

      // ── deleteSurface ──────────────────────────────────
      if ("deleteSurface" in msg && msg.deleteSurface) {
        const { surfaceId } = msg.deleteSurface;
        this._surfaceGroup.delete(surfaceId);
        surfaceIds.add(surfaceId);
        handled = true;
      }

      if (handled) {
        accepted++;
      } else {
        logger.warn("无法识别的消息类型:", Object.keys(msg).join(", "));
      }
    }

    return { accepted, surfaceIds: [...surfaceIds] };
  }
}
