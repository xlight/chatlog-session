<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAIAgentStore } from '@/stores/ai/agent'
import type { SendPermissionLevel } from '@/types/ai/agent'

const props = defineProps<{
  modelValue: boolean
  sessionId: string
  sessionName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const agentStore = useAIAgentStore()

const sendPermission = ref<SendPermissionLevel>('draft_confirm')
const observerEnabled = ref(false)
const observerInterval = ref(300)
const observerMinNewMessages = ref(5)
const keywordEnabled = ref(false)
const keywordPatterns = ref('')
const maxAutoReplies = ref(0)
const cooldownMs = ref(5000)
const promptTemplateId = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      loadConfig()
    }
  },
)

function loadConfig() {
  const config = agentStore.getEffectiveConfig(props.sessionId)
  sendPermission.value = config.sendPermission
  observerEnabled.value = config.observer.enabled
  observerInterval.value = config.observer.intervalSeconds
  observerMinNewMessages.value = config.observer.minNewMessages
  keywordEnabled.value = config.keywordMonitor.enabled
  keywordPatterns.value = config.keywordMonitor.matchPatterns.join(', ')
  maxAutoReplies.value = config.maxAutoReplies
  cooldownMs.value = config.cooldownMs
  promptTemplateId.value = config.promptTemplateId ?? ''
}

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

function handlePatternsChange(val: string) {
  const patterns = val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  updateKeyword('matchPatterns', patterns)
}

function handleReset() {
  agentStore.clearSessionConfig(props.sessionId)
  loadConfig()
  ElMessage.success('已恢复默认配置')
}

function handleClose() {
  emit('update:modelValue', false)
}

const permissionOptions = [
  { value: 'forbidden' as const, label: '禁止' },
  { value: 'draft_confirm' as const, label: '草稿确认' },
  { value: 'send_cancellable' as const, label: '可取消发送' },
  { value: 'full_auto' as const, label: '全自动' },
]
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="Agent 设置"
    width="480px"
    @close="handleClose"
  >
    <el-form label-width="120px" label-position="left" size="small">
      <el-divider content-position="left">发送权限</el-divider>

      <el-form-item label="发送权限">
        <el-select
          :model-value="sendPermission"
          @update:model-value="updateField('sendPermission', $event)"
          style="width: 100%"
        >
          <el-option
            v-for="opt in permissionOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">旁观模式 (Observer)</el-divider>

      <el-form-item label="启用">
        <el-switch
          :model-value="observerEnabled"
          @update:model-value="updateObserver('enabled', $event)"
        />
      </el-form-item>
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

      <el-divider content-position="left">关键词监测</el-divider>

      <el-form-item label="启用">
        <el-switch
          :model-value="keywordEnabled"
          @update:model-value="updateKeyword('enabled', $event)"
        />
      </el-form-item>
      <el-form-item label="关键词列表">
        <el-input
          :model-value="keywordPatterns"
          @update:model-value="handlePatternsChange"
          placeholder="逗号分隔多个关键词"
        />
      </el-form-item>

      <el-divider content-position="left">回复设置</el-divider>

      <el-form-item label="最大回复次数">
        <el-input-number
          :model-value="maxAutoReplies"
          @update:model-value="updateField('maxAutoReplies', $event)"
          :min="0"
          :max="100"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="冷却时间（ms）">
        <el-input-number
          :model-value="cooldownMs"
          @update:model-value="updateField('cooldownMs', $event)"
          :min="0"
          :step="1000"
          style="width: 100%"
        />
      </el-form-item>

      <el-divider content-position="left">高级</el-divider>

      <el-form-item label="Prompt 覆盖">
        <el-input
          :model-value="promptTemplateId"
          @update:model-value="updateField('promptTemplateId', $event || undefined)"
          placeholder="留空使用全局默认"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleReset">恢复默认</el-button>
      <el-button type="primary" @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>
