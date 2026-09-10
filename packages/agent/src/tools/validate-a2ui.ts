/**
 * A2UI v0.9 消息校验器。
 *
 * 职责：
 * - 对 A2UI 消息列表执行六项校验：结构校验、组件属性校验、根组件存在性校验、
 *   子组件引用校验、Surface 存在性校验、安全内容校验
 * - 基于 Ajv 对 A2UI v0.9 JSON Schema 和 Basic Catalog Schema 进行复合校验
 *
 * 不负责：A2UI Schema 的定义与维护（见 schemas/）、校验结果的持久化。
 */

import Ajv2020 from "ajv/dist/2020.js";
import type {
  A2UIServerMessage,
  SurfaceSnapshotData,
  ValidateA2UIInput,
  ValidateA2UIResult,
  ValidationIssue,
} from "@a2ui-platform/shared";
import { getBasicCatalogJsonSchema } from "@a2ui-platform/shared";
import a2uiSchema from "../schemas/a2ui-v0.9-schema.json" with { type: "json" };
import { logger } from "../logger.js";

/** Ajv 实例（懒加载单例） */
let _ajv: Ajv2020 | null = null;
/** A2UI v0.9 JSON Schema 编译后的校验函数（懒加载） */
let _a2uiValidator: ReturnType<Ajv2020["compile"]> | null = null;

/**
 * 获取或创建 Ajv 实例。
 */
function getAjv(): Ajv2020 {
  if (!_ajv) {
    _ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      validateSchema: false,
    });
  }
  return _ajv;
}

/**
 * 获取或编译 A2UI v0.9 顶层 Schema 的校验函数。
 */
function getA2UIValidator(): ReturnType<Ajv2020["compile"]> {
  if (!_a2uiValidator) {
    _a2uiValidator = getAjv().compile(a2uiSchema);
  }
  return _a2uiValidator;
}

/**
 * 对一批 A2UI 消息执行完整校验。
 *
 * @param input - 校验输入（消息列表、catalogId、可选的当前快照）
 * @returns 校验结果，包含错误、警告和规范化消息列表
 */
export function validateA2UI(input: ValidateA2UIInput): ValidateA2UIResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const { messages, catalogId, currentSnapshot } = input;

  logger.debug(
    `开始校验 → messages=${messages.length}, catalogId=${catalogId}`,
  );

  // 执行六项校验（依次累积 errors，不短路）
  const knownSurfaceIds = collectKnownSurfaceIds(currentSnapshot);
  validateMessageStructures(messages, knownSurfaceIds, errors);
  validateComponentProperties(messages, errors);
  validateRootExists(messages, errors);
  validateChildReferences(messages, errors);
  validateSurfaceExistences(messages, knownSurfaceIds, errors);
  validateSafetyConstraints(messages, errors);

  if (errors.length > 0) {
    logger.debug(
      `校验发现问题 → errors=${errors.length}, warnings=${warnings.length}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedMessages: errors.length === 0 ? messages : [],
  };
}

/**
 * 从当前快照中收集已知的 Surface ID 集合，用于增量校验。
 */
function collectKnownSurfaceIds(
  currentSnapshot: SurfaceSnapshotData | null | undefined,
): Set<string> {
  const knownSurfaceIds = new Set<string>();
  if (currentSnapshot?.surfaces) {
    for (const surfaceId of Object.keys(currentSnapshot.surfaces)) {
      knownSurfaceIds.add(surfaceId);
    }
  }
  return knownSurfaceIds;
}

/**
 * 校验每条消息的顶层 A2UI v0.9 结构是否符合 JSON Schema。
 * 同时从 createSurface 消息中提取新增的 Surface ID 加入已知集合。
 */
function validateMessageStructures(
  messages: A2UIServerMessage[],
  knownSurfaceIds: Set<string>,
  errors: ValidationIssue[],
): void {
  const a2uiValidator = getA2UIValidator();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const valid = a2uiValidator(msg);
    if (!valid) {
      for (const ajvErr of a2uiValidator.errors ?? []) {
        errors.push({
          code: "A2UI_STRUCTURE",
          path: `/${i}${ajvErr.instancePath}`,
          message: `A2UI v0.9 结构校验失败：${ajvErr.message ?? "未知错误"}`,
        });
      }
    }

    // createSurface 会引入新的 surfaceId，后续引用可以合法使用
    if (msg && typeof msg === "object" && "createSurface" in msg) {
      const surfaceId = msg.createSurface?.surfaceId;
      if (surfaceId) {
        knownSurfaceIds.add(surfaceId);
      }
    }
  }
}

/**
 * 校验 updateComponents 消息中每个组件的属性是否符合 Basic Catalog 定义。
 */
function validateComponentProperties(
  messages: A2UIServerMessage[],
  errors: ValidationIssue[],
): void {
  const ajv = getAjv();
  const catalogSchema = getBasicCatalogJsonSchema();
  const catalogDefs = (catalogSchema as { $defs?: Record<string, unknown> })
    .$defs;
  const componentDefs = (
    catalogSchema as { definitions?: Record<string, unknown> }
  ).definitions;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object" || !("updateComponents" in msg)) {
      continue;
    }

    const components = msg.updateComponents?.components;
    if (!Array.isArray(components)) continue;

    for (let ci = 0; ci < components.length; ci++) {
      const comp = components[ci] as Record<string, unknown>;
      const componentType = comp["component"];
      if (typeof componentType !== "string") continue;

      // 检查组件类型是否在 Catalog 中定义
      if (!componentDefs?.[componentType]) {
        errors.push({
          code: "UNKNOWN_COMPONENT",
          path: `/${i}/updateComponents/components/${ci}/component`,
          message: `组件 "${comp["id"] ?? `[${ci}]`}" 的类型 "${componentType}" 不在 Basic Catalog 中`,
        });
        continue;
      }

      // 对该组件实例执行 Catalog Schema 校验
      let valid = false;
      try {
        valid = ajv.validate(
          {
            $defs: catalogDefs,
            definitions: componentDefs,
            $ref: `#/definitions/${componentType}`,
          },
          comp,
        ) as boolean;
      } catch (err) {
        errors.push({
          code: "UNKNOWN_COMPONENT",
          path: `/${i}/updateComponents/components/${ci}/component`,
          message: `组件 "${comp["id"] ?? `[${ci}]`}" 的类型 "${componentType}" 无法加载：${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }

      if (!valid) {
        for (const ajvErr of ajv.errors ?? []) {
          const extraProperty =
            ajvErr.keyword === "additionalProperties" &&
            typeof ajvErr.params?.["additionalProperty"] === "string"
              ? `/${ajvErr.params["additionalProperty"]}`
              : "";
          errors.push({
            code: "CATALOG_PROPERTY",
            path: `/${i}/updateComponents/components/${ci}${ajvErr.instancePath}${extraProperty}`,
            message: `组件 "${comp["id"] ?? `[${ci}]`}" 的属性不符合 "${componentType}" 规范：${ajvErr.message ?? "未知错误"}`,
          });
        }
      }
    }
  }
}

/**
 * 校验是否存在 id="root" 的根组件（当有组件被创建时必须存在）。
 */
function validateRootExists(
  messages: A2UIServerMessage[],
  errors: ValidationIssue[],
): void {
  const componentIds = new Set<string>();
  for (const msg of messages) {
    if (!("updateComponents" in msg)) continue;
    for (const comp of msg.updateComponents.components) {
      componentIds.add(comp.id);
    }
  }

  if (componentIds.size > 0 && !componentIds.has("root")) {
    errors.push({
      code: "MISSING_ROOT",
      path: "",
      message: '所有 updateComponents 消息中缺少 id="root" 的根组件。',
    });
  }
}

/**
 * 校验 child / children 引用的组件 ID 是否在同一个 surface 内已声明。
 */
function validateChildReferences(
  messages: A2UIServerMessage[],
  errors: ValidationIssue[],
): void {
  // 1. 收集每个 surface 内已声明的组件 ID
  const surfaceComponentsMap = new Map<string, Set<string>>();

  for (const msg of messages) {
    if (!("updateComponents" in msg)) continue;
    const { surfaceId, components } = msg.updateComponents;
    const ids = surfaceComponentsMap.get(surfaceId) ?? new Set<string>();
    for (const comp of components) {
      ids.add(comp.id);
    }
    surfaceComponentsMap.set(surfaceId, ids);
  }

  // 2. 检查每条消息中每个组件的 child / children / tabItems 引用
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg) continue;
    if (!("updateComponents" in msg)) continue;
    const { surfaceId, components } = msg.updateComponents;
    const knownIds = surfaceComponentsMap.get(surfaceId);
    if (!knownIds) continue;

    for (let ci = 0; ci < components.length; ci++) {
      const comp = components[ci] as Record<string, unknown>;
      const compId = comp["id"];

      if ("child" in comp) {
        validateChildRef(
          comp["child"],
          knownIds,
          errors,
          i,
          ci,
          compId,
          surfaceId,
        );
      }

      if (Array.isArray(comp["children"])) {
        const children = comp["children"] as unknown[];
        for (let chi = 0; chi < children.length; chi++) {
          const child = children[chi];
          if (typeof child === "string" && !knownIds.has(child)) {
            errors.push({
              code: "MISSING_CHILD_REF",
              path: `/${i}/updateComponents/components/${ci}/children/${chi}`,
              message: `组件 "${String(compId)}" (surface "${surfaceId}") 的 children[${chi}] 引用了不存在的组件 "${child}"`,
            });
          }
          if (child && typeof child === "object" && "componentId" in child) {
            const templateChild = child as { componentId?: string };
            if (
              typeof templateChild.componentId === "string" &&
              !knownIds.has(templateChild.componentId)
            ) {
              errors.push({
                code: "MISSING_CHILD_REF",
                path: `/${i}/updateComponents/components/${ci}/children/${chi}`,
                message: `组件 "${String(compId)}" (surface "${surfaceId}") 的 children[${chi}].componentId 引用了不存在的组件 "${templateChild.componentId}"`,
              });
            }
          }
        }
      }

      if (Array.isArray(comp["tabItems"])) {
        const tabItems = comp["tabItems"] as Array<Record<string, unknown>>;
        for (let ti = 0; ti < tabItems.length; ti++) {
          const tabItem = tabItems[ti];
          if (tabItem && "child" in tabItem) {
            validateChildRef(
              tabItem["child"],
              knownIds,
              errors,
              i,
              ci,
              compId,
              surfaceId,
              `tabItems/${ti}`,
            );
          }
        }
      }
    }
  }
}

/**
 * 校验单个 child 引用（字符串形式）是否存在于已知组件集合中。
 */
function validateChildRef(
  child: unknown,
  knownIds: ReadonlySet<string>,
  errors: ValidationIssue[],
  msgIndex: number,
  compIndex: number,
  compId: unknown,
  surfaceId: string,
  subPath?: string,
): void {
  if (typeof child !== "string" || knownIds.has(child)) return;
  const pathSuffix = subPath ? `/${subPath}/child` : "/child";
  errors.push({
    code: "MISSING_CHILD_REF",
    path: `/${msgIndex}/updateComponents/components/${compIndex}${pathSuffix}`,
    message: `组件 "${String(compId)}" (surface "${surfaceId}") 的 child 引用了不存在的组件 "${child}"`,
  });
}

/**
 * 校验 updateComponents / updateDataModel / deleteSurface 引用的 surfaceId 是否已知。
 */
function validateSurfaceExistences(
  messages: A2UIServerMessage[],
  knownSurfaceIds: ReadonlySet<string>,
  errors: ValidationIssue[],
): void {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg) continue;
    const targetSurfaceId = getTargetSurfaceId(msg);
    if (targetSurfaceId && !knownSurfaceIds.has(targetSurfaceId)) {
      errors.push({
        code: "UNKNOWN_SURFACE",
        path: `/${i}`,
        message: `${getOperationName(msg)} 引用了未知的 surface "${targetSurfaceId}"。`,
      });
    }
  }
}

/**
 * 从消息对象中提取目标 surfaceId。
 */
function getTargetSurfaceId(msg: A2UIServerMessage): string | null {
  if ("updateComponents" in msg) return msg.updateComponents.surfaceId;
  if ("updateDataModel" in msg) return msg.updateDataModel.surfaceId;
  if ("deleteSurface" in msg) return msg.deleteSurface.surfaceId;
  return null;
}

/**
 * 获取消息的操作名称（用于错误消息）。
 */
function getOperationName(msg: A2UIServerMessage): string {
  if ("updateComponents" in msg) return "updateComponents";
  if ("updateDataModel" in msg) return "updateDataModel";
  if ("deleteSurface" in msg) return "deleteSurface";
  if ("createSurface" in msg) return "createSurface";
  return "未知操作";
}

/** 字符串内容不安全模式，用于防止 XSS / 脚本注入。 */
const UNSAFE_STRING_PATTERNS = [
  /<script/i,
  /innerHTML/i,
  /eval\s*\(/i,
  /javascript\s*:/i,
  /<[^>]*\son[a-z]+\s*=/i,
] as const;

/** 明确禁止的浏览器事件属性名。 */
const UNSAFE_PROPERTY_NAMES = new Set([
  "onclick",
  "onchange",
  "oninput",
  "onsubmit",
  "onload",
  "onerror",
  "onmouseover",
  "onkeydown",
  "onkeyup",
  "onfocus",
  "onblur",
]);

/**
 * 校验消息中是否包含潜在的不安全内容（script、innerHTML、eval 等）。
 */
function validateSafetyConstraints(
  messages: A2UIServerMessage[],
  errors: ValidationIssue[],
): void {
  for (let i = 0; i < messages.length; i++) {
    const issue = findUnsafeContent(messages[i]);
    if (!issue) {
      continue;
    }
    errors.push({
      code: "UNSAFE_CONTENT",
      path: `/${i}${issue.path}`,
      message: `消息包含不安全内容："${issue.match}"。`,
    });
  }
}

function findUnsafeContent(
  value: unknown,
  path = "",
): { path: string; match: string } | null {
  if (typeof value === "string") {
    for (const pattern of UNSAFE_STRING_PATTERNS) {
      const match = pattern.exec(value);
      if (match) {
        return { path, match: match[0] };
      }
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const issue = findUnsafeContent(value[i], `${path}/${i}`);
      if (issue) {
        return issue;
      }
    }
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (/^on[A-Z]/.test(key) || UNSAFE_PROPERTY_NAMES.has(normalizedKey)) {
      return { path: `${path}/${key}`, match: key };
    }
    const issue = findUnsafeContent(child, `${path}/${key}`);
    if (issue) {
      return issue;
    }
  }

  return null;
}
