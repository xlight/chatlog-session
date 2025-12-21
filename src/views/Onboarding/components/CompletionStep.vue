<template>
  <div class="completion-step">
    <div class="completion-step__content">
      <!-- 庆祝图标 -->
      <div class="completion-step__icon">
        <div class="completion-step__icon-celebration">🎉</div>
      </div>

      <!-- 标题 -->
      <h2 class="completion-step__title">配置完成！</h2>
      <p class="completion-step__description">
        您已准备好开始浏览聊天记录
      </p>

      <!-- 提示信息 -->
      <div class="completion-step__tips">
        <div class="completion-step__tip">
          <div class="completion-step__tip-icon">💡</div>
          <div class="completion-step__tip-content">
            <div class="completion-step__tip-title">小提示</div>
            <ul class="completion-step__tip-list">
              <li>首次加载会话列表可能需要几秒钟</li>
              <li>打开会话后会自动加载所有历史消息</li>
              <li>您可以随时在设置中调整配置</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 快速开始指南 -->
      <div v-if=0 class="completion-step__guide">
        <h3 class="completion-step__guide-title">快速开始</h3>
        <div class="completion-step__guide-steps">
          <div class="completion-step__guide-step">
            <div class="completion-step__guide-step-number">1</div>
            <div class="completion-step__guide-step-text">
              在左侧会话列表中选择一个会话
            </div>
          </div>
          <div class="completion-step__guide-step">
            <div class="completion-step__guide-step-number">2</div>
            <div class="completion-step__guide-step-text">
              查看完整的聊天历史记录
            </div>
          </div>
          <div class="completion-step__guide-step">
            <div class="completion-step__guide-step-number">3</div>
            <div class="completion-step__guide-step-text">
              使用搜索功能快速找到需要的内容
            </div>
          </div>
        </div>
      </div>

      <!-- 按钮区域 -->
      <div class="completion-step__actions">
        <el-button size="large" @click="handlePrev">
          <el-icon><ArrowLeft /></el-icon>
          上一步
        </el-button>
        <el-button
          ref="completeButtonRef"
          type="primary"
          size="large"
          @click="handleComplete"
        >
          开始使用
          <el-icon><Right /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ArrowLeft, Right } from '@element-plus/icons-vue'

const emit = defineEmits<{
  prev: []
  complete: []
}>()

const completeButtonRef = ref<InstanceType<typeof import('element-plus')['ElButton']>>()

const handlePrev = () => {
  emit('prev')
}

const handleComplete = () => {
  emit('complete')
}

// 页面加载时自动聚焦"开始使用"按钮
onMounted(async () => {
  await nextTick()
  completeButtonRef.value?.$el?.focus()
})
</script>

<style scoped lang="scss">
.completion-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  padding: 40px 20px;

  &__content {
    max-width: 600px;
    width: 100%;
    text-align: center;
  }

  &__icon {
    margin-bottom: 32px;
  }

  &__icon-celebration {
    font-size: 100px;
    animation: celebration 1s ease-in-out;
  }

  &__title {
    font-size: 32px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 16px 0;
  }

  &__description {
    font-size: 18px;
    color: #606266;
    line-height: 1.6;
    margin: 0 0 40px 0;
  }

  &__tips {
    margin-bottom: 40px;
  }

  &__tip {
    display: flex;
    gap: 16px;
    padding: 24px;
    background: #ecf5ff;
    border: 1px solid #b3d8ff;
    border-radius: 12px;
    text-align: left;
  }

  &__tip-icon {
    font-size: 32px;
    flex-shrink: 0;
  }

  &__tip-content {
    flex: 1;
  }

  &__tip-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
  }

  &__tip-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 14px;
    color: #606266;
    line-height: 1.8;

    li {
      position: relative;
      padding-left: 20px;
      margin-bottom: 8px;

      &::before {
        content: '•';
        position: absolute;
        left: 0;
        color: var(--el-color-primary, #409eff);
        font-weight: bold;
        font-size: 18px;
        line-height: 1.4;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  &__guide {
    margin-bottom: 40px;
    text-align: left;
  }

  &__guide-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 20px 0;
    text-align: center;
  }

  &__guide-steps {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__guide-step {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: #f5f7fa;
    border-radius: 10px;
    transition: all 0.3s ease;

    &:hover {
      background: #ecf5ff;
      transform: translateX(4px);
    }
  }

  &__guide-step-number {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--el-color-primary, #409eff);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 600;
    flex-shrink: 0;
  }

  &__guide-step-text {
    font-size: 15px;
    color: #606266;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 16px;

    .el-button {
      min-width: 160px;
      min-height: 48px;
      font-size: 16px;
    }
  }
}

@keyframes celebration {
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(180deg);
  }
  100% {
    transform: scale(1) rotate(360deg);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .completion-step {
    padding: 20px;
    min-height: 400px;

    &__icon-celebration {
      font-size: 80px;
    }

    &__title {
      font-size: 26px;
    }

    &__description {
      font-size: 16px;
      margin-bottom: 32px;
    }

    &__tip {
      padding: 20px;
    }

    &__tip-icon {
      font-size: 28px;
    }

    &__tip-title {
      font-size: 15px;
    }

    &__tip-list {
      font-size: 13px;
    }

    &__guide-title {
      font-size: 16px;
    }

    &__guide-step {
      padding: 14px 16px;
    }

    &__guide-step-number {
      width: 32px;
      height: 32px;
      font-size: 16px;
    }

    &__guide-step-text {
      font-size: 14px;
    }

    &__actions {
      flex-direction: column;

      .el-button {
        width: 100%;
        min-width: auto;
      }
    }
  }
}
</style>
