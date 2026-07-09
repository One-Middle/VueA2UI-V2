import { createApp, defineComponent, h } from "vue";
import {
  A2uiSurface,
  MessageProcessor,
  SurfaceGroupModel,
  registerBasicCatalog,
} from "@a2ui-platform/renderer";
import type { A2UIComponent, A2UIServerMessage } from "@a2ui-platform/shared";

const components: Record<string, A2UIComponent> = {
  root: {
    id: "root",
    component: "Card",
    child: "week_tabs",
    title: "我的课表",
  },
  week_tabs: {
    id: "week_tabs",
    component: "Tabs",
    tabs: [
      { child: "monday", title: "周一" },
      { child: "tuesday", title: "周二" },
      { child: "wednesday", title: "周三" },
      { child: "thursday", title: "周四" },
      { child: "friday", title: "周五" },
    ],
  },
  monday: {
    id: "monday",
    component: "Column",
    children: ["mon1", "div_m1", "mon2", "div_m2", "mon3"],
  },
  mon1: { id: "mon1", component: "Text", text: "高等数学 8:00-9:40" },
  div_m1: { id: "div_m1", component: "Divider" },
  mon2: { id: "mon2", component: "Text", text: "大学英语 10:00-11:40" },
  div_m2: { id: "div_m2", component: "Divider" },
  mon3: { id: "mon3", component: "Text", text: "体育 14:00-15:30" },
  tuesday: {
    id: "tuesday",
    component: "Column",
    children: ["tue1", "div_t1", "tue2", "div_t2", "tue3"],
  },
  tue1: { id: "tue1", component: "Text", text: "线性代数 8:00-9:40" },
  div_t1: { id: "div_t1", component: "Divider" },
  tue2: { id: "tue2", component: "Text", text: "C语言 10:00-11:40" },
  div_t2: { id: "div_t2", component: "Divider" },
  tue3: { id: "tue3", component: "Text", text: "物理实验 14:00-16:00" },
  wednesday: {
    id: "wednesday",
    component: "Column",
    children: ["wed1", "div_w1", "wed2"],
  },
  wed1: { id: "wed1", component: "Text", text: "大学物理 8:00-9:40" },
  div_w1: { id: "div_w1", component: "Divider" },
  wed2: { id: "wed2", component: "Text", text: "英语听力 10:00-11:40" },
  thursday: {
    id: "thursday",
    component: "Column",
    children: ["thu1", "div_th1", "thu2"],
  },
  thu1: { id: "thu1", component: "Text", text: "高等数学 8:00-9:40" },
  div_th1: { id: "div_th1", component: "Divider" },
  thu2: { id: "thu2", component: "Text", text: "C语言上机 10:00-11:40" },
  friday: {
    id: "friday",
    component: "Column",
    children: ["fri1", "div_f1", "fri2"],
  },
  fri1: { id: "fri1", component: "Text", text: "思修 8:00-9:40" },
  div_f1: { id: "div_f1", component: "Divider" },
  fri2: { id: "fri2", component: "Text", text: "选修课 10:00-11:40" },
};

registerBasicCatalog();

const surfaceGroup = new SurfaceGroupModel();
const processor = new MessageProcessor(surfaceGroup);
const messages: A2UIServerMessage[] = [
  {
    version: "v0.9",
    createSurface: {
      surfaceId: "main",
      catalogId: "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
    },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: "main",
      components: Object.values(components),
    },
  },
];

processor.processMessages(messages);

const App = defineComponent({
  setup() {
    return () =>
      h("main", { class: "test-shell" }, [
        h("h1", "A2UI Renderer 临时测试"),
        h(A2uiSurface, { surfaceId: "main", surfaceGroup }),
      ]);
  },
});

createApp(App).mount("#app");
