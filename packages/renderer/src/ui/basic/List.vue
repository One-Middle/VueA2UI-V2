<script lang="ts">
/**
 * 普通列表组件。
 *
 * 职责：
 * - 渲染普通 slot 子项为列表项
 * - 处理 loading、empty、方向、分隔线等视觉状态
 *
 * 不负责：解析 A2UI `{ path, componentId }` 动态列表。
 */
import { computed, defineComponent, h, type CSSProperties } from "vue";

export default defineComponent({
  name: "UiList",
  props: {
    direction: String,
    marker: String,
    gap: String,
    divided: Boolean,
    dividers: Boolean,
    wrap: Boolean,
    emptyText: String,
    loading: Boolean,
    itemRole: String,
    selection: String,
    variant: String,
    size: String,
    tone: String,
    preset: String,
    style: Object as () => CSSProperties,
  },
  setup(props, { slots }) {
    const classes = computed(() =>
      [
        "a2ui-list",
        props.direction ? `a2ui-list--direction-${props.direction}` : "",
        props.marker ? `a2ui-list--marker-${props.marker}` : "",
        props.itemRole ? `a2ui-list--item-role-${props.itemRole}` : "",
        props.selection ? `a2ui-list--selection-${props.selection}` : "",
        props.dividers || props.divided ? "a2ui-list--dividers" : "",
        props.loading ? "a2ui-list--loading" : "",
        props.variant ? `a2ui-list--variant-${props.variant}` : "",
        props.size ? `a2ui-list--size-${props.size}` : "",
        props.tone ? `a2ui-list--tone-${props.tone}` : "",
        props.preset ? `a2ui-list--preset-${props.preset}` : "",
      ].filter(Boolean),
    );
    const listStyle = computed<CSSProperties>(() => ({
      ...(props.style ?? {}),
      ...(props.gap ? { gap: props.gap } : {}),
      ...(props.direction === "horizontal" ? { flexDirection: "row" } : {}),
      ...(props.wrap !== undefined
        ? { flexWrap: props.wrap ? "wrap" : "nowrap" }
        : {}),
      ...(props.marker === "none" ? { listStyle: "none", paddingLeft: 0 } : {}),
    }));

    return () => {
      const nodes = slots.default?.() ?? [];
      const children = props.loading
        ? [h("li", { class: "a2ui-list-status" }, "加载中...")]
        : nodes.length === 0 && props.emptyText
          ? [h("li", { class: "a2ui-list-status" }, props.emptyText)]
          : nodes.map((node, index) => h("li", { key: index }, [node]));

      return h(
        "ul",
        { class: classes.value, style: listStyle.value },
        children,
      );
    };
  },
});
</script>
