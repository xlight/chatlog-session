<script setup lang="ts">
interface Props {
  forwardedTitle: string
  forwardedDesc: string
  forwardedCount: number
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
  <div class="message-forwarded" @click="handleClick">
    <div class="forwarded-header">
      <el-icon class="forwarded-icon"><ChatDotSquare /></el-icon>
      <span class="forwarded-title">{{ forwardedTitle }}</span>
    </div>
    <div v-if="forwardedDesc" class="forwarded-desc">{{ forwardedDesc }}</div>
    <div class="forwarded-footer">
      <span v-if="forwardedCount > 0" class="forwarded-count">共{{ forwardedCount }}条消息</span>
      <span v-else class="forwarded-hint">点击查看聊天记录</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-forwarded {
  cursor: pointer;

  .forwarded-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .forwarded-icon {
      font-size: 20px;
      color: var(--el-color-primary);
    }

    .forwarded-title {
      font-size: 14px;
      font-weight: 500;
    }
  }

  .forwarded-desc {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;
    margin-bottom: 8px;
    max-height: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .forwarded-footer {
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);

    .forwarded-count,
    .forwarded-hint {
      font-size: 12px;
      color: var(--el-color-primary);
    }
  }

  &:hover {
    opacity: 0.9;
  }
}

.dark-mode {
  .message-forwarded .forwarded-footer {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}
</style>