/**
 * RenderRoot：在 Vue 组件树内承载 RenderNode 渲染结果。
 *
 * 职责：
 * - 接收当前 RenderNode 和 RenderContext
 * - 调用 renderVueNode 生成 VNode
 *
 * 不负责：构建 RenderNode 或同步 DataModel 订阅。
 */

import { defineComponent, type PropType } from "vue";
import type { RenderContext } from "../render/render-context";
import type { RenderNode } from "../render/render-node";
import { renderVueNode } from "../render/vue-renderer";

export default defineComponent({
  name: "RenderRoot",
  props: {
    node: {
      type: Object as PropType<RenderNode | null>,
      default: null,
    },
    renderContext: {
      type: Object as PropType<RenderContext>,
      required: true,
    },
  },
  setup(props) {
    return () => renderVueNode(props.node, props.renderContext);
  },
});
