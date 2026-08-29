/**
 * RenderNode 构建依赖收集器。
 *
 * 职责：
 * - 收集本次 RenderNode tree 构建读取过的 dataModel 绝对路径
 * - 输出去重、排序后的依赖数组，供 surface 层同步订阅
 *
 * 不负责：订阅 DataModel 或触发 Vue 响应式刷新。
 */

import type { DataContext } from "../core/data-context";
import { resolveScriptDeps } from "../core/dynamic-value";

export class RenderDependencyCollector {
  private readonly dependencies = new Set<string>();

  addPath(path: string, dataContext: DataContext): void {
    this.dependencies.add(dataContext.resolvePath(path));
  }

  addResolvedPath(path: string): void {
    this.dependencies.add(path);
  }

  addScriptDeps(deps: string[], dataContext: DataContext): void {
    for (const path of resolveScriptDeps(deps, dataContext)) {
      this.dependencies.add(path);
    }
  }

  toArray(): string[] {
    return Array.from(this.dependencies).sort();
  }
}
