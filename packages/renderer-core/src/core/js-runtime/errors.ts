/**
 * JSRuntime 错误定义。
 *
 * 职责：
 * - 统一受限脚本执行、校验和安全检查的错误类型
 *
 * 不负责：
 * - 决定错误如何上报到宿主应用
 *
 * 引用：
 * - 无
 * 被引用：
 * - validation、ast-guard、各 JSRuntime 实现
 * 注意：
 * - code 会被上层用于生成 renderer error payload，修改时需要同步调用方约定。
 */

/** JSRuntime 执行错误。 */
export class JsRuntimeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JsRuntimeError";
    this.code = code;
  }
}
