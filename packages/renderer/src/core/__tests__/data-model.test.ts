/**
 * DataModel 响应式回归测试。
 *
 * 职责：
 * - 验证 JSON Pointer 深层写入能触发显式路径订阅
 * - 验证根替换、自动创建路径和路径订阅的关键边界
 *
 * 不负责：组件渲染和 DOM 行为。
 */

import { describe, expect, it } from "vitest";
import { DataContext } from "../data-context";
import { DataModel } from "../data-model";

describe("DataModel", () => {
  it("深层路径更新会触发路径订阅并让 DataContext 读到新值", () => {
    const dataModel = new DataModel({ form: { name: "A" } });
    const dataContext = new DataContext(dataModel);
    let changes = 0;
    dataModel.subscribe("/form/name", () => {
      changes++;
    });

    expect(dataContext.resolve({ path: "/form/name" })).toBe("A");

    dataModel.set("/form/name", "B");

    expect(changes).toBe(1);
    expect(dataContext.resolve({ path: "/form/name" })).toBe("B");
  });

  it("根节点替换后旧 DataContext 仍能读取新数据", () => {
    const dataModel = new DataModel({ title: "旧标题" });
    const dataContext = new DataContext(dataModel);

    dataModel.set("/", { title: "新标题" });

    expect(dataContext.resolve({ path: "/title" })).toBe("新标题");
  });

  it("根节点不是对象时，深层写入会自动创建对象路径", () => {
    const dataModel = new DataModel(null);

    dataModel.set("/form/name", "张三");

    expect(dataModel.get("/form/name")).toBe("张三");
    expect(dataModel.get("/")).toEqual({ form: { name: "张三" } });
  });

  it("数字路径片段会自动创建数组路径", () => {
    const dataModel = new DataModel({});

    dataModel.set("/items/0/title", "第一项");

    expect(dataModel.get("/items/0/title")).toBe("第一项");
    expect(dataModel.get("/")).toEqual({
      items: [{ title: "第一项" }],
    });
  });

  it("根节点替换会通知所有已订阅路径", () => {
    const dataModel = new DataModel({ form: { name: "A" } });
    let nameChanges = 0;
    let formChanges = 0;

    dataModel.subscribe("/form/name", () => {
      nameChanges++;
    });
    dataModel.subscribe("/form", () => {
      formChanges++;
    });

    dataModel.set("/", { form: { name: "B" } });

    expect(nameChanges).toBe(1);
    expect(formChanges).toBe(1);
  });

  it("相对路径会基于当前 DataContext 作用域解析", () => {
    const dataModel = new DataModel({
      items: [{ title: "第一项" }],
    });
    const itemContext = new DataContext(dataModel, "/items/0");

    expect(itemContext.basePath).toBe("/items/0");
    expect(itemContext.resolvePath("title")).toBe("/items/0/title");
    expect(itemContext.resolve({ path: "title" })).toBe("第一项");
  });
});
