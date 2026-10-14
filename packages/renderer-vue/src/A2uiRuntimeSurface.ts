/**
 * Vue Surface 容器组件，将 SurfaceRuntime 快照渲染为 Vue VNode 树。
 *
 * 职责：
 * - 订阅 renderer-core 的 SurfaceRuntime 快照。
 * - 在 runtime 替换时重新绑定订阅，并在卸载时释放订阅。
 * - 渲染 Surface 外层 section 与空状态。
 *
 * 引用：
 * - Vue 组合式 API、renderer-core SurfaceRuntime、render-vue。
 * 被引用：
 * - renderer-vue 包入口和运行时测试。
 * 注意：
 * - 本组件只负责订阅和容器结构，节点递归渲染交给 renderVueNode。
 */
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  type PropType,
} from "vue";
import type { SurfaceRuntime } from "@a2ui-platform/renderer-core";
import { renderVueNode } from "./render-vue";

/**
 * Vue 版 A2UI Surface 运行时组件。
 */
export const A2uiRuntimeSurface = defineComponent({
  name: "A2uiRuntimeSurface",
  props: {
    runtime: {
      type: Object as PropType<{
        getSnapshot(): ReturnType<SurfaceRuntime["getSnapshot"]>;
        subscribe(listener: () => void): () => void;
      }>,
      required: true,
    },
  },
  setup(props) {
    const snapshot = shallowRef(props.runtime.getSnapshot());
    let unsubscribe: (() => void) | undefined;

    /**
     * 绑定当前 runtime 的订阅，并同步一次最新快照。
     */
    const attach = () => {
      unsubscribe?.();
      snapshot.value = props.runtime.getSnapshot();
      unsubscribe = props.runtime.subscribe(() => {
        snapshot.value = props.runtime.getSnapshot();
      });
    };
    onMounted(attach);
    watch(() => props.runtime, attach);
    onBeforeUnmount(() => unsubscribe?.());
    return () =>
      h(
        "section",
        { class: "a2ui-surface", "data-surface-id": snapshot.value.surfaceId },
        snapshot.value.node
          ? [
              renderVueNode(
                snapshot.value.node,
                props.runtime as SurfaceRuntime,
              ),
            ]
          : [
              h(
                "div",
                { class: "a2ui-empty" },
                "Surface 未找到或 Root 组件未定义",
              ),
            ],
      );
  },
});
