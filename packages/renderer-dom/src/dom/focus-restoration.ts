export interface FocusSnapshot {
  componentId: string;
  basePath: string;
  controlKey?: string;
  controlIndex?: number;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  selectionDirection?: "forward" | "backward" | "none" | null;
}

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
      // Some input types do not support selection ranges.
    }
  }
}

function escapeAttr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const focusableSelector = "input, textarea, select, button, [tabindex]";
