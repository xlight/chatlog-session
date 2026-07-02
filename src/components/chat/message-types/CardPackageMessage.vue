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
  <div class="message-cardpackage" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="cardpackage-icon">
        <el-icon :size="24"><Tickets /></el-icon>
      </div>
      <div class="cardpackage-content">
        <div class="cardpackage-title">微信卡包</div>
        <div class="cardpackage-hint">请在微信客户端查看</div>
      </div>
      <el-icon class="cardpackage-arrow"><Right /></el-icon>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 16) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-cardpackage {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 240px;
  max-width: 300px;

  .cardpackage-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    color: white;
    flex-shrink: 0;
  }

  .cardpackage-content {
    flex: 1;
    min-width: 0;

    .cardpackage-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--el-text-color-primary);
    }

    .cardpackage-hint {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      font-style: italic;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .cardpackage-arrow {
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