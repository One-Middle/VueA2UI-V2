import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { SurfaceGroupModel, SurfaceRuntime } from "@a2ui-platform/renderer-core";
import { A2uiRuntimeSurface } from "../A2uiRuntimeSurface";

describe("Vue Adapter", () => {
  const containers: HTMLElement[] = [];
  afterEach(() => containers.splice(0).forEach((container) => container.remove()));

  it("renders Runtime snapshots and refreshes bound props", async () => {
    const group = new SurfaceGroupModel();
    const surface = group.getOrCreate("main", "basic");
    surface.updateDataModel("/title", "First");
    surface.updateComponents([
      { id: "root", component: "Text", text: { path: "/title" } },
    ]);
    const runtime = new SurfaceRuntime({ surfaceGroup: group, surfaceId: "main" });
    const container = document.createElement("div");
    containers.push(container);
    createApp({ render: () => h(A2uiRuntimeSurface, { runtime }) }).mount(container);
    expect(container.textContent).toContain("First");
    surface.updateDataModel("/title", "Second");
    await Promise.resolve();
    await nextTick();
    expect(container.textContent).toContain("Second");
    runtime.dispose();
  });

  it("routes component events through the shared Runtime", async () => {
    const actions: string[] = [];
    const group = new SurfaceGroupModel();
    const surface = group.getOrCreate("main", "basic");
    surface.updateComponents([
      { id: "root", component: "Button", label: "Save", action: { event: { name: "save" } } },
    ]);
    const runtime = new SurfaceRuntime({
      surfaceGroup: group,
      surfaceId: "main",
      onAction: (action) => actions.push(action.name),
    });
    const container = document.createElement("div");
    containers.push(container);
    createApp({ render: () => h(A2uiRuntimeSurface, { runtime }) }).mount(container);

    (container.querySelector("button") as HTMLButtonElement).click();
    await nextTick();

    expect(actions).toEqual(["save"]);
    runtime.dispose();
  });
});
