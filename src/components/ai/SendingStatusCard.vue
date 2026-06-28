<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAIAgentStore } from '@/stores/ai/agent'
import { sendmsgAPI } from '@/api/sendmsg'
import type { AgentSendingStatus } from '@/types/ai/agent'

const agentStore = useAIAgentStore()

const props = defineProps<{
  status: AgentSendingStatus
}>()

const emit = defineEmits<{
  completed: [draftId: string]
  failed: [draftId: string, error: string]
  cancelled: [draftId: string]
}>()

let pollingTimer: ReturnType<typeof setInterval> | null = null
const POLLING_INTERVAL = 1000
const POLLING_TIMEOUT = 30000

onMounted(() => {
  if (props.status.status === 'sending') {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})

function startPolling() {
  const startTime = Date.now()

  pollingTimer = setInterval(async () => {
    if (Date.now() - startTime > POLLING_TIMEOUT) {
      stopPolling()
      agentStore.updateSendingStatus(props.status.draftId, {
        status: 'failed',
        error: '发送超时',
      })
      emit('failed', props.status.draftId, '发送超时')
      return
    }

    try {
      const response = await sendmsgAPI.getQueueStatus(props.status.messageId)

      if (!response.ok || !response.message) return

      const msgStatus = response.message.status

      if (msgStatus === 'completed') {
        stopPolling()
        agentStore.updateSendingStatus(props.status.draftId, { status: 'completed' })
        emit('completed', props.status.draftId)
      } else if (msgStatus === 'failed') {
        stopPolling()
        const error = response.message.error_message || '发送失败'
        agentStore.updateSendingStatus(props.status.draftId, { status: 'failed', error })
        emit('failed', props.status.draftId, error)
      } else if (msgStatus === 'cancelled') {
        stopPolling()
        agentStore.updateSendingStatus(props.status.draftId, { status: 'cancelled' })
        emit('cancelled', props.status.draftId)
      }
    } catch {
      if (Date.now() - startTime > POLLING_TIMEOUT) {
        stopPolling()
        agentStore.updateSendingStatus(props.status.draftId, {
          status: 'failed',
          error: '发送超时',
        })
        emit('failed', props.status.draftId, '发送超时')
      }
    }
  }, POLLING_INTERVAL)
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

async function handleCancel() {
  try {
    const result = await sendmsgAPI.cancelJob(props.status.messageId)
    if (result.ok) {
      stopPolling()
      agentStore.updateSendingStatus(props.status.draftId, { status: 'cancelled' })
      emit('cancelled', props.status.draftId)
      ElMessage.success('已取消发送')
    } else {
      ElMessage.error(result.error || '取消失败')
    }
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '取消失败')
  }
}

function handleDismiss() {
  agentStore.removeSendingStatus(props.status.draftId)
}
</script>

<template>
  <div class="sending-status-card" :class="`status-${status.status}`">
    <div class="status-indicator">
      <el-icon v-if="status.status === 'sending'" class="is-loading"><Loading /></el-icon>
      <el-icon v-else-if="status.status === 'completed'"><CircleCheckFilled /></el-icon>
      <el-icon v-else-if="status.status === 'cancelled'"><CircleCloseFilled /></el-icon>
      <el-icon v-else><WarningFilled /></el-icon>
    </div>
    <div class="status-body">
      <span class="status-contact">{{ status.contactName }}</span>
      <span class="status-preview">{{ status.contentPreview }}</span>
      <span class="status-label">
        {{ status.status === 'sending' ? '发送中...' : status.status === 'completed' ? '已发送' : status.status === 'cancelled' ? '已取消' : status.error || '发送失败' }}
      </span>
    </div>
    <div class="status-actions">
      <el-button
        v-if="status.status === 'sending'"
        text
        size="small"
        @click="handleCancel"
      >
        取消
      </el-button>
      <el-button
        v-if="status.status !== 'sending'"
        text
        size="small"
        @click="handleDismiss"
      >
        关闭
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sending-status-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;

  &.status-sending {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.status-completed {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  &.status-failed {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  &.status-cancelled {
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
  }
}

.status-indicator {
  flex-shrink: 0;
}

.status-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.status-contact {
  font-weight: 600;
}

.status-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-regular);
}

.status-label {
  color: var(--el-text-color-secondary);
}

.status-actions {
  flex-shrink: 0;
}
</style>
