<template>
  <div class="api-config-step">
    <div class="api-config-step__content">
      <!-- 标题 -->
      <h2 class="api-config-step__title">配置 API 连接</h2>
      <p class="api-config-step__description">
        ChatLog Session 需要连接到 ChatLog API 服务器来获取您的聊天记录。<br />
        请输入您的 API 服务器地址。
      </p>

      <!-- 表单 -->
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-position="top"
        class="api-config-step__form"
        @submit.prevent="handleTestConnection"
      >
        <el-form-item label="API Base URL" prop="apiBaseUrl">
          <el-input
            ref="apiUrlInputRef"
            v-model="formData.apiBaseUrl"
            size="large"
            placeholder="http://localhost:5030"
            clearable
            @blur="handleUrlBlur"
            @keyup.enter="handleTestConnection"
          >
            <template #prepend>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <!-- 帮助提示 -->
        <el-collapse class="api-config-step__help">
          <el-collapse-item title="💡 配置提示" name="help">
            <ul class="api-config-step__help-list">
              <li>本地开发通常使用 <code>http://localhost:5030</code></li>
              <li>生产环境使用您部署的服务器地址</li>
              <li>URL 必须以 http:// 或 https:// 开头</li>
              <li>不要包含末尾的斜杠</li>
            </ul>
            <div class="api-config-step__help-examples">
              <div class="api-config-step__help-example-title">常见配置示例：</div>
              <div
                v-for="example in examples"
                :key="example.url"
                class="api-config-step__help-example"
                @click="handleUseExample(example.url)"
              >
                <code>{{ example.url }}</code>
                <span class="api-config-step__help-example-label">{{ example.label }}</span>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>

        <!-- 测试状态 -->
        <div v-if="testStatus !== 'idle'" class="api-config-step__status">
          <!-- 测试中 -->
          <el-alert
            v-if="testStatus === 'testing'"
            type="info"
            :closable="false"
            show-icon
          >
            <template #title>
              <el-icon class="is-loading"><Loading /></el-icon>
              正在测试连接...
            </template>
          </el-alert>

          <!-- 测试成功 -->
          <el-alert
            v-else-if="testStatus === 'success'"
            type="success"
            :closable="false"
            show-icon
          >
            <template #title>✓ 连接成功！</template>
            <template #default>
              API 服务器连接正常，可以继续下一步。
            </template>
          </el-alert>

          <!-- 测试失败 -->
          <el-alert
            v-else-if="testStatus === 'error'"
            type="error"
            :closable="false"
            show-icon
          >
            <template #title>连接失败</template>
            <template #default>
              <div class="api-config-step__error">
                <div class="api-config-step__error-message">{{ testError }}</div>
                <div class="api-config-step__error-suggestions">
                  <div class="api-config-step__error-title">排查建议：</div>
                  <ul>
                    <li>检查 URL 是否正确</li>
                    <li>检查服务器是否正在运行</li>
                    <li>检查网络连接是否正常</li>
                    <li>检查防火墙设置</li>
                  </ul>
                </div>
              </div>
            </template>
          </el-alert>
        </div>

        <!-- 按钮组 -->
        <div class="api-config-step__actions">
          <el-button size="large" @click="handlePrev">
            <el-icon><ArrowLeft /></el-icon>
            上一步
          </el-button>
          <el-button
            size="large"
            :loading="testStatus === 'testing'"
            @click="handleTestConnection"
          >
            <el-icon v-if="testStatus !== 'testing'"><Connection /></el-icon>
            测试连接
          </el-button>
          <el-button
            ref="nextButtonRef"
            type="primary"
            size="large"
            :disabled="!canProceed"
            @click="handleNext"
          >
            下一步
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Link,
  Loading,
  Connection,
  ArrowLeft,
  ArrowRight,
} from '@element-plus/icons-vue'

interface Props {
  modelValue: string
  testStatus: 'idle' | 'testing' | 'success' | 'error'
  testError: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  prev: []
  next: []
  test: []
}>()

const formRef = ref<FormInstance>()
const nextButtonRef = ref<InstanceType<typeof import('element-plus')['ElButton']>>()
const apiUrlInputRef = ref<InstanceType<typeof import('element-plus')['ElInput']>>()
const formData = reactive({
  apiBaseUrl: props.modelValue,
})

// 配置示例
const examples = [
  { url: 'http://localhost:5030', label: '本地开发' },
  { url: 'http://192.168.1.100:5030', label: '局域网' },
  { url: 'https://api.example.com', label: '生产环境' },
]

// 表单验证规则
const rules: FormRules = {
  apiBaseUrl: [
    { required: true, message: '请输入 API 地址', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: 'URL 必须以 http:// 或 https:// 开头',
      trigger: 'blur',
    },
  ],
}

// 是否可以继续
const canProceed = computed(() => {
  return props.testStatus === 'success' && formData.apiBaseUrl
})

// 监听 props 变化
watch(
  () => props.modelValue,
  (newValue) => {
    formData.apiBaseUrl = newValue
  }
)

// 监听表单变化，同步到父组件
watch(
  () => formData.apiBaseUrl,
  (newValue) => {
    emit('update:modelValue', newValue)
  }
)

// 监听测试状态，成功后自动聚焦到"下一步"按钮
watch(
  () => props.testStatus,
  async (newStatus) => {
    if (newStatus === 'success') {
      await nextTick()
      nextButtonRef.value?.$el?.focus()
    }
  }
)

// 页面加载时自动聚焦 API URL 输入框
onMounted(async () => {
  await nextTick()
  apiUrlInputRef.value?.focus()
})

/**
 * URL 失焦时规范化
 */
const handleUrlBlur = () => {
  if (formData.apiBaseUrl) {
    // 去除尾部斜杠
    formData.apiBaseUrl = formData.apiBaseUrl.replace(/\/$/, '')
  }
}

/**
 * 使用示例配置
 */
const handleUseExample = (url: string) => {
  formData.apiBaseUrl = url
  ElMessage.success('已填充示例配置')
}

/**
 * 测试连接
 */
const handleTestConnection = async () => {
  // 验证表单
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  emit('test')
}

/**
 * 上一步
 */
const handlePrev = () => {
  emit('prev')
}

/**
 * 下一步
 */
const handleNext = () => {
  if (!canProceed.value) {
    ElMessage.warning('请先测试 API 连接')
    return
  }
  emit('next')
}
</script>

<style scoped lang="scss">
.api-config-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  padding: 40px 20px;

  &__content {
    max-width: 600px;
    width: 100%;
  }

  &__title {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 16px 0;
    text-align: center;
  }

  &__description {
    font-size: 16px;
    color: #606266;
    line-height: 1.6;
    text-align: center;
    margin: 0 0 32px 0;
  }

  &__form {
    margin-top: 24px;
  }

  &__help {
    margin: 16px 0 24px 0;
    border: none;
    background: #f5f7fa;
    border-radius: 8px;

    :deep(.el-collapse-item__header) {
      background: transparent;
      border: none;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #606266;
    }

    :deep(.el-collapse-item__wrap) {
      border: none;
      background: transparent;
    }

    :deep(.el-collapse-item__content) {
      padding: 0 16px 16px 16px;
    }
  }

  &__help-list {
    margin: 0;
    padding-left: 20px;
    color: #606266;
    font-size: 14px;
    line-height: 1.8;

    li {
      margin-bottom: 8px;
    }

    code {
      background: #e6e8eb;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      color: #303133;
    }
  }

  &__help-examples {
    margin-top: 16px;
  }

  &__help-example-title {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 12px;
  }

  &__help-example {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: white;
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary, #409eff);
      background: #ecf5ff;
    }

    code {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      color: #303133;
      flex: 1;
    }

    &-label {
      font-size: 12px;
      color: #909399;
      margin-left: 12px;
    }
  }

  &__status {
    margin: 24px 0;

    .el-alert {
      :deep(.el-alert__title) {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
      }
    }
  }

  &__error {
    font-size: 14px;

    &-message {
      margin-bottom: 12px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
    }

    &-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        margin-bottom: 4px;
        line-height: 1.6;
      }
    }
  }

  &__actions {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 32px;

    .el-button {
      flex: 1;
      min-height: 44px;
    }
  }
}

@media (max-width: 768px) {
  .api-config-step {
    padding: 20px;
    min-height: 400px;

    &__title {
      font-size: 22px;
    }

    &__description {
      font-size: 14px;
      margin-bottom: 24px;
    }

    &__actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
