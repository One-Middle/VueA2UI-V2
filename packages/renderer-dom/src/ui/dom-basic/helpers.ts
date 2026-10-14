/**
 * dom-basic 组件共享的 DOM 构建工具。
 *
 * 职责：
 * - 统一 props 类型收窄、className 拼接与 style 写入。
 * - 提供字段外壳、选项归一化和子节点 cleanup 聚合能力。
 *
 * 引用：
 * - dom-basic 类型契约。
 * 被引用：
 * - dom-basic 组件实现。
 * 注意：
 * - helper 只处理通用 DOM 拼装，不承载具体组件语义。
 */
import type { DomCleanup, DomRenderResult, DomStyleProperties } from "./types";

/**
 * 把未知值转换为适合写入 textContent 的字符串。
 *
 * @param value - 任意协议值。
 * @returns undefined 与 null 会被转换为空字符串。
 */
export function textValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/**
 * 安全读取字符串属性。
 */
export function stringProp(
  props: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = props[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * 安全读取布尔属性，只把显式 true 视为真。
 */
export function booleanProp(
  props: Record<string, unknown>,
  key: string,
): boolean {
  return props[key] === true;
}

/**
 * 安全读取有限数字属性。
 */
export function numberProp(
  props: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = props[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * 创建 HTMLElement，并应用 className、style、文本与属性。
 *
 * @param tagName - 要创建的 HTML 标签名。
 * @param options - 可选的 DOM 初始化配置。
 * @returns 已初始化的 HTMLElement。
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: {
    className?: string | string[];
    style?: unknown;
    text?: unknown;
    attrs?: Record<string, string | number | boolean | undefined>;
  },
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (options?.className) {
    const classes = Array.isArray(options.className)
      ? options.className
      : [options.className];
    element.className = classes.filter(Boolean).join(" ");
  }
  if (options?.style) {
    applyStyle(element, options.style);
  }
  if (options?.text !== undefined) {
    element.textContent = textValue(options.text);
  }
  if (options?.attrs) {
    setAttrs(element, options.attrs);
  }
  return element;
}

/**
 * 拼接可选 className 片段。
 */
export function classes(items: Array<string | false | undefined>): string {
  return items.filter(Boolean).join(" ");
}

/**
 * 根据通用视觉属性生成 BEM 风格 className。
 */
export function visualClasses(
  block: string,
  props: Record<string, unknown>,
): string {
  return ["variant", "size", "tone", "preset"]
    .filter((key) => stringProp(props, key))
    .map((key) => `${block}--${key}-${props[key]}`)
    .join(" ");
}

/**
 * 根据字段类组件的通用属性生成 className。
 */
export function fieldClasses(
  block: string,
  props: Record<string, unknown>,
  visualBlock = block,
): string {
  return classes([
    block,
    visualClasses(visualBlock, props),
    stringProp(props, "validationState")
      ? `a2ui-field--validation-${props.validationState}`
      : undefined,
    stringProp(props, "density")
      ? `a2ui-field--density-${props.density}`
      : undefined,
  ]);
}

/**
 * 把多个子渲染结果挂到父节点上，并合并它们的 cleanup。
 *
 * @param parent - 要追加子节点的父节点。
 * @param results - 子组件渲染结果。
 * @returns 聚合后的清理函数；没有副作用时返回 undefined。
 */
export function appendResults(
  parent: Node,
  results: DomRenderResult[],
): DomCleanup | undefined {
  const cleanups: DomCleanup[] = [];
  for (const result of results) {
    parent.appendChild(result.node);
    if (result.cleanup) cleanups.push(result.cleanup);
  }
  return cleanups.length > 0
    ? () => {
        for (const cleanup of cleanups) cleanup();
      }
    : undefined;
}

/**
 * 把协议 style 对象写入 HTMLElement.style。
 *
 * 注意：驼峰属性名会转换为 kebab-case，再通过 setProperty 写入。
 */
export function applyStyle(element: HTMLElement, style: unknown): void {
  if (!style || typeof style !== "object" || Array.isArray(style)) return;
  for (const [key, value] of Object.entries(style as DomStyleProperties)) {
    if (value === undefined || value === null) continue;
    element.style.setProperty(toKebabCase(key), String(value));
  }
}

/**
 * 批量设置 HTML 属性。
 *
 * 注意：布尔 true 写成空属性，false 与 undefined 不写入。
 */
export function setAttrs(
  element: HTMLElement,
  attrs: Record<string, string | number | boolean | undefined>,
): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (value === true) {
      element.setAttribute(key, "");
    } else {
      element.setAttribute(key, String(value));
    }
  }
}

/**
 * 创建字段类组件共享的标签、描述与根节点外壳。
 *
 * @param tagName - 根节点标签，label 表示点击标签可聚焦控件。
 * @param props - 组件属性。
 * @param className - 根节点 className。
 * @returns 已包含 label/description 的根节点。
 */
export function fieldChrome(
  tagName: "label" | "div",
  props: Record<string, unknown>,
  className: string,
): HTMLElement {
  const root = createElement(tagName, {
    className,
    style: props.style,
  });
  const label = stringProp(props, "label");
  if (label) {
    const labelEl = createElement("span", {
      className: `${className.split(" ")[0]}-label`,
    });
    labelEl.append(document.createTextNode(label));
    if (booleanProp(props, "required")) {
      labelEl.appendChild(
        createElement("span", {
          className: "a2ui-field-required",
          text: "*",
        }),
      );
    }
    root.appendChild(labelEl);
  }
  const description = stringProp(props, "description");
  if (description) {
    root.appendChild(
      createElement("span", {
        className: "a2ui-field-description",
        text: description,
      }),
    );
  }
  return root;
}

/**
 * 根据字段校验状态追加错误或帮助文案。
 */
export function appendFieldMessage(
  root: HTMLElement,
  props: Record<string, unknown>,
): void {
  const errorText = stringProp(props, "errorText");
  const helpText = stringProp(props, "helpText");
  if (errorText) {
    root.appendChild(
      createElement("span", { className: "a2ui-field-error", text: errorText }),
    );
  } else if (helpText) {
    root.appendChild(
      createElement("span", { className: "a2ui-field-help", text: helpText }),
    );
  }
}

/**
 * 将协议中的 options 归一化为原生控件可使用的选项数组。
 *
 * @param value - 字符串数组或对象数组。
 * @returns 标准化后的 label/value/disabled 结构。
 */
export function toOptions(value: unknown): Array<{
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
}> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return { label: item, value: item };
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const rawValue = record.value ?? record.key ?? record.label;
      const label = textValue(record.label ?? rawValue);
      const optionValue =
        typeof rawValue === "number" || typeof rawValue === "boolean"
          ? rawValue
          : textValue(rawValue);
      return {
        label,
        value: optionValue,
        disabled: record.disabled === true,
      };
    })
    .filter((item) => item !== null);
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
