import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, AIError, UsageInfo } from '@/types/ai'

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
  }

  function abortStream() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    streaming.value = false
  }

  function $reset() {
    clearConversation()
    currentModel.value = ''
    streaming.value = false
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
    abortStream,
    $reset,
  }
})
