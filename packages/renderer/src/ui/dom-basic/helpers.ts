import type { DomCleanup, DomRenderResult, DomStyleProperties } from "./types";

export function textValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

export function stringProp(
  props: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = props[key];
  return typeof value === "string" ? value : undefined;
}

export function booleanProp(
  props: Record<string, unknown>,
  key: string,
): boolean {
  return props[key] === true;
}

export function numberProp(
  props: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = props[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

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

export function classes(items: Array<string | false | undefined>): string {
  return items.filter(Boolean).join(" ");
}

export function visualClasses(
  block: string,
  props: Record<string, unknown>,
): string {
  return ["variant", "size", "tone", "preset"]
    .filter((key) => stringProp(props, key))
    .map((key) => `${block}--${key}-${props[key]}`)
    .join(" ");
}

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

export function applyStyle(element: HTMLElement, style: unknown): void {
  if (!style || typeof style !== "object" || Array.isArray(style)) return;
  for (const [key, value] of Object.entries(style as DomStyleProperties)) {
    if (value === undefined || value === null) continue;
    element.style.setProperty(toKebabCase(key), String(value));
  }
}

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
