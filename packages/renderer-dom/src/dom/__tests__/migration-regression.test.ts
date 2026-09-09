import { afterEach, expect, it, vi } from "vitest";
import type { A2UIComponent } from "@a2ui-platform/shared";
import { ComponentStateStore, SurfaceGroupModel } from "@a2ui-platform/renderer-core";
import { DomSurfaceHost } from "../surface-host";
import { basicDomComponents } from "../../ui/dom-basic";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
function setup(components: A2UIComponent[], data: Record<string, any> = {}) {
  const group = new SurfaceGroupModel();
  const surface = group.getOrCreate("a", "basic");
  surface.updateComponents(components);
  surface.updateDataModel("/", data);
  const container = document.createElement("div");
  document.body.append(container);
  const host = new DomSurfaceHost({
    container,
    surfaceGroup: group,
    surfaceId: "a",
  });
  cleanups.push(() => {
    host.unmount();
    group.destroy();
  });
  return { group, surface, container, host };
}
function ui(type: string, props: Record<string, unknown>) {
  const emit = vi.fn();
  const result = basicDomComponents.get(type)!({
    props,
    slots: {},
    emit,
    state: new ComponentStateStore().stateFor({
      surfaceId: "a",
      componentId: "root",
      basePath: "/",
    }),
    renderChildren: () => [],
  });
  cleanups.push(() => result.cleanup?.());
  return { node: result.node as HTMLElement, emit };
}

it("rebinds equal dependency paths on surface switch and ignores the old model", async () => {
  const { group, surface, host, container } = setup(
    [{ id: "root", component: "Text", text: { path: "/title" } }],
    { title: "A" },
  );
  const other = group.getOrCreate("b", "basic");
  other.updateComponents([
    { id: "root", component: "Text", text: { path: "/title" } },
  ]);
  other.updateDataModel("/", { title: "B" });
  host.setSurfaceId("b");
  other.updateDataModel("/title", "updated");
  await Promise.resolve();
  expect(container.textContent).toBe("updated");
  const rendered = container.firstChild;
  surface.updateDataModel("/title", "old");
  await Promise.resolve();
  expect(container.firstChild).toBe(rendered);
  host.setSurfaceId("missing");
  expect(container.textContent).toContain("Surface 未找到");
  host.setSurfaceId("a");
  surface.updateDataModel("/title", "back");
  await Promise.resolve();
  expect(container.textContent).toBe("back");
});
it("rebinds after delete and recreate in the same tick", async () => {
  const { group, container } = setup(
    [{ id: "root", component: "Text", text: { path: "/title" } }],
    { title: "A" },
  );
  group.delete("a");
  const replacement = group.getOrCreate("a", "basic");
  replacement.updateComponents([
    { id: "root", component: "Text", text: { path: "/title" } },
  ]);
  replacement.updateDataModel("/", { title: "B" });
  await Promise.resolve();
  replacement.updateDataModel("/title", "C");
  await Promise.resolve();
  expect(container.textContent).toBe("C");
});
it("batches updates, supports synchronous update and cancels work on unmount", async () => {
  const { surface, container, host } = setup(
    [{ id: "root", component: "Text", text: { path: "/title" } }],
    { title: "A" },
  );
  const replace = vi.spyOn(container, "replaceChildren");
  surface.updateDataModel("/title", "B");
  surface.updateDataModel("/title", "C");
  expect(replace).not.toHaveBeenCalled();
  await Promise.resolve();
  expect(replace).toHaveBeenCalledTimes(1);
  surface.updateDataModel("/title", "D");
  host.update();
  expect(container.textContent).toBe("D");
  await Promise.resolve();
  expect(replace).toHaveBeenCalledTimes(2);
  surface.updateDataModel("/title", "E");
  host.unmount();
  await Promise.resolve();
  expect(container.textContent).toBe("");
  replace.mockClear();
  surface.updateDataModel("/title", "F");
  await Promise.resolve();
  expect(replace).not.toHaveBeenCalled();
});
it("restores root button focus and exact tab focus", async () => {
  const { container, host, surface } = setup([
    { id: "root", component: "Button", label: "Go" },
  ]);
  container.querySelector("button")!.focus();
  host.update();
  expect(document.activeElement).toBe(container.querySelector("button"));
  surface.updateComponents([
    {
      id: "root",
      component: "Tabs",
      tabItems: [
        { key: "one", title: "One", child: "one" },
        { key: "two", title: "Two", child: "two" },
      ],
    },
    { id: "one", component: "Text", text: "First" },
    { id: "two", component: "Text", text: "Second" },
  ]);
  await Promise.resolve();
  const second = container.querySelectorAll("button")[1]!;
  second.focus();
  second.click();
  await Promise.resolve();
  expect(document.activeElement).toBe(container.querySelectorAll("button")[1]);
  host.update();
  expect(container.textContent).toContain("Second");
});
it("restores text selection and postpones model writes during composition", async () => {
  const { container, surface } = setup(
    [{ id: "root", component: "TextField", text: { path: "/name" } }],
    { name: "hello" },
  );
  let input = container.querySelector("input")!;
  input.focus();
  input.setSelectionRange(1, 3, "backward");
  surface.updateDataModel("/name", "hello!");
  await Promise.resolve();
  input = container.querySelector("input")!;
  expect(document.activeElement).toBe(input);
  expect([
    input.selectionStart,
    input.selectionEnd,
    input.selectionDirection,
  ]).toEqual([1, 3, "backward"]);
  input.dispatchEvent(new CompositionEvent("compositionstart"));
  input.value = "中文";
  input.dispatchEvent(new Event("input"));
  await Promise.resolve();
  expect(surface.dataModel.get("/name")).toBe("hello!");
  expect(container.querySelector("input")).toBe(input);
  input.dispatchEvent(new CompositionEvent("compositionend"));
  await Promise.resolve();
  expect(surface.dataModel.get("/name")).toBe("中文");
});
it("preserves grid, container, flex and spacer layout semantics", () => {
  expect(ui("Grid", { columns: 3 }).node.style.gridTemplateColumns).toBe(
    "repeat(3, minmax(0, 1fr))",
  );
  expect(
    ui("Grid", { columns: "auto", minItemWidth: "160px" }).node.style
      .gridTemplateColumns,
  ).toContain("160px");
  expect(
    ui("Container", { width: "wide", padding: "lg", align: "center" }).node
      .className,
  ).toContain("a2ui-container--padding-lg");
  for (const type of ["Row", "Column"]) {
    const node = ui(type, {
      distribution: "spaceBetween",
      alignment: "start",
      divider: "line",
    }).node;
    expect(node.style.justifyContent).toBe("space-between");
    expect(node.style.alignItems).toBe("flex-start");
    expect(node.className).toContain("--divider-line");
  }
  expect(
    ui("Spacer", { size: "lg", axis: "horizontal" }).node.style.width,
  ).toBe("24px");
  expect(ui("Spacer", { flex: true }).node.style.flex).toBe("1 1 auto");
});
it.each(["select", "radio", "segmented"])(
  "preserves ChoicePicker %s mode and numeric values",
  (mode) => {
    const { node, emit } = ui("ChoicePicker", {
      mode,
      modelValue: 1,
      options: [
        { label: "One", value: 1 },
        { label: "Two", value: 2 },
      ],
    });
    expect(node.classList.contains("a2ui-choicepicker-field")).toBe(true);
    if (mode === "select") {
      const select = node.querySelector("select")!;
      select.value = "2";
      select.dispatchEvent(new Event("change"));
    } else node.querySelectorAll("button")[1]!.click();
    expect(emit).toHaveBeenCalledWith("update:modelValue", 2);
  },
);
it("preserves datetime input, readonly and field styling", () => {
  const { node } = ui("DateTimeInput", {
    usageHint: "datetime",
    modelValue: "2026-09-08T12:30",
    readonly: true,
    name: "date",
    validationState: "error",
  });
  const input = node.querySelector("input")!;
  expect(input.type).toBe("datetime-local");
  expect(input.value).toBe("2026-09-08T12:30");
  expect(input.readOnly).toBe(true);
  expect(input.className).toBe("a2ui-datetimeinput-input");
  expect(node.className).toContain("a2ui-field--validation-error");
});
it.each([
  ["CheckBox", "change", true],
  ["ChoicePicker", "change", 2],
  ["Slider", "input", 8],
  ["DateTimeInput", "input", "2026-09-08"],
])("writes %s values through model-set", async (type, event, value) => {
  const { container, surface } = setup(
    [
      {
        id: "root",
        component: String(type),
        value: { path: "/value" },
        options: [
          { label: "One", value: 1 },
          { label: "Two", value: 2 },
        ],
      },
    ],
    { value: type === "CheckBox" ? false : type === "DateTimeInput" ? "" : 1 },
  );
  const control = container.querySelector("input, select") as HTMLInputElement;
  if (type === "CheckBox") control.checked = true;
  else control.value = String(value);
  control.dispatchEvent(new Event(String(event)));
  await Promise.resolve();
  expect(surface.dataModel.get("/value")).toBe(value);
});
it("preserves Card regions and media styles", () => {
  const card = ui("Card", {
    header: "Header",
    subtitle: "Subtitle",
    footer: "Footer",
    clickable: true,
  }).node;
  expect(card.querySelector(".a2ui-card-subtitle")?.textContent).toBe(
    "Subtitle",
  );
  expect(card.querySelector("footer")?.textContent).toBe("Footer");
  expect(
    ui("Video", { style: { width: "120px" }, aspectRatio: "16:9" }).node.style
      .width,
  ).toBe("120px");
  expect(
    ui("AudioPlayer", { style: { width: "100px" } }).node.style.width,
  ).toBe("100px");
  const divider = ui("Divider", {
    thickness: 2,
    color: "red",
    spacing: 8,
  }).node;
  expect(divider.style.borderTopWidth).toBe("2px");
  expect(divider.style.margin).toBe("8px 0px");
});
