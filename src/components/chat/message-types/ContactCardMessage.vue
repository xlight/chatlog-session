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
  <div class="message-contact-card" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="card-icon">
        <el-icon :size="24"><User /></el-icon>
      </div>
      <div class="card-content">
        <div class="card-title">分享了名片</div>
        <div class="card-hint">请在微信客户端查看</div>
      </div>
      <el-icon class="card-arrow"><Right /></el-icon>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(42, 0) }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use './_shared.scss' as *;

.message-contact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 240px;
  max-width: 300px;

  .card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    flex-shrink: 0;
  }

  .card-content {
    flex: 1;
    min-width: 0;

    .card-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--el-text-color-primary);
    }

    .card-hint {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      font-style: italic;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .card-arrow {
    font-size: 18px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  .media-placeholder {


    @include media-placeholder;


  }

  &:hover {
    opacity: 0.8;
  }
}
</style>