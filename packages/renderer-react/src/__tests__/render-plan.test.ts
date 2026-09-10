import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SurfaceGroupModel, SurfaceRuntime } from "@a2ui-platform/renderer-core";
import { A2uiRuntimeSurface } from "..";

describe("React Adapter", () => {
  const roots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];
  afterEach(() => roots.splice(0).forEach(({ root, container }) => { act(() => root.unmount()); container.remove(); }));

  it("renders a Runtime snapshot", () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const group = new SurfaceGroupModel();
    const surface = group.getOrCreate("main", "basic");
    surface.updateComponents([{ id: "root", component: "Text", text: "React" }]);
    const runtime = new SurfaceRuntime({ surfaceGroup: group, surfaceId: "main" });
    const container = document.createElement("div");
    const root = createRoot(container);
    roots.push({ root, container });
    act(() => root.render(React.createElement(A2uiRuntimeSurface, { runtime })));
    expect(container.textContent).toContain("React");
    runtime.dispose();
  });

  it("routes component events through the shared Runtime", () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const actions: string[] = [];
    const group = new SurfaceGroupModel();
    const surface = group.getOrCreate("main", "basic");
    surface.updateComponents([{ id: "root", component: "Button", label: "Save", action: { event: { name: "save" } } }]);
    const runtime = new SurfaceRuntime({
      surfaceGroup: group,
      surfaceId: "main",
      onAction: (action) => actions.push(action.name),
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    roots.push({ root, container });
    act(() => root.render(React.createElement(A2uiRuntimeSurface, { runtime })));

    act(() => (container.querySelector("button") as HTMLButtonElement).click());

    expect(actions).toEqual(["save"]);
    runtime.dispose();
  });
});
