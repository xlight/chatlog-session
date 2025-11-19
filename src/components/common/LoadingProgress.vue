<script setup lang="ts">
import { computed } from 'vue'
import type { LoadProgress } from '@/utils/background-loader'

interface Props {
  progress: LoadProgress | null
  visible?: boolean
  position?: 'top' | 'bottom' | 'fixed'
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  position: 'bottom',
  showDetails: false
})

// 格式化时间
const formatTime = (ms?: number) => {
  if (!ms || ms <= 0) return '--'
  
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  return `${minutes}分${remainSeconds}秒`
}

// 格式化速度
const formatSpeed = (itemsPerSecond: number) => {
  if (itemsPerSecond < 1) return '<1 项/秒'
  return `${Math.round(itemsPerSecond)} 项/秒`
}

// 进度条宽度
const progressWidth = computed(() => {
  if (!props.progress) return '0%'
  return `${Math.min(props.progress.percentage, 100).toFixed(1)}%`
})

// 进度条颜色
const progressColor = computed(() => {
  if (!props.progress) return 'var(--el-color-primary)'
  
  const percentage = props.progress.percentage
  if (percentage < 30) return 'var(--el-color-danger)'
  if (percentage < 70) return 'var(--el-color-warning)'
  return 'var(--el-color-success)'
})

// 显示状态文本
const statusText = computed(() => {
  if (!props.progress) return '准备中...'
  
  if (props.progress.completed) {
    return '加载完成'
  }
  
  return `正在加载联系人... ${props.progress.loaded} 项`
})

// 是否显示组件
const shouldShow = computed(() => {
  return props.visible && props.progress !== null && !props.progress.completed
})
</script>

<template>
  <transition name="slide-fade">
    <div
      v-if="shouldShow"
      class="loading-progress"
      :class="[
        `loading-progress--${position}`,
        { 'loading-progress--detailed': showDetails }
      ]"
    >
      <div class="loading-progress__container">
        <!-- 状态栏 -->
        <div class="loading-progress__status">
          <div class="loading-progress__text">
            <el-icon class="loading-icon">
              <Loading />
            </el-icon>
            <span>{{ statusText }}</span>
          </div>
          
          <div v-if="progress" class="loading-progress__percentage">
            {{ progressWidth }}
          </div>
        </div>

        <!-- 进度条 -->
        <div class="loading-progress__bar">
          <div
            class="loading-progress__fill"
            :style="{
              width: progressWidth,
              backgroundColor: progressColor
            }"
          />
        </div>

        <!-- 详细信息 -->
        <div v-if="showDetails && progress" class="loading-progress__details">
          <div class="detail-item">
            <span class="label">加载速度:</span>
            <span class="value">{{ formatSpeed(progress.itemsPerSecond) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">已用时间:</span>
            <span class="value">{{ formatTime(progress.elapsedTime) }}</span>
          </div>
          <div v-if="progress.estimatedTimeRemaining" class="detail-item">
            <span class="label">预计剩余:</span>
            <span class="value">{{ formatTime(progress.estimatedTimeRemaining) }}</span>
          </div>
          <div v-if="progress.totalBatches" class="detail-item">
            <span class="label">批次:</span>
            <span class="value">{{ progress.currentBatch }} / {{ progress.totalBatches }}</span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.loading-progress {
  position: relative;
  z-index: 100;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  &--top {
    position: sticky;
    top: 0;
  }

  &--bottom {
    position: sticky;
    bottom: 0;
  }

  &--fixed {
    position: fixed;
    bottom: 16px;
    right: 16px;
    width: 320px;
    border-radius: 8px;
  }

  &__container {
    padding: 12px 16px;
  }

  &__status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__text {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--el-text-color-primary);

    .loading-icon {
      animation: rotate 1s linear infinite;
      color: var(--el-color-primary);
    }
  }

  &__percentage {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }

  &__bar {
    height: 4px;
    background-color: var(--el-fill-color);
    border-radius: 2px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    transition: width 0.3s ease, background-color 0.3s ease;
    border-radius: 2px;
  }

  &__details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;

    .label {
      color: var(--el-text-color-secondary);
    }

    .value {
      color: var(--el-text-color-regular);
      font-weight: 500;
    }
  }

  &--detailed {
    .loading-progress__container {
      padding: 16px;
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 过渡动画
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

// 暗色模式
.dark-mode {
  .loading-progress {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }
}
</style>