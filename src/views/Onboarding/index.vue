<template>
  <div class="onboarding">
    <div class="onboarding__container">
      <!-- 跳过按钮 -->
      <div v-if="!isLastStep" class="onboarding__skip">
        <el-link type="info" @click="handleSkipClick">
          跳过引导 →
        </el-link>
      </div>

      <!-- 进度指示器 -->
      <ProgressIndicator
        :current-step="store.currentStep"
        :total-steps="store.totalSteps"
      />

      <!-- 步骤内容 -->
      <div class="onboarding__content">
        <Transition name="fade" mode="out-in">
          <!-- Step 1: 欢迎页面 -->
          <WelcomeStep
            v-if="store.currentStep === 1"
            @next="handleNext"
          />

          <!-- Step 2: API 配置 -->
          <ApiConfigStep
            v-else-if="store.currentStep === 2"
            v-model="store.apiBaseUrl"
            :test-status="store.apiTestStatus"
            :test-error="store.apiTestError"
            @prev="handlePrev"
            @next="handleNext"
            @test="handleTestConnection"
          />

          <!-- Step 3: 功能介绍 -->
          <FeatureTourStep
            v-else-if="store.currentStep === 3"
            @prev="handlePrev"
            @next="handleNext"
            @skip="handleNext"
          />

          <!-- Step 4: 完成 -->
          <CompletionStep
            v-else-if="store.currentStep === 4"
            @prev="handlePrev"
            @complete="handleComplete"
          />
        </Transition>
      </div>
    </div>

    <!-- 跳过确认对话框 -->
    <el-dialog
      v-model="showSkipDialog"
      title="确认跳过引导"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="onboarding__skip-dialog">
        <p>确定要跳过配置向导吗？</p>
        <p class="onboarding__skip-dialog-hint">
          {{ skipDialogHint }}
        </p>
      </div>
      <template #footer>
        <el-button @click="showSkipDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmSkip">确定跳过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOnboarding } from './composables/useOnboarding'
import ProgressIndicator from './components/ProgressIndicator.vue'
import WelcomeStep from './components/WelcomeStep.vue'
import ApiConfigStep from './components/ApiConfigStep.vue'
import FeatureTourStep from './components/FeatureTourStep.vue'
import CompletionStep from './components/CompletionStep.vue'

const {
  store,
  isLastStep,
  handleNext,
  handlePrev,
  handleSkip,
  handleComplete,
  handleTestConnection,
} = useOnboarding()

const showSkipDialog = ref(false)

// 跳过提示文字
const skipDialogHint = computed(() => {
  if (store.currentStep === 2) {
    return '跳过后需要在设置中手动配置 API 连接。'
  }
  return '您可以稍后重新运行引导向导。'
})

/**
 * 点击跳过按钮
 */
const handleSkipClick = () => {
  showSkipDialog.value = true
}

/**
 * 确认跳过
 */
const confirmSkip = async () => {
  showSkipDialog.value = false
  await handleSkip()
}

/**
 * 组件挂载时加载已有配置
 */
onMounted(() => {
  store.loadExistingConfig()
})
</script>

<style scoped lang="scss">
.onboarding {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: auto;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    opacity: 0.5;
  }

  &__container {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 900px;
    background: white;
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  &__skip {
    position: absolute;
    top: 20px;
    right: 24px;
    z-index: 10;

    .el-link {
      font-size: 14px;
    }
  }

  &__content {
    min-height: 500px;
  }

  &__skip-dialog {
    padding: 10px 0;

    p {
      margin: 0 0 12px 0;
      font-size: 15px;
      color: #606266;
      line-height: 1.6;
    }

    &-hint {
      padding: 12px;
      background: #fef0f0;
      border: 1px solid #fde2e2;
      border-radius: 6px;
      color: #f56c6c;
      font-size: 14px;
    }
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@media (max-width: 768px) {
  .onboarding {
    padding: 10px;

    &__container {
      border-radius: 16px;
    }

    &__skip {
      top: 12px;
      right: 16px;

      .el-link {
        font-size: 12px;
      }
    }

    &__content {
      min-height: 400px;
    }
  }
}
</style>