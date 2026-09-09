/**
 * new Function 路径的 AST 安全检查。
 *
 * 职责：
 * - 在执行脚本前解析语法树并拒绝高风险语法
 * - 阻断浏览器全局对象、动态执行能力和原型链逃逸入口
 *
 * 不负责：
 * - 替代真正沙箱隔离；new Function 仍然不是安全沙箱
 *
 * 引用：
 * - acorn
 * - JSRuntime 错误定义
 * 被引用：
 * - FunctionJsRuntime
 * 注意：
 * - new Function 不是安全沙箱；这里的规则偏保守，重点降低脚本拿回全局能力的概率。
 */

import { parse } from "acorn";
import { JsRuntimeError } from "./errors";

/**
 * 禁止作为「引用」使用的全局标识符。
 *
 * 这些是浏览器宿主环境提供的全局能力（DOM、网络、存储、定时器、动态执行等），
 * 脚本一旦拿到其中任意一个，就能借它脱离受限执行环境——例如用 fetch 外发数据、
 * 用 eval/Function 执行任意代码、用 localStorage 读写持久化数据。
 * 因此凡是以「引用」身份出现（读取/写入变量）即拒绝；作为对象键或非计算成员名
 * 出现时放行（见 assertAllowedIdentifier），因为那只是命名，并未真正访问全局。
 */
const FORBIDDEN_IDENTIFIERS = new Set([
  "window",
  "document",
  "globalThis",
  "self",
  "parent",
  "top",
  "frames",
  "location",
  "navigator",
  "history",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "crypto",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Worker",
  "SharedWorker",
  "importScripts",
  "fetch",
  "eval",
  "Function",
  "setTimeout",
  "setInterval",
  "requestAnimationFrame",
  "console",
]);

/**
 * 禁止访问的成员名。
 *
 * constructor / prototype / __proto__ 是 JS 原型链上的通用属性。经典逃逸手法是：
 * `obj.constructor.constructor("...")()`——借任意对象的 constructor 一路拿到 Function
 * 构造函数，从而在受限环境里执行任意代码。因此统一在成员访问阶段拦截这三个名字。
 */
const FORBIDDEN_MEMBER_NAMES = new Set(["constructor", "prototype", "__proto__"]);

/**
 * 禁止出现的 AST 节点类型。
 *
 * 这些语法要么引入模块能力、要么依赖异步/调用上下文、要么作用域规则复杂，
 * 都超出了 JSRuntime 期望的受限脚本语法，逐项拦截成本高且易漏，故整体禁用：
 * - Import* / Export*：模块导入导出能力，可借 import() 动态加载代码；
 * - AwaitExpression：依赖异步上下文；
 * - MetaProperty：import.meta / new.target，依赖模块或函数调用上下文；
 * - ThisExpression：this 取值依赖调用上下文，可能绕过词法约束；
 * - WithStatement：作用域解析歧义大，严格模式下本身即被禁止；
 * - ClassDeclaration / ClassExpression：含 super、静态块等复杂语义，保守禁用。
 */
const FORBIDDEN_NODE_TYPES = new Set([
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
  "ImportExpression",
  "AwaitExpression",
  "MetaProperty",
  "ThisExpression",
  "WithStatement",
  "ClassDeclaration",
  "ClassExpression",
]);

/**
 * 解析并校验脚本，拒绝超出 JSRuntime 受限语法的代码。
 *
 * 解析失败（语法错误）或 AST 命中禁用规则时抛出 JsRuntimeError；
 * 通过校验则静默返回，表示可以交给 new Function 执行。
 *
 * @param code - 待执行的脚本源码
 * @throws {JsRuntimeError} 语法非法或命中禁用规则时抛出
 */
export function assertSafeScriptAst(code: string): void {
  let ast: unknown;
  try {
    // 用 IIFE 包裹后解析：把源码当作一段语句块处理，return 等语句在函数体内才合法
    ast = parse(`(() => {\n${code}\n})()`, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowReturnOutsideFunction: false,
    });
  } catch (error) {
    throw new JsRuntimeError(
      "SCRIPT_SYNTAX_INVALID",
      error instanceof Error ? `脚本语法错误：${error.message}` : "脚本语法错误。",
    );
  }

  walkAst(ast, null);
}

/**
 * 递归遍历 AST，对每个节点依次执行各项安全断言。
 *
 * @param node - 当前访问的 AST 节点，或节点上的任意字段值（可能是 null / 数字 / 字符串）
 * @param parent - 当前节点的父节点，用于判断标识符是「引用」还是「属性名」
 */
function walkAst(node: unknown, parent: Record<string, unknown> | null): void {
  if (!isAstNode(node)) return;

  assertAllowedNode(node);
  assertAllowedIdentifier(node, parent);
  assertAllowedMemberAccess(node);
  assertAllowedCall(node);

  for (const [key, value] of Object.entries(node)) {
    // start/end/loc/range 是 acorn 的位置信息，跳过以免被误判成子节点
    if (key === "start" || key === "end" || key === "loc" || key === "range") continue;
    if (Array.isArray(value)) {
      value.forEach((child) => walkAst(child, node));
      continue;
    }
    walkAst(value, node);
  }
}

/** 拒绝 FORBIDDEN_NODE_TYPES 中列出的节点类型，如 import / await / with / class 等。 */
function assertAllowedNode(node: Record<string, unknown>): void {
  const type = String(node.type);
  if (FORBIDDEN_NODE_TYPES.has(type)) {
    throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", `脚本不允许使用 ${type}。`);
  }
}

/**
 * 拒绝把禁用的全局标识符当作「引用」使用。
 *
 * 例外：当标识符是对象字面量键（{ window: 1 }）或成员访问的非计算属性名
 * （obj.window）时放行——这些位置只是命名，并不会真正读取全局对象。
 */
function assertAllowedIdentifier(node: Record<string, unknown>, parent: Record<string, unknown> | null): void {
  if (node.type !== "Identifier") return;
  const name = String(node.name);
  if (!FORBIDDEN_IDENTIFIERS.has(name)) return;

  // 对象字面量键 { window: 1 }：键名只是命名，不触发全局访问
  if (parent?.type === "Property" && parent.key === node && parent.computed !== true) {
    return;
  }
  // 成员访问 obj.window：访问的是 obj 自身的属性，而非全局 window
  if (parent?.type === "MemberExpression" && parent.property === node && parent.computed !== true) {
    return;
  }

  throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", `脚本不允许访问 ${name}。`);
}

/**
 * 拦截通过成员访问进行的原型链逃逸与动态访问。
 *
 * - 禁止 obj.constructor / obj.prototype / obj.__proto__（含字符串字面量写法）；
 * - 禁止非整数字面量的计算属性访问 obj[x]，防止用字符串拼接绕过上面的静态名称检查。
 */
function assertAllowedMemberAccess(node: Record<string, unknown>): void {
  if (node.type !== "MemberExpression") return;

  const property = node.property;
  if (!isAstNode(property)) return;

  if (property.type === "Identifier" && FORBIDDEN_MEMBER_NAMES.has(String(property.name))) {
    throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", `脚本不允许访问 ${String(property.name)}。`);
  }

  if (property.type === "Literal" && FORBIDDEN_MEMBER_NAMES.has(String(property.value))) {
    throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", `脚本不允许访问 ${String(property.value)}。`);
  }

  // 仅放行 obj[0] 这类整数下标；拒绝 obj[key] 动态访问，否则可拼接出被禁的成员名绕过检查
  if (node.computed === true && !isNumericLiteral(property)) {
    throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", "脚本不允许使用动态成员访问。");
  }
}

/**
 * 拒绝直接调用禁用的全局函数，如 eval(...) / fetch(...)。
 *
 * 单独的标识符引用本会被 assertAllowedIdentifier 拦截，但这里在遍历到 callee 之前
 * 先行命中，能给出语义更贴切的「调用」错误信息。
 */
function assertAllowedCall(node: Record<string, unknown>): void {
  if (node.type !== "CallExpression") return;
  const callee = node.callee;
  if (!isAstNode(callee)) return;
  if (callee.type === "Identifier" && FORBIDDEN_IDENTIFIERS.has(String(callee.name))) {
    throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", `脚本不允许调用 ${String(callee.name)}。`);
  }
}

/** 判断是否为整数数字字面量，用于放行 obj[0] 这类数组下标访问。 */
function isNumericLiteral(node: Record<string, unknown>): boolean {
  return node.type === "Literal" && typeof node.value === "number" && Number.isInteger(node.value);
}

/**
 * 类型收窄守卫：判断一个值是否为 AST 节点（拥有字符串 type 字段的对象）。
 *
 * acorn 生成的节点图里既有节点对象，也有 null / 数字 / 字符串等值，
 * 先用它过滤，后续才能安全地读取 node.type。
 */
function isAstNode(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && typeof (value as Record<string, unknown>).type === "string";
}
