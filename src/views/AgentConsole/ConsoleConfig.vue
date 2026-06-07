<script setup lang="ts">
// Console 配置 Tab：Agent 全局设置（开关、默认模型、连接测试）
// 直接绑定到 settingsStore.ai，store 已做 persist

import { onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAIAgentStore } from '@/stores/ai/agent'
import { ElMessage } from 'element-plus'
import { Connection, Refresh } from '@element-plus/icons-vue'
import { listModels, testConnection } from '@/api/llm'
import type { ModelInfo } from '@/types/ai'

const settingsStore = useSettingsStore()
const agentStore = useAIAgentStore()

const isLoading = ref(false)
const modelOptions = ref<ModelInfo[]>([])
const loadingModels = ref(false)

// 挂载时拉取模型列表
onMounted(async () => {
  await loadModels()
})

async function loadModels() {
  loadingModels.value = true
  try {
    modelOptions.value = await listModels()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '加载模型列表失败'
    ElMessage.error(`加载模型失败：${msg}`)
    modelOptions.value = []
  } finally {
    loadingModels.value = false
  }
}

async function handleTestConnection() {
  isLoading.value = true
  try {
    const result = await testConnection()
    if (result.success) {
      const latency = result.latencyMs ? `（${result.latencyMs}ms）` : ''
      ElMessage.success(`连接成功，共 ${result.modelCount} 个模型${latency}`)
    } else {
      ElMessage.error(`连接失败：${result.error ?? '未知错误'}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误'
    ElMessage.error(`连接失败：${msg}`)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="console-config">
    <h2 class="page-title">Agent 配置</h2>

    <el-card class="config-card" shadow="never">
      <el-form label-position="top" class="config-form">
        <el-form-item label="启用 AI">
          <el-switch
            v-model="settingsStore.ai.enabled"
            active-text="开"
            inactive-text="关"
          />
          <span class="form-hint">
            关闭后所有 AI 对话与投喂功能不可用
          </span>
        </el-form-item>

        <el-form-item label="默认模型">
          <el-select
            v-model="settingsStore.ai.llmDefaultModel"
            placeholder="请选择默认模型"
            :loading="loadingModels"
            class="model-select"
            filterable
          >
            <el-option
              v-for="model in modelOptions"
              :key="model.id"
              :label="model.id"
              :value="model.id"
            />
          </el-select>
          <el-button
            :icon="Refresh"
            :loading="loadingModels"
            plain
            class="reload-btn"
            @click="loadModels"
          >
            刷新
          </el-button>
        </el-form-item>

        <el-form-item label="侧边栏显示">
          <el-switch
            v-model="settingsStore.ai.showConsoleInSidebar"
            active-text="显示"
            inactive-text="隐藏"
          />
          <span class="form-hint">
            控制侧边栏是否出现 AI Console 入口
          </span>
        </el-form-item>

        <el-form-item label="快捷键">
          <el-input
            model-value="Cmd/Ctrl+Shift+K"
            readonly
            disabled
            class="shortcut-input"
          />
          <span class="form-hint">全局唤起 AI Console（只读）</span>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :icon="Connection"
            :loading="isLoading"
            @click="handleTestConnection"
          >
            测试连接
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="config-card" shadow="never" style="margin-top: 16px">
      <template #header>
        <span>自动回复</span>
      </template>
      <el-form label-position="top" class="config-form">
        <el-form-item label="启用自动回复">
          <el-switch
            v-model="agentStore.config.enabled"
            active-text="开"
            inactive-text="关"
          />
          <span class="form-hint">
            开启后 Agent 将根据配置自动生成回复
          </span>
        </el-form-item>

        <el-form-item label="回复模式">
          <el-radio-group v-model="agentStore.config.mode">
            <el-radio value="draft">草稿模式</el-radio>
            <el-radio value="auto">自动发送</el-radio>
          </el-radio-group>
          <span class="form-hint">
            草稿模式需确认后发送，自动模式直接发送
          </span>
        </el-form-item>

        <el-form-item label="发送前确认">
          <el-switch
            v-model="agentStore.config.requireConfirm"
            active-text="需要"
            inactive-text="不需要"
            :disabled="agentStore.config.mode === 'auto'"
          />
          <span class="form-hint">
            草稿模式下是否需要手动确认发送
          </span>
        </el-form-item>

        <el-form-item label="最大自动回复次数">
          <el-input-number
            v-model="agentStore.config.maxAutoReplies"
            :min="0"
            :step="1"
            controls-position="right"
          />
          <span class="form-hint">
            0 表示无限制
          </span>
        </el-form-item>

        <el-form-item label="冷却时间（毫秒）">
          <el-input-number
            v-model="agentStore.config.cooldownMs"
            :min="0"
            :step="1000"
            controls-position="right"
          />
          <span class="form-hint">
            两次自动回复之间的最小间隔
          </span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.console-config {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
}

.config-card {
  max-width: 640px;
}

.config-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;
  }
}

.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.model-select {
  width: 320px;
  max-width: 100%;
}

.reload-btn {
  margin-left: 8px;
}

.shortcut-input {
  width: 240px;
  max-width: 100%;
}
</style>
