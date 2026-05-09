<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { sendmsgAPI } from '@/api/sendmsg'
import { useDisplayName } from './composables/useDisplayName'
import type { Session } from '@/types/session'

const props = defineProps<{
  session: Session
}>()

const emit = defineEmits<{
  refresh: []
}>()

// ==================== 状态 ====================

type SendState = 'idle' | 'sending' | 'queued' | 'polling' | 'success' | 'error'

const messageText = ref('')
const sendState = ref<SendState>('idle')
const errorMessage = ref('')
const serviceAvailable = ref(true)
const wechatLoggedIn = ref(true)
const serviceStatusMessage = ref('')

// 轮询管理
const pollingTimers = ref<Map<number, ReturnType<typeof setInterval>>>(new Map())
const pollingStartTimes = ref<Map<number, number>>(new Map())
const POLLING_INTERVAL = 1000
const POLLING_TIMEOUT = 30000

// ==================== contact_name 解析 ====================

// 复用 useDisplayName composable，与 ChatHeader 保持一致
const { displayName } = useDisplayName({
  id: computed(() => props.session?.talker),
  defaultName: computed(() => props.session?.name),
})

const contactName = computed(() => {
  const name = displayName.value
  // wxid 格式不是可读名称，wechat-sendmsg 不接受
  if (!name || name.startsWith('wxid_')) return ''
  return name
})

const canSend = computed(() => {
  return (
    sendState.value === 'idle' ||
    sendState.value === 'success' ||
    sendState.value === 'error'
  ) && serviceAvailable.value &&
    wechatLoggedIn.value &&
    contactName.value !== ''
})

const contactNameWarning = computed(() => {
  if (contactName.value === '') {
    return '无法确定联系人名称'
  }
  return ''
})

// ==================== 发送逻辑 ====================

async function sendMessage() {
  const text = messageText.value.trim()
  if (!text || !canSend.value) return

  sendState.value = 'sending'
  errorMessage.value = ''

  try {
    const result = await sendmsgAPI.send(contactName.value, text)

    if (!result.ok) {
      sendState.value = 'error'
      errorMessage.value = result.error || result.message || '发送失败'
      return
    }

    // 消息已加入队列
    if (result.message_id !== undefined) {
      sendState.value = 'queued'
      messageText.value = ''
      startPolling(result.message_id)
    } else {
      // 没有队列 ID，直接标记成功
      sendState.value = 'success'
      messageText.value = ''
      emit('refresh')
      autoResetState()
    }
  } catch (error: unknown) {
    sendState.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '发送请求失败'
  }
}

function startPolling(messageId: number) {
  sendState.value = 'polling'
  pollingStartTimes.value.set(messageId, Date.now())

  const timer = setInterval(async () => {
    try {
      const response = await sendmsgAPI.getQueueStatus(messageId)

      // 检查是否超时
      const startTime = pollingStartTimes.value.get(messageId) || Date.now()
      if (Date.now() - startTime > POLLING_TIMEOUT) {
        stopPolling(messageId)
        sendState.value = 'error'
        errorMessage.value = '发送超时，请到微信确认'
        return
      }

      // 响应格式: { ok, message: { status, ... } }
      if (!response.ok || !response.message) {
        // 查询失败，继续轮询（可能是暂时性错误）
        return
      }

      const msgStatus = response.message.status

      // 根据队列状态判断
      if (msgStatus === 'completed') {
        stopPolling(messageId)
        sendState.value = 'success'
        emit('refresh')
        autoResetState()
      } else if (msgStatus === 'failed') {
        stopPolling(messageId)
        sendState.value = 'error'
        errorMessage.value = response.message.error_message || '发送失败'
      } else if (msgStatus === 'cancelled') {
        stopPolling(messageId)
        sendState.value = 'error'
        errorMessage.value = '消息已取消'
      }
      // 其他状态（pending/processing）继续轮询
    } catch {
      // 轮询请求失败，检查超时
      const startTime = pollingStartTimes.value.get(messageId) || Date.now()
      if (Date.now() - startTime > POLLING_TIMEOUT) {
        stopPolling(messageId)
        sendState.value = 'error'
        errorMessage.value = '发送超时，请到微信确认'
      }
    }
  }, POLLING_INTERVAL)

  pollingTimers.value.set(messageId, timer)
}

function stopPolling(messageId: number) {
  const timer = pollingTimers.value.get(messageId)
  if (timer) {
    clearInterval(timer)
    pollingTimers.value.delete(messageId)
  }
  pollingStartTimes.value.delete(messageId)
}

function stopAllPolling() {
  for (const timer of pollingTimers.value.values()) {
    clearInterval(timer)
  }
  pollingTimers.value.clear()
  pollingStartTimes.value.clear()
}

// ==================== 键盘事件 ====================

function handleKeydown(e: Event | KeyboardEvent) {
  const ke = e as KeyboardEvent
  if (ke.key === 'Enter' && !ke.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// ==================== 服务可用性检测 ====================

async function checkServiceAvailability() {
  try {
    const status = await sendmsgAPI.status()
    serviceAvailable.value = true
    const wechatAvailable = status.wechat_status?.wechat_available ?? false
    wechatLoggedIn.value = wechatAvailable
    if (!wechatAvailable) {
      serviceStatusMessage.value = '微信不可用，请确认微信已登录'
    } else {
      serviceStatusMessage.value = ''
    }
  } catch {
    serviceAvailable.value = false
    serviceStatusMessage.value = '发送服务不可用'
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  checkServiceAvailability()
})

onUnmounted(() => {
  stopAllPolling()
  if (successTimer) clearTimeout(successTimer)
})

// ==================== 状态重置 ====================

const SUCCESS_DISPLAY_DURATION = 3000
let successTimer: ReturnType<typeof setTimeout> | null = null

function resetState() {
  sendState.value = 'idle'
  errorMessage.value = ''
}

function autoResetState() {
  if (successTimer) clearTimeout(successTimer)
  successTimer = setTimeout(() => {
    if (sendState.value === 'success') {
      resetState()
    }
    successTimer = null
  }, SUCCESS_DISPLAY_DURATION)
}
</script>

<template>
  <div class="send-box">
    <!-- 服务状态提示 -->
    <div v-if="!serviceAvailable" class="send-box-status status-error">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ serviceStatusMessage || '发送服务不可用' }}</span>
      <el-button link type="primary" size="small" @click="checkServiceAvailability">重新检测</el-button>
    </div>
    <div v-else-if="!wechatLoggedIn" class="send-box-status status-warning">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ serviceStatusMessage || '微信未登录' }}</span>
      <el-button link type="primary" size="small" @click="checkServiceAvailability">重新检测</el-button>
    </div>
    <div v-else-if="contactNameWarning" class="send-box-status status-warning">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ contactNameWarning }}</span>
    </div>

    <!-- 发送状态提示 -->
    <div v-if="sendState === 'polling'" class="send-box-status status-info">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在发送...</span>
    </div>
    <div v-if="sendState === 'error'" class="send-box-status status-error">
      <el-icon><CircleCloseFilled /></el-icon>
      <span>{{ errorMessage }}</span>
      <el-button link type="primary" size="small" @click="resetState">重试</el-button>
    </div>
    <div v-if="sendState === 'success'" class="send-box-status status-success">
      <el-icon><CircleCheckFilled /></el-icon>
      <span>发送成功</span>
    </div>

    <!-- 输入区域 -->
    <div class="send-box-input">
      <el-input
        v-model="messageText"
        type="textarea"
        :rows="2"
        :placeholder="canSend ? '输入消息，Enter 发送，Shift+Enter 换行' : '无法发送'"
        :disabled="!canSend"
        resize="none"
        @keydown="handleKeydown"
      />
      <el-button
        type="primary"
        :disabled="!canSend || !messageText.trim()"
        :loading="sendState === 'sending'"
        class="send-button"
        @click="sendMessage"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.send-box {
  border-top: 1px solid var(--el-border-color-light);
  padding: 8px 12px;
  background-color: var(--el-bg-color);
  flex-shrink: 0;
}

.send-box-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-bottom: 6px;
  border-radius: 4px;
  font-size: 12px;

  &.status-error {
    color: var(--el-color-danger);
    background-color: var(--el-color-danger-light-9);
  }

  &.status-warning {
    color: var(--el-color-warning);
    background-color: var(--el-color-warning-light-9);
  }

  &.status-info {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }

  &.status-success {
    color: var(--el-color-success);
    background-color: var(--el-color-success-light-9);
  }
}

.send-box-input {
  display: flex;
  gap: 8px;
  align-items: flex-end;

  :deep(.el-textarea) {
    flex: 1;

    .el-textarea__inner {
      padding: 8px 12px;
      font-size: 14px;
      line-height: 1.5;
    }
  }
}

.send-button {
  flex-shrink: 0;
  height: 40px;
}
</style>
