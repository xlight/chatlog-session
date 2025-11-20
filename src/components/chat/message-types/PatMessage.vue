<script setup lang="ts">
interface Props {
  content: string
  showMediaResources: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="message-pat">
    <template v-if="showMediaResources">
      <div class="pat-card">
        <el-icon class="pat-icon"><Pointer /></el-icon>
        <span class="pat-text">{{ content }}</span>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ content }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-pat {
  display: flex;
  justify-content: center;
  padding: 4px 0;

  .pat-card {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 16px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
    max-width: 80%;
    word-break: break-word;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    .pat-icon {
      font-size: 16px;
      color: var(--el-color-primary);
      flex-shrink: 0;
      animation: shake 0.5s ease-in-out;
    }

    .pat-text {
      text-align: center;
    }
  }

  .media-placeholder {
    display: inline-block;
    padding: 6px 12px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    background: var(--el-fill-color-light);
    border-radius: 12px;
  }
}

// 抖动动画
@keyframes shake {
  0%, 100% {
    transform: translateX(0) rotate(0deg);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-2px) rotate(-2deg);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(2px) rotate(2deg);
  }
}

.dark-mode {
  .message-pat {
    .pat-card {
      background: rgba(255, 255, 255, 0.05);

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    }

    .media-placeholder {
      background: var(--el-fill-color-dark);
    }
  }
}
</style>