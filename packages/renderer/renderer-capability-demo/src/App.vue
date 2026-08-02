<script setup lang="ts">
/**
 * Renderer 能力展示测试台。
 *
 * 职责：
 * - 通过真实 MessageProcessor + SurfaceGroupModel 驱动 A2UI 渲染
 * - 提供多个高质量示例页面的切换入口
 * - 展示 dataModel、A2UI 消息和 renderer action/error 事件
 *
 * 注意：
 * - 本目录仅用于 renderer 能力测试，不参与正式包导出。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { A2UIClientMessage } from "@a2ui-platform/shared";
import {
  A2uiSurface,
  MessageProcessor,
  SurfaceGroupModel,
  registerBasicCatalog,
} from "../../src";
import { demoCases, type DemoCase } from "./cases";

interface EventLogEntry {
  id: number;
  time: string;
  type: "action" | "error" | "system";
  name: string;
  source: string;
  payload: unknown;
}

registerBasicCatalog();

const selectedCaseId = ref(demoCases[0]?.id ?? "");
const surfaceGroup = new SurfaceGroupModel();
const eventLog = ref<EventLogEntry[]>([]);
let eventSequence = 0;

const selectedCase = computed(
  () => demoCases.find((item) => item.id === selectedCaseId.value) ?? demoCases[0]!,
);

const currentDataModel = computed(() => {
  const value = surfaceGroup.get("main")?.dataModel.get("/") ?? {};
  return JSON.stringify(value, null, 2);
});

const currentMessages = computed(() =>
  JSON.stringify(selectedCase.value.messages, null, 2),
);

const capabilityGrid = computed(() => [
  { label: "Components", ready: true },
  { label: "Layouts", ready: true },
  { label: "Bindings", ready: true },
  { label: "Events", ready: true },
  { label: "JSRuntime", ready: true },
  { label: "Dynamic List", ready: true },
  { label: "Theme State", ready: false },
  { label: "FunctionCall", ready: false },
]);

onMounted(() => {
  loadCase(selectedCase.value, "system");
  window.addEventListener("a2ui:action", handleRendererAction as EventListener);
  window.addEventListener("a2ui:error", handleRendererError as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener("a2ui:action", handleRendererAction as EventListener);
  window.removeEventListener("a2ui:error", handleRendererError as EventListener);
  surfaceGroup.destroy();
});

function selectCase(item: DemoCase): void {
  selectedCaseId.value = item.id;
  loadCase(item, "system");
}

function loadCase(item: DemoCase, source: EventLogEntry["type"]): void {
  surfaceGroup.destroy();
  const processor = new MessageProcessor(surfaceGroup);
  processor.processMessages(item.messages);
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

function clearEvents(): void {
  eventLog.value = [];
}

function replayCase(): void {
  loadCase(selectedCase.value, "system");
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
  eventLog.value = [
    {
      id: ++eventSequence,
      time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      ...input,
    },
    ...eventLog.value,
  ].slice(0, 8);
}
</script>

<template>
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
        <button class="run-button" type="button" @click="replayCase">
          <span class="play-dot"></span>
          Run
        </button>
        <span class="version-pill">A2UI v0.9</span>
      </div>
    </header>

    <section class="workspace">
      <aside class="sidebar">
        <div class="sidebar-title">Pages</div>
        <button
          v-for="item in demoCases"
          :key="item.id"
          class="case-button"
          :class="{ 'case-button--active': item.id === selectedCase.id }"
          type="button"
          @click="selectCase(item)"
        >
          <span class="case-icon">{{ item.icon }}</span>
          <span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.subtitle }}</small>
          </span>
        </button>

        <div class="connection-card">
          <span class="connection-dot"></span>
          <span>Connected</span>
          <small>Vue 3 · Vite · Renderer source</small>
        </div>
      </aside>

      <section class="preview-zone">
        <div class="preview-toolbar">
          <span>iPhone 14</span>
          <span>390 × 844</span>
          <span>100%</span>
        </div>

        <div class="phone-frame">
          <div class="phone-status">
            <span>9:41</span>
            <span class="dynamic-island"></span>
            <span>5G  ▰</span>
          </div>
          <div class="phone-nav">
            <span>‹</span>
            <strong>{{ selectedCase.title }}</strong>
            <span>•••</span>
          </div>
          <div class="phone-content">
            <A2uiSurface surface-id="main" :surface-group="surfaceGroup" />
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
          <div class="capability-grid">
            <div
              v-for="item in capabilityGrid"
              :key="item.label"
              class="capability-item"
              :class="{ 'capability-item--pending': !item.ready }"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.ready ? "✓" : "○" }}</strong>
            </div>
          </div>
          <div class="case-tags">
            <span
              v-for="capability in selectedCase.capabilities"
              :key="capability"
              :style="{ borderColor: selectedCase.accent, color: selectedCase.accent }"
            >
              {{ capability }}
            </span>
          </div>
        </section>

        <section class="panel code-panel">
          <div class="panel-heading">
            <h2>dataModel</h2>
            <span>JSON</span>
          </div>
          <pre>{{ currentDataModel }}</pre>
        </section>

        <section class="panel code-panel messages-panel">
          <div class="panel-heading">
            <h2>A2UI Messages</h2>
            <span>{{ selectedCase.messages.length }} items</span>
          </div>
          <pre>{{ currentMessages }}</pre>
        </section>

        <section class="panel event-panel">
          <div class="panel-heading">
            <h2>Event Log</h2>
            <button type="button" @click="clearEvents">Clear</button>
          </div>
          <div class="event-list">
            <div
              v-for="entry in eventLog"
              :key="entry.id"
              class="event-row"
              :class="`event-row--${entry.type}`"
            >
              <span class="event-time">{{ entry.time }}</span>
              <strong>{{ entry.name }}</strong>
              <small>{{ entry.source }}</small>
              <code>{{ JSON.stringify(entry.payload) }}</code>
            </div>
          </div>
        </section>
      </aside>
    </section>
  </main>
</template>
