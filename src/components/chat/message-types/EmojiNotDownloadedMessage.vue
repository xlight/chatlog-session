<script setup lang="ts">
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  showMediaResources: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="message-emoji-not-downloaded">
    <template v-if="showMediaResources">
      <el-icon class="emoji-icon"><PictureFilled /></el-icon>
      <div class="emoji-info">
        <div class="emoji-title">表情包</div>
        <div class="emoji-status">暂未下载</div>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 8, '表情包') }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use './_shared.scss' as *;

.message-emoji-not-downloaded {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 180px;
  padding: 4px;

  .emoji-icon {
    font-size: 32px;
    color: var(--el-color-warning);
    flex-shrink: 0;
  }

  .emoji-info {
    flex: 1;
    min-width: 0;

    .emoji-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .emoji-status {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .media-placeholder {


    @include media-placeholder;


  }
}
</style>