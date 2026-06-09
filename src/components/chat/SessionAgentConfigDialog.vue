<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAIAgentStore, deriveLevelPreset, applyLevelPreset } from '@/stores/ai/agent'
import type { AgentLevelPreset } from '@/types/ai/agent'

const props = defineProps<{
  modelValue: boolean
  sessionId: string
  sessionName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const agentStore = useAIAgentStore()

// ==================== 响应式配置（从 store 读取，UI 自动跟随 store 变化） ====================
const effectiveConfig = computed(() => agentStore.getEffectiveConfig(props.sessionId))

const sendPermission = computed(() => effectiveConfig.value.sendPermission)
const derivedPreset = computed(() => deriveLevelPreset(effectiveConfig.value))
const forceCustomMode = ref(false)
const currentPreset = computed(() => forceCustomMode.value ? 'Custom' as AgentLevelPreset : derivedPreset.value)
const isCustomMode = computed(() => currentPreset.value === 'Custom')

// 字段可见性：按 preset 条件显示
const showObserverParams = computed(() => {
  const p = derivedPreset.value
  return isCustomMode.value || ['L1', 'L2', 'L3', 'L4'].includes(p)
})
const showCooldown = computed(() => {
  const p = derivedPreset.value
  return isCustomMode.value || ['L2', 'L3', 'L4'].includes(p)
})
const showKeywordPatterns = computed(() => derivedPreset.value === 'L3')
const showAutoReplyCount = computed(() => derivedPreset.value === 'L4')
const observerEnabled = computed(() => effectiveConfig.value.observer.enabled)
const observerInterval = computed(() => effectiveConfig.value.observer.intervalSeconds)
const observerMinNewMessages = computed(() => effectiveConfig.value.observer.minNewMessages)
const observerAutoReply = computed(() => effectiveConfig.value.observer.autoReply)
const keywordEnabled = computed(() => effectiveConfig.value.keywordMonitor.enabled)
const maxAutoReplies = computed(() => effectiveConfig.value.maxAutoReplies)
const cooldownMs = computed(() => effectiveConfig.value.cooldownMs)
const promptTemplateId = computed(() => effectiveConfig.value.promptTemplateId ?? '')

// ==================== keywordPatterns 特殊处理（文本输入，本地 ref + onBlur 提交） ====================
const keywordPatterns = ref('')

/** 对话框打开时从 store 加载 keyword patterns 到本地 ref */
function loadKeywordPatterns() {
  keywordPatterns.value = effectiveConfig.value.keywordMonitor.matchPatterns.join(', ')
}

/** 用户输入时实时更新本地 ref + store（解析后的数组） */
function handlePatternsInput(val: string) {
  keywordPatterns.value = val // 保持本地显示原文
  const patterns = val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const current = agentStore.getEffectiveConfig(props.sessionId).keywordMonitor
  agentStore.setSessionConfig(props.sessionId, {
    keywordMonitor: { ...current, matchPatterns: patterns },
  })
}

// ==================== 写入操作 ====================

function updateField<K extends keyof import('@/types/ai/agent').SessionAgentConfig>(
  field: K,
  value: import('@/types/ai/agent').SessionAgentConfig[K],
) {
  agentStore.setSessionConfig(props.sessionId, { [field]: value })
}

function updateObserver<K extends keyof import('@/types/ai/agent').SessionAgentConfig['observer']>(
  field: K,
  value: import('@/types/ai/agent').SessionAgentConfig['observer'][K],
) {
  const config = agentStore.getEffectiveConfig(props.sessionId)
  agentStore.setSessionConfig(props.sessionId, {
    observer: { ...config.observer, [field]: value },
  })
}

function updateKeyword<K extends keyof import('@/types/ai/agent').SessionAgentConfig['keywordMonitor']>(
  field: K,
  value: import('@/types/ai/agent').SessionAgentConfig['keywordMonitor'][K],
) {
  const config = agentStore.getEffectiveConfig(props.sessionId)
  agentStore.setSessionConfig(props.sessionId, {
    keywordMonitor: { ...config.keywordMonitor, [field]: value },
  })
}

// ==================== 重置 & 关闭 ====================

function handleReset() {
  agentStore.clearSessionConfig(props.sessionId)
  loadKeywordPatterns()
  ElMessage.success('已恢复默认配置')
}

function handleClose() {
  emit('update:modelValue', false)
}

function handleOpened() {
  loadKeywordPatterns()
}

// 预设选项
const presetLabels: Record<AgentLevelPreset, string> = {
  L0: 'L0 - 完全禁用',
  L1: 'L1 - 仅旁观',
  L2: 'L2 - 草稿确认',
  L3: 'L3 - 关键词自动',
  L4: 'L4 - 智能代理',
  Custom: '自定义',
}

const presetDescriptions: Record<AgentLevelPreset, string> = {
  L0: '禁止所有 Agent 行为',
  L1: '仅旁观分析会话，不自动回复',
  L2: '旁观分析 + 生成草稿需确认后发送',
  L3: '旁观分析 + 关键词监测 + 自动回复',
  L4: '旁观分析 + 主动观察并自动回复',
  Custom: '手动配置所有选项',
}

const presetColors: Record<AgentLevelPreset, string> = {
  L0: '#c0c4cc',
  L1: '#e6a23c',
  L2: '#409eff',
  L3: '#67c23a',
  L4: '#9b59b6',
  Custom: '#f56c6c',
}

function handlePresetChange(preset: AgentLevelPreset) {
  if (preset === 'Custom') {
    forceCustomMode.value = true
    return
  }
  forceCustomMode.value = false
  const patch = applyLevelPreset(preset)
  agentStore.setSessionConfig(props.sessionId, patch)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="Agent 设置"
    width="480px"
    @close="handleClose"
    @opened="handleOpened"
  >
    <el-form label-width="120px" label-position="left" size="small">
      <el-divider content-position="left">预设等级</el-divider>

      <el-form-item label="等级">
        <el-select
          :model-value="currentPreset"
          @update:model-value="handlePresetChange"
          style="width: 100%"
        >
          <el-option
            v-for="(label, key) in presetLabels"
            :key="key"
            :label="label"
            :value="key"
          >
            <span>
              <span :style="{ color: presetColors[key as AgentLevelPreset], fontWeight: 600 }">{{ key }}</span>
              <span style="margin-left: 4px">{{ label.slice(key.length + 2) }}</span>
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item v-if="!isCustomMode" label="说明">
        <span style="font-size: 12px; color: var(--el-text-color-secondary)">
          {{ presetDescriptions[currentPreset] }}
        </span>
      </el-form-item>

      <!-- Custom 模式：显示底层独立字段开关 -->
      <template v-if="isCustomMode">
        <el-divider content-position="left">基础配置</el-divider>

        <el-form-item label="发送权限">
          <el-select
            :model-value="sendPermission"
            @update:model-value="updateField('sendPermission', $event)"
            style="width: 100%"
          >
            <el-option label="禁止" value="forbidden" />
            <el-option label="草稿确认" value="draft_confirm" />
            <el-option label="自动发送" value="auto" />
          </el-select>
        </el-form-item>
        <el-form-item label="旁观分析">
          <el-switch
            :model-value="observerEnabled"
            @update:model-value="updateObserver('enabled', $event)"
          />
        </el-form-item>
        <el-form-item label="关键词监测">
          <el-switch
            :model-value="keywordEnabled"
            @update:model-value="updateKeyword('enabled', $event)"
          />
        </el-form-item>
        <el-form-item label="分析后回复">
          <el-switch
            :model-value="observerAutoReply"
            @update:model-value="updateObserver('autoReply', $event)"
          />
        </el-form-item>
      </template>

      <!-- L1+ : 分析间隔、最少新消息、最大回复次数、Prompt 覆盖 -->
      <template v-if="showObserverParams">
        <el-divider content-position="left">分析参数</el-divider>

        <el-form-item label="分析间隔（秒）">
          <el-input-number
            :model-value="observerInterval"
            @update:model-value="updateObserver('intervalSeconds', $event)"
            :min="60"
            :max="3600"
            :step="30"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="最少新消息">
          <el-input-number
            :model-value="observerMinNewMessages"
            @update:model-value="updateObserver('minNewMessages', $event)"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="最大回复次数">
          <el-input-number
            :model-value="maxAutoReplies"
            @update:model-value="updateField('maxAutoReplies', $event)"
            :min="0"
            :max="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="Prompt 覆盖">
          <el-input
            :model-value="promptTemplateId"
            @update:model-value="updateField('promptTemplateId', $event || undefined)"
            placeholder="留空使用全局默认"
          />
        </el-form-item>
      </template>

      <!-- L2+ : 冷却时间 -->
      <template v-if="showCooldown">
        <el-divider content-position="left">回复控制</el-divider>

        <el-form-item label="冷却时间（ms）">
          <el-input-number
            :model-value="cooldownMs"
            @update:model-value="updateField('cooldownMs', $event)"
            :min="0"
            :step="1000"
            style="width: 100%"
          />
        </el-form-item>
      </template>

      <!-- L3 : 关键词列表 -->
      <template v-if="showKeywordPatterns">
        <el-divider content-position="left">关键词监测</el-divider>

        <el-form-item label="关键词列表">
          <el-input
            :model-value="keywordPatterns"
            @update:model-value="handlePatternsInput"
            placeholder="逗号分隔多个关键词"
          />
        </el-form-item>
      </template>

      <!-- L4 : 分析后回复数 -->
      <template v-if="showAutoReplyCount">
        <el-divider content-position="left">自动回复</el-divider>

        <el-form-item label="每次分析回复数">
          <el-input-number
            :model-value="effectiveConfig.observer.autoReplyCount"
            @update:model-value="updateObserver('autoReplyCount', $event)"
            :min="1"
            :max="10"
            style="width: 100%"
          />
        </el-form-item>
      </template>

      <!-- Custom + keyword enabled : 关键词列表 -->
      <template v-if="isCustomMode && keywordEnabled">
        <el-divider content-position="left">关键词监测</el-divider>

        <el-form-item label="关键词列表">
          <el-input
            :model-value="keywordPatterns"
            @update:model-value="handlePatternsInput"
            placeholder="逗号分隔多个关键词"
          />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="handleReset">恢复默认</el-button>
      <el-button type="primary" @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>
