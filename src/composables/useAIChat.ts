import { useSettingsStore } from '@/stores/settings'
import { useAIConversationStore } from '@/stores/ai/conversation'
import { chatStream, mapError, showAIErrorToast } from '@/api/llm'
import type { ChatMessage } from '@/types/ai'

/**
 * AI 对话组合函数
 * 封装消息发送、流式接收、停止生成等逻辑
 */
export function useAIChat() {
  const settingsStore = useSettingsStore()
  const conversation = useAIConversationStore()

  async function sendMessage(input: string) {
    if (!input.trim()) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    conversation.addMessage(userMessage)

    // 创建 assistant 占位
    conversation.addMessage({ role: 'assistant', content: '' })
    conversation.setStreaming(true)
    conversation.setError(null)
    conversation.setThinkingContent('')
    conversation.setThinkingVisible(true)

    const abortController = new AbortController()
    ;(conversation as any).abortController = abortController

    const model = settingsStore.ai.llmDefaultModel
    conversation.setCurrentModel(model)

    try {
      const accumContent: string[] = []
      let rafPending = false

      function scheduleContentUpdate() {
        if (!rafPending) {
          rafPending = true
          requestAnimationFrame(() => {
            rafPending = false
            conversation.updateLastAssistantContent(accumContent.join(''))
          })
        }
      }

      for await (const chunk of chatStream({
        messages: conversation.messages,
        model,
        signal: abortController.signal,
      })) {
        const delta = chunk.choices?.[0]?.delta
        const finishReason = chunk.choices?.[0]?.finish_reason

        if (delta?.reasoning_content) {
          conversation.appendThinkingContent(delta.reasoning_content)
        }

        if (delta?.content) {
          accumContent.push(delta.content)
          scheduleContentUpdate()
        }

        if (finishReason === 'stop' || finishReason === 'length') {
          // 立即刷新最后的更新
          conversation.updateLastAssistantContent(accumContent.join(''))
          const u = (chunk as any).usage
          if (u) {
            conversation.setUsage({
              promptTokens: u.prompt_tokens ?? 0,
              completionTokens: u.completion_tokens ?? 0,
              totalTokens: u.total_tokens ?? 0,
            })
          }
          break
        }
      }
    } catch (err) {
      const aiErr = mapError(err, abortController.signal)
      conversation.setError(aiErr)
      // 如果是中止，移除空的 assistant 消息
      if (aiErr.type === 'aborted') {
        const msgs = conversation.messages
        const last = msgs[msgs.length - 1]
        if (last && last.role === 'assistant' && !last.content) {
          conversation.messages.splice(-1, 1)
        }
      } else {
        showAIErrorToast(aiErr)
      }
    } finally {
      conversation.setStreaming(false)
    }
  }

  function stopGeneration() {
    conversation.abortStream()
  }

  function clearConversation() {
    conversation.clearConversation()
  }

  return {
    conversation,
    sendMessage,
    stopGeneration,
    clearConversation,
  }
}
