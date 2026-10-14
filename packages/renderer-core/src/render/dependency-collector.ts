/**
 * RenderNode 构建依赖收集器。
 *
 * 职责：
 * - 收集本次 RenderNode tree 构建读取过的 dataModel 绝对路径
 * - 输出去重、排序后的依赖数组，供 surface 层同步订阅
 *
 * 不负责：订阅 DataModel 或触发 DOM 刷新。
 */

import type { DataContext } from "../core/data-context";
import { resolveScriptDeps } from "../core/dynamic-value";

export class RenderDependencyCollector {
  private readonly dependencies = new Set<string>();

  /**
   * 添加相对当前 DataContext 的数据路径依赖。
   */
  addPath(path: string, dataContext: DataContext): void {
    this.dependencies.add(dataContext.resolvePath(path));
  }

  /**
   * 添加已经解析成绝对路径的数据依赖。
   */
  addResolvedPath(path: string): void {
    this.dependencies.add(path);
  }

  /**
   * 添加属性脚本声明的 deps 依赖。
   */
  addScriptDeps(deps: string[], dataContext: DataContext): void {
    for (const path of resolveScriptDeps(deps, dataContext)) {
      this.dependencies.add(path);
    }
  }

  /**
   * 输出去重并排序后的依赖路径。
   */
  toArray(): string[] {
    return Array.from(this.dependencies).sort();
  }
}
