<template>
  <div class="progress-indicator">
    <div class="progress-indicator__steps">
      <div
        v-for="step in steps"
        :key="step.number"
        class="progress-indicator__step"
        :class="{
          'progress-indicator__step--active': step.number === currentStep,
          'progress-indicator__step--completed': step.number < currentStep,
        }"
      >
        <div class="progress-indicator__step-circle">
          <span v-if="step.number < currentStep" class="progress-indicator__step-check">✓</span>
          <span v-else class="progress-indicator__step-number">{{ step.number }}</span>
        </div>
        <div class="progress-indicator__step-label">
          <div class="progress-indicator__step-title">{{ step.title }}</div>
          <div class="progress-indicator__step-description">{{ step.description }}</div>
        </div>
      </div>
      <div class="progress-indicator__line" :style="{ width: lineWidth }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Step {
  number: number
  title: string
  description: string
}

interface Props {
  currentStep: number
  totalSteps: number
}

const props = withDefaults(defineProps<Props>(), {
  currentStep: 1,
  totalSteps: 4,
})

const steps = computed<Step[]>(() => [
  { number: 1, title: '欢迎', description: '了解应用' },
  { number: 2, title: 'API 配置', description: '连接服务器' },
  { number: 3, title: '功能介绍', description: '快速上手' },
  { number: 4, title: '完成', description: '开始使用' },
])

const lineWidth = computed(() => {
  const percentage = ((props.currentStep - 1) / (props.totalSteps - 1)) * 100
  return `${percentage}%`
})
</script>

<style scoped lang="scss">
.progress-indicator {
  width: 100%;
  padding: 24px 0;

  &__steps {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    max-width: 600px;
    margin: 0 auto;
  }

  &__step {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    position: relative;
    z-index: 2;

    &--active {
      .progress-indicator__step-circle {
        background: var(--el-color-primary, #409eff);
        color: white;
        border-color: var(--el-color-primary, #409eff);
        box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.1);
      }

      .progress-indicator__step-title {
        color: var(--el-color-primary, #409eff);
        font-weight: 600;
      }
    }

    &--completed {
      .progress-indicator__step-circle {
        background: var(--el-color-success, #67c23a);
        color: white;
        border-color: var(--el-color-success, #67c23a);
      }

      .progress-indicator__step-title {
        color: var(--el-color-success, #67c23a);
      }
    }
  }

  &__step-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid #dcdfe6;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 16px;
    color: #909399;
    transition: all 0.3s ease;
    margin-bottom: 8px;
  }

  &__step-check {
    font-size: 20px;
    font-weight: bold;
  }

  &__step-number {
    font-size: 16px;
  }

  &__step-label {
    text-align: center;
    max-width: 100px;
  }

  &__step-title {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
    transition: all 0.3s ease;
  }

  &__step-description {
    font-size: 12px;
    color: #909399;
  }

  &__line {
    position: absolute;
    top: 20px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--el-color-success, #67c23a);
    transition: width 0.3s ease;
    z-index: 1;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: #dcdfe6;
      z-index: -1;
      width: calc((100% / 3) * 4);
    }
  }
}

@media (max-width: 768px) {
  .progress-indicator {
    &__step-circle {
      width: 32px;
      height: 32px;
      font-size: 14px;
    }

    &__step-check {
      font-size: 16px;
    }

    &__step-title {
      font-size: 12px;
    }

    &__step-description {
      font-size: 10px;
    }

    &__step-label {
      max-width: 80px;
    }

    &__line {
      top: 16px;
    }
  }
}
</style>