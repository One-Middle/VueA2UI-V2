import Ajv from "ajv";
import type {
  ValidateA2UIInput,
  ValidateA2UIResult,
  ValidationIssue,
  A2UIServerMessage,
  SurfaceSnapshotData,
} from "@a2ui-platform/shared";
import a2uiSchema from "../schemas/a2ui-v0.9-schema.json" with { type: "json" };
import catalogSchema from "../schemas/basic-catalog-schema.json" with { type: "json" };
import { logger } from "../logger.js";

// ─── Ajv 实例（懒初始化） ────────────────────────────────────

let _ajv: Ajv | null = null;
let _a2uiValidator: ReturnType<Ajv["compile"]> | null = null;
let _catalogValidator: ReturnType<Ajv["compile"]> | null = null;

function getAjv(): Ajv {
  if (!_ajv) {
    _ajv = new Ajv({
      allErrors: true,
      strict: false, // 允许 JSON Schema 中使用非标准关键字
      validateSchema: false, // 跳过 schema 自身校验以避免 oneOf 警告
    });
  }
  return _ajv;
}

function getA2UIValidator(): ReturnType<Ajv["compile"]> {
  if (!_a2uiValidator) {
    _a2uiValidator = getAjv().compile(a2uiSchema);
  }
  return _a2uiValidator;
}

function getCatalogValidator(): ReturnType<Ajv["compile"]> {
  if (!_catalogValidator) {
    _catalogValidator = getAjv().compile(catalogSchema);
  }
  return _catalogValidator;
}

// ─── validateA2UI ───────────────────────────────────────────

/**
 * 对 A2UI 消息进行完整校验：
 * 1. A2UI v0.9 消息结构校验（Ajv + JSON Schema）
 * 2. 组件属性 catalog 校验
 * 3. Root 组件存在性检查
 * 4. Child 引用有效性检查
 * 5. Surface 存在性检查
 * 6. 安全约束检查
 */
export function validateA2UI(input: ValidateA2UIInput): ValidateA2UIResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const { messages, catalogId, currentSnapshot } = input;

  logger.debug(`开始校验 → messages=${messages.length}, catalogId=${catalogId}`);

  // 收集所有已知 surface（已创建 + currentSnapshot 中的）
  const knownSurfaceIds = new Set<string>();
  if (currentSnapshot?.surfaces) {
    for (const sid of Object.keys(currentSnapshot.surfaces)) {
      knownSurfaceIds.add(sid);
    }
  }

  // —— 步骤 1：A2UI v0.9 消息结构校验 ——
  const a2uiValidator = getA2UIValidator();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const valid = a2uiValidator(msg);
    if (!valid) {
      const ajvErrors = a2uiValidator.errors ?? [];
      for (const ajvErr of ajvErrors) {
        errors.push({
          code: "A2UI_STRUCTURE",
          path: `/${i}${ajvErr.instancePath}`,
          message: `A2UI v0.9 结构校验失败：${ajvErr.message ?? "未知错误"}`,
        });
      }
    }

    // 收集 createSurface 声明的 surface
    if (msg && typeof msg === "object" && "createSurface" in msg) {
      const cs = msg as { createSurface: { surfaceId: string } };
      if (cs.createSurface?.surfaceId) {
        knownSurfaceIds.add(cs.createSurface.surfaceId);
      }
    }
  }

  // —— 步骤 2：组件属性 Catalog 校验 ——
  validateComponentProperties(messages, catalogId, errors);

  // —— 步骤 3：Root 检查 ——
  validateRootExists(messages, errors, warnings);

  // —— 步骤 4：Child 引用检查 ——
  validateChildReferences(messages, errors);

  // —— 步骤 5：Surface 存在性检查 ——
  validateSurfaceExistences(messages, knownSurfaceIds, errors);

  // —— 步骤 6：安全约束检查 ——
  validateSafetyConstraints(messages, errors);

  if (errors.length > 0) {
    logger.debug(`校验发现问题 → errors=${errors.length}, warnings=${warnings.length}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedMessages: errors.length === 0 ? messages : [],
  };
}

// ─── 步骤 2：组件属性 Catalog 校验 ──────────────────────────

function validateComponentProperties(
  messages: A2UIServerMessage[],
  _catalogId: string,
  errors: ValidationIssue[],
): void {
  const catalogValidator = getCatalogValidator();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object" || !("updateComponents" in msg)) {
      continue;
    }

    const uc = msg as { updateComponents: { surfaceId: string; components: Array<Record<string, unknown>> } };
    if (!Array.isArray(uc.updateComponents?.components)) continue;

    const components = uc.updateComponents.components;

    for (let ci = 0; ci < components.length; ci++) {
      const comp = components[ci];
      if (!comp || typeof comp !== "object") continue;

      const componentType = comp["component"];
      if (typeof componentType !== "string") continue;

      // 使用 basic-catalog-schema.json 中对应组件类型的 definition 进行校验
      // 将 catalog schema 注册到 Ajv，然后引用其 definitions
      const ajv = getAjv();
      if (!ajv.getSchema("basic-catalog")) {
        ajv.addSchema(catalogSchema, "basic-catalog");
      }

      let valid: boolean;
      try {
        valid = ajv.validate(
          { $ref: `basic-catalog#/definitions/${componentType}` },
          comp,
        ) as boolean;
      } catch {
        // 组件类型在 catalog schema definitions 中不存在
        errors.push({
          code: "UNKNOWN_COMPONENT",
          path: `/${i}/updateComponents/components/${ci}/component`,
          message: `组件 "${comp["id"] ?? `[${ci}]`}" 的类型 "${componentType}" 不在 Basic Catalog 中`,
        });
        continue;
      }
      if (!valid) {
        const ajvErrors = catalogValidator.errors ?? [];
        for (const ajvErr of ajvErrors) {
          errors.push({
            code: "CATALOG_PROPERTY",
            path: `/${i}/updateComponents/components/${ci}${ajvErr.instancePath}`,
            message: `组件 "${comp["id"] ?? `[${ci}]`}" 的属性不符合 "${componentType}" 规范：${ajvErr.message ?? "未知错误"}`,
          });
        }
      }
    }
  }
}

// ─── 步骤 3：Root 检查 ─────────────────────────────────────

function validateRootExists(
  messages: A2UIServerMessage[],
  errors: ValidationIssue[],
  _warnings: ValidationIssue[],
): void {
  // 收集所有 updateComponents 中的组件 id
  const allComponentIds = new Set<string>();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object" || !("updateComponents" in msg)) {
      continue;
    }
    const uc = msg as { updateComponents: { components: Array<{ id?: string }> } };
    const components = uc.updateComponents?.components;
    if (!Array.isArray(components)) continue;
    for (const comp of components) {
      if (comp && typeof comp.id === "string") {
        allComponentIds.add(comp.id);
      }
    }
  }

  // 如果存在 updateComponents 消息，则必须有一个 id 为 "root" 的组件
  if (allComponentIds.size > 0 && !allComponentIds.has("root")) {
    errors.push({
      code: "MISSING_ROOT",
      path: "",
      message: '所有 updateComponents 消息中缺少 id="root" 的根组件。每个 UI 树必须有一个 id 为 "root" 的根节点。',
    });
  }
}

// ─── 步骤 4：Child 引用检查 ─────────────────────────────────

function validateChildReferences(
  messages: A2UIServerMessage[],
  errors: ValidationIssue[],
): void {
  // 按 surfaceId 收集组件 id（需要在同一条消息和多条消息之间做交叉校验）
  // 由于 A2UI 消息可能分批发送，这里按目标 surface 收集所有已知组件 id

  const surfaceComponentsMap = new Map<string, Map<string, number>>();
  // surfaceId -> Map<componentId, messageIndex>

  // 第一遍：收集所有组件 id
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object" || !("updateComponents" in msg)) {
      continue;
    }
    const uc = msg as { updateComponents: { surfaceId: string; components: Array<{ id?: string }> } };
    const surfaceId = uc.updateComponents?.surfaceId;
    const components = uc.updateComponents?.components;
    if (typeof surfaceId !== "string" || !Array.isArray(components)) continue;

    let compMap = surfaceComponentsMap.get(surfaceId);
    if (!compMap) {
      compMap = new Map();
      surfaceComponentsMap.set(surfaceId, compMap);
    }

    for (const comp of components) {
      if (comp && typeof comp.id === "string") {
        compMap.set(comp.id, i);
      }
    }
  }

  // 第二遍：检查 child/children 引用
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object" || !("updateComponents" in msg)) {
      continue;
    }
    const uc = msg as {
      updateComponents: {
        surfaceId: string;
        components: Array<Record<string, unknown>>;
      };
    };
    const surfaceId = uc.updateComponents?.surfaceId;
    const components = uc.updateComponents?.components;
    if (typeof surfaceId !== "string" || !Array.isArray(components)) continue;

    const knownIds = surfaceComponentsMap.get(surfaceId);
    if (!knownIds) continue;

    for (let ci = 0; ci < components.length; ci++) {
      const comp = components[ci]!;
      const compId = comp["id"];

      // 检查 child 属性（单子引用）
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

      // 检查 children 属性（多子引用 - 字符串数组）
      if ("children" in comp && Array.isArray(comp["children"])) {
        const children = comp["children"] as unknown[];
        for (let chi = 0; chi < children.length; chi++) {
          const child = children[chi];
          if (typeof child === "string") {
            if (!knownIds.has(child)) {
              errors.push({
                code: "MISSING_CHILD_REF",
                path: `/${i}/updateComponents/components/${ci}/children/${chi}`,
                message: `组件 "${String(compId)}" (surface "${surfaceId}") 的 children[${chi}] 引用了不存在的组件 "${child}"`,
              });
            }
          }
          // children 如果是 { path, componentId } 对象，componentId 也需要检查
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

      // 检查 tabItems 中的 child 引用
      if ("tabItems" in comp && Array.isArray(comp["tabItems"])) {
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
 * 校验单个 child 引用（字符串或内联对象）。
 */
function validateChildRef(
  child: unknown,
  knownIds: Map<string, number>,
  errors: ValidationIssue[],
  msgIndex: number,
  compIndex: number,
  compId: unknown,
  surfaceId: string,
  subPath?: string,
): void {
  if (typeof child === "string") {
    if (!knownIds.has(child)) {
      const pathSuffix = subPath ? `/${subPath}/child` : "/child";
      errors.push({
        code: "MISSING_CHILD_REF",
        path: `/${msgIndex}/updateComponents/components/${compIndex}${pathSuffix}`,
        message: `组件 "${String(compId)}" (surface "${surfaceId}") 的 child 引用了不存在的组件 "${child}"`,
      });
    }
  }
  // child 如果是内联对象（nested component），则不需要做引用检查
  // 因为内联组件不会出现在 other components 的引用中
}

// ─── 步骤 5：Surface 存在性检查 ──────────────────────────────

function validateSurfaceExistences(
  messages: A2UIServerMessage[],
  knownSurfaceIds: ReadonlySet<string>,
  errors: ValidationIssue[],
): void {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") continue;

    // 检查 updateComponents / updateDataModel / deleteSurface 的 target surface 是否存在
    const targetSurfaceId = getTargetSurfaceId(msg as unknown as Record<string, unknown>);
    if (targetSurfaceId && !knownSurfaceIds.has(targetSurfaceId)) {
      const opName = getOperationName(msg as unknown as Record<string, unknown>);
      errors.push({
        code: "UNKNOWN_SURFACE",
        path: `/${i}`,
        message: `${opName} 引用了未知的 surface "${targetSurfaceId}"（该 surface 未在当前消息中创建，也不在 currentSnapshot 中）`,
      });
    }
  }
}

/**
 * 获取消息的目标 surfaceId（非 createSurface 的操作）。
 */
function getTargetSurfaceId(msg: Record<string, unknown>): string | null {
  if ("updateComponents" in msg) {
    const uc = msg["updateComponents"] as Record<string, unknown> | undefined;
    return typeof uc?.["surfaceId"] === "string" ? (uc["surfaceId"] as string) : null;
  }
  if ("updateDataModel" in msg) {
    const ud = msg["updateDataModel"] as Record<string, unknown> | undefined;
    return typeof ud?.["surfaceId"] === "string" ? (ud["surfaceId"] as string) : null;
  }
  if ("deleteSurface" in msg) {
    const ds = msg["deleteSurface"] as Record<string, unknown> | undefined;
    return typeof ds?.["surfaceId"] === "string" ? (ds["surfaceId"] as string) : null;
  }
  return null;
}

/**
 * 获取消息的操作名称（用于错误提示）。
 */
function getOperationName(msg: Record<string, unknown>): string {
  if ("updateComponents" in msg) return "updateComponents";
  if ("updateDataModel" in msg) return "updateDataModel";
  if ("deleteSurface" in msg) return "deleteSurface";
  if ("createSurface" in msg) return "createSurface";
  return "未知操作";
}

// ─── 步骤 6：安全约束检查 ───────────────────────────────────

/**
 * 安全敏感字符串模式。拒绝包含这些模式的字符串值。
 */
const UNSAFE_PATTERNS = [
  /<script/i,
  /innerHTML/i,
  /eval\s*\(/i,
  /javascript\s*:/i,
  /on\w+\s*=/i, // 事件处理器如 onclick=
] as const;

function validateSafetyConstraints(
  messages: A2UIServerMessage[],
  errors: ValidationIssue[],
): void {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") continue;

    // 将整个消息转为 JSON 字符串，然后搜索不安全模式
    // 这样可以从顶层检测所有嵌套值中的不安全内容
    const jsonStr = JSON.stringify(msg);

    for (const pattern of UNSAFE_PATTERNS) {
      const match = pattern.exec(jsonStr);
      if (match) {
        errors.push({
          code: "UNSAFE_CONTENT",
          path: `/${i}`,
          message: `消息包含不安全内容："${match[0]}"。A2UI 消息中不允许出现 <script、innerHTML、eval 或内联事件处理器。`,
        });
        break; // 每条消息只报告一次不安全内容
      }
    }
  }
}
