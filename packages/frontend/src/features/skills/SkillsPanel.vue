<script setup lang="ts">
import type { SkillDto, SkillReference } from "@a2ui-platform/shared";
import {
  NButton,
  NCard,
  NEmpty,
  NInput,
  NModal,
  NSwitch,
  NTag,
} from "naive-ui";
import { computed, onMounted, ref } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";

// ─── 类型 ──────────────────────────────────────────────

type ModalMode = "create" | "view" | "edit";

// ─── Store ─────────────────────────────────────────────

const workspace = useWorkspaceStore();

// ─── 弹窗状态 ──────────────────────────────────────────

const modalVisible = ref(false);
const modalMode = ref<ModalMode>("create");
const editingSkill = ref<SkillDto | null>(null);
const togglingSkillIds = ref<Set<string>>(new Set());
const form = ref({
  name: "",
  description: "",
  content: "",
  referencesJson: "[]",
  isActive: true,
});

// ─── 计算属性 ──────────────────────────────────────────

const modalTitle = computed(() => {
  switch (modalMode.value) {
    case "view":
      return editingSkill.value?.name ?? "查看 Skill";
    case "edit":
      return "编辑 Skill";
    case "create":
      return "创建 Skill";
  }
});

const isBuiltin = computed(
  () =>
    editingSkill.value?.sourceType === "builtin" ||
    editingSkill.value?.sourceType === "platform",
);

const isReadonly = computed(
  () => modalMode.value === "view" || isBuiltin.value,
);

// ─── 生命周期 ──────────────────────────────────────────

onMounted(() => workspace.loadSkills());

// ─── 弹窗控制 ──────────────────────────────────────────

/** 打开查看弹窗 */
const openView = (skill: SkillDto) => {
  editingSkill.value = skill;
  form.value = {
    name: skill.name,
    description: skill.description ?? "",
    content: skill.content,
    referencesJson: formatReferences(skill.references),
    isActive: skill.isActive,
  };
  modalMode.value = "view";
  modalVisible.value = true;
};

/** 打开编辑弹窗 */
const openEdit = (skill: SkillDto) => {
  editingSkill.value = skill;
  form.value = {
    name: skill.name,
    description: skill.description ?? "",
    content: skill.content,
    referencesJson: formatReferences(skill.references),
    isActive: skill.isActive,
  };
  modalMode.value = "edit";
  modalVisible.value = true;
};

/** 打开新建弹窗 */
const openCreate = () => {
  editingSkill.value = null;
  form.value = {
    name: "",
    description: "",
    content: "",
    referencesJson: "[]",
    isActive: true,
  };
  modalMode.value = "create";
  modalVisible.value = true;
};

/** 关闭弹窗 */
const closeModal = () => {
  modalVisible.value = false;
};

// ─── 操作 ──────────────────────────────────────────────

/** 新建 / 编辑 提交 */
const handleSubmit = async () => {
  if (!form.value.name || !form.value.content) return;
  const references = parseReferences(form.value.referencesJson);

  if (modalMode.value === "edit" && editingSkill.value) {
    await workspace.updateSkill(editingSkill.value.id, {
      name: form.value.name,
      description: form.value.description,
      content: form.value.content,
      references,
      isActive: form.value.isActive,
    });
  } else if (modalMode.value === "create") {
    await workspace.createSkill(
      form.value.name,
      form.value.description,
      form.value.content,
      references,
    );
  }

  closeModal();
};

/** 格式化 Skill Reference JSON。 */
const formatReferences = (references: SkillReference[] = []) =>
  JSON.stringify(references, null, 2);

/** 解析 Skill Reference JSON。 */
const parseReferences = (raw: string): SkillReference[] => {
  const parsed = JSON.parse(raw || "[]") as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("References 必须是数组");
  }
  return parsed.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Reference 必须是对象");
    }
    const ref = item as Record<string, unknown>;
    if (
      typeof ref.id !== "string" ||
      typeof ref.title !== "string" ||
      typeof ref.content !== "string"
    ) {
      throw new Error("Reference 必须包含 id、title 和 content");
    }
    return {
      id: ref.id,
      title: ref.title,
      content: ref.content,
      description:
        typeof ref.description === "string" ? ref.description : null,
    };
  });
};

/** 平台 Skill 由 resolver 自动启用，不走会话级开关。 */
const isPlatformSkill = (skill: SkillDto) => skill.sourceType === "platform";

/** Skill 在当前 UI 中是否显示为启用。 */
const isSkillEnabled = (skill: SkillDto) =>
  isPlatformSkill(skill) || workspace.enabledSkillIds.includes(skill.id);

/** 会话级启用/禁用切换 */
const toggleSkill = async (skill: SkillDto, enabled: boolean) => {
  if (isPlatformSkill(skill) || !workspace.activeSessionId) return;

  togglingSkillIds.value = new Set([...togglingSkillIds.value, skill.id]);
  try {
    if (enabled) {
      await workspace.enableSkill(skill.id);
    } else {
      await workspace.disableSkill(skill.id);
    }
  } finally {
    const nextToggling = new Set(togglingSkillIds.value);
    nextToggling.delete(skill.id);
    togglingSkillIds.value = nextToggling;
  }
};

/** 开关是否可点击。 */
const isToggleDisabled = (skill: SkillDto) =>
  !workspace.activeSessionId ||
  !skill.isActive ||
  isPlatformSkill(skill) ||
  togglingSkillIds.value.has(skill.id);

/** 开关旁状态文案。 */
const skillToggleLabel = (skill: SkillDto) => {
  if (isPlatformSkill(skill)) return "自动启用";
  if (!workspace.activeSessionId) return "请选择会话";
  return isSkillEnabled(skill) ? "已启用" : "未启用";
};

/** 来源类型中文标签 */
const sourceTypeLabel = (type: string) => {
  switch (type) {
    case "platform":
      return "平台";
    case "builtin":
      return "内置";
    case "manual":
      return "手动";
    default:
      return type;
  }
};

/** 来源类型 Tag 颜色 */
const sourceTypeTagType = (type: string): "info" | "warning" | "default" => {
  switch (type) {
    case "platform":
      return "info";
    case "builtin":
      return "info";
    case "manual":
      return "warning";
    default:
      return "default";
  }
};
</script>

<template>
  <div class="panel-page skills-panel">
    <!-- ── 页头 ────────────────────────────────────── -->
    <div class="panel-heading">
      <div>
        <h2>Skills</h2>
        <p>管理当前平台可用的 Agent 能力，并为当前会话启用所需 Skill。</p>
      </div>
      <n-button type="primary" @click="openCreate">创建 Skill</n-button>
    </div>

    <!-- ── 空状态 ──────────────────────────────────── -->
    <div v-if="workspace.skills.length === 0" class="panel-center">
      <n-empty description="暂无 Skills" />
    </div>

    <!-- ── 卡片列表 ────────────────────────────────── -->
    <div v-else class="skill-list">
      <div v-for="s in workspace.skills" :key="s.id" class="skill-item">
        <div class="skill-main">
          <div class="skill-title">
            <strong>{{ s.name }}</strong>
            <n-tag
              size="small"
              :type="s.isActive ? 'success' : 'default'"
            >
              {{ s.isActive ? "可用" : "禁用" }}
            </n-tag>
            <n-tag size="small" :type="sourceTypeTagType(s.sourceType)">
              {{ sourceTypeLabel(s.sourceType) }}
            </n-tag>
          </div>
          <p>{{ s.description ?? "暂无描述" }}</p>
          <small>v{{ s.version }}</small>
        </div>
        <div class="skill-actions">
          <n-button size="tiny" quaternary @click="openView(s)">查看</n-button>
          <n-button size="tiny" quaternary @click="openEdit(s)">编辑</n-button>
        </div>
        <div class="skill-toggle">
          <span>{{ skillToggleLabel(s) }}</span>
          <n-switch
            :value="isSkillEnabled(s)"
            :disabled="isToggleDisabled(s)"
            :loading="togglingSkillIds.has(s.id)"
            @update:value="(value) => toggleSkill(s, value)"
          />
        </div>
      </div>
    </div>

    <!-- ── 弹窗 ────────────────────────────────────── -->
    <n-modal v-model:show="modalVisible">
      <n-card
        class="skill-modal"
        :title="modalTitle"
        :bordered="false"
        role="dialog"
        aria-modal="true"
      >
        <div class="modal-form">
          <!-- 名称 -->
          <div class="form-field">
            <label>名称</label>
            <n-input
              v-model:value="form.name"
              placeholder="Skill 名称"
              :readonly="modalMode === 'view'"
            />
          </div>

          <!-- 描述 -->
          <div class="form-field">
            <label>描述</label>
            <n-input
              v-model:value="form.description"
              placeholder="简要描述该 Skill 的用途"
              :readonly="modalMode === 'view'"
            />
          </div>

          <!-- 内容 -->
          <div class="form-field">
            <label>内容（Markdown）</label>
            <n-input
              v-model:value="form.content"
              type="textarea"
              placeholder="Skill 的完整 Prompt 内容"
              :rows="modalMode === 'view' ? 16 : 12"
              :readonly="isReadonly"
            />
            <p v-if="isBuiltin && modalMode !== 'view'" class="field-hint">
              内置 Skill 的源码定义在
              <code>packages/agent/src/skills/</code> 目录下的 .md
              文件中。请通过编辑对应 .md 文件后运行
              <code>pnpm skill:sync</code> 更新内容。
            </p>
          </div>

          <!-- References -->
          <div class="form-field">
            <label>References（JSON）</label>
            <n-input
              v-model:value="form.referencesJson"
              type="textarea"
              placeholder='[{"id":"ref-1","title":"参考资料","content":"资料正文"}]'
              :rows="modalMode === 'view' ? 10 : 8"
              :readonly="isReadonly"
            />
          </div>

          <!-- 可用状态（仅编辑模式显示） -->
          <div v-if="modalMode === 'edit'" class="form-field form-field-inline">
            <label>可用状态</label>
            <n-switch v-model:value="form.isActive" />
            <span class="field-hint-inline">{{
              form.isActive ? "启用" : "禁用"
            }}</span>
          </div>

          <!-- 元信息（查看模式显示） -->
          <div v-if="modalMode === 'view' && editingSkill" class="form-meta">
            <div>
              <span class="meta-key">来源类型</span>
              <span class="meta-value">{{
                sourceTypeLabel(editingSkill.sourceType)
              }}</span>
            </div>
            <div>
              <span class="meta-key">版本</span>
              <span class="meta-value">v{{ editingSkill.version }}</span>
            </div>
            <div>
              <span class="meta-key">状态</span>
              <span class="meta-value">{{
                editingSkill.isActive ? "可用" : "禁用"
              }}</span>
            </div>
            <div>
              <span class="meta-key">更新于</span>
              <span class="meta-value">{{
                new Date(editingSkill.updatedAt).toLocaleString("zh-CN")
              }}</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="modal-actions">
            <n-button @click="closeModal">{{
              modalMode === "view" ? "关闭" : "取消"
            }}</n-button>
            <n-button
              v-if="modalMode !== 'view'"
              type="primary"
              :disabled="!form.name || !form.content"
              @click="handleSubmit"
            >
              {{ modalMode === "edit" ? "保存" : "确认创建" }}
            </n-button>
          </div>
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped>
/* ─── 列表 ──────────────────────────────────────────── */

.skill-list {
  display: grid;
  gap: 12px;
}

.skill-item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 8px 20px rgb(15 23 42 / 4%);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.skill-item:hover {
  border-color: #bfd3f4;
  box-shadow: 0 14px 28px rgb(15 23 42 / 7%);
  transform: translateY(-1px);
}

.skill-main {
  min-width: 0;
  flex: 1;
}

.skill-title {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.skill-title strong {
  color: #0f172a;
  font-size: 14px;
}

.skill-main p {
  margin: 7px 0 4px;
  color: #5d6f89;
  font-size: 13px;
  line-height: 1.55;
}

.skill-main small {
  color: #94a3b8;
  font-size: 12px;
}

/* ─── 卡片操作按钮 ──────────────────────────────────── */

.skill-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

/* ─── 会话启用/禁用区域 ─────────────────────────────── */

.skill-toggle {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.skill-toggle span {
  color: #94a3b8;
  font-size: 12px;
}

/* ─── 弹窗 ──────────────────────────────────────────── */

.skill-modal {
  width: min(680px, calc(100vw - 32px));
}

.modal-form {
  display: grid;
  gap: 14px;
}

.form-field {
  display: grid;
  gap: 6px;
}

.form-field label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.form-field-inline {
  display: flex;
  gap: 10px;
  align-items: center;
}

.field-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #f59e0b;
  line-height: 1.5;
}

.field-hint code {
  padding: 1px 5px;
  border-radius: 4px;
  background: #fef3c7;
  font-size: 11px;
}

.field-hint-inline {
  font-size: 12px;
  color: #64748b;
}

/* ─── 元信息（查看模式）─────────────────────────────── */

.form-meta {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 13px;
}

.form-meta div {
  display: flex;
  gap: 8px;
}

.meta-key {
  color: #94a3b8;
  min-width: 60px;
}

.meta-value {
  color: #334155;
}

/* ─── 按钮行 ────────────────────────────────────────── */

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
