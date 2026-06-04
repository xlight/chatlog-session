<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { testConnection, inferProviderName, resetClient, listModels } from '@/api/llm'
import type { AISettingsData } from '@/stores/settings'
import type { ModelInfo } from '@/types/ai'

const props = defineProps<{
  modelValue: AISettingsData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AISettingsData]
}>()

const testing = ref(false)
const testResult = ref<'success' | 'failure' | 'idle'>('idle')
const testMessage = ref('')
const testLatency = ref(0)
const models = ref<ModelInfo[]>([])
const loadingModels = ref(false)
const showApiKey = ref(false)

const updateValue = <K extends keyof AISettingsData>(
  key: K,
  value: AISettingsData[K]
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

watch(
  () => [props.modelValue.llmBaseUrl, props.modelValue.llmApiKey],
  () => {
    resetClient()
    testResult.value = 'idle'
  }
)

async function handleTestConnection() {
  if (!props.modelValue.llmApiKey) {
    ElMessage.warning('请先填写 API Key')
    return
  }

  testing.value = true
  testResult.value = 'idle'
  testMessage.value = ''
  testLatency.value = 0
  models.value = []

  try {
    resetClient()
    const result = await testConnection()
    if (result.success) {
      testResult.value = 'success'
      testMessage.value = `连接成功，共 ${result.modelCount} 个模型`
      testLatency.value = result.latencyMs ?? 0
      models.value = result.models ?? []
      ElMessage.success(`连接成功！延迟 ${testLatency.value}ms`)
    } else {
      testResult.value = 'failure'
      testMessage.value = result.error ?? '未知错误'
      ElMessage.error(`连接失败: ${testMessage.value}`)
    }
  } catch (err) {
    testResult.value = 'failure'
    testMessage.value = err instanceof Error ? err.message : '未知错误'
    ElMessage.error(`连接失败: ${testMessage.value}`)
  } finally {
    testing.value = false
  }
}

async function handleLoadModels() {
  if (!props.modelValue.llmApiKey) {
    ElMessage.warning('请先填写 API Key')
    return
  }
  loadingModels.value = true
  try {
    resetClient()
    const list = await listModels()
    models.value = list
    if (list.length === 0) {
      ElMessage.warning('该服务未返回任何模型')
    } else {
      ElMessage.success(`已加载 ${list.length} 个模型`)
    }
  } catch (err) {
    ElMessage.error(
      `加载模型失败: ${err instanceof Error ? err.message : '未知错误'}`
    )
  } finally {
    loadingModels.value = false
  }
}

async function handleEnabledChange(val: string | number | boolean) {
  const enabled = Boolean(val)

  if (enabled && !props.modelValue.privacyAcknowledged) {
    const provider = inferProviderName(props.modelValue.llmBaseUrl)
    try {
      await ElMessageBox.confirm(
        `启用 AI 助手后，聊天内容将被发送给 ${provider} 进行处理。\n\n请确认你了解并接受此数据传输。`,
        'AI 数据隐私提示',
        {
          type: 'warning',
          confirmButtonText: '我已了解，启用',
          cancelButtonText: '取消',
        }
      )
      emit('update:modelValue', {
        ...props.modelValue,
        enabled: true,
        privacyAcknowledged: true,
      })
    } catch {
      // 用户取消
    }
  } else {
    updateValue('enabled', enabled)
  }
}

const toolsSupported = models.value.some(m => m.capabilities.tools === true)

const providerName = () => inferProviderName(props.modelValue.llmBaseUrl)
</script>

<template>
  <div class="setting-section">
    <div class="section-header">
      <h3>AI 助手设置</h3>
      <p>配置 OpenAI 兼容的 LLM 服务（直连或经 wechat-butler 代理）</p>
    </div>

    <el-form label-position="left" label-width="120px">
      <el-form-item label="启用 AI">
        <el-switch
          :model-value="modelValue.enabled"
          @update:model-value="handleEnabledChange"
        />
        <el-text type="info" size="small" style="margin-left: 12px">
          启用后聊天界面显示 AI 面板
        </el-text>
      </el-form-item>

      <el-divider />

      <el-form-item label="Base URL">
        <el-input
          :model-value="modelValue.llmBaseUrl"
          placeholder="https://api.deepseek.com/v1"
          style="width: 480px"
          @update:model-value="(val: string) => updateValue('llmBaseUrl', val)"
        >
          <template #prepend>
            <el-icon><Link /></el-icon>
          </template>
        </el-input>
        <el-text type="info" size="small" style="margin-left: 12px">
          当前 Provider: <strong>{{ providerName() }}</strong>
        </el-text>
      </el-form-item>

      <el-form-item label="API Key">
        <el-input
          :model-value="modelValue.llmApiKey"
          :type="showApiKey ? 'text' : 'password'"
          placeholder="sk-..."
          style="width: 480px"
          show-password
          @update:model-value="(val: string) => updateValue('llmApiKey', val)"
        >
          <template #prepend>
            <el-icon><Key /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="默认模型">
        <el-input
          :model-value="modelValue.llmDefaultModel"
          placeholder="deepseek-chat"
          style="width: 320px"
          @update:model-value="(val: string) => updateValue('llmDefaultModel', val)"
        />
        <el-button
          link
          type="primary"
          :loading="loadingModels"
          style="margin-left: 8px"
          @click="handleLoadModels"
        >
          从服务加载
        </el-button>
      </el-form-item>

      <el-form-item v-if="models.length > 0" label="可用模型">
        <el-select
          :model-value="modelValue.llmDefaultModel"
          placeholder="选择模型"
          style="width: 320px"
          @update:model-value="(val: string) => updateValue('llmDefaultModel', val)"
        >
          <el-option
            v-for="m in models"
            :key="m.id"
            :value="m.id"
            :label="m.id"
          />
        </el-select>
      </el-form-item>

      <el-divider />

      <el-form-item label="连接测试">
        <el-button
          type="primary"
          :loading="testing"
          @click="handleTestConnection"
        >
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <el-tag
          v-if="testResult !== 'idle'"
          :type="testResult === 'success' ? 'success' : 'danger'"
          effect="plain"
          style="margin-left: 12px"
        >
          {{ testMessage }}
          <span v-if="testLatency > 0">（{{ testLatency }}ms）</span>
        </el-tag>
      </el-form-item>

      <el-form-item v-if="testResult === 'success' && models.length > 0" label="能力">
        <el-tag
          v-if="toolsSupported"
          type="success"
          effect="plain"
          style="margin-right: 8px"
        >
          支持工具调用
        </el-tag>
        <el-tag
          v-else
          type="info"
          effect="plain"
          style="margin-right: 8px"
        >
          仅对话
        </el-tag>
        <el-text type="info" size="small">
          （能力信息来自后端 x-capabilities 扩展）
        </el-text>
      </el-form-item>
    </el-form>

    <el-alert title="隐私提示" type="warning" :closable="false" style="margin-top: 20px">
      <template #default>
        <div style="line-height: 1.8">
          <p>• 启用 AI 后，聊天内容和已投喂的上下文将发送给 <strong>{{ providerName() }}</strong></p>
          <p>• 请勿在 AI 对话中输入密码、Token 等敏感信息</p>
          <p>• API Key 仅保存在本地浏览器 localStorage，不上传服务器</p>
          <p>• 切换 Provider 时需重新进行隐私确认</p>
        </div>
      </template>
    </el-alert>

    <el-alert
      title="兼容说明"
      type="info"
      :closable="false"
      style="margin-top: 12px"
    >
      <template #default>
        <div style="line-height: 1.8">
          <p>• 支持所有 OpenAI Chat Completions 兼容服务：DeepSeek、OpenAI、Moonshot Kimi、智谱 GLM、本地 Ollama 等</p>
          <p>• 直连时 baseURL 示例：<code>https://api.deepseek.com/v1</code></p>
          <p>• 经 wechat-butler 代理时 baseURL 示例：<code>http://127.0.0.1:8765/v1</code>（但ler 0.2.0+）</p>
        </div>
      </template>
    </el-alert>
  </div>
</template>
