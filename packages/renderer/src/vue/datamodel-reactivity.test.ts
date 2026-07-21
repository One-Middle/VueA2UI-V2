/**
 * Renderer dataModel 响应式渲染回归测试。
 *
 * 职责：
 * - 验证 updateDataModel 后 Basic 组件会刷新 DOM
 * - 验证动态 List 会为每个 item 建立独立 dataModel 作用域
 *
 * 不负责：Basic Catalog 的完整视觉表现。
 */

import { afterEach, describe, expect, it } from "vitest";
import { createApp, nextTick, type App } from "vue";
import type { A2UIComponent, JsonValue } from "@a2ui-platform/shared";
import { registerBasicCatalog } from "../components";
import { SurfaceGroupModel, type SurfaceModel } from "../core/surface-model";
import A2uiSurface from "./A2uiSurface.vue";

let app: App<Element> | undefined;

afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.innerHTML = "";
});

function mountSurface(
  dataModel: JsonValue,
  components: A2UIComponent[]
): { container: HTMLElement; surface: SurfaceModel } {
  registerBasicCatalog();
  const surfaceGroup = new SurfaceGroupModel();
  const surface = surfaceGroup.getOrCreate("main", "basic");
  surface.updateDataModel("/", dataModel);
  surface.updateComponents(components);

  const container = document.createElement("div");
  document.body.appendChild(container);
  app = createApp(A2uiSurface, { surfaceId: "main", surfaceGroup });
  app.mount(container);

  return { container, surface };
}

describe("Renderer dataModel 响应式渲染", () => {
  it("深层 updateDataModel 会刷新绑定文本", async () => {
    const { container, surface } = mountSurface(
      { form: { name: "A" } },
      [
        {
          id: "root",
          component: "Text",
          text: { path: "/form/name" },
        },
      ]
    );

    await nextTick();
    expect(container.textContent).toContain("A");

    surface.updateDataModel("/form/name", "B");
    await nextTick();

    expect(container.textContent).toContain("B");
  });

  it("动态 List 会用 item 作用域解析模板组件的相对路径", async () => {
    const { container, surface } = mountSurface(
      {
        items: [
          { title: "第一项" },
          { title: "第二项" },
        ],
      },
      [
        {
          id: "root",
          component: "List",
          children: [{ path: "/items", componentId: "itemTitle" }],
        },
        {
          id: "itemTitle",
          component: "Text",
          text: { path: "title" },
        },
      ]
    );

    await nextTick();
    expect(container.textContent).toContain("第一项");
    expect(container.textContent).toContain("第二项");

    surface.updateDataModel("/items/1/title", "第二项已更新");
    await nextTick();

    expect(container.textContent).toContain("第一项");
    expect(container.textContent).toContain("第二项已更新");
  });

  it("动态 List 数组新增项后会渲染新增 item", async () => {
    const { container, surface } = mountSurface(
      { items: [{ title: "第一项" }] },
      [
        {
          id: "root",
          component: "List",
          children: [{ path: "/items", componentId: "itemTitle" }],
        },
        {
          id: "itemTitle",
          component: "Text",
          text: { path: "title" },
        },
      ]
    );

    await nextTick();
    expect(container.querySelectorAll(".a2ui-text-body")).toHaveLength(1);

    surface.updateDataModel("/items/1/title", "第二项");
    await nextTick();

    expect(container.querySelectorAll(".a2ui-text-body")).toHaveLength(2);
    expect(container.textContent).toContain("第二项");
  });
});
