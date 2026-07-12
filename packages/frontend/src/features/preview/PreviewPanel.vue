<script setup lang="ts">
import { A2uiSurface, MessageProcessor, SurfaceGroupModel, registerBasicCatalog } from "@a2ui-platform/renderer";
import type { A2UIComponent, JsonValue } from "@a2ui-platform/shared";
import { NAlert, NEmpty, NInput, NSpin, NTag } from "naive-ui";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRendererStore } from "../../stores/renderer";
import { useWorkspaceStore } from "../../stores/workspace";

defineProps<{ compact?: boolean }>();

const workspace = useWorkspaceStore();
const renderer = useRendererStore();

registerBasicCatalog();

const surfaceGroup = new SurfaceGroupModel();
const messageProcessor = new MessageProcessor(surfaceGroup);
const surfaceIds = ref<string[]>([]);
const componentJson = ref("");
const dataModelJson = ref("");
let consumedMessageCount = 0;
const componentError = ref("");
const dataModelError = ref("");
const isSyncingEditors = ref(false);
const applyTimers: Partial<Record<"components" | "dataModel", ReturnType<typeof setTimeout>>> = {};
let unsubscribeDataModel: (() => void) | undefined;

const hasContent = computed(() => surfaceIds.value.length > 0);
const activeSurfaceId = computed(() => surfaceIds.value[0]);
const activeSurface = computed(() => activeSurfaceId.value ? surfaceGroup.get(activeSurfaceId.value) : undefined);

const statusTag = computed(() => {
  if (workspace.isGenerating) return { label: "AI 正在生成...", type: "info" as const };
  if (hasContent.value) return { label: `${surfaceIds.value.length} 个 Surface`, type: "success" as const };
  return { label: "等待内容", type: "default" as const };
});

const processRendererMessages = () => {
  const messages = renderer.messagesForRenderer;
  const canAppend = renderer.changeKind === "append" && consumedMessageCount <= messages.length;

  if (canAppend) {
    const pendingMessages = messages.slice(consumedMessageCount);
    if (pendingMessages.length > 0) {
      messageProcessor.processMessages(pendingMessages);
    }
  } else {
    unsubscribeDataModel?.();
    unsubscribeDataModel = undefined;
    surfaceGroup.destroy();
    surfaceIds.value = [];
    if (messages.length > 0) {
      messageProcessor.processMessages(messages);
    }
  }

  consumedMessageCount = messages.length;
  surfaceIds.value = surfaceGroup.getSurfaceIds();
  unsubscribeDataModel?.();
  unsubscribeDataModel = activeSurface.value?.dataModel.subscribe("/", syncEditorsFromSurface);
  syncEditorsFromSurface();
};

watch(() => renderer.revision, processRendererMessages, { immediate: true });
watch(activeSurfaceId, () => {
  unsubscribeDataModel?.();
  unsubscribeDataModel = activeSurface.value?.dataModel.subscribe("/", syncEditorsFromSurface);
  syncEditorsFromSurface();
});
watch(componentJson, () => scheduleApplyEditors("components"));
watch(dataModelJson, () => scheduleApplyEditors("dataModel"));

onMounted(processRendererMessages);

onBeforeUnmount(() => {
  unsubscribeDataModel?.();
  Object.values(applyTimers).forEach((timer) => {
    if (timer) clearTimeout(timer);
  });
  surfaceGroup.destroy();
});

function syncEditorsFromSurface(): void {
  const surface = activeSurface.value;
  isSyncingEditors.value = true;

  if (!surface) {
    componentJson.value = "";
    dataModelJson.value = "";
    componentError.value = "";
    dataModelError.value = "";
    nextTick(() => {
      isSyncingEditors.value = false;
    });
    return;
  }

  componentJson.value = stringifyJson(componentsToJson(surface.components));
  dataModelJson.value = stringifyJson(surface.dataModel.get("/") ?? null);
  componentError.value = "";
  dataModelError.value = "";

  nextTick(() => {
    isSyncingEditors.value = false;
  });
}

function scheduleApplyEditors(target: "components" | "dataModel"): void {
  if (isSyncingEditors.value) return;
  const existingTimer = applyTimers[target];
  if (existingTimer) clearTimeout(existingTimer);
  applyTimers[target] = setTimeout(() => {
    applyEditorJson(target);
  }, 350);
}

function applyEditorJson(target: "components" | "dataModel"): void {
  const surface = activeSurface.value;
  if (!surface) return;

  if (target === "components") {
    try {
      const parsed = JSON.parse(componentJson.value) as unknown;
      const components = normalizeComponents(parsed);
      surface.updateComponents(components);
      componentError.value = "";
    } catch (error) {
      componentError.value = error instanceof Error ? error.message : "component JSON 格式不正确";
    }
    return;
  }

  try {
    const parsed = JSON.parse(dataModelJson.value) as JsonValue;
    surface.updateDataModel("/", parsed);
    dataModelError.value = "";
  } catch (error) {
    dataModelError.value = error instanceof Error ? error.message : "dataModel JSON 格式不正确";
  }
}

function componentsToJson(components: Map<string, unknown>): Record<string, A2UIComponent> {
  const result: Record<string, A2UIComponent> = {};
  for (const [id, model] of components) {
    const rawModel = model as {
      componentType: string;
      _raw?: Record<string, JsonValue | undefined>;
    };
    result[id] = {
      id,
      component: rawModel.componentType,
      ...(rawModel._raw ?? {}),
    };
  }
  return result;
}

function normalizeComponents(value: unknown): A2UIComponent[] {
  const components = Array.isArray(value) ? value : Object.values(assertPlainObject(value));
  return components.map((item, index) => {
    const component = assertPlainObject(item);
    if (typeof component.id !== "string" || !component.id) {
      throw new Error(`components[${index}] 缺少字符串 id`);
    }
    if (typeof component.component !== "string" || !component.component) {
      throw new Error(`components[${index}] 缺少字符串 component`);
    }
    return component as A2UIComponent;
  });
}

function assertPlainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("JSON 必须是对象，或 component 区域可使用数组");
  }
  return value as Record<string, unknown>;
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
</script>

<template>
  <div :class="['preview-panel', { compact }]">
    <header class="preview-toolbar">
      <div>
        <h2>实时预览</h2>
        <p>A2UI Renderer 输出区域</p>
      </div>
      <n-tag size="small" :type="statusTag.type">{{ statusTag.label }}</n-tag>
    </header>

    <div class="preview-body">
      <n-alert v-if="workspace.sessionHydrationStatus === 'error'" type="error" title="历史会话恢复失败">
        {{ workspace.sessionHydrationError ?? "无法加载当前会话快照，请检查后端服务和会话数据。" }}
      </n-alert>
      <n-spin :show="workspace.isGenerating && !hasContent" description="AI 正在生成 UI...">
        <div class="preview-stack">
          <div v-if="!hasContent && !workspace.isGenerating" class="panel-center">
            <n-empty description="暂无 UI 内容，请在左侧输入需求生成页面。" />
          </div>
          <div v-else-if="hasContent" class="preview-canvas">
            <A2uiSurface
              v-for="sid in surfaceIds"
              :key="sid"
              :surface-id="sid"
              :surface-group="surfaceGroup"
            />
          </div>
          <div v-else class="preview-generating">
            <div class="generating-hint">AI 正在分析需求并生成 UI 组件...</div>
          </div>

          <div class="a2ui-inspector">
            <section class="inspector-card">
              <div class="inspector-heading">
                <div>
                  <h3>component</h3>
                  <p>当前 Surface 的组件树，修改合法 JSON 后会实时更新渲染。</p>
                </div>
                <n-tag size="small" :type="componentError ? 'error' : hasContent ? 'success' : 'default'">
                  {{ componentError ? "JSON 错误" : hasContent ? "同源数据" : "等待数据" }}
                </n-tag>
              </div>
              <n-alert v-if="componentError" type="error" class="json-error">
                {{ componentError }}
              </n-alert>
              <n-input
                v-model:value="componentJson"
                class="json-editor"
                type="textarea"
                placeholder="等待 component 数据..."
                :disabled="!hasContent"
                :autosize="{ minRows: 9, maxRows: 16 }"
              />
            </section>

            <section class="inspector-card">
              <div class="inspector-heading">
                <div>
                  <h3>dataModel</h3>
                  <p>当前 Surface 的数据模型，修改合法 JSON 后会实时更新绑定内容。</p>
                </div>
                <n-tag size="small" :type="dataModelError ? 'error' : hasContent ? 'success' : 'default'">
                  {{ dataModelError ? "JSON 错误" : hasContent ? "同源数据" : "等待数据" }}
                </n-tag>
              </div>
              <n-alert v-if="dataModelError" type="error" class="json-error">
                {{ dataModelError }}
              </n-alert>
              <n-input
                v-model:value="dataModelJson"
                class="json-editor"
                type="textarea"
                placeholder="等待 dataModel 数据..."
                :disabled="!hasContent"
                :autosize="{ minRows: 9, maxRows: 16 }"
              />
            </section>
          </div>
        </div>
      </n-spin>
    </div>
  </div>
</template>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.preview-toolbar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 18px 16px;
  border-bottom: 1px solid #e2eaf5;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.preview-toolbar h2 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.preview-toolbar p {
  margin: 6px 0 0;
  color: #5d6f89;
  font-size: 13px;
}

.preview-body {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow: auto;
  background:
    radial-gradient(circle at 50% 0%, rgb(15 159 143 / 7%), transparent 34%),
    linear-gradient(180deg, rgb(248 252 250 / 74%) 0%, rgb(241 247 244 / 72%) 100%);
}

.preview-stack {
  display: grid;
  gap: 14px;
  min-height: 100%;
  grid-template-rows: minmax(320px, 1fr) auto;
}

.preview-canvas {
  min-height: 320px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgb(15 23 42 / 6%),
    inset 0 1px 0 rgb(255 255 255 / 88%);
  overflow: hidden;
}

.preview-canvas :deep(.a2ui-surface),
.preview-canvas :deep([data-a2ui-surface]) {
  min-height: 100%;
}

.compact .preview-body {
  padding: 14px;
}

.a2ui-inspector {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.inspector-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 10px 24px rgb(15 23 42 / 5%);
}

.inspector-heading {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.inspector-heading h3 {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.inspector-heading p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.json-error {
  margin-bottom: 10px;
}

.json-editor :deep(.n-input__textarea-el) {
  font-family:
    "Cascadia Code",
    "JetBrains Mono",
    Consolas,
    monospace;
  font-size: 12px;
  line-height: 1.55;
}

.preview-generating {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: #ffffff;
}

.generating-hint {
  color: #5d6f89;
  font-size: 14px;
  animation: hint-pulse 2s infinite ease-in-out;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@media (max-width: 1200px) {
  .a2ui-inspector {
    grid-template-columns: 1fr;
  }
}
</style>
