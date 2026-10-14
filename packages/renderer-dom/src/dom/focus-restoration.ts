/**
 * DOM 整树重绘时的焦点保存与恢复工具。
 *
 * 职责：
 * - 在容器重建前记录当前聚焦控件所属的组件与控件定位信息。
 * - 在重建后尽量恢复焦点、光标选区和输入方向。
 *
 * 被引用：
 * - surface-host。
 * 注意：
 * - 该模块依赖渲染结果上的 data-component-id 与 data-a2ui-base-path。
 * - 恢复失败时静默放弃，避免因为不可聚焦节点影响正常渲染。
 */
export interface FocusSnapshot {
  componentId: string;
  basePath: string;
  controlKey?: string;
  controlIndex?: number;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  selectionDirection?: "forward" | "backward" | "none" | null;
}

/**
 * 捕获容器内当前焦点的位置。
 *
 * @param container - 即将被重建的 Surface 容器。
 * @returns 可用于恢复焦点的快照；焦点不在容器内时返回 null。
 */
export function captureFocus(container: HTMLElement): FocusSnapshot | null {
  const active = document.activeElement;
  if (!active || !container.contains(active)) return null;
  const element = active as HTMLElement;
  const host = element.closest<HTMLElement>(
    "[data-component-id][data-a2ui-base-path]",
  );
  if (!host) return null;
  const snapshot: FocusSnapshot = {
    componentId: host.dataset.componentId ?? "",
    basePath: host.dataset.a2uiBasePath ?? "/",
    controlKey: element.dataset.a2uiFocus,
    controlIndex: Array.from(host.querySelectorAll(focusableSelector)).indexOf(
      element,
    ),
  };
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    snapshot.selectionStart = element.selectionStart;
    snapshot.selectionEnd = element.selectionEnd;
    snapshot.selectionDirection = element.selectionDirection;
  }
  return snapshot.componentId ? snapshot : null;
}

/**
 * 根据快照恢复容器内的焦点。
 *
 * @param container - 已完成重建的 Surface 容器。
 * @param snapshot - captureFocus 返回的焦点快照。
 */
export function restoreFocus(
  container: HTMLElement,
  snapshot: FocusSnapshot | null,
): void {
  if (!snapshot) return;
  const selector = `[data-component-id="${escapeAttr(snapshot.componentId)}"][data-a2ui-base-path="${escapeAttr(snapshot.basePath)}"]`;
  const host = container.querySelector<HTMLElement>(selector);
  const focusable = snapshot.controlKey
    ? host?.querySelector<HTMLElement>(
        `[data-a2ui-focus="${escapeAttr(snapshot.controlKey)}"]`,
      )
    : host?.matches(focusableSelector)
      ? host
      : host?.querySelectorAll<HTMLElement>(focusableSelector)[
          snapshot.controlIndex ?? 0
        ];
  if (!focusable || focusable.matches(":disabled, [hidden], [inert]")) return;
  focusable.focus({ preventScroll: true });
  if (
    (focusable instanceof HTMLInputElement ||
      focusable instanceof HTMLTextAreaElement) &&
    snapshot.selectionStart !== undefined
  ) {
    try {
      focusable.setSelectionRange(
        snapshot.selectionStart ?? 0,
        snapshot.selectionEnd ?? snapshot.selectionStart ?? 0,
        snapshot.selectionDirection ?? "none",
      );
    } catch {
      // 部分 input 类型不支持选区 API，焦点已恢复即可。
    }
  }
}

function escapeAttr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const focusableSelector = "input, textarea, select, button, [tabindex]";
