import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, AIError, LastReply, UsageInfo } from '@/types/ai'

export const useAIConversationStore = defineStore('aiConversation', () => {
  // ==================== State ====================

  const messages = ref<ChatMessage[]>([])
  const currentModel = ref('')
  const streaming = ref(false)
  const error = ref<AIError | null>(null)
  const usage = ref<UsageInfo | null>(null)
  const abortController = ref<AbortController | null>(null)

  // 思考过程（推理内容）
  const thinkingContent = ref('')
  const thinkingVisible = ref(true)

  // Mermaid 系统提示词注入状态
  const hasMermaidPrompt = ref(false)

  // 最近一次「帮我回复」/「分析消息」生成的草稿（RecentReplyCard 显示用）
  const lastReply = ref<LastReply | null>(null)

  // ==================== Getters ====================

  const hasMessages = computed(() => messages.value.length > 0)

  const lastMessage = computed(() => {
    const msgs = messages.value
    return msgs.length > 0 ? msgs[msgs.length - 1] : null
  })

  const displayedContent = computed(() => {
    const msgs = messages.value
    if (msgs.length === 0) return ''
    // 取最后一条 assistant 消息的内容
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') {
        return msgs[i].content
      }
    }
    return ''
  })

  // ==================== Actions ====================

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
  }

  function updateLastAssistantContent(content: string) {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === 'assistant') {
        messages.value[i] = { ...messages.value[i], content }
        return
      }
    }
  }

  function appendStreamContent(delta: string) {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === 'assistant') {
        messages.value[i] = {
          ...messages.value[i],
          content: messages.value[i].content + delta,
        }
        return
      }
    }
    // 没有 assistant 消息则创建一条
    messages.value.push({ role: 'assistant', content: delta })
  }

  function setStreaming(val: boolean) {
    streaming.value = val
    if (!val) {
      abortController.value = null
    }
  }

  function setError(err: AIError | null) {
    error.value = err
  }

  function setUsage(u: UsageInfo | null) {
    usage.value = u
  }

  function setCurrentModel(model: string) {
    currentModel.value = model
  }

  function setThinkingContent(content: string) {
    thinkingContent.value = content
  }

  function appendThinkingContent(delta: string) {
    thinkingContent.value += delta
  }

  function setThinkingVisible(val: boolean) {
    thinkingVisible.value = val
  }

  function clearConversation() {
    messages.value = []
    error.value = null
    usage.value = null
    thinkingContent.value = ''
    thinkingVisible.value = true
    hasMermaidPrompt.value = false
  }

  function ensureMermaidPrompt() {
    if (hasMermaidPrompt.value) return
    const MERMAID_SYSTEM_PROMPT = `当需要展示图表、流程图、时序图、类图、甘特图等可视化内容时，优先使用 Mermaid 格式，使用 \`\`\`mermaid 代码块标记。
示例：
\`\`\`mermaid
graph TD
    A[开始] --> B[处理] --> C[结束]
\`\`\``
    messages.value.unshift({ role: 'system', content: MERMAID_SYSTEM_PROMPT })
    hasMermaidPrompt.value = true
  }

  function abortStream() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    streaming.value = false
  }

  function removeLastAssistant() {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === 'assistant' && !messages.value[i].content) {
        messages.value.splice(i, 1)
        return
      }
    }
  }

  function setLastReply(reply: LastReply | null) {
    lastReply.value = reply
  }

  function markLastReplyInjected() {
    if (lastReply.value) {
      lastReply.value = { ...lastReply.value, injected: true }
    }
  }

  function $reset() {
    clearConversation()
    currentModel.value = ''
    streaming.value = false
    lastReply.value = null
  }

  return {
    // State
    messages,
    currentModel,
    streaming,
    error,
    usage,
    thinkingContent,
    thinkingVisible,
    abortController,
    hasMermaidPrompt,
    lastReply,

    // Getters
    hasMessages,
    lastMessage,
    displayedContent,

    // Actions
    addMessage,
    updateLastAssistantContent,
    appendStreamContent,
    setStreaming,
    setError,
    setUsage,
    setCurrentModel,
    setThinkingContent,
    appendThinkingContent,
    setThinkingVisible,
    clearConversation,
    ensureMermaidPrompt,
    abortStream,
    removeLastAssistant,
    setLastReply,
    markLastReplyInjected,
    $reset,
  }
})
