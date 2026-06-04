<script setup lang="ts">
import { useAIPromptStore } from '@/stores/ai/prompt'

const emit = defineEmits<{
  select: [promptId: string]
}>()

const promptStore = useAIPromptStore()
</script>

<template>
  <el-dropdown trigger="click" @command="(id: string) => emit('select', id)">
    <el-button size="small" text>
      <el-icon><Notebook /></el-icon>
      Prompt
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <template v-for="prompt in promptStore.builtinList" :key="prompt.id">
          <el-dropdown-item :command="prompt.id">
            <div class="prompt-item">
              <span class="prompt-item__name">{{ prompt.name }}</span>
              <span class="prompt-item__desc">{{ prompt.description }}</span>
            </div>
          </el-dropdown-item>
        </template>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>
.prompt-item {
  display: flex;
  flex-direction: column;

  &__name {
    font-weight: 500;
  }

  &__desc {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }
}
</style>
