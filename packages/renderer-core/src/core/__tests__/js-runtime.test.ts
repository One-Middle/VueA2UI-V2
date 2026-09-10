/**
 * JSRuntime 执行路径测试。
 *
 * 职责：
 * - 验证默认 new Function 路径能执行受限属性脚本和动作脚本
 * - 验证 AST guard 会拒绝高风险全局能力和原型链访问
 *
 * 不负责：
 * - 覆盖所有组件渲染链路
 *
 * 引用：
 * - DataModel
 * - JSRuntime 工厂和错误定义
 * 被引用：
 * - Vitest 测试入口
 * 注意：
 * - 这里不验证 SES 兼容性，SES 路径作为可切换实现单独保留。
 */

import { describe, expect, it, vi } from "vitest";
import { DataContext } from "../data-context";
import { DataModel } from "../data-model";
import { JsRuntimeError, JsRuntimeFactory } from "../js-runtime";

describe("FunctionJsRuntime", () => {
  it("可以执行只读属性脚本", () => {
    const runtime = new JsRuntimeFactory().create("function");
    const dataModel = new DataModel({ count: 2 });

    const result = runtime.runPropertyScript({
      dataContext: new DataContext(dataModel),
      script: {
        code: "const count = Number(dataModel.get('/count') ?? 0); return count + 1;",
        deps: ["/count"],
      },
    });

    expect(result).toBe(3);
  });

  it("可以执行动作脚本并写入 dataModel、派发 action", () => {
    const runtime = new JsRuntimeFactory().create("function");
    const dataModel = new DataModel({ count: 2 });
    const emit = vi.fn();

    runtime.runActionScript({
      dataContext: new DataContext(dataModel),
      actions: { emit },
      context: { source: "button" },
      script: {
        code: [
          "const next = Number(dataModel.get('/count') ?? 0) + 1;",
          "dataModel.set('/count', next);",
          "actions.emit('changed', { count: next });",
        ].join("\n"),
      },
    });

    expect(dataModel.get("/count")).toBe(3);
    expect(emit).toHaveBeenCalledWith("changed", { count: 3 });
  });

  it("脚本 dataModel.get/set 支持当前 DataContext 相对路径", () => {
    const runtime = new JsRuntimeFactory().create("function");
    const dataModel = new DataModel({
      items: [{ done: false }, { done: true }],
    });
    const itemContext = new DataContext(dataModel, "/items/0");
    const emit = vi.fn();

    const result = runtime.runPropertyScript({
      dataContext: itemContext,
      script: {
        code: "return dataModel.get('done') ? '已完成' : '进行中';",
        deps: ["done"],
      },
    });

    runtime.runActionScript({
      dataContext: itemContext,
      actions: { emit },
      context: {},
      script: {
        code: "const next = !Boolean(dataModel.get('done')); dataModel.set('done', next); actions.emit('changed', { done: next });",
        deps: ["done"],
      },
    });

    expect(result).toBe("进行中");
    expect(dataModel.get("/items/0/done")).toBe(true);
    expect(dataModel.get("/items/1/done")).toBe(true);
    expect(emit).toHaveBeenCalledWith("changed", { done: true });
  });

  it("会在 AST 阶段拒绝浏览器全局对象", () => {
    const runtime = new JsRuntimeFactory().create("function");
    const dataModel = new DataModel({});

    expect(() =>
      runtime.runPropertyScript({
        dataContext: new DataContext(dataModel),
        script: {
          code: "return window;",
          deps: ["/"],
        },
      }),
    ).toThrow(JsRuntimeError);
  });

  it("会在 AST 阶段拒绝原型链逃逸入口", () => {
    const runtime = new JsRuntimeFactory().create("function");
    const dataModel = new DataModel({});

    expect(() =>
      runtime.runPropertyScript({
        dataContext: new DataContext(dataModel),
        script: {
          code: "return dataModel.get.constructor;",
          deps: ["/"],
        },
      }),
    ).toThrow(JsRuntimeError);
  });

  it("会拒绝动态成员访问，避免拼接 constructor 绕过检查", () => {
    const runtime = new JsRuntimeFactory().create("function");
    const dataModel = new DataModel({ items: ["A"] });

    expect(() =>
      runtime.runPropertyScript({
        dataContext: new DataContext(dataModel),
        script: {
          code: "const key = 'constructor'; return dataModel[key];",
          deps: ["/items"],
        },
      }),
    ).toThrow(JsRuntimeError);
  });
});
