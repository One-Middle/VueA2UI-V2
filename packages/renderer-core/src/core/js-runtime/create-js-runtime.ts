/**
 * JSRuntime 工厂。
 *
 * 职责：
 * - 根据配置创建 SES 或 new Function 路径的 JSRuntime 对象
 *
 * 不负责：
 * - 缓存默认 Runtime 实例
 * - 执行脚本
 *
 * 引用：
 * - JSRuntime 公共类型
 * - SES 与 Function Runtime 实现
 * 被引用：
 * - JSRuntime 门面和测试
 * 注意：
 * - 如果工程最终删除 SES 文件，需要同步收窄这里的 kind 分支。
 */

import type { JSRuntime, JsRuntimeKind } from "./types";
import { FunctionJsRuntime } from "./implementations/function-js-runtime";
import { SesJsRuntime } from "./implementations/ses-js-runtime";

/** 创建 JSRuntime 对象的工厂。 */
export class JsRuntimeFactory {
  /**
   * 根据 kind 创建 JSRuntime。
   *
   * @param kind - 执行路径，"ses" 使用 SES Compartment，"function" 使用 new Function
   * @returns 符合统一接口的 JSRuntime 实例
   */
  create(kind: JsRuntimeKind): JSRuntime {
    if (kind === "ses") {
      return new SesJsRuntime();
    }
    return new FunctionJsRuntime();
  }
}
