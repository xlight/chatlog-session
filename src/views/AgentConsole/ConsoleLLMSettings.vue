<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { testConnection, inferProviderName, resetClient, listModels } from '@/api/llm'
import type { AISettingsData } from '@/stores/settings'
import type { ModelInfo } from '@/types/ai'
import { useSettingsStore } from '@/stores/settings'
import { Refresh } from '@element-plus/icons-vue'

const settingsStore = useSettingsStore()

const testing = ref(false)
const testResult = ref<'success' | 'failure' | 'idle'>('idle')
const testMessage = ref('')
const testLatency = ref(0)
const showApiKey = ref(false)

const updateValue = <K extends keyof AISettingsData>(
  key: K,
  value: AISettingsData[K]
) => {
  ;(settingsStore.ai as AISettingsData)[key] = value
}

watch(
  () => [settingsStore.ai.llmBaseUrl, settingsStore.ai.llmApiKey],
  () => {
    resetClient()
    testResult.value = 'idle'
  }
)

async function handleTestConnection() {
  if (!settingsStore.ai.llmApiKey) {
    ElMessage.warning('请先填写 API Key')
    return
  }

  testing.value = true
  testResult.value = 'idle'
  testMessage.value = ''
  testLatency.value = 0

  try {
    resetClient()
    const result = await testConnection()
    if (result.success) {
      testResult.value = 'success'
      testMessage.value = `连接成功，共 ${result.modelCount} 个模型`
      testLatency.value = result.latencyMs ?? 0
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

async function handleLoadModels(): Promise<ModelInfo[]> {
  if (!settingsStore.ai.llmApiKey) {
    ElMessage.warning('请先填写 API Key')
    return []
  }
  try {
    resetClient()
    const list = await listModels()
    if (list.length === 0) {
      ElMessage.warning('该服务未返回任何模型')
    } else {
      ElMessage.success(`已加载 ${list.length} 个模型`)
    }
    return list
  } catch (err) {
    ElMessage.error(
      `加载模型失败: ${err instanceof Error ? err.message : '未知错误'}`
    )
    return []
  }
}

const providerName = computed(() => inferProviderName(settingsStore.ai.llmBaseUrl))

/** 重新确认隐私授权：重置 acknowledged 后重新弹确认，用户再次点头 */
async function handleReconfirm() {
  settingsStore.resetPrivacyAcknowledgment()
  const provider = inferProviderName(settingsStore.ai.llmBaseUrl)
  try {
    await ElMessageBox.confirm(
      `启用 AI 助手后，聊天内容将被发送给 ${provider} 进行处理。\n\n请确认你了解并接受此数据传输。`,
      'AI 数据隐私提示',
      {
        type: 'warning',
        confirmButtonText: '我已了解',
        cancelButtonText: '取消',
      }
    )
    settingsStore.setAiEnabled(true, { acknowledged: true })
    ElMessage.success('已重新确认隐私授权')
  } catch {
    // 用户取消，保持已重置状态（下次启用时重新提示）
  }
}
</script>

<template>
  <el-form label-position="top" class="llm-settings-form">
    <el-form-item label="Base URL">
      <el-input
        :model-value="settingsStore.ai.llmBaseUrl"
        placeholder="https://api.deepseek.com/v1"
        style="width: 100%"
        @update:model-value="(val: string) => updateValue('llmBaseUrl', val)"
      >
        <template #prepend>
          <el-icon><Link /></el-icon>
        </template>
      </el-input>
      <el-text type="info" size="small">
        当前 Provider: <strong>{{ providerName }}</strong>
      </el-text>
    </el-form-item>

    <el-form-item label="API Key">
      <el-input
        :model-value="settingsStore.ai.llmApiKey"
        :type="showApiKey ? 'text' : 'password'"
        placeholder="sk-..."
        style="width: 100%"
        show-password
        @update:model-value="(val: string) => updateValue('llmApiKey', val)"
      >
        <template #prepend>
          <el-icon><Key /></el-icon>
        </template>
      </el-input>
    </el-form-item>

    <el-form-item>
      <el-button
        type="primary"
        :loading="testing"
        @click="handleTestConnection"
      >
        <el-icon><Connection /></el-icon>
        测试连接
      </el-button>
      <el-button :icon="Refresh" plain @click="handleLoadModels">
        从服务加载
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
  </el-form>

  <el-alert title="隐私提示" type="warning" :closable="false" style="margin-top: 4px">
    <template #default>
      <div style="line-height: 1.8">
        <p>• 启用 AI 后，聊天内容和已投喂的上下文将发送给 <strong>{{ providerName }}</strong></p>
        <p>• 请勿在 AI 对话中输入密码、Token 等敏感信息</p>
        <p>• API Key 仅保存在本地浏览器 localStorage，不上传服务器</p>
        <p>• 切换 Provider 时需重新进行隐私确认</p>
      </div>
    </template>
  </el-alert>

  <el-button link type="primary" style="margin-top: 8px" @click="handleReconfirm">
    重新确认隐私授权
  </el-button>
</template>

<style lang="scss" scoped>
.llm-settings-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}
</style>
