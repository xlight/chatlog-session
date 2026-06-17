<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Delete, Star, Download, Cpu, ChatLineRound, DataAnalysis, EditPen } from '@element-plus/icons-vue'
import type { Message } from '@/types'
import { useAppStore } from '@/stores/app'
import { useAIConversationStore } from '@/stores/ai/conversation'
import { useAIPromptStore } from '@/stores/ai/prompt'
import { useAIActivityLogStore } from '@/stores/ai/activityLog'
import { useAIAgentStore } from '@/stores/ai/agent'
import { useAIChat } from '@/composables/useAIChat'
import { useSessionStore } from '@/stores/session'
import { useDisplayName } from './composables/useDisplayName'
import type { LastReply } from '@/types/ai'

const visible = ref(false)

interface Props {
  message: Message
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end'
    | 'left-start'
    | 'left-end'
    | 'right-start'
    | 'right-end'
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom-end',
})

const emit = defineEmits<{
  delete: [message: Message]
  favorite: [message: Message]
}>()

const appStore = useAppStore()
const conversation = useAIConversationStore()
const promptStore = useAIPromptStore()
const activityLog = useAIActivityLogStore()
const agentStore = useAIAgentStore()
const sessionStore = useSessionStore()
const aiChat = useAIChat()

const currentSession = computed(() =>
  sessionStore.sessions.find((s) => s.id === sessionStore.currentSessionId)
)

const agentPermission = computed(() => {
  if (!currentSession.value?.id) return null
  return agentStore.getEffectiveConfig(currentSession.value.id).sendPermission
})

const canShowAgentDraft = computed(() => {
  if (!agentPermission.value) return true // 无权限配置时默认可用
  return agentPermission.value !== 'forbidden'
})

const { displayName: agentContactName } = useDisplayName({
  id: computed(() => props.message?.talker),
  defaultName: computed(() => props.message?.talkerName),
})

const handleCopy = async () => {
  try {
    const content = props.message.content || ''
    if (!content) {
      ElMessage.warning('无内容可复制')
      return
    }
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
  visible.value = false
}

const handleFavorite = () => {
  emit('favorite', props.message)
  ElMessage.success('已收藏')
  visible.value = false
}

const handleDelete = () => {
  emit('delete', props.message)
  visible.value = false
}

const handleDownload = () => {
  ElMessage.info('下载功能开发中...')
  visible.value = false
}

const handleSendToAI = () => {
  const text = props.message.content || ''
  if (!text) {
    ElMessage.warning('无可发送的文本内容')
    return
  }
  appStore.aiPanelOpen = true
  conversation.addMessage({ role: 'user', content: text })
  ElMessage.success('已发送到 AI 面板')
  visible.value = false
}

function runBuiltinPrompt(
  promptId: 'builtin-reply' | 'builtin-analyze',
  promptType: LastReply['promptType'],
  emptyWarning: string
) {
  const text = props.message.content || ''
  if (!text) {
    ElMessage.warning(emptyWarning)
    visible.value = false
    return
  }
  const prompt = promptStore.getPromptById(promptId)
  if (!prompt) {
    ElMessage.error('Prompt 模板未找到')
    visible.value = false
    return
  }
  const variables: Record<string, string> = { content: text }
  if (promptType === 'reply') {
    variables.tone = '友好'
  }
  const finalContent = promptStore.substituteVariables(prompt.content, variables)

  appStore.aiPanelOpen = true

  const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: finalContent }
  conversation.addMessage(userMsg)

  void aiChat.sendMessage(finalContent).then(() => {
    const msgs = conversation.messages
    const last = msgs[msgs.length - 1]
    if (last && last.role === 'assistant') {
      const messageId = last.id || crypto.randomUUID()
      if (!last.id) {
        conversation.messages[conversation.messages.length - 1] = { ...last, id: messageId }
      }
      conversation.setLastReply({
        messageId,
        content: last.content,
        promptType,
        sourceMessageId: String(props.message.id),
        generatedAt: Date.now(),
        injected: false,
      })
    }
  })

  activityLog.addEntry(
    promptType === 'reply' ? 'ai_reply' : 'ai_analyze',
    promptType === 'reply' ? '对消息使用「帮我回复」' : '对消息使用「分析消息」'
  )

  ElMessage.success(promptType === 'reply' ? '已请求 AI 生成回复' : '已请求 AI 分析消息')
  visible.value = false
}

function handleAIReply() {
  runBuiltinPrompt('builtin-reply', 'reply', '无可回复的内容')
}

function handleAIAnalyze() {
  runBuiltinPrompt('builtin-analyze', 'analyze', '无可分析的内容')
}

function handleAgentDraft() {
  if (!canShowAgentDraft.value) {
    ElMessage.warning('当前会话已禁用 Agent 功能')
    visible.value = false
    return
  }

  const text = props.message.content || ''
  if (!text) {
    ElMessage.warning('无可生成草稿的内容')
    visible.value = false
    return
  }

  const prompt = promptStore.getPromptById('builtin-reply')
  if (!prompt) {
    ElMessage.error('Prompt 模板未找到')
    visible.value = false
    return
  }

  const variables: Record<string, string> = { content: text, tone: '友好' }
  const finalContent = promptStore.substituteVariables(prompt.content, variables)

  appStore.aiPanelOpen = true

  const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: finalContent }
  conversation.addMessage(userMsg)

  void aiChat.sendMessage(finalContent).then(() => {
    const msgs = conversation.messages
    const last = msgs[msgs.length - 1]
    if (last && last.role === 'assistant' && last.content) {
      const currentSession = sessionStore.sessions.find(
        (s) => s.id === sessionStore.currentSessionId
      )
      const sessionId = currentSession?.id || ''
      const sessionName = currentSession?.name || currentSession?.talkerName || '未知会话'
      const contactName = agentContactName.value || props.message.talkerName || ''

      agentStore.addDraft({
        sourceMessageId: String(props.message.id),
        sessionId,
        sessionName,
        contactName,
        content: last.content,
        generatedAt: Date.now(),
      })
    }
  })

  activityLog.addEntry('ai_reply', '对消息使用「Agent 生成草稿」')

  ElMessage.success('已请求 AI 生成草稿')
  visible.value = false
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'copy':
      handleCopy()
      break
    case 'favorite':
      handleFavorite()
      break
    case 'delete':
      handleDelete()
      break
    case 'download':
      handleDownload()
      break
    case 'send-to-ai':
      handleSendToAI()
      break
    case 'ai-reply':
      handleAIReply()
      break
    case 'ai-analyze':
      handleAIAnalyze()
      break
    case 'agent-draft':
      handleAgentDraft()
      break
  }
}

const hasTextContent = () => {
  return !!props.message.content
}

const hasMedia = () => {
  const type = props.message.type
  return type === 3 || type === 34 || type === 43 || type === 47
}
</script>

<template>
  <el-dropdown
    v-model:visible="visible"
    :placement="placement"
    trigger="click"
    @command="handleCommand"
  >
    <el-button text circle size="small" class="message-quick-actions__trigger">
      <el-icon :size="16">
        <MoreFilled />
      </el-icon>
    </el-button>

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-if="hasTextContent()" command="copy" :icon="CopyDocument">
          复制内容
        </el-dropdown-item>

        <el-dropdown-item command="favorite" :icon="Star"> 收藏消息 </el-dropdown-item>

        <el-dropdown-item
          v-if="hasTextContent()"
          command="ai-reply"
          :icon="ChatLineRound"
        >
          帮我回复
        </el-dropdown-item>

        <el-dropdown-item
          v-if="hasTextContent()"
          command="ai-analyze"
          :icon="DataAnalysis"
        >
          分析消息
        </el-dropdown-item>

        <el-dropdown-item
          v-if="hasTextContent() && canShowAgentDraft"
          command="agent-draft"
          :icon="EditPen"
        >
          Agent 生成草稿
        </el-dropdown-item>

        <el-dropdown-item
          v-if="hasTextContent()"
          command="send-to-ai"
          :icon="Cpu"
        >
          <span style="color: var(--el-color-primary)">发送到 AI</span>
        </el-dropdown-item>

        <el-dropdown-item v-if="hasMedia()" command="download" :icon="Download" divided>
          下载媒体
        </el-dropdown-item>

        <el-dropdown-item command="delete" :icon="Delete" :divided="!hasMedia()">
          <span style="color: var(--el-color-danger)">删除消息</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped lang="scss">
.message-quick-actions__trigger {
  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

:deep(.el-dropdown-menu__item) {
  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
