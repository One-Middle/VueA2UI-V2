import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch, type PropType } from "vue";
import type { SurfaceRuntime } from "@a2ui-platform/renderer-core";
import { renderVueNode } from "./render-vue";

export const A2uiRuntimeSurface = defineComponent({
  name: "A2uiRuntimeSurface",
  props: { runtime: { type: Object as PropType<{ getSnapshot(): ReturnType<SurfaceRuntime["getSnapshot"]>; subscribe(listener: () => void): () => void }>, required: true } },
  setup(props) {
    const snapshot = shallowRef(props.runtime.getSnapshot());
    let unsubscribe: (() => void) | undefined;
    const attach = () => {
      unsubscribe?.();
      snapshot.value = props.runtime.getSnapshot();
      unsubscribe = props.runtime.subscribe(() => { snapshot.value = props.runtime.getSnapshot(); });
    };
    onMounted(attach);
    watch(() => props.runtime, attach);
    onBeforeUnmount(() => unsubscribe?.());
    return () => h("section", { class: "a2ui-surface", "data-surface-id": snapshot.value.surfaceId }, snapshot.value.node ? [renderVueNode(snapshot.value.node, props.runtime as SurfaceRuntime)] : [h("div", { class: "a2ui-empty" }, "Surface 未找到或 Root 组件未定义")]);
  },
});
