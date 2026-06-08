<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAIAgentStore } from '@/stores/ai/agent'
import { sendmsgAPI } from '@/api/sendmsg'
import type { AgentDraft } from '@/types/ai/agent'

const agentStore = useAIAgentStore()

const props = withDefaults(defineProps<{
  draft: AgentDraft
  showSessionInfo?: boolean
}>(), {
  showSessionInfo: true,
})

const emit = defineEmits<{
  sent: [draftId: string, messageId: number]
  dismissed: [draftId: string]
}>()

const previewText = computed(() => {
  const content = props.draft.content
  return content.length > 100 ? content.slice(0, 100) + '...' : content
})

const timeLabel = computed(() => {
  const diff = Date.now() - props.draft.generatedAt
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
})

const isSending = computed(() =>
  agentStore.sendingStatuses.some(
    (s) => s.draftId === props.draft.id && s.status === 'sending'
  )
)

async function handleSend() {
  if (isSending.value) return

  try {
    const result = await sendmsgAPI.send(props.draft.contactName, props.draft.content)

    if (!result.ok) {
      ElMessage.error(result.error || result.message || '发送失败')
      return
    }

    if (result.message_id !== undefined) {
      agentStore.markDraftSent(props.draft.id, result.message_id)
      agentStore.addSendingStatus({
        draftId: props.draft.id,
        messageId: result.message_id,
        contactName: props.draft.contactName,
        contentPreview: previewText.value,
        status: 'sending',
      })
      emit('sent', props.draft.id, result.message_id)
      ElMessage.success('草稿已发送')
    } else {
      agentStore.markDraftSent(props.draft.id, 0)
      emit('sent', props.draft.id, 0)
      ElMessage.success('草稿已发送')
    }
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '发送失败')
  }
}

function handleDismiss() {
  agentStore.removeDraft(props.draft.id)
  emit('dismissed', props.draft.id)
}

function handleCopy() {
  navigator.clipboard.writeText(props.draft.content).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}
</script>

<template>
  <div class="agent-draft-card" :class="{ 'is-sending': isSending }">
    <div class="draft-header">
      <span v-if="showSessionInfo" class="draft-session">{{ draft.sessionName }}</span>
      <span class="draft-time">{{ timeLabel }}</span>
    </div>
    <div class="draft-body">
      <span class="draft-preview">{{ previewText }}</span>
    </div>
    <div class="draft-actions">
      <el-button
        type="primary"
        size="small"
        :loading="isSending"
        @click="handleSend"
      >
        {{ isSending ? '发送中' : '发送' }}
      </el-button>
      <el-button size="small" @click="handleCopy">复制</el-button>
      <el-button text size="small" @click="handleDismiss">忽略</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.agent-draft-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 8px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 8px;
  transition: opacity 0.2s;

  &.is-sending {
    opacity: 0.7;
    pointer-events: none;
  }
}

.draft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.draft-session {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.draft-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.draft-body {
  flex: 1;
}

.draft-preview {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  word-break: break-word;
}

.draft-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
