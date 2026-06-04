<script setup lang="ts">
import type { ContextTag } from '@/types/ai'

defineProps<{
  tags: ContextTag[]
}>()

const emit = defineEmits<{
  remove: [id: string]
  clear: []
}>()
</script>

<template>
  <div v-if="tags.length > 0" class="context-bar">
    <div class="context-bar__header">
      <span class="context-bar__title">
        <el-icon><FolderOpened /></el-icon>
        上下文（{{ tags.length }}）
      </span>
      <el-button text size="small" @click="emit('clear')">
        清空
      </el-button>
    </div>
    <div class="context-bar__tags">
      <el-tag
        v-for="tag in tags"
        :key="tag.id"
        closable
        size="small"
        type="info"
        effect="plain"
        @close="emit('remove', tag.id)"
      >
        {{ tag.sessionName }}
        <el-text type="info" size="small" style="margin-left: 4px">
          {{ tag.messageCount }}条
        </el-text>
      </el-tag>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.context-bar {
  border-bottom: 1px solid var(--el-border-color-light);
  padding: 8px 12px;
  flex-shrink: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
}
</style>
