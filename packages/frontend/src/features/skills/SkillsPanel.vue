<script setup lang="ts">
import type { SkillDto } from "@a2ui-platform/shared";
import { NButton, NInput, NModal, NSpace, NSwitch, NTag } from "naive-ui";
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
  <div class="skills-panel">
    <n-space style="margin-bottom: 16px;">
      <n-button type="primary" @click="showCreate = true">创建 Skill</n-button>
    </n-space>

    <div v-if="workspace.skills.length === 0" style="color: #999;">暂无 Skills</div>
    <div v-for="s in workspace.skills" :key="s.id" class="skill-item">
      <div>
        <strong>{{ s.name }}</strong> <n-tag size="small" :type="s.isActive ? 'success' : 'default'">{{ s.isActive ? '启用' : '禁用' }}</n-tag>
        <p style="color: #666; font-size: 13px;">{{ s.description ?? "无描述" }} · v{{ s.version }}</p>
      </div>
      <n-switch :value="workspace.enabledSkillIds.includes(s.id)" @update:value="() => toggleSkill(s)" />
    </div>

    <n-modal v-model:show="showCreate" title="创建 Skill">
      <div style="padding: 16px;">
        <n-input v-model:value="form.name" placeholder="名称" style="margin-bottom: 8px;" />
        <n-input v-model:value="form.description" placeholder="描述" style="margin-bottom: 8px;" />
        <n-input v-model:value="form.content" type="textarea" placeholder="内容" :rows="6" style="margin-bottom: 12px;" />
        <n-button type="primary" @click="handleCreate" :disabled="!form.name || !form.content">确认创建</n-button>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.skills-panel { padding: 16px; }
.skill-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
</style>
