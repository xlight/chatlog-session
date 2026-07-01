<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { CirclePlus, PictureRounded } from '@element-plus/icons-vue'
import { sendmsgAPI } from '@/api/sendmsg'
import { useSettingsStore } from '@/stores/settings'
import { useAIAgentStore } from '@/stores/ai/agent'
import { useSessionDisplayName } from './composables/useDisplayName'
import { useSendQueue, agentSendQueue } from '@/composables/useSendQueue'
import type { SendTask } from '@/api/sendmsg'
import AgentDraftCard from '@/components/ai/AgentDraftCard.vue'
import type { Session } from '@/types/session'

const settingsStore = useSettingsStore()
const agentStore = useAIAgentStore()

const hasAgentPermission = computed(() => {
  if (!props.session?.id) return false
  const config = agentStore.getEffectiveConfig(props.session.id)
  return config.sendPermission !== 'forbidden'
})

const draftPermissionLabel = computed(() => {
  if (!props.session?.id) return ''
  const config = agentStore.getEffectiveConfig(props.session.id)
  switch (config.sendPermission) {
    case 'draft_confirm': return '需确认后发送'
    case 'auto': return '自动发送'
    default: return ''
  }
})

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)

const inputRef = ref<InstanceType<typeof import('element-plus').ElInput> | null>(null)

function injectDraft(text: string) {
  messageText.value = text
  draftText.value = text
  nextTick(() => {
    const el = inputRef.value?.$el?.querySelector('textarea') as HTMLTextAreaElement | null
    el?.focus()
  })
}

const props = defineProps<{
  session: Session
}>()

const emit = defineEmits<{
  refresh: []
  draftSent: [draftId: string, messageId: number]
}>()

// ==================== 状态 ====================

const messageText = ref('')
const draftText = ref('')
const serviceAvailable = ref(true)
const wechatLoggedIn = ref(true)
const serviceStatusMessage = ref('')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico'])
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const showEmojiPicker = ref(false)

// ==================== 发送队列 ====================

const { tasks: pendingMessages, send: queueSend, cancel: queueCancel, getStageLabel } = useSendQueue({
  autoRemoveDelay: 3000,
  onCompleted: () => emit('refresh'),
})

// ==================== contact_name 解析 ====================

const { displayName } = useSessionDisplayName({
  session: computed(() => props.session)
})

const contactName = computed(() => {
  const name = displayName.value
  if (!name || name.startsWith('wxid_')) return ''
  return name
})

const canSend = computed(() => {
  return serviceAvailable.value && wechatLoggedIn.value && contactName.value !== ''
})

const sendPlaceholder = computed(() => {
  if (!canSend.value) return '无法发送'
  const shortcut = settingsStore.sendmsg.sendShortcut
  if (shortcut === 'ctrl-enter') {
    const mod = isMac ? '⌘' : 'Ctrl'
    return `输入消息，${mod}+Enter 发送，Enter 换行`
  }
  return '输入消息，Enter 发送，Shift+Enter 换行'
})

const contactNameWarning = computed(() => {
  if (contactName.value === '') {
    return '无法确定联系人名称'
  }
  return ''
})

const hasText = computed(() => messageText.value.trim().length > 0)

// ==================== 发送 / 取消逻辑 ====================

async function cancelPendingMessage(msg: SendTask) {
  try {
    await queueCancel(msg.id)
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '取消失败')
  }
}

async function sendMessage() {
  const text = messageText.value.trim()
  if (!text || !canSend.value) return

  messageText.value = ''
  await queueSend(contactName.value, text)
}

// ==================== 文件发送逻辑 ====================

async function sendDraft(draftId: string, content: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  if (!content || !canSend.value) return { ok: false, error: '无法发送' }

  const result = await queueSend(contactName.value, content)
  if (result.ok && result.messageId) {
    emit('draftSent', draftId, result.messageId)
  }
  return { ok: result.ok, messageId: result.messageId, error: result.error }
}

function clearDraft() {
  draftText.value = ''
}

function onDraftSent(draftId: string, messageId: number) {
  emit('draftSent', draftId, messageId)
}

function onDraftDismissed(draftId: string) {
  agentStore.removeDraft(draftId)
}

async function cancelAgentTask(msg: SendTask) {
  try {
    await agentSendQueue.cancel(msg.id)
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '取消失败')
  }
}

const agentPendingTasks = computed(() => agentSendQueue.tasks.value)

// ==================== 文件发送逻辑 ====================

function triggerFileSelect() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) sendFileOrImage(file)
  input.value = ''
}

async function sendFileOrImage(file: File) {
  if (!canSend.value) return

  if (file.size > MAX_FILE_SIZE) {
    ElMessage.warning(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    return
  }

  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  const isImage = IMAGE_EXTENSIONS.has(ext)
  const label = isImage ? `📷 ${file.name}` : `📎 ${file.name}`

  await queueSend(contactName.value, label, async (contactName, _content) => {
    const result = isImage
      ? await sendmsgAPI.sendImageUpload(contactName, file)
      : await sendmsgAPI.sendFileUpload(contactName, file)
    return { ok: result.ok, message_id: result.message_id, error: result.error, message: result.message }
  })
}

// ==================== 粘贴图片 ====================

const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'])

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (IMAGE_MIME_TYPES.has(item.type)) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) sendFileOrImage(file)
      return
    }
  }
}

// ==================== 拖拽文件 ====================

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.types.includes('Files')) {
    isDragOver.value = true
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false

  const file = e.dataTransfer?.files?.[0]
  if (file) sendFileOrImage(file)
}

// ==================== 键盘事件 ====================

function handleKeydown(e: Event | KeyboardEvent) {
  const ke = e as KeyboardEvent
  if (ke.key !== 'Enter') return
  if (ke.isComposing) return

  const shortcut = settingsStore.sendmsg.sendShortcut
  if (shortcut === 'ctrl-enter') {
    if ((ke.metaKey || ke.ctrlKey) && !ke.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  } else {
    if (!ke.shiftKey && !ke.metaKey && !ke.ctrlKey) {
      e.preventDefault()
      sendMessage()
    }
  }
}

// ==================== Emoji ====================

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
  '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
  '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑',
  '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔',
  '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '👍', '👎', '👏', '🙌', '🤝', '💪', '✌️', '🤞',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
]

function insertEmoji(emoji: string) {
  messageText.value += emoji
  showEmojiPicker.value = false
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

defineExpose({ injectDraft, sendDraft, clearDraft, draftText })
</script>

<template>
  <div class="send-box" :class="{ 'is-drag-over': isDragOver }" @paste="handlePaste" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
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

    <!-- 发送中消息列表 -->
    <div v-if="pendingMessages.length > 0" class="pending-messages">
      <div
        v-for="msg in pendingMessages"
        :key="msg.id"
        class="pending-msg"
        :class="`pending-${msg.status === 'completed' ? 'success' : msg.status === 'cancelled' ? 'error' : msg.status}`"
      >
        <el-icon v-if="msg.status === 'sending'" class="is-loading"><Loading /></el-icon>
        <el-icon v-else-if="msg.status === 'completed'"><CircleCheckFilled /></el-icon>
        <el-icon v-else><CircleCloseFilled /></el-icon>
        <span class="pending-content">{{ msg.contentPreview }}</span>
        <span class="pending-status">
          {{ msg.status === 'sending' ? getStageLabel(msg.stage) : msg.status === 'completed' ? '已发送' : msg.error || '发送失败' }}
        </span>
        <el-button
          v-if="msg.status === 'sending' && msg.messageId"
          text
          size="small"
          class="pending-cancel"
          @click="cancelPendingMessage(msg)"
        >
          取消
        </el-button>
      </div>
    </div>

    <!-- Agent 草稿卡片 -->
    <div v-if="hasAgentPermission && agentStore.pendingDrafts.length > 0" class="agent-drafts">
      <div class="agent-drafts-header">
        <span>{{ draftPermissionLabel }}</span>
      </div>
      <AgentDraftCard
        v-for="draft in agentStore.pendingDrafts"
        :key="draft.id"
        :draft="draft"
        @sent="onDraftSent"
        @dismissed="onDraftDismissed"
      />
    </div>

    <!-- Agent 发送状态 -->
    <div v-if="agentPendingTasks.length > 0" class="agent-sending-statuses">
      <div
        v-for="msg in agentPendingTasks"
        :key="msg.id"
        class="pending-msg"
        :class="`pending-${msg.status === 'completed' ? 'success' : msg.status === 'cancelled' ? 'error' : msg.status}`"
      >
        <el-icon v-if="msg.status === 'sending'" class="is-loading"><Loading /></el-icon>
        <el-icon v-else-if="msg.status === 'completed'"><CircleCheckFilled /></el-icon>
        <el-icon v-else><CircleCloseFilled /></el-icon>
        <span class="pending-content">{{ msg.contentPreview }}</span>
        <span class="pending-status">
          {{ msg.status === 'sending' ? agentSendQueue.getStageLabel(msg.stage) : msg.status === 'completed' ? '已发送' : msg.error || '发送失败' }}
        </span>
        <el-button
          v-if="msg.status === 'sending' && msg.messageId"
          text
          size="small"
          class="pending-cancel"
          @click="cancelAgentTask(msg)"
        >
          取消
        </el-button>
        <el-button
          v-if="msg.status !== 'sending'"
          text
          size="small"
          class="pending-cancel"
          @click="agentSendQueue.remove(msg.id)"
        >
          关闭
        </el-button>
      </div>
    </div>

    <!-- 草稿插槽（供外部扩展） -->
    <slot name="draft" />

    <!-- 输入区域 -->
    <div class="send-box-input">
      <!-- 表情按钮 -->
      <el-popover :visible="showEmojiPicker" placement="top-start" :width="320" trigger="click" @update:visible="showEmojiPicker = $event">
        <template #reference>
          <el-button :disabled="!canSend" link class="action-btn" title="表情">
            <el-icon><PictureRounded /></el-icon>
          </el-button>
        </template>
        <div class="emoji-grid">
          <button
            v-for="emoji in EMOJI_LIST"
            :key="emoji"
            class="emoji-item"
            @click="insertEmoji(emoji)"
          >{{ emoji }}</button>
        </div>
      </el-popover>

      <el-input
        ref="inputRef"
        v-model="messageText"
        type="textarea"
        :rows="2"
        :placeholder="sendPlaceholder"
        :disabled="!canSend"
        resize="none"
        @keydown="handleKeydown"
      />

      <!-- ➕ 按钮（输入框空时） -->
      <el-button
        v-if="!hasText"
        :disabled="!canSend"
        :icon="CirclePlus"
        link
        class="action-btn"
        title="发送文件"
        @click="triggerFileSelect"
      />

      <!-- 发送按钮（输入框有内容时） -->
      <el-button
        v-else
        type="primary"
        :disabled="!canSend"
        class="send-button"
        @click="sendMessage"
      >
        发送
      </el-button>
    </div>

    <!-- 隐藏的文件选择 input -->
    <input ref="fileInputRef" type="file" style="display: none" @change="handleFileChange" />
  </div>
</template>

<style lang="scss" scoped>
.send-box {
  border-top: 1px solid var(--el-border-color-light);
  padding: 8px 12px;
  background-color: var(--el-bg-color);
  flex-shrink: 0;
  transition: border-color 0.2s, background-color 0.2s;

  &.is-drag-over {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
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
}

.pending-messages {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}

.pending-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.pending-sending {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }

  &.pending-success {
    color: var(--el-color-success);
    background-color: var(--el-color-success-light-9);
  }

  &.pending-error {
    color: var(--el-color-danger);
    background-color: var(--el-color-danger-light-9);
  }
}

.pending-cancel {
  flex-shrink: 0;
}

.pending-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-status {
  flex-shrink: 0;
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

.action-btn {
  flex-shrink: 0;
  font-size: 20px;
  padding: 4px;
}

.send-button {
  flex-shrink: 0;
  height: 40px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.emoji-item {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  border-radius: 4px;
  text-align: center;
  transition: background-color 0.15s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.agent-drafts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.agent-drafts-header {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  padding: 2px 4px;
}

.agent-sending-statuses {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
  max-height: 120px;
  overflow-y: auto;
}
</style>
