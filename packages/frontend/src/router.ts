import { createRouter, createWebHistory } from "vue-router";
import WorkspacePage from "./views/WorkspacePage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "workspace",
      component: WorkspacePage
    }
  ]
});
