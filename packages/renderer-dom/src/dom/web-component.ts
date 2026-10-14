/**
 * A2UI Surface 的 Web Component 适配层。
 *
 * 职责：
 * - 暴露 <a2ui-surface> 自定义元素，方便非框架页面直接挂载 Surface。
 * - 支持通过属性 group/surface-id 或属性 surfaceGroup/surfaceId 绑定数据源。
 * - 在元素连接、断开和属性变化时同步 DomSurfaceHost 生命周期。
 *
 * 引用：
 * - surface-group-registry、surface-host。
 * 被引用：
 * - 包入口与 DOM 宿主测试。
 * 注意：
 * - 通过 group 属性查找的是进程内注册表，不会跨页面或跨 iframe 共享。
 */
import type { SurfaceGroupModel } from "@a2ui-platform/renderer-core";
import { getA2uiSurfaceGroup } from "./surface-group-registry";
import { DomSurfaceHost } from "./surface-host";

/**
 * 渲染 A2UI Surface 的自定义元素。
 *
 * @remarks
 * 属性模式适合 HTML 直接声明，属性值模式适合 JavaScript 持有 SurfaceGroup 实例时使用。
 */
export class A2uiSurfaceElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["surface-id", "group"];
  }

  private host: DomSurfaceHost | undefined;
  private propertySurfaceGroup: SurfaceGroupModel | undefined;
  private propertySurfaceId: string | undefined;
  private mountedSurfaceGroup: SurfaceGroupModel | undefined;

  /**
   * 通过 JavaScript 属性绑定的 SurfaceGroup。
   *
   * 注意：设置后优先级高于 group HTML 属性。
   */
  get surfaceGroup(): SurfaceGroupModel | undefined {
    return this.propertySurfaceGroup;
  }

  set surfaceGroup(value: SurfaceGroupModel | undefined) {
    this.propertySurfaceGroup = value;
    this.refreshHost();
  }

  /**
   * 当前渲染的 Surface 标识。
   *
   * 默认值为 main，属性值优先级高于 surface-id HTML 属性。
   */
  get surfaceId(): string {
    return this.propertySurfaceId ?? this.getAttribute("surface-id") ?? "main";
  }

  set surfaceId(value: string) {
    this.propertySurfaceId = value;
    this.refreshHost();
  }

  /**
   * 元素插入文档时创建或刷新宿主。
   */
  connectedCallback(): void {
    this.refreshHost();
  }

  /**
   * 元素离开文档时释放宿主，避免运行时订阅继续持有 DOM 引用。
   */
  disconnectedCallback(): void {
    this.host?.unmount();
    this.host = undefined;
    this.mountedSurfaceGroup = undefined;
  }

  /**
   * 监听 group 与 surface-id 属性变化，并同步到宿主。
   */
  attributeChangedCallback(): void {
    this.refreshHost();
  }

  /**
   * 根据当前属性解析 SurfaceGroup，并确保宿主与数据源保持一致。
   */
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

/**
 * 注册 A2UI Surface 自定义元素。
 *
 * @param tagName - 自定义元素标签名，默认是 a2ui-surface。
 * @returns 已注册或新注册的自定义元素构造函数。
 */
export function defineA2uiSurfaceElement(
  tagName = "a2ui-surface",
): CustomElementConstructor {
  const existing = customElements.get(tagName);
  if (existing) return existing;
  customElements.define(tagName, A2uiSurfaceElement);
  return A2uiSurfaceElement;
}
