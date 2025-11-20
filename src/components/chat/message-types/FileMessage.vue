<script setup lang="ts">
import { getMediaPlaceholder, formatFileSize } from '../composables/utils'

interface Props {
  fileUrl: string
  fileName: string
  fileSize?: number
  showMediaResources: boolean
  md5?: string
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
  <div class="message-file" @click="handleClick">
    <template v-if="showMediaResources">
      <el-icon class="file-icon"><Document /></el-icon>
      <div class="file-info">
        <div class="file-name ellipsis">{{ fileName }}</div>
        <div v-if="fileSize" class="file-size">{{ formatFileSize(fileSize) }}</div>
        <div v-else-if="md5" class="file-size">
          MD5: {{ md5.substring(0, 8) }}...
        </div>
        <div v-else class="file-size">未知大小</div>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 6, fileName) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-file {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 200px;

  .file-icon {
    font-size: 32px;
    color: var(--el-color-primary);
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
    min-width: 0;

    .file-name {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .file-size {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
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

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark-mode {
  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>