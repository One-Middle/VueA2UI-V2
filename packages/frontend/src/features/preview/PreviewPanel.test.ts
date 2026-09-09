import { afterEach, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia } from "pinia";
import type { A2UIServerMessage } from "@a2ui-platform/shared";
import PreviewPanel from "./PreviewPanel.vue";
import { useRendererStore } from "../../stores/renderer";

vi.mock("naive-ui", async () => {
  const { defineComponent, h } = await import("vue");
  const stub = defineComponent({
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    },
  });
  const input = defineComponent({
    props: ["value"],
    setup(props) {
      return () => h("textarea", { value: props.value });
    },
  });
  return { NAlert: stub, NEmpty: stub, NInput: input, NSpin: stub, NTag: stub };
});
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  document.body.replaceChildren();
});
const messages: A2UIServerMessage[] = [
  { version: "v0.9", createSurface: { surfaceId: "main", catalogId: "basic" } },
  {
    version: "v0.9",
    updateDataModel: { surfaceId: "main", path: "/", value: { name: "Ada" } },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: "main",
      components: [
        { id: "root", component: "Column", children: ["tabs", "field"] },
        {
          id: "tabs",
          component: "Tabs",
          tabItems: [
            { key: "one", title: "One", child: "one" },
            { key: "two", title: "Two", child: "two" },
          ],
        },
        { id: "one", component: "Text", text: "First" },
        { id: "two", component: "Text", text: "Second" },
        { id: "field", component: "TextField", text: { path: "/name" } },
      ],
    },
  },
];
async function flush() {
  for (let i = 0; i < 5; i++) await nextTick();
}
function mount() {
  const pinia = createPinia();
  const app = createApp(defineComponent({ render: () => h(PreviewPanel) }));
  app.use(pinia);
  const container = document.createElement("div");
  document.body.append(container);
  app.mount(container);
  dispose = () => app.unmount();
  return { container, store: useRendererStore(pinia) };
}
it("keeps Tabs and input focus on appended data, but resets the plan on full replacement", async () => {
  const { container, store } = mount();
  store.replaceMessages(messages);
  await flush();
  const button =
    container.querySelectorAll<HTMLButtonElement>(".a2ui-tabs-tab")[1]!;
  button.click();
  await flush();
  const input = container.querySelector<HTMLInputElement>(
    ".a2ui-textfield-input",
  )!;
  input.focus();
  input.setSelectionRange(1, 2);
  store.processMessages([
    {
      version: "v0.9",
      updateDataModel: { surfaceId: "main", path: "/name", value: "Grace" },
    },
  ]);
  await flush();
  expect(container.querySelector(".a2ui-tabs-content")?.textContent).toBe(
    "Second",
  );
  const updated = container.querySelector<HTMLInputElement>(
    ".a2ui-textfield-input",
  )!;
  expect(updated.value).toBe("Grace");
  expect(document.activeElement).toBe(updated);
  // Vue applies the controlled value in place; browsers place the caret at its end.
  expect(updated.selectionStart).toBe(updated.value.length);
  store.replaceMessages(messages);
  await flush();
  expect(container.querySelector(".a2ui-tabs-content")?.textContent).toBe(
    "First",
  );
  expect(
    container.querySelector<HTMLInputElement>(".a2ui-textfield-input")?.value,
  ).toBe("Ada");
  container.querySelector<HTMLButtonElement>(".inspector-toggle")!.click();
  await flush();
  expect(container.querySelectorAll("textarea")[1]?.value).toContain("Ada");
  store.reset();
  await flush();
  expect(container.querySelector(".a2ui-surface")).toBeNull();
});
it("does not mount queued surfaces after unmount", async () => {
  const { container, store } = mount();
  store.replaceMessages(messages);
  await nextTick();
  dispose?.();
  dispose = undefined;
  await flush();
  expect(container.querySelector(".a2ui-surface")).toBeNull();
});
