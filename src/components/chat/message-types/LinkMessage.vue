<script setup lang="ts">
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  linkTitle: string
  linkUrl: string
  showMediaResources: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <div class="message-link" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="link-content">
        <div class="link-title">{{ linkTitle }}</div>
        <div v-if="linkUrl" class="link-url">{{ linkUrl }}</div>
      </div>
      <el-icon class="link-arrow"><Right /></el-icon>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 5) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  min-width: 240px;

  .link-content {
    flex: 1;
    min-width: 0;

    .link-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .link-url {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .link-arrow {
    font-size: 18px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  .media-placeholder {
    display: inline-block;
    padding: 8px 12px;
    color: var(--el-text-color-secondary);
    font-size: 14px;
    font-style: italic;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    border: 1px dashed var(--el-border-color);

    &:hover {
      background: var(--el-fill-color);
    }
  }

  &:hover {
    opacity: 0.8;
  }
}

.dark-mode {
  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>