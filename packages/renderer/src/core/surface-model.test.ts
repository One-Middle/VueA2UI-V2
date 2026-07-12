import { describe, expect, it } from "vitest";
import { DataContext } from "./data-context";
import { SurfaceModel } from "./surface-model";

describe("SurfaceModel", () => {
  it("updates root dataModel without replacing the instance", () => {
    const surface = new SurfaceModel("main", "basic");
    surface.updateDataModel("/", { title: "旧标题" });

    const originalDataModel = surface.dataModel;
    const originalContext = new DataContext(originalDataModel);

    surface.updateDataModel("/", { title: "新标题", count: 2 });

    expect(surface.dataModel).toBe(originalDataModel);
    expect(originalContext.resolve({ path: "/title" })).toBe("新标题");
    expect(originalContext.resolve({ path: "/count" })).toBe(2);
  });

  it("keeps nested path updates working", () => {
    const surface = new SurfaceModel("main", "basic");
    surface.updateDataModel("/", { form: { name: "A" } });

    const originalDataModel = surface.dataModel;
    surface.updateDataModel("/form/name", "B");

    expect(surface.dataModel).toBe(originalDataModel);
    expect(surface.dataModel.get("/form/name")).toBe("B");
  });
});
