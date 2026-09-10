import type { A2UIClientMessage } from "@a2ui-platform/shared";
import { MessageProcessor, SurfaceGroupModel } from "@a2ui-platform/renderer-core";
import { mountA2uiSurface, type DomSurfaceHandle } from "../../src";
import { demoCases, type DemoCase } from "./cases";
import "./styles.css";

interface EventLogEntry {
  id: number;
  time: string;
  type: "action" | "error" | "system";
  name: string;
  source: string;
  payload: unknown;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Renderer demo root #app not found");
}

const surfaceGroup = new SurfaceGroupModel();
const eventLog: EventLogEntry[] = [];
let eventSequence = 0;
let selectedCase = demoCases[0]!;
let surfaceHandle: DomSurfaceHandle | undefined;
let unsubscribeDataModel: (() => void) | undefined;

app.innerHTML = `
  <main class="lab-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">A</div>
        <div>
          <h1>Renderer Lab</h1>
          <p>A2UI v0.9 capability workbench</p>
        </div>
      </div>
      <div class="topbar-actions">
        <button class="run-button" type="button" data-action="replay">
          <span class="play-dot"></span>
          Run
        </button>
        <span class="version-pill">A2UI v0.9</span>
      </div>
    </header>

    <section class="workspace">
      <aside class="sidebar">
        <div class="sidebar-title">Pages</div>
        <div data-region="cases"></div>
        <div class="connection-card">
          <span class="connection-dot"></span>
          <span>Connected</span>
          <small>DOM · Vite · Renderer source</small>
        </div>
      </aside>

      <section class="preview-zone">
        <div class="preview-toolbar">
          <span>iPhone 14</span>
          <span>390 x 844</span>
          <span>100%</span>
        </div>

        <div class="phone-frame">
          <div class="phone-status">
            <span>9:41</span>
            <span class="dynamic-island"></span>
            <span>5G ▰</span>
          </div>
          <div class="phone-nav">
            <span>‹</span>
            <strong data-region="title"></strong>
            <span>•••</span>
          </div>
          <div class="phone-content">
            <div data-region="surface"></div>
          </div>
          <div class="phone-tabs">
            <span class="phone-tab phone-tab--active">Home</span>
            <span class="phone-tab">Explore</span>
            <span class="phone-tab">Library</span>
            <span class="phone-tab">Profile</span>
          </div>
        </div>
      </section>

      <aside class="inspector">
        <section class="panel">
          <div class="panel-heading">
            <h2>Renderer Capabilities</h2>
          </div>
          <div class="capability-grid" data-region="capabilities"></div>
          <div class="case-tags" data-region="tags"></div>
        </section>

        <section class="panel code-panel">
          <div class="panel-heading">
            <h2>dataModel</h2>
            <span>JSON</span>
          </div>
          <pre data-region="dataModel"></pre>
        </section>

        <section class="panel code-panel messages-panel">
          <div class="panel-heading">
            <h2>A2UI Messages</h2>
            <span data-region="messageCount"></span>
          </div>
          <pre data-region="messages"></pre>
        </section>

        <section class="panel event-panel">
          <div class="panel-heading">
            <h2>Event Log</h2>
            <button type="button" data-action="clear-events">Clear</button>
          </div>
          <div class="event-list" data-region="events"></div>
        </section>
      </aside>
    </section>
  </main>
`;

const regions = {
  cases: app.querySelector<HTMLElement>("[data-region='cases']")!,
  title: app.querySelector<HTMLElement>("[data-region='title']")!,
  surface: app.querySelector<HTMLElement>("[data-region='surface']")!,
  capabilities: app.querySelector<HTMLElement>("[data-region='capabilities']")!,
  tags: app.querySelector<HTMLElement>("[data-region='tags']")!,
  dataModel: app.querySelector<HTMLElement>("[data-region='dataModel']")!,
  messages: app.querySelector<HTMLElement>("[data-region='messages']")!,
  messageCount: app.querySelector<HTMLElement>("[data-region='messageCount']")!,
  events: app.querySelector<HTMLElement>("[data-region='events']")!,
};

app.querySelector("[data-action='replay']")?.addEventListener("click", () => {
  loadCase(selectedCase, "system");
});
app.querySelector("[data-action='clear-events']")?.addEventListener("click", () => {
  eventLog.splice(0);
  renderEventLog();
});
window.addEventListener("a2ui:action", handleRendererAction as EventListener);
window.addEventListener("a2ui:error", handleRendererError as EventListener);

renderCaseButtons();
renderStaticInspector();
loadCase(selectedCase, "system");

function renderCaseButtons(): void {
  regions.cases.replaceChildren();
  for (const item of demoCases) {
    const button = document.createElement("button");
    button.className = `case-button${item.id === selectedCase.id ? " case-button--active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="case-icon"></span>
      <span>
        <strong></strong>
        <small></small>
      </span>
    `;
    button.querySelector(".case-icon")!.textContent = item.icon;
    button.querySelector("strong")!.textContent = item.title;
    button.querySelector("small")!.textContent = item.subtitle;
    button.addEventListener("click", () => {
      selectedCase = item;
      renderCaseButtons();
      renderStaticInspector();
      loadCase(item, "system");
    });
    regions.cases.appendChild(button);
  }
}

function renderStaticInspector(): void {
  regions.title.textContent = selectedCase.title;
  regions.capabilities.replaceChildren();
  for (const item of capabilityGrid()) {
    const element = document.createElement("div");
    element.className = `capability-item${item.ready ? "" : " capability-item--pending"}`;
    element.innerHTML = `<span></span><strong></strong>`;
    element.querySelector("span")!.textContent = item.label;
    element.querySelector("strong")!.textContent = item.ready ? "✓" : "○";
    regions.capabilities.appendChild(element);
  }
  regions.tags.replaceChildren();
  for (const capability of selectedCase.capabilities) {
    const tag = document.createElement("span");
    tag.style.borderColor = selectedCase.accent;
    tag.style.color = selectedCase.accent;
    tag.textContent = capability;
    regions.tags.appendChild(tag);
  }
  regions.messages.textContent = JSON.stringify(selectedCase.messages, null, 2);
  regions.messageCount.textContent = `${selectedCase.messages.length} items`;
}

function loadCase(item: DemoCase, source: EventLogEntry["type"]): void {
  surfaceHandle?.unmount();
  unsubscribeDataModel?.();
  regions.surface.replaceChildren();
  surfaceGroup.destroy();
  new MessageProcessor(surfaceGroup).processMessages(item.messages);
  surfaceHandle = mountA2uiSurface(regions.surface, {
    surfaceGroup,
    surfaceId: "main",
  });
  unsubscribeDataModel = surfaceGroup
    .get("main")
    ?.dataModel.subscribe("/", renderDataModel);
  renderDataModel();
  pushEvent({
    type: source,
    name: "page.enter",
    source: item.title,
    payload: {
      page: item.title,
      messages: item.messages.length,
      surfaceIds: surfaceGroup.getSurfaceIds(),
    },
  });
}

function renderDataModel(): void {
  regions.dataModel.textContent = JSON.stringify(
    surfaceGroup.get("main")?.dataModel.get("/") ?? {},
    null,
    2,
  );
}

function handleRendererAction(event: CustomEvent<A2UIClientMessage>): void {
  const action = "action" in event.detail ? event.detail.action : null;
  pushEvent({
    type: "action",
    name: action?.name ?? "action",
    source: action?.sourceComponentId ?? "renderer",
    payload: action?.context ?? {},
  });
}

function handleRendererError(event: CustomEvent<A2UIClientMessage>): void {
  const error = "error" in event.detail ? event.detail.error : null;
  pushEvent({
    type: "error",
    name: error?.code ?? "renderer.error",
    source: error?.surfaceId ?? "renderer",
    payload: error ?? {},
  });
}

function pushEvent(input: Omit<EventLogEntry, "id" | "time">): void {
  eventLog.unshift({
    id: ++eventSequence,
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    ...input,
  });
  eventLog.splice(8);
  renderEventLog();
}

function renderEventLog(): void {
  regions.events.replaceChildren();
  for (const entry of eventLog) {
    const row = document.createElement("div");
    row.className = `event-row event-row--${entry.type}`;
    row.innerHTML = `
      <span class="event-time"></span>
      <strong></strong>
      <small></small>
      <code></code>
    `;
    row.querySelector(".event-time")!.textContent = entry.time;
    row.querySelector("strong")!.textContent = entry.name;
    row.querySelector("small")!.textContent = entry.source;
    row.querySelector("code")!.textContent = JSON.stringify(entry.payload);
    regions.events.appendChild(row);
  }
}

function capabilityGrid(): Array<{ label: string; ready: boolean }> {
  return [
    { label: "Components", ready: true },
    { label: "Semantic Props", ready: true },
    { label: "Layout Catalog", ready: true },
    { label: "Bindings", ready: true },
    { label: "Events", ready: true },
    { label: "JSRuntime", ready: true },
    { label: "Dynamic Templates", ready: true },
    { label: "Theme State", ready: false },
    { label: "FunctionCall", ready: false },
  ];
}
