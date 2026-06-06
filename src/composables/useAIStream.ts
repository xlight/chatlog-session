import type { Ref } from 'vue'
import { chatStream, mapError, showAIErrorToast } from '@/api/llm'
import type { AIError, ChatMessage, UsageInfo } from '@/types/ai'

export interface AIStreamStore {
  messages: Ref<ChatMessage[]> | { value: ChatMessage[] }
  addMessage(msg: ChatMessage): void
  updateLastAssistantContent(content: string): void
  appendThinkingContent(delta: string): void
  streaming: Ref<boolean> | { value: boolean }
  setStreaming(val: boolean): void
  setAbortController(ctrl: AbortController | null): void
  abortController: Ref<AbortController | null> | { value: AbortController | null }
  error: Ref<AIError | null> | { value: AIError | null }
  setError(err: AIError | null): void
  thinkingContent: Ref<string> | { value: string }
  thinkingVisible: Ref<boolean> | { value: boolean }
  setThinkingContent(content: string): void
  setThinkingVisible(visible: boolean): void
  setUsage(usage: UsageInfo): void
  setCurrentModel(model: string): void
  ensureMermaidPrompt?(): void
  removeLastAssistant?(): void
}

export interface UseAIStreamOptions {
  getMessages: () => ChatMessage[]
  getModel: () => string
  onComplete?: (content: string) => void
  onError?: (err: AIError) => void
}

function readRef<T>(r: Ref<T> | { value: T }): T {
  return r.value
}

function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useAIStream(store: AIStreamStore, options: UseAIStreamOptions) {
  async function sendMessage(input: string): Promise<void> {
    if (!input.trim()) return

    const userMessage: ChatMessage = { id: generateMessageId(), role: 'user', content: input.trim() }
    store.addMessage(userMessage)

    const assistantId = generateMessageId()
    store.addMessage({ id: assistantId, role: 'assistant', content: '' })

    store.setStreaming(true)
    store.setError(null)
    store.setThinkingContent('')
    store.setThinkingVisible(true)
    store.ensureMermaidPrompt?.()

    const ctrl = new AbortController()
    store.setAbortController(ctrl)

    const model = options.getModel()
    store.setCurrentModel(model)

    const accumContent: string[] = []
    let rafPending = false

    function scheduleUpdate() {
      if (rafPending) return
      rafPending = true
      requestAnimationFrame(() => {
        rafPending = false
        store.updateLastAssistantContent(accumContent.join(''))
      })
    }

    try {
      for await (const chunk of chatStream({
        messages: readRef(store.messages),
        model,
        signal: ctrl.signal,
      })) {
        const delta = chunk.choices?.[0]?.delta
        const finishReason = chunk.choices?.[0]?.finish_reason

        if (delta?.reasoning_content) {
          store.appendThinkingContent(delta.reasoning_content)
        }

        if (delta?.content) {
          accumContent.push(delta.content)
          scheduleUpdate()
        }

        if (finishReason === 'stop' || finishReason === 'length') {
          const finalContent = accumContent.join('')
          store.updateLastAssistantContent(finalContent)
          const u = (chunk as unknown as { usage?: UsageInfo | null }).usage
          if (u) {
            store.setUsage(u)
          }
          options.onComplete?.(finalContent)
          break
        }
      }
    } catch (err) {
      const aiErr = mapError(err, ctrl.signal)
      store.setError(aiErr)
      if (aiErr.type === 'aborted') {
        store.removeLastAssistant?.()
      } else {
        showAIErrorToast(aiErr)
      }
      options.onError?.(aiErr)
    } finally {
      store.setStreaming(false)
    }
  }

  function stopGeneration(): void {
    const ctrl = readRef(store.abortController)
    if (ctrl) {
      ctrl.abort()
      store.setAbortController(null)
    }
    store.setStreaming(false)
  }

  return { sendMessage, stopGeneration }
}
