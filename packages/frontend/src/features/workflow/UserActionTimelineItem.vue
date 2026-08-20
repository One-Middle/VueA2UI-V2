<script setup lang="ts">
/**
 * 用户动作时间线节点。
 *
 * 将 WorkflowAction 产生的用户消息渲染为时间线上的用户节点：
 * 展示动作标签（确认/修改/拒绝/补充），并可展开查看提交明细。
 */
import type { MessageDto } from "@a2ui-platform/shared";
import { NButton } from "naive-ui";
import { computed, ref } from "vue";
import { workflowActionDetails, workflowActionFeedbackLabel } from "./workflowDisplay";

const props = defineProps<{ message: MessageDto }>();

const open = ref(false);
const label = computed(() => workflowActionFeedbackLabel(props.message));
const details = computed(() => workflowActionDetails(props.message));
const hasDetails = computed(() => details.value.length > 0);
</script>

<template>
  <div class="user-action">
    <div class="user-action-head">
      <span class="user-action-label">{{ label }}</span>
      <n-button v-if="hasDetails" text size="tiny" @click="open = !open">
        {{ open ? "收起" : "明细" }}
      </n-button>
    </div>
    <ul v-if="open && hasDetails" class="user-action-details">
      <li v-for="detail in details" :key="detail.label">
        <span class="detail-label">{{ detail.label }}</span>
        <span class="detail-value">{{ detail.value }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.user-action {
  display: grid;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgb(45 212 191 / 32%);
  border-radius: 8px;
  background: linear-gradient(180deg, #ecfdf9 0%, #f4fbf9 100%);
}

.user-action-head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.user-action-label {
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
}

.user-action-details {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 6px 0 0;
  border-top: 1px dashed rgb(45 212 191 / 30%);
  list-style: none;
}

.user-action-details li {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.detail-label {
  flex-shrink: 0;
  color: #5d6f89;
  font-size: 12px;
  font-weight: 600;
}

.detail-value {
  color: #334155;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}
</style>
