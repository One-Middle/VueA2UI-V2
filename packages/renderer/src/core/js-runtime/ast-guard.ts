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

const FORBIDDEN_MEMBER_NAMES = new Set(["constructor", "prototype", "__proto__"]);

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

/** 校验脚本 AST 是否只使用 JSRuntime 允许的受限语法。 */
export function assertSafeScriptAst(code: string): void {
  let ast: unknown;
  try {
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

function walkAst(node: unknown, parent: Record<string, unknown> | null): void {
  if (!isAstNode(node)) return;

  assertAllowedNode(node);
  assertAllowedIdentifier(node, parent);
  assertAllowedMemberAccess(node);
  assertAllowedCall(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === "start" || key === "end" || key === "loc" || key === "range") continue;
    if (Array.isArray(value)) {
      value.forEach((child) => walkAst(child, node));
      continue;
    }
    walkAst(value, node);
  }
}

function assertAllowedNode(node: Record<string, unknown>): void {
  const type = String(node.type);
  if (FORBIDDEN_NODE_TYPES.has(type)) {
    throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", `脚本不允许使用 ${type}。`);
  }
}

function assertAllowedIdentifier(node: Record<string, unknown>, parent: Record<string, unknown> | null): void {
  if (node.type !== "Identifier") return;
  const name = String(node.name);
  if (!FORBIDDEN_IDENTIFIERS.has(name)) return;

  if (parent?.type === "Property" && parent.key === node && parent.computed !== true) {
    return;
  }
  if (parent?.type === "MemberExpression" && parent.property === node && parent.computed !== true) {
    return;
  }

  throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", `脚本不允许访问 ${name}。`);
}

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

  if (node.computed === true && !isNumericLiteral(property)) {
    throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", "脚本不允许使用动态成员访问。");
  }
}

function assertAllowedCall(node: Record<string, unknown>): void {
  if (node.type !== "CallExpression") return;
  const callee = node.callee;
  if (!isAstNode(callee)) return;
  if (callee.type === "Identifier" && FORBIDDEN_IDENTIFIERS.has(String(callee.name))) {
    throw new JsRuntimeError("SCRIPT_AST_FORBIDDEN", `脚本不允许调用 ${String(callee.name)}。`);
  }
}

function isNumericLiteral(node: Record<string, unknown>): boolean {
  return node.type === "Literal" && typeof node.value === "number" && Number.isInteger(node.value);
}

function isAstNode(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && typeof (value as Record<string, unknown>).type === "string";
}
