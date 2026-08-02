/**
 * JSRuntime 执行路径配置。
 *
 * 职责：
 * - 提供 Renderer 默认 JSRuntime 实现选择
 * - 提供 new Function 路径的 AST guard 开关
 *
 * 不负责：
 * - 创建或执行 JSRuntime
 *
 * 引用：
 * - JSRuntime 公共类型
 * 被引用：
 * - JSRuntime 门面和 FunctionJsRuntime
 * 注意：
 * - 如需切换回 SES，只改 JS_RUNTIME_KIND 为 "ses"；如确认 SES 不再使用，可删除 SES 实现和 ses 依赖。
 */

import type { JsRuntimeKind } from "./types";

/** Renderer 默认 JSRuntime 路径。 */
export const JS_RUNTIME_KIND: JsRuntimeKind = "function";

/** new Function 路径是否启用 AST 安全检查。 */
export const ENABLE_FUNCTION_RUNTIME_AST_GUARD = true;
