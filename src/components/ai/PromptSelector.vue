<script setup lang="ts">
import { ref } from 'vue'
import { useAIPromptStore } from '@/stores/ai/prompt'
import type { PromptTemplate } from '@/types/ai'

const emit = defineEmits<{
  select: [promptId: string]
  edit: [prompt: PromptTemplate, isBuiltin: boolean]
  duplicate: [promptId: string]
  delete: [promptId: string]
  create: []
}>()

const promptStore = useAIPromptStore()
const popoverVisible = ref(false)

function handleSelect(id: string) {
  popoverVisible.value = false
  emit('select', id)
}

function handleEdit(prompt: PromptTemplate, isBuiltin: boolean) {
  emit('edit', prompt, isBuiltin)
}

function handleDuplicate(id: string) {
  emit('duplicate', id)
}

function handleDelete(id: string) {
  emit('delete', id)
}

function handleCreate() {
  emit('create')
}
</script>

<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="bottom-start"
    :width="320"
    trigger="click"
  >
    <template #reference>
      <el-button size="small" text>
        <el-icon><Notebook /></el-icon>
        Prompt
      </el-button>
    </template>

    <div class="prompt-panel">
      <div class="prompt-panel__scroll">
        <!-- 内置模板组 -->
        <div class="prompt-group">
          <div class="prompt-group__title">内置模板</div>
          <div
            v-for="prompt in promptStore.builtinList"
            :key="prompt.id"
            class="prompt-item"
          >
            <div class="prompt-item__main" @click="handleSelect(prompt.id)">
              <span class="prompt-item__name">
                {{ prompt.name }}
                <el-tag v-if="(prompt as any)._overridden" size="small" type="warning">已修改</el-tag>
              </span>
              <span class="prompt-item__desc">{{ prompt.description }}</span>
            </div>
            <div class="prompt-item__actions">
              <el-tooltip content="复制为自定义" placement="top">
                <el-button
                  size="small"
                  text
                  @click.stop="handleDuplicate(prompt.id)"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-button
                  size="small"
                  text
                  @click.stop="handleEdit(prompt, true)"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- 自定义模板组 -->
        <div v-if="promptStore.customList.length > 0" class="prompt-group">
          <div class="prompt-group__title">自定义模板</div>
          <div
            v-for="prompt in promptStore.customList"
            :key="prompt.id"
            class="prompt-item"
          >
            <div class="prompt-item__main" @click="handleSelect(prompt.id)">
              <span class="prompt-item__name">{{ prompt.name }}</span>
              <span class="prompt-item__desc">{{ prompt.description }}</span>
            </div>
            <div class="prompt-item__actions">
              <el-tooltip content="编辑" placement="top">
                <el-button
                  size="small"
                  text
                  @click.stop="handleEdit(prompt, false)"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <el-popconfirm
                title="确定删除此模板？"
                confirm-button-text="删除"
                cancel-button-text="取消"
                @confirm="handleDelete(prompt.id)"
              >
                <template #reference>
                  <el-button size="small" text @click.stop>
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>

        <div v-if="promptStore.builtinList.length === 0 && promptStore.customList.length === 0" class="prompt-panel__empty">
          暂无模板
        </div>
      </div>

      <div class="prompt-panel__footer">
        <el-button size="small" type="primary" text @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新建模板
        </el-button>
      </div>
    </div>
  </el-popover>
</template>

<style lang="scss" scoped>
.prompt-panel {
  margin: -12px;
  display: flex;
  flex-direction: column;

  &__scroll {
    max-height: 400px;
    overflow-y: auto;
    padding: 4px 0;
  }

  &__empty {
    padding: 24px;
    text-align: center;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  &__footer {
    border-top: 1px solid var(--el-border-color-lighter);
    padding: 8px 12px;
  }
}

.prompt-group {
  &__title {
    padding: 6px 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
  }
}

.prompt-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-weight: 500;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__desc {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    margin-left: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover &__actions {
    opacity: 1;
  }
}
</style>
