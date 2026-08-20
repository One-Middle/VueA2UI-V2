<script setup lang="ts">
/**
 * 可折叠的 artifact 摘要。
 *
 * 用于 Plan Markdown 与 Validation Report：
 * 默认只展示紧凑摘要，点击展开才显示完整详情文本。
 */
import { NButton, NTag } from "naive-ui";
import { ref } from "vue";

const props = defineProps<{
  title: string;
  tag?: string;
  tagType?: "default" | "success" | "error" | "info" | "warning";
  /** 紧凑摘要行（默认收起时展示） */
  summary?: string;
  /** 展开后展示的详情文本 */
  details?: string;
  /** 是否默认展开（默认折叠） */
  defaultOpen?: boolean;
}>();

const open = ref(props.defaultOpen ?? false);

const hasDetails = () => Boolean(props.details?.trim());
</script>

<template>
  <section class="artifact-summary">
    <div class="summary-heading">
      <div class="summary-title">
        <h3>{{ title }}</h3>
        <n-tag v-if="tag" size="small" :type="tagType ?? 'default'">{{ tag }}</n-tag>
      </div>
      <n-button
        v-if="hasDetails()"
        text
        size="tiny"
        @click="open = !open"
      >
        {{ open ? "收起" : "展开" }}
      </n-button>
    </div>
    <p v-if="summary" class="summary-line">{{ summary }}</p>
    <pre v-if="open && hasDetails()" class="summary-details">{{ details }}</pre>
  </section>
</template>

<style scoped>
.artifact-summary {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fbfdff;
}

.summary-heading {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.summary-title {
  display: flex;
  gap: 8px;
  align-items: center;
}

.summary-title h3 {
  margin: 0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.summary-line {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.summary-details {
  max-height: 240px;
  margin: 0;
  padding: 10px;
  overflow: auto;
  border-radius: 6px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
