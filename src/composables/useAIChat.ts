import { useSettingsStore } from '@/stores/settings'
import { useAIConversationStore } from '@/stores/ai/conversation'
import { useAIStream, type AIStreamStore } from '@/composables/useAIStream'
import type { ChatMessage } from '@/types/ai'

/**
 * AI 对话组合函数（薄包装）
 *
 * 委托 useAIStream(conversation, options)，保留公共 API 以便调用方零改动
 * 流式渲染、RAF 批处理、错误映射、abort 清理统一在 useAIStream 中实现
 */
export function useAIChat() {
  const settingsStore = useSettingsStore()
  const conversation = useAIConversationStore() as unknown as AIStreamStore

  const stream = useAIStream(conversation, {
    getMessages: () =>
      (conversation as unknown as { messages: { value: ChatMessage[] } }).messages.value,
    getModel: () => settingsStore.ai.llmDefaultModel,
  })

  async function sendMessage(input: string) {
    return stream.sendMessage(input)
  }

  function stopGeneration() {
    stream.stopGeneration()
  }

  function clearConversation() {
    ;(conversation as unknown as { clearConversation: () => void }).clearConversation()
  }

  return {
    conversation: conversation as unknown as ReturnType<typeof useAIConversationStore>,
    sendMessage,
    stopGeneration,
    clearConversation,
  }
}
