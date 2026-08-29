/**
 * 受控视觉 style 解析。
 *
 * 职责：
 * - 将 A2UI style 白名单字段转换为 Vue CSSProperties
 * - 解析 style 子字段中的 `{ path }` 和属性脚本
 *
 * 不负责：透传任意 CSS、className 或事件处理器。
 */

import type { CSSProperties } from "vue";
import { DataContext } from "../core/data-context";
import type { RenderContext } from "./render-context";
import { resolveRenderValue } from "./resolve-dynamic";

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
  "overflow",
  "flex",
] as const;

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  xs: "0 1px 2px rgba(15, 23, 42, 0.06)",
  sm: "0 4px 10px rgba(15, 23, 42, 0.08)",
  md: "0 12px 28px rgba(15, 23, 42, 0.12)",
  lg: "0 20px 44px rgba(15, 23, 42, 0.16)",
};

export function resolveControlledStyle(input: {
  value: unknown;
  dataContext: DataContext;
  renderContext: RenderContext;
  sourceComponentId: string;
}): CSSProperties {
  if (
    !input.value ||
    typeof input.value !== "object" ||
    Array.isArray(input.value)
  ) {
    return {};
  }

  const source: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(
    input.value as Record<string, unknown>,
  )) {
    const resolved = resolveRenderValue({
      value,
      dataContext: input.dataContext,
      renderContext: input.renderContext,
      sourceComponentId: input.sourceComponentId,
    });
    if (resolved !== undefined) {
      source[key] = resolved;
    }
  }

  const style: CSSProperties = {};
  for (const key of DIRECT_STYLE_KEYS) {
    const value = source[key];
    if (
      value !== undefined &&
      (typeof value === "string" || typeof value === "number")
    ) {
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
