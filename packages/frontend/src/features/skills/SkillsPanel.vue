<script setup lang="ts">
import type { SkillDto } from "@a2ui-platform/shared";
import { NButton, NCard, NEmpty, NInput, NModal, NSwitch, NTag } from "naive-ui";
import { onMounted, ref } from "vue";
import { useWorkspaceStore } from "../../stores/workspace";

const workspace = useWorkspaceStore();
const showCreate = ref(false);
const form = ref({ name: "", description: "", content: "" });

onMounted(() => workspace.loadSkills());

const handleCreate = async () => {
  if (!form.value.name || !form.value.content) return;
  await workspace.createSkill(form.value.name, form.value.description, form.value.content);
  showCreate.value = false;
  form.value = { name: "", description: "", content: "" };
};

const toggleSkill = (skill: SkillDto) => {
  workspace.enabledSkillIds.includes(skill.id) ? workspace.disableSkill(skill.id) : workspace.enableSkill(skill.id);
};
</script>

<template>
  <div class="panel-page skills-panel">
    <div class="panel-heading">
      <div>
        <h2>Skills</h2>
        <p>管理当前平台可用的 Agent 能力，并为当前会话启用所需 Skill。</p>
      </div>
      <n-button type="primary" @click="showCreate = true">创建 Skill</n-button>
    </div>

    <div v-if="workspace.skills.length === 0" class="panel-center">
      <n-empty description="暂无 Skills" />
    </div>

    <div v-else class="skill-list">
      <div v-for="s in workspace.skills" :key="s.id" class="skill-item">
        <div class="skill-main">
          <div class="skill-title">
            <strong>{{ s.name }}</strong>
            <n-tag size="small" :type="s.isActive ? 'success' : 'default'">{{ s.isActive ? "可用" : "禁用" }}</n-tag>
          </div>
          <p>{{ s.description ?? "暂无描述" }}</p>
          <small>v{{ s.version }}</small>
        </div>
        <div class="skill-action">
          <span>{{ workspace.enabledSkillIds.includes(s.id) ? "已启用" : "未启用" }}</span>
          <n-switch :value="workspace.enabledSkillIds.includes(s.id)" @update:value="() => toggleSkill(s)" />
        </div>
      </div>
    </div>

    <n-modal v-model:show="showCreate">
      <n-card class="skill-modal" title="创建 Skill" :bordered="false" role="dialog" aria-modal="true">
        <div class="modal-form">
          <n-input v-model:value="form.name" placeholder="名称" />
          <n-input v-model:value="form.description" placeholder="描述" />
          <n-input v-model:value="form.content" type="textarea" placeholder="内容" :rows="7" />
          <div class="modal-actions">
            <n-button @click="showCreate = false">取消</n-button>
            <n-button type="primary" :disabled="!form.name || !form.content" @click="handleCreate">确认创建</n-button>
          </div>
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped>
.skill-list {
  display: grid;
  gap: 12px;
}

.skill-item {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background:
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
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
}

.skill-title {
  display: flex;
  gap: 8px;
  align-items: center;
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

.skill-main small,
.skill-action span {
  color: #94a3b8;
  font-size: 12px;
}

.skill-action {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.skill-modal {
  width: min(640px, calc(100vw - 32px));
}

.modal-form {
  display: grid;
  gap: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
