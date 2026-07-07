/**
 * Renderer 状态管理
 *
 * 独立于 workspace store，管理 A2UI 消息累积和 Renderer 就绪状态。
 * 遵循 Renderer 内部状态不混入工作台 Pinia 的原则。
 */

import type { A2UIServerMessage } from "@a2ui-platform/shared";
import { defineStore } from "pinia";

export const useRendererStore = defineStore("renderer", {
  state: () => ({
    /** 累积收到的 A2UI 消息（供 Renderer 组件消费） */
    a2uiMessages: [] as unknown[],
    /** Renderer 是否已就绪 */
    rendererReady: false,
  }),

  getters: {
    messagesForRenderer(state): A2UIServerMessage[] {
      return state.a2uiMessages as A2UIServerMessage[];
    },
  },

  actions: {
    /**
     * 处理 A2UI 消息批次
     * 将消息累积到状态中，由 Renderer 组件观察并消费
     */
    processMessages(messages: A2UIServerMessage[]) {
      const prev = this.a2uiMessages as A2UIServerMessage[];
      this.a2uiMessages = [...prev, ...messages];
    },

    /** 清空所有状态（切换 session 时调用） */
    reset() {
      this.a2uiMessages = [];
      this.rendererReady = false;
    },

    /** 标记 Renderer 就绪 */
    setReady(ready: boolean) {
      this.rendererReady = ready;
    },
  },
});
