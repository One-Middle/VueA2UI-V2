import { describe, expect, it } from "vitest";
import { SurfaceGroupModel } from "../../core/surface-model";
import { SurfaceRuntime } from "../surface-runtime";

function createRuntime() {
  const group = new SurfaceGroupModel();
  const surface = group.getOrCreate("main", "basic");
  surface.updateDataModel("/title", "First");
  surface.updateDataModel("/name", "Ada");
  surface.updateComponents([
    { id: "root", component: "Column", children: ["text", "button"] },
    { id: "text", component: "Text", text: { path: "/title" } },
    { id: "button", component: "Button", label: "Save", action: { event: { name: "save", context: { name: { path: "/name" } } } } },
  ]);
  return { group, surface };
}

describe("SurfaceRuntime", () => {
  it("publishes a new pure-data plan for subscribed model paths", async () => {
    const { group, surface } = createRuntime();
    const runtime = new SurfaceRuntime({ surfaceGroup: group, surfaceId: "main" });
    const revisions: number[] = [];
    runtime.subscribe(() => revisions.push(runtime.getSnapshot().revision));
    const first = runtime.getSnapshot();
    expect(first.node?.type).toBe("Column");
    expect(JSON.stringify(first.node)).toContain("First");
    surface.updateDataModel("/title", "Second");
    await Promise.resolve();
    expect(revisions).toHaveLength(1);
    expect(JSON.stringify(runtime.getSnapshot().node)).toContain("Second");
    runtime.dispose();
  });

  it("interprets adapter events once and reports action callbacks", () => {
    const { group } = createRuntime();
    const actions: string[] = [];
    const runtime = new SurfaceRuntime({
      surfaceGroup: group,
      surfaceId: "main",
      onAction: (event) => actions.push(`${event.name}:${String(event.context.name)}`),
    });
    runtime.dispatch({ address: { surfaceId: "main", componentId: "button", basePath: "/" }, eventName: "click" });
    expect(actions).toEqual(["save:Ada"]);
    runtime.dispose();
  });
});
