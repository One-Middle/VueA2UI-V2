<script setup lang="ts">
/**
 * A2uiSurface 组件：渲染一个 A2UI Surface。
 *
 * 从上层 provide 的 SurfaceGroupModel 中获取指定 surfaceId 的 SurfaceModel，
 * 通过 provide 向下传递 surfaceGroup 和 surfaceId，供子组件使用。
 */
import { computed, provide } from "vue";
import type { SurfaceGroupModel } from "../core/surface-model";
import A2uiComponent from "./A2uiComponent.vue";

const props = defineProps<{
  /** 要渲染的 Surface ID */
  surfaceId: string;
  /** 从上层传入的 SurfaceGroupModel 实例 */
  surfaceGroup: SurfaceGroupModel;
}>();

const surfaceModel = computed(() => props.surfaceGroup.get(props.surfaceId));

/** 向下传递 SurfaceGroupModel */
provide<SurfaceGroupModel>("A2UI_SURFACE_GROUP", props.surfaceGroup);
</script>

<template>
  <section class="a2ui-surface" :data-surface-id="surfaceId">
    <!-- Surface 未找到 -->
    <div v-if="!surfaceModel" class="a2ui-empty">
      Surface 未找到：{{ surfaceId }}
    </div>

    <!-- Root 组件不存在 -->
    <div v-else-if="!surfaceModel.components.has('root')" class="a2ui-empty">
      Root 组件未定义
    </div>

    <!-- 正常渲染 -->
    <A2uiComponent
      v-else
      :surface-id="surfaceId"
      :component-id="'root'"
    />
  </section>
</template>
