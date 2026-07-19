/**
 * Basic Catalog 视觉属性回归测试。
 *
 * 职责：
 * - 验证协议允许的受控视觉字段可被 Renderer 组件消费
 * - 覆盖 Icon.name 兼容、Slider.showValue 和常用 style/class 透传
 *
 * 不负责：完整视觉截图验收。
 */

import { afterEach, describe, expect, it } from "vitest";
import { createApp, nextTick, type App } from "vue";
import type { A2UIComponent } from "@a2ui-platform/shared";
import { registerBasicCatalog } from "../index";
import { SurfaceGroupModel } from "../../core/surface-model";
import A2uiSurface from "../../vue/A2uiSurface.vue";

let app: App<Element> | undefined;

afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.innerHTML = "";
});

function mountSurface(components: A2UIComponent[]): HTMLElement {
  registerBasicCatalog();
  const surfaceGroup = new SurfaceGroupModel();
  const surface = surfaceGroup.getOrCreate("main", "basic");
  surface.updateDataModel("/", {
    progress: 32,
    coverUrl: "https://example.com/cover.jpg",
    currentTrack: {
      id: "song-1",
      title: "播放",
    },
  });
  surface.updateComponents(components);

  const container = document.createElement("div");
  document.body.appendChild(container);
  app = createApp(A2uiSurface, { surfaceId: "main", surfaceGroup });
  app.mount(container);
  return container;
}

describe("Basic Catalog 视觉属性", () => {
  it("渲染 Icon.name 并兼容按钮视觉修饰类", async () => {
    const container = mountSurface([
      {
        id: "root",
        component: "Button",
        child: "icon",
        action: { event: { name: "play" } },
        variant: "ghost",
        size: "lg",
        preset: "buttonIcon",
      },
      {
        id: "icon",
        component: "Icon",
        name: "play_arrow",
        size: "lg",
        tone: "brand",
      },
    ]);

    await nextTick();

    const button = container.querySelector("button");
    const icon = container.querySelector(".a2ui-icon");
    expect(button?.classList.contains("a2ui-button--variant-ghost")).toBe(true);
    expect(button?.classList.contains("a2ui-button--preset-buttonIcon")).toBe(true);
    expect(icon?.textContent?.trim()).toBe("▶");
    expect(icon?.classList.contains("a2ui-icon--tone-brand")).toBe(true);
  });

  it("按官网式 action.event 派发 A2UI action 消息", async () => {
    const actions: unknown[] = [];
    const handler = (event: Event) => {
      actions.push((event as CustomEvent<unknown>).detail);
    };
    window.addEventListener("a2ui:action", handler);

    const container = mountSurface([
      {
        id: "root",
        component: "Button",
        child: "label",
        action: {
          event: {
            name: "play",
            context: {
              trackId: "song-1",
            },
          },
        },
      },
      {
        id: "label",
        component: "Text",
        text: "播放",
      },
    ]);

    await nextTick();
    container.querySelector("button")?.dispatchEvent(new MouseEvent("click"));
    window.removeEventListener("a2ui:action", handler);

    expect(actions[0]).toMatchObject({
      version: "v0.9",
      action: {
        kind: "event",
        name: "play",
        surfaceId: "main",
        sourceComponentId: "root",
        context: {
          trackId: "song-1",
        },
      },
    });
  });

  it("解析 action.event context 中的动态绑定", async () => {
    const actions: unknown[] = [];
    const handler = (event: Event) => {
      actions.push((event as CustomEvent<unknown>).detail);
    };
    window.addEventListener("a2ui:action", handler);

    const container = mountSurface([
      {
        id: "root",
        component: "Button",
        child: "label",
        action: {
          event: {
            name: "playTrack",
            context: {
              track: { path: "/currentTrack" },
            },
          },
        },
      },
      {
        id: "label",
        component: "Text",
        text: { path: "/currentTrack/title" },
      },
    ]);

    await nextTick();
    container.querySelector("button")?.dispatchEvent(new MouseEvent("click"));
    window.removeEventListener("a2ui:action", handler);

    expect(actions[0]).toMatchObject({
      action: {
        kind: "event",
        name: "playTrack",
        context: {
          track: {
            id: "song-1",
            title: "播放",
          },
        },
      },
    });
  });

  it("不再兼容历史扁平 action", async () => {
    const actions: unknown[] = [];
    const handler = (event: Event) => {
      actions.push((event as CustomEvent<unknown>).detail);
    };
    window.addEventListener("a2ui:action", handler);

    const container = mountSurface([
      {
        id: "root",
        component: "Button",
        child: "label",
        action: {
          name: "legacyPlay",
          context: {
            trackId: "song-1",
          },
        },
      },
      {
        id: "label",
        component: "Text",
        text: "播放",
      },
    ]);

    await nextTick();
    container.querySelector("button")?.dispatchEvent(new MouseEvent("click"));
    window.removeEventListener("a2ui:action", handler);

    expect(actions).toHaveLength(0);
  });

  it("当前不执行 action.functionCall", async () => {
    const actions: unknown[] = [];
    const handler = (event: Event) => {
      actions.push((event as CustomEvent<unknown>).detail);
    };
    window.addEventListener("a2ui:action", handler);

    const container = mountSurface([
      {
        id: "root",
        component: "Button",
        child: "label",
        action: {
          functionCall: {
            call: "openUrl",
            args: {
              url: "https://a2ui.org",
            },
          },
        },
      },
      {
        id: "label",
        component: "Text",
        text: "打开",
      },
    ]);

    await nextTick();
    container.querySelector("button")?.dispatchEvent(new MouseEvent("click"));
    window.removeEventListener("a2ui:action", handler);

    expect(actions).toHaveLength(0);
  });

  it("透传 Card、Row 和 Image 的受控样式字段", async () => {
    const container = mountSurface([
      {
        id: "root",
        component: "Card",
        child: "row",
        preset: "media",
        style: { maxWidth: "360px", borderRadius: "12px", shadow: "md" },
      },
      {
        id: "row",
        component: "Row",
        children: ["image"],
        gap: "12px",
        wrap: false,
        style: { padding: "8px" },
      },
      {
        id: "image",
        component: "Image",
        url: { path: "/coverUrl" },
        fit: "cover",
        aspectRatio: "1:1",
        style: { borderRadius: "8px" },
      },
    ]);

    await nextTick();

    const card = container.querySelector(".a2ui-card") as HTMLElement | null;
    const row = container.querySelector(".a2ui-row") as HTMLElement | null;
    const image = container.querySelector(".a2ui-image") as HTMLElement | null;
    expect(card?.classList.contains("a2ui-card--preset-media")).toBe(true);
    expect(card?.style.maxWidth).toBe("360px");
    expect(card?.style.borderRadius).toBe("12px");
    expect(row?.style.gap).toBe("12px");
    expect(row?.style.flexWrap).toBe("nowrap");
    expect(image?.style.objectFit).toBe("cover");
    expect(image?.style.aspectRatio).toBe("1 / 1");
  });

  it("遵守 Slider.showValue=false 并透传 step", async () => {
    const container = mountSurface([
      {
        id: "root",
        component: "Slider",
        label: "播放进度",
        min: 0,
        max: 100,
        step: 1,
        value: { path: "/progress" },
        showValue: false,
      },
    ]);

    await nextTick();

    const input = container.querySelector(".a2ui-slider-input") as HTMLInputElement | null;
    expect(input?.step).toBe("1");
    expect(container.querySelector(".a2ui-slider-value")).toBeNull();
  });
});
