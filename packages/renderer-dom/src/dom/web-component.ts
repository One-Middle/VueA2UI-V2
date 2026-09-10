import type { SurfaceGroupModel } from "@a2ui-platform/renderer-core";
import { getA2uiSurfaceGroup } from "./surface-group-registry";
import { DomSurfaceHost } from "./surface-host";

export class A2uiSurfaceElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["surface-id", "group"];
  }

  private host: DomSurfaceHost | undefined;
  private propertySurfaceGroup: SurfaceGroupModel | undefined;
  private propertySurfaceId: string | undefined;
  private mountedSurfaceGroup: SurfaceGroupModel | undefined;

  get surfaceGroup(): SurfaceGroupModel | undefined {
    return this.propertySurfaceGroup;
  }

  set surfaceGroup(value: SurfaceGroupModel | undefined) {
    this.propertySurfaceGroup = value;
    this.refreshHost();
  }

  get surfaceId(): string {
    return this.propertySurfaceId ?? this.getAttribute("surface-id") ?? "main";
  }

  set surfaceId(value: string) {
    this.propertySurfaceId = value;
    this.refreshHost();
  }

  connectedCallback(): void {
    this.refreshHost();
  }

  disconnectedCallback(): void {
    this.host?.unmount();
    this.host = undefined;
    this.mountedSurfaceGroup = undefined;
  }

  attributeChangedCallback(): void {
    this.refreshHost();
  }

  private refreshHost(): void {
    if (!this.isConnected) return;
    const surfaceGroup = this.resolveSurfaceGroup();
    if (!surfaceGroup) {
      this.host?.unmount();
      this.host = undefined;
      this.mountedSurfaceGroup = undefined;
      this.replaceChildren(this.empty("SurfaceGroup 未找到"));
      return;
    }

    if (!this.host || this.mountedSurfaceGroup !== surfaceGroup) {
      this.host?.unmount();
      this.host = new DomSurfaceHost({
        container: this,
        surfaceGroup,
        surfaceId: this.surfaceId,
      });
      this.mountedSurfaceGroup = surfaceGroup;
      return;
    }

    this.host.setSurfaceId(this.surfaceId);
    this.host.update();
  }

  private resolveSurfaceGroup(): SurfaceGroupModel | undefined {
    if (this.propertySurfaceGroup) return this.propertySurfaceGroup;
    const groupName = this.getAttribute("group");
    return groupName ? getA2uiSurfaceGroup(groupName) : undefined;
  }

  private empty(message: string): HTMLElement {
    const element = document.createElement("div");
    element.className = "a2ui-empty";
    element.textContent = message;
    return element;
  }
}

export function defineA2uiSurfaceElement(
  tagName = "a2ui-surface",
): CustomElementConstructor {
  const existing = customElements.get(tagName);
  if (existing) return existing;
  customElements.define(tagName, A2uiSurfaceElement);
  return A2uiSurfaceElement;
}
