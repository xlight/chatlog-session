<script setup lang="ts">
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
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
  <div class="message-qqmusic" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="qqmusic-icon">
        <el-icon :size="24"><Headset /></el-icon>
      </div>
      <div class="qqmusic-content">
        <div class="qqmusic-title">QQ音乐</div>
        <div class="qqmusic-hint">请在微信客户端查看</div>
      </div>
      <el-icon class="qqmusic-arrow"><Right /></el-icon>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 3) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-qqmusic {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 240px;
  max-width: 300px;

  .qqmusic-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: linear-gradient(135deg, #31c27c 0%, #1faa5f 100%);
    color: white;
    flex-shrink: 0;
  }

  .qqmusic-content {
    flex: 1;
    min-width: 0;

    .qqmusic-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--el-text-color-primary);
    }

    .qqmusic-hint {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      font-style: italic;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .qqmusic-arrow {
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

html.dark {
  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>