import { afterEach, describe, expect, it } from "vitest";
import type { A2UIComponent, JsonValue } from "@a2ui-platform/shared";
import { MessageProcessor, SurfaceGroupModel, type SurfaceModel } from "@a2ui-platform/renderer-core";
import { mountA2uiSurface } from "../mount-surface";
import {
  defineA2uiSurfaceElement,
  type A2uiSurfaceElement,
} from "../web-component";
import {
  registerA2uiSurfaceGroup,
  unregisterA2uiSurfaceGroup,
} from "../surface-group-registry";

let cleanup: (() => void) | undefined;

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.innerHTML = "";
  unregisterA2uiSurfaceGroup("test");
});

function mountSurface(
  dataModel: JsonValue,
  components: A2UIComponent[],
): { container: HTMLElement; surface: SurfaceModel; surfaceGroup: SurfaceGroupModel } {
  const surfaceGroup = new SurfaceGroupModel();
  const surface = surfaceGroup.getOrCreate("main", "basic");
  surface.updateDataModel("/", dataModel);
  surface.updateComponents(components);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const handle = mountA2uiSurface(container, { surfaceGroup, surfaceId: "main" });
  cleanup = () => {
    handle.unmount();
    surfaceGroup.destroy();
  };
  return { container, surface, surfaceGroup };
}

function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

describe("DOM A2UI surface host", () => {
  it("refreshes bound text when dataModel changes", async () => {
    const { container, surface } = mountSurface({ form: { name: "A" } }, [
      { id: "root", component: "Text", text: { path: "/form/name" } },
    ]);

    expect(container.textContent).toContain("A");

    surface.updateDataModel("/form/name", "B");
    await flushMicrotasks();

    expect(container.textContent).toContain("B");
  });

  it("renders dynamic List items with relative item scope", async () => {
    const { container, surface } = mountSurface(
      { items: [{ title: "第一项" }] },
      [
        {
          id: "root",
          component: "List",
          children: [{ path: "/items", componentId: "itemTitle" }],
        },
        { id: "itemTitle", component: "Text", text: { path: "title" } },
      ],
    );

    expect(container.textContent).toContain("第一项");

    surface.updateDataModel("/items/1/title", "第二项");
    await flushMicrotasks();

    expect(container.querySelectorAll(".a2ui-text-body")).toHaveLength(2);
    expect(container.textContent).toContain("第二项");
  });

  it("writes TextField input back to dataModel", async () => {
    const { container, surface } = mountSurface({ form: { name: "初始值" } }, [
      {
        id: "root",
        component: "TextField",
        label: "名称",
        text: { path: "/form/name" },
      },
    ]);
    const input = container.querySelector("input");
    expect(input?.value).toBe("初始值");

    input!.value = "已修改";
    input!.dispatchEvent(new Event("input", { bubbles: true }));
    await flushMicrotasks();

    expect(surface.dataModel.get("/form/name")).toBe("已修改");
    expect(container.querySelector("input")?.value).toBe("已修改");
  });

  it("runs action.script with relative item paths and dispatches action", async () => {
    const actions: unknown[] = [];
    window.addEventListener("a2ui:action", (event) => {
      actions.push((event as CustomEvent).detail);
    });

    const { container, surface } = mountSurface(
      { items: [{ title: "第一项", done: false }] },
      [
        {
          id: "root",
          component: "List",
          children: [{ path: "/items", componentId: "itemButton" }],
        },
        {
          id: "itemButton",
          component: "Button",
          label: {
            script: {
              code: "return dataModel.get('done') ? '已完成' : '完成';",
              deps: ["done"],
              fallback: "完成",
            },
          },
          action: {
            script: {
              code: "const next = !Boolean(dataModel.get('done')); dataModel.set('done', next); actions.emit('itemToggled', { title: dataModel.get('title'), done: next });",
              deps: ["done"],
            },
          },
        },
      ],
    );

    container.querySelector("button")?.click();
    await flushMicrotasks();

    expect(surface.dataModel.get("/items/0/done")).toBe(true);
    expect(container.querySelector("button")?.textContent).toContain("已完成");
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      action: {
        name: "itemToggled",
        context: { title: "第一项", done: true },
      },
    });
  });

  it("dispatches action.event with resolved context", () => {
    const actions: unknown[] = [];
    window.addEventListener("a2ui:action", (event) => {
      actions.push((event as CustomEvent).detail);
    });

    const { container } = mountSurface(
      { form: { name: "Ada" } },
      [
        {
          id: "root",
          component: "Button",
          label: "Submit",
          action: {
            event: {
              name: "submit",
              context: { name: { path: "/form/name" } },
            },
          },
        },
      ],
    );

    container.querySelector("button")?.click();

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      version: "v0.9",
      action: {
        name: "submit",
        context: { name: "Ada" },
      },
    });
  });

  it("does not execute action.functionCall", () => {
    const actions: unknown[] = [];
    window.addEventListener("a2ui:action", (event) => {
      actions.push((event as CustomEvent).detail);
    });

    const { container } = mountSurface({}, [
      {
        id: "root",
        component: "Button",
        label: "Open",
        action: {
          functionCall: { call: "openUrl", args: { url: "https://example.com" } },
        },
      },
    ]);

    container.querySelector("button")?.click();

    expect(actions).toHaveLength(0);
  });

  it("recomputes style scripts through controlled style resolution", async () => {
    const { container, surface } = mountSurface(
      { size: "120px" },
      [
        {
          id: "root",
          component: "Text",
          text: "Sized",
          style: {
            width: {
              script: {
                code: "return dataModel.get('/size');",
                deps: ["/size"],
                fallback: "10px",
              },
            },
          },
        },
      ],
    );

    expect((container.querySelector(".a2ui-text-body") as HTMLElement).style.width).toBe("120px");

    surface.updateDataModel("/size", "160px");
    await flushMicrotasks();

    expect((container.querySelector(".a2ui-text-body") as HTMLElement).style.width).toBe("160px");
  });

  it("keeps Tabs active state across full rebuilds", async () => {
    const { container, surface } = mountSurface(
      { label: "A" },
      [
        {
          id: "root",
          component: "Tabs",
          tabItems: [
            { key: "first", title: "第一", child: "firstPanel" },
            { key: "second", title: "第二", child: "secondPanel" },
          ],
        },
        { id: "firstPanel", component: "Text", text: { path: "/label" } },
        { id: "secondPanel", component: "Text", text: "第二面板" },
      ],
    );

    container.querySelectorAll("button")[1]?.click();
    await flushMicrotasks();
    expect(container.textContent).toContain("第二面板");

    surface.updateDataModel("/label", "B");
    await flushMicrotasks();

    expect(container.textContent).toContain("第二面板");
    expect(container.textContent).not.toContain("B");
  });

  it("renders every formal Basic Catalog component through the DOM registry", () => {
    const { container } = mountSurface(
      {
        form: {
          name: "Ada",
          enabled: true,
          choice: "a",
          amount: 5,
          date: "2026-09-04",
        },
      },
      [
        { id: "root", component: "Column", children: ["text", "media", "layout", "form", "tabs"] },
        { id: "text", component: "Text", text: "Text" },
        { id: "media", component: "Row", children: ["image", "icon", "video", "audio", "divider"] },
        { id: "image", component: "Image", url: "about:blank", alt: "blank" },
        { id: "icon", component: "Icon", name: "check" },
        { id: "video", component: "Video", url: "about:blank" },
        { id: "audio", component: "AudioPlayer", url: "about:blank" },
        { id: "divider", component: "Divider", label: "line" },
        { id: "layout", component: "Container", child: "card" },
        { id: "card", component: "Card", title: "Card", child: "grid" },
        { id: "grid", component: "Grid", children: ["button", "spacer"] },
        { id: "button", component: "Button", label: "Button" },
        { id: "spacer", component: "Spacer", size: "sm" },
        { id: "form", component: "Column", children: ["field", "checkbox", "choice", "slider", "date"] },
        { id: "field", component: "TextField", label: "Name", text: { path: "/form/name" } },
        { id: "checkbox", component: "CheckBox", label: "Enabled", value: { path: "/form/enabled" } },
        {
          id: "choice",
          component: "ChoicePicker",
          label: "Choice",
          value: { path: "/form/choice" },
          options: [{ label: "A", value: "a" }],
        },
        { id: "slider", component: "Slider", label: "Amount", value: { path: "/form/amount" } },
        { id: "date", component: "DateTimeInput", label: "Date", value: { path: "/form/date" } },
        {
          id: "tabs",
          component: "Tabs",
          tabItems: [{ key: "one", title: "One", child: "tabText" }],
        },
        { id: "tabText", component: "Text", text: "Panel" },
      ],
    );

    expect(container.querySelector(".a2ui-text-body")).not.toBeNull();
    expect(container.querySelector(".a2ui-image")).not.toBeNull();
    expect(container.querySelector(".a2ui-icon")).not.toBeNull();
    expect(container.querySelector("video.a2ui-video")).not.toBeNull();
    expect(container.querySelector("audio.a2ui-audio")).not.toBeNull();
    expect(container.querySelector(".a2ui-divider")).not.toBeNull();
    expect(container.querySelector(".a2ui-row")).not.toBeNull();
    expect(container.querySelector(".a2ui-column")).not.toBeNull();
    expect(container.querySelector(".a2ui-grid")).not.toBeNull();
    expect(container.querySelector(".a2ui-container")).not.toBeNull();
    expect(container.querySelector(".a2ui-spacer")).not.toBeNull();
    expect(container.querySelector(".a2ui-card")).not.toBeNull();
    expect(container.querySelector(".a2ui-tabs")).not.toBeNull();
    expect(container.querySelector(".a2ui-button")).not.toBeNull();
    expect(container.querySelector(".a2ui-textfield")).not.toBeNull();
    expect(container.querySelector(".a2ui-checkbox")).not.toBeNull();
    expect(container.querySelector(".a2ui-choicepicker")).not.toBeNull();
    expect(container.querySelector(".a2ui-slider")).not.toBeNull();
    expect(container.querySelector(".a2ui-datetimeinput")).not.toBeNull();
  });

  it("supports Web Component registry injection", async () => {
    defineA2uiSurfaceElement();
    const surfaceGroup = new SurfaceGroupModel();
    new MessageProcessor(surfaceGroup).processMessages([
      {
        version: "v0.9",
        createSurface: { surfaceId: "main", catalogId: "basic" },
      },
      {
        version: "v0.9",
        updateDataModel: { surfaceId: "main", path: "/", value: { title: "Web" } },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "main",
          components: [{ id: "root", component: "Text", text: { path: "/title" } }],
        },
      },
    ]);
    registerA2uiSurfaceGroup("test", surfaceGroup);
    const element = document.createElement("a2ui-surface") as A2uiSurfaceElement;
    element.setAttribute("group", "test");
    element.setAttribute("surface-id", "main");
    document.body.appendChild(element);
    cleanup = () => {
      element.remove();
      surfaceGroup.destroy();
    };

    await flushMicrotasks();

    expect(element.textContent).toContain("Web");
  });

  it("updates Web Component surface id and remounts when property surfaceGroup changes", async () => {
    defineA2uiSurfaceElement();
    const firstGroup = new SurfaceGroupModel();
    firstGroup.getOrCreate("main", "basic").updateComponents([
      { id: "root", component: "Text", text: "Main" },
    ]);
    firstGroup.getOrCreate("other", "basic").updateComponents([
      { id: "root", component: "Text", text: "Other" },
    ]);
    const secondGroup = new SurfaceGroupModel();
    secondGroup.getOrCreate("main", "basic").updateComponents([
      { id: "root", component: "Text", text: "Second" },
    ]);

    const element = document.createElement("a2ui-surface") as A2uiSurfaceElement;
    element.surfaceGroup = firstGroup;
    document.body.appendChild(element);
    cleanup = () => {
      element.remove();
      firstGroup.destroy();
      secondGroup.destroy();
    };

    expect(element.textContent).toContain("Main");

    element.surfaceId = "other";
    await flushMicrotasks();
    expect(element.textContent).toContain("Other");

    element.surfaceGroup = secondGroup;
    element.surfaceId = "main";
    await flushMicrotasks();
    expect(element.textContent).toContain("Second");

    element.remove();
    firstGroup.getOrCreate("other", "basic").updateComponents([
      { id: "root", component: "Text", text: "Detached" },
    ]);
    await flushMicrotasks();
    expect(element.textContent).toBe("");
  });
});
