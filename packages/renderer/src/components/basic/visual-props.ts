/**
 * Basic Catalog 通用视觉属性解析工具。
 *
 * 职责：
 * - 将协议中的受控 style 白名单转换为 Vue 可绑定的 CSSProperties
 * - 为 variant / size / tone / preset 生成稳定的 BEM 修饰类
 *
 * 不负责：校验 A2UI 协议合法性；该职责由 Agent validateA2UI 完成。
 */

import type { CSSProperties } from "vue";
import type { ComponentContext } from "../../vue/context";

/** 可透传到 DOM 的受控样式字段。 */
const DIRECT_STYLE_KEYS = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "padding",
  "margin",
  "gap",
  "color",
  "backgroundColor",
  "borderColor",
  "borderWidth",
  "borderRadius",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "textAlign",
  "alignSelf",
  "justifySelf",
  "opacity",
] as const;

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  xs: "0 1px 2px rgba(15, 23, 42, 0.06)",
  sm: "0 4px 10px rgba(15, 23, 42, 0.08)",
  md: "0 12px 28px rgba(15, 23, 42, 0.12)",
  lg: "0 20px 44px rgba(15, 23, 42, 0.16)",
};

/** 解析组件 style 字段。 */
export function resolveVisualStyle(ctx: ComponentContext): CSSProperties {
  const raw = ctx.resolveValue(ctx.componentModel.getProperty("style"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const source = raw as Record<string, unknown>;
  const style: CSSProperties = {};

  for (const key of DIRECT_STYLE_KEYS) {
    const value = source[key];
    if (value !== undefined && (typeof value === "string" || typeof value === "number")) {
      (style as Record<string, string | number>)[key] = value;
    }
  }

  if (typeof source.paddingX === "string") {
    style.paddingLeft = source.paddingX;
    style.paddingRight = source.paddingX;
  }
  if (typeof source.paddingY === "string") {
    style.paddingTop = source.paddingY;
    style.paddingBottom = source.paddingY;
  }
  if (typeof source.marginX === "string") {
    style.marginLeft = source.marginX;
    style.marginRight = source.marginX;
  }
  if (typeof source.marginY === "string") {
    style.marginTop = source.marginY;
    style.marginBottom = source.marginY;
  }
  if (typeof source.shadow === "string") {
    style.boxShadow = SHADOW_MAP[source.shadow] ?? source.shadow;
  }

  return style;
}

/** 读取字符串视觉属性。 */
export function resolveStringProp(ctx: ComponentContext, key: string): string {
  const value = ctx.resolveValue(ctx.componentModel.getProperty(key));
  return typeof value === "string" ? value : "";
}

/** 读取布尔属性。 */
export function resolveBooleanProp(
  ctx: ComponentContext,
  key: string,
  defaultValue = false,
): boolean {
  const value = ctx.resolveValue(ctx.componentModel.getProperty(key));
  return typeof value === "boolean" ? value : defaultValue;
}

/** 生成组件视觉修饰类。 */
export function resolveVisualClasses(ctx: ComponentContext, block: string): string[] {
  const classes: string[] = [];
  for (const key of ["variant", "size", "tone", "preset"] as const) {
    const value = resolveStringProp(ctx, key);
    if (value) {
      classes.push(`${block}--${key}-${value}`);
    }
  }
  return classes;
}
