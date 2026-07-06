/**
 * DataContext 类：包装 DataModel，支持 basePath 和动态值解析。
 *
 * 用于组件渲染时提供相对于组件作用域的数据访问上下文。
 *   - resolve(expr)：如果 expr 是 { path: string }，从 dataModel 解析；否则返回原值
 *   - createChildContext(relativePath)：创建子上下文，basePath 拼接
 *   - resolvePath(path)：支持 "/" 开头绝对路径和相对路径拼接
 */

import type { JsonValue } from "@a2ui-platform/shared";
import { DataModel } from "./data-model";

/** 动态值引用：{ path: "/some/path" } */
interface DynamicRef {
  path: string;
}

function isDynamicRef(value: unknown): value is DynamicRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "path" in value &&
    typeof (value as DynamicRef).path === "string" &&
    Object.keys(value as Record<string, unknown>).length === 1
  );
}

export class DataContext {
  /** 底层数据模型 */
  readonly dataModel: DataModel;
  /** 当前上下文的基准路径，以 "/" 结尾（形式）。内部存储不含结尾 "/"。 */
  private _basePath: string;

  /**
   * @param dataModel 底层 DataModel 实例
   * @param basePath  基准路径，默认为 "/"
   */
  constructor(dataModel: DataModel, basePath?: string) {
    this.dataModel = dataModel;
    this._basePath = basePath && basePath !== "/" ? basePath : "";
  }

  // ─── 公开 API ─────────────────────────────────────────────

  /**
   * 解析表达式值。
   * 如果 expr 是形如 { path: "..." } 的动态引用对象，则从 dataModel 取值；
   * 否则原样返回。
   */
  resolve(expr: unknown): unknown {
    if (isDynamicRef(expr)) {
      const fullPath = this.resolvePath(expr.path);
      return this.dataModel.get(fullPath) ?? expr.path;
    }
    return expr;
  }

  /**
   * 创建子上下文，在当前 basePath 基础上拼接 relativePath。
   * @param relativePath 相对路径（如 "item"、"children/0"）
   */
  createChildContext(relativePath: string): DataContext {
    const childBase = this._joinPath(this._basePath, relativePath);
    return new DataContext(this.dataModel, childBase);
  }

  /** 订阅 dataModel 中相对路径的变更 */
  subscribe(path: string, callback: () => void): () => void {
    const fullPath = this.resolvePath(path);
    return this.dataModel.subscribe(fullPath, callback);
  }

  /** 在当前上下文设置相对路径的值 */
  set(path: string, value: JsonValue): void {
    const fullPath = this.resolvePath(path);
    this.dataModel.set(fullPath, value);
  }

  /**
   * 解析路径：如果以 "/" 开头则为绝对路径，直接返回；
   * 否则在 basePath 基础上拼接。
   */
  resolvePath(path: string): string {
    if (path.startsWith("/")) {
      return path;
    }
    return this._joinPath(this._basePath, path);
  }

  // ─── 内部方法 ─────────────────────────────────────────────

  /** 拼接两个路径片段 */
  private _joinPath(base: string, relative: string): string {
    if (!base) return "/" + relative;
    return base + "/" + relative;
  }
}
