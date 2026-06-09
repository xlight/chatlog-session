<script setup lang="ts">
// Console 配置 Tab：全局 AI 设置 + Agent 默认配置 + 已配置会话列表

import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAIAgentStore } from '@/stores/ai/agent'
import { useSessionStore } from '@/stores/session'
import { ElMessage } from 'element-plus'
import { Connection, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import { listModels, testConnection } from '@/api/llm'
import type { ModelInfo } from '@/types/ai'
import type { AgentLevelPreset, SessionAgentConfig } from '@/types/ai/agent'
import { deriveLevelPreset } from '@/stores/ai/agent'
import SessionAgentConfigDialog from '@/components/chat/SessionAgentConfigDialog.vue'

const settingsStore = useSettingsStore()
const agentStore = useAIAgentStore()
const sessionStore = useSessionStore()

const isLoading = ref(false)
const modelOptions = ref<ModelInfo[]>([])
const loadingModels = ref(false)

// 会话配置编辑弹窗
const editingSession = ref<{ id: string; name: string } | null>(null)
const showEditDialog = ref(false)

const defaultPreset = computed(() => agentStore.persistedConfig.defaults.levelPreset)
const isDefaultCustom = computed(() => defaultPreset.value === 'Custom')

const presetLabels: Record<AgentLevelPreset, string> = {
  L0: 'L0 - 完全禁用',
  L1: 'L1 - 仅旁观',
  L2: 'L2 - 草稿确认',
  L3: 'L3 - 关键词自动',
  L4: 'L4 - 智能代理',
  Custom: '自定义',
}

const presetColors: Record<AgentLevelPreset, string> = {
  L0: '#c0c4cc',
  L1: '#e6a23c',
  L2: '#409eff',
  L3: '#67c23a',
  L4: '#9b59b6',
  Custom: '#f56c6c',
}

const presetDescriptions: Record<AgentLevelPreset, string> = {
  L0: '禁止所有 Agent 行为',
  L1: '仅旁观分析会话，不自动回复',
  L2: '旁观分析 + 生成草稿需确认后发送',
  L3: '旁观分析 + 关键词监测 + 自动回复',
  L4: '旁观分析 + 主动观察并自动回复',
  Custom: '手动配置所有选项',
}

function handleDefaultPresetChange(preset: AgentLevelPreset) {
  agentStore.updateDefaultLevelPreset(preset)
}

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

/** 已覆盖默认配置的会话列表 */
const configuredSessions = computed(() => {
  const overrides: Array<{ id: string; name: string; preset: AgentLevelPreset; config: SessionAgentConfig }> = []
  for (const [sid, config] of Object.entries(agentStore.sessionConfigs)) {
    const session = sessionStore.sessions.find((s) => s.id === sid)
    overrides.push({
      id: sid,
      name: session?.name ?? session?.talkerName ?? sid,
      preset: deriveLevelPreset(config),
      config,
    })
  }
  return overrides
})

function openEdit(sessionId: string, name: string) {
  editingSession.value = { id: sessionId, name }
  showEditDialog.value = true
}

function handleDeleteConfig(sessionId: string) {
  agentStore.clearSessionConfig(sessionId)
  ElMessage.success('已清除该会话的配置覆盖')
}
</script>

<template>
  <div class="console-config">
    <h2 class="page-title">Agent 配置</h2>

    <!-- 全局 AI 设置 -->
    <el-card class="config-card" shadow="never">
      <template #header>
        <span>全局 AI 设置</span>
      </template>
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
          <div class="model-row">
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
          </div>
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

    <!-- Agent 默认配置 -->
    <el-card class="config-card" shadow="never">
      <template #header>
        <span>Agent 默认配置</span>
      </template>
      <el-form label-position="top" class="config-form">
        <el-form-item label="默认预设等级">
          <el-select
            :model-value="defaultPreset"
            @update:model-value="handleDefaultPresetChange"
            style="width: 240px"
          >
            <el-option
              v-for="(label, key) in presetLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
          <span v-if="!isDefaultCustom" class="form-hint">{{ presetDescriptions[defaultPreset] }}</span>
        </el-form-item>

        <el-form-item label="默认允许的操作">
          <el-checkbox-group
            :model-value="agentStore.persistedConfig.defaults.allowedActions"
            @update:model-value="agentStore.setDefaultActions($event)"
          >
            <el-checkbox value="analyze">分析</el-checkbox>
            <el-checkbox value="draft_reply">回复</el-checkbox>
            <el-checkbox value="ask_ai">AI 询问</el-checkbox>
            <el-checkbox value="summarize">摘要</el-checkbox>
            <el-checkbox value="extract_todos">待办</el-checkbox>
            <el-checkbox value="profile">画像</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <template v-if="isDefaultCustom">
        <el-divider content-position="left">旁观模式 (Observer)</el-divider>

        <el-form-item label="默认启用">
          <el-switch
            :model-value="agentStore.persistedConfig.defaults.observerEnabled"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, observerEnabled: $event },
              }
            "
          />
        </el-form-item>
        <el-form-item label="分析间隔（秒）">
          <el-input-number
            :model-value="agentStore.persistedConfig.defaults.observerIntervalSeconds"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, observerIntervalSeconds: $event },
              }
            "
            :min="60"
            :max="3600"
            :step="30"
          />
        </el-form-item>
        <el-form-item label="最少新消息">
          <el-input-number
            :model-value="agentStore.persistedConfig.defaults.observerMinNewMessages"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, observerMinNewMessages: $event },
              }
            "
            :min="1"
            :max="100"
          />
        </el-form-item>

        <el-form-item label="默认分析后回复">
          <el-switch
            :model-value="agentStore.persistedConfig.defaults.observerAutoReply"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, observerAutoReply: $event },
              }
            "
          />
        </el-form-item>
        <el-form-item label="默认最多回复数">
          <el-input-number
            :model-value="agentStore.persistedConfig.defaults.observerAutoReplyCount"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, observerAutoReplyCount: $event },
              }
            "
            :min="1"
            :max="10"
          />
        </el-form-item>

        <el-divider content-position="left">关键词监测 (Keyword Monitor)</el-divider>

        <el-form-item label="默认启用">
          <el-switch
            :model-value="agentStore.persistedConfig.defaults.keywordEnabled"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, keywordEnabled: $event },
              }
            "
          />
        </el-form-item>
        <el-form-item label="默认关键词">
          <el-input
            :model-value="agentStore.persistedConfig.defaults.keywordMatchPatterns.join(', ')"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: {
                  ...agentStore.persistedConfig.defaults,
                  keywordMatchPatterns: $event.split(',').map((s: string) => s.trim()).filter(Boolean),
                },
              }
            "
            placeholder="逗号分隔多个关键词"
          />
        </el-form-item>

        </template>

        <el-divider content-position="left">回复限制</el-divider>

        <el-form-item label="最大自动回复次数">
          <el-input-number
            :model-value="agentStore.persistedConfig.defaults.maxAutoReplies"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, maxAutoReplies: $event },
              }
            "
            :min="0"
            :step="1"
          />
          <span class="form-hint">0 表示无限制</span>
        </el-form-item>
        <el-form-item label="冷却时间（毫秒）">
          <el-input-number
            :model-value="agentStore.persistedConfig.defaults.cooldownMs"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, cooldownMs: $event },
              }
            "
            :min="0"
            :step="1000"
            controls-position="right"
          />
          <span class="form-hint">两次自动回复之间的最小间隔</span>
        </el-form-item>
        <el-form-item label="默认 Prompt 模板">
          <el-input
            :model-value="agentStore.persistedConfig.defaults.promptTemplateId"
            @update:model-value="
              agentStore.persistedConfig = {
                ...agentStore.persistedConfig,
                defaults: { ...agentStore.persistedConfig.defaults, promptTemplateId: $event },
              }
            "
            placeholder="builtin-reply"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 已配置的会话 -->
    <el-card class="config-card" shadow="never">
      <template #header>
        <span>已配置的会话（{{ configuredSessions.length }}）</span>
      </template>
      <div v-if="configuredSessions.length === 0" class="empty-hint">
        暂无会话覆盖配置，请在聊天头部菜单中进行会话级配置
      </div>
      <div v-else class="session-config-list">
        <div
          v-for="item in configuredSessions"
          :key="item.id"
          class="session-config-item"
        >
          <div class="session-info">
            <span class="session-name">{{ item.name }}</span>
            <el-tag size="small" :style="{ color: '#fff', backgroundColor: presetColors[item.preset], border: 'none' }">
              {{ item.preset }}
            </el-tag>
            <span v-if="item.config.observer.enabled" class="feature-tag">旁观</span>
            <span v-if="item.config.keywordMonitor.enabled" class="feature-tag">关键词</span>
          </div>
          <div class="session-actions">
            <el-button text size="small" :icon="Edit" @click="openEdit(item.id, item.name)">
              编辑
            </el-button>
            <el-button text size="small" type="danger" :icon="Delete" @click="handleDeleteConfig(item.id)">
              清除
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 会话配置编辑弹窗 -->
    <SessionAgentConfigDialog
      v-if="editingSession"
      v-model="showEditDialog"
      :session-id="editingSession.id"
      :session-name="editingSession.name"
      @update:model-value="!$event && (editingSession = null)"
    />
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
  margin-top: 16px;

  &:first-of-type {
    margin-top: 0;
  }
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

.model-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-select {
  width: 320px;
  max-width: 100%;
}

.reload-btn {
  flex-shrink: 0;
}

.shortcut-input {
  width: 240px;
  max-width: 100%;
}

.empty-hint {
  padding: 16px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.session-config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
}

.session-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;

  .session-name {
    font-weight: 500;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .feature-tag {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.session-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
