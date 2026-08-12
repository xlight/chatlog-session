/**
 * useAIStream 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAIStream, type AIStreamStore } from '@/composables/useAIStream'
import type {
  AIError,
  ChatCompletionChunk,
  ChatMessage,
  UsageInfo,
} from '@/types/ai'

vi.mock('@/api/llm', () => ({
  chatStream: vi.fn(),
  mapError: vi.fn(),
  showAIErrorToast: vi.fn(),
}))

import { chatStream, mapError, showAIErrorToast } from '@/api/llm'

interface MockStoreBundle {
  store: AIStreamStore
  spies: {
    addMessage: ReturnType<typeof vi.fn>
    updateLastAssistantContent: ReturnType<typeof vi.fn>
    appendThinkingContent: ReturnType<typeof vi.fn>
    setStreaming: ReturnType<typeof vi.fn>
    setAbortController: ReturnType<typeof vi.fn>
    setError: ReturnType<typeof vi.fn>
    setThinkingContent: ReturnType<typeof vi.fn>
    setThinkingVisible: ReturnType<typeof vi.fn>
    setUsage: ReturnType<typeof vi.fn>
    setCurrentModel: ReturnType<typeof vi.fn>
    ensureMermaidPrompt: ReturnType<typeof vi.fn>
    removeLastAssistant: ReturnType<typeof vi.fn>
    finalizeThinking: ReturnType<typeof vi.fn>
  }
}

function createMockStore(): MockStoreBundle {
  const messages = ref<ChatMessage[]>([])
  const streaming = ref(false)
  const abortController = ref<AbortController | null>(null)
  const error = ref<AIError | null>(null)
  const thinkingContent = ref('')
  const thinkingVisible = ref(false)

  const spies = {
    addMessage: vi.fn((msg: ChatMessage) => {
      messages.value.push(msg)
    }),
    updateLastAssistantContent: vi.fn((c: string) => {
      for (let i = messages.value.length - 1; i >= 0; i--) {
        if (messages.value[i].role === 'assistant') {
          messages.value[i] = { ...messages.value[i], content: c }
          return
        }
      }
    }),
    appendThinkingContent: vi.fn((d: string) => {
      thinkingContent.value += d
    }),
    setStreaming: vi.fn((v: boolean) => {
      streaming.value = v
    }),
    setAbortController: vi.fn((c: AbortController | null) => {
      abortController.value = c
    }),
    setError: vi.fn((e: AIError | null) => {
      error.value = e
    }),
    setThinkingContent: vi.fn((c: string) => {
      thinkingContent.value = c
    }),
    setThinkingVisible: vi.fn((v: boolean) => {
      thinkingVisible.value = v
    }),
    setUsage: vi.fn(),
    setCurrentModel: vi.fn(),
    ensureMermaidPrompt: vi.fn(),
    removeLastAssistant: vi.fn(() => {
      for (let i = messages.value.length - 1; i >= 0; i--) {
        if (messages.value[i].role === 'assistant') {
          messages.value.splice(i, 1)
          return
        }
      }
    }),
    finalizeThinking: vi.fn(() => {
      if (!thinkingContent.value) return
      for (let i = messages.value.length - 1; i >= 0; i--) {
        if (messages.value[i].role === 'assistant') {
          messages.value[i] = { ...messages.value[i], thinkingContent: thinkingContent.value }
          break
        }
      }
      thinkingContent.value = ''
    }),
  }

  const store: AIStreamStore = {
    messages,
    streaming,
    abortController,
    error,
    thinkingContent,
    thinkingVisible,
    ...spies,
  }
  return { store, spies }
}

function makeChunk(
  delta: { content?: string; reasoning_content?: string },
  finish: string | null = null,
  usage?: UsageInfo
): ChatCompletionChunk {
  return {
    id: 'chunk-id',
    object: 'chat.completion.chunk',
    created: Date.now(),
    model: 'test-model',
    choices: [{ index: 0, delta, finish_reason: finish }],
    usage: usage ?? null,
  }
}

async function* asyncGen(
  chunks: ChatCompletionChunk[]
): AsyncGenerator<ChatCompletionChunk, void, void> {
  for (const c of chunks) {
    yield c
  }
}

describe('useAIStream', () => {
  let bundle: MockStoreBundle

  beforeEach(() => {
    vi.clearAllMocks()
    // sendMessage 内部会调用 useMCPStore()，需要激活 Pinia
    setActivePinia(createPinia())
    bundle = createMockStore()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('sendMessage', () => {
    it('调用 addMessage 推入 user 与空 assistant 各一条', async () => {
      vi.mocked(chatStream).mockReturnValueOnce(asyncGen([makeChunk({}, 'stop')]))

      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'gpt-test',
      })

      await stream.sendMessage('你好')

      expect(bundle.spies.addMessage).toHaveBeenCalledTimes(2)
      const firstArg = bundle.spies.addMessage.mock.calls[0][0] as ChatMessage
      const secondArg = bundle.spies.addMessage.mock.calls[1][0] as ChatMessage
      expect(firstArg.role).toBe('user')
      expect(firstArg.content).toBe('你好')
      expect(secondArg.role).toBe('assistant')
      expect(secondArg.content).toBe('')
    })

    it('空白字符串不发送', async () => {
      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'm',
      })
      await stream.sendMessage('   ')
      expect(bundle.spies.addMessage).not.toHaveBeenCalled()
      expect(chatStream).not.toHaveBeenCalled()
    })

    it('content chunk 触发 setStreaming(true) 与 updateLastAssistantContent', async () => {
      vi.mocked(chatStream).mockReturnValueOnce(
        asyncGen([
          makeChunk({ content: 'Hello' }),
          makeChunk({ content: ' World' }),
          makeChunk({}, 'stop'),
        ])
      )

      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'm',
      })

      await stream.sendMessage('hi')

      expect(bundle.spies.setStreaming).toHaveBeenCalledWith(true)
      expect(bundle.spies.updateLastAssistantContent).toHaveBeenCalled()
      const calls = bundle.spies.updateLastAssistantContent.mock.calls
const lastCall = calls[calls.length - 1]
      expect(lastCall?.[0]).toBe('Hello World')
    })

    it('reasoning_content delta 触发 appendThinkingContent', async () => {
      vi.mocked(chatStream).mockReturnValueOnce(
        asyncGen([makeChunk({ reasoning_content: '思考中...' }), makeChunk({}, 'stop')])
      )

      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'm',
      })

      await stream.sendMessage('q')

      expect(bundle.spies.appendThinkingContent).toHaveBeenCalledWith('思考中...')
    })

    it('finish_reason=stop 触发 setUsage 与 onComplete 回调', async () => {
      const usage: UsageInfo = { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      vi.mocked(chatStream).mockReturnValueOnce(
        asyncGen([makeChunk({ content: 'done' }), makeChunk({}, 'stop', usage)])
      )

      const onComplete = vi.fn()
      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'm',
        onComplete,
      })

      await stream.sendMessage('q')

      expect(bundle.spies.setUsage).toHaveBeenCalledWith(usage)
      expect(onComplete).toHaveBeenCalledWith('done')
      expect(bundle.spies.setStreaming).toHaveBeenLastCalledWith(false)
    })

    it('aborted 错误时调用 removeLastAssistant，不触发 showAIErrorToast', async () => {
      vi.mocked(chatStream).mockImplementationOnce(() => {
        throw new Error('user abort')
      })
      const abortedErr: AIError = {
        type: 'aborted',
        message: '对话已停止',
        retryable: false,
      }
      vi.mocked(mapError).mockReturnValueOnce(abortedErr)

      const onError = vi.fn()
      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'm',
        onError,
      })

      await stream.sendMessage('q')

      expect(bundle.spies.removeLastAssistant).toHaveBeenCalledTimes(1)
      expect(showAIErrorToast).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(abortedErr)
      expect(bundle.spies.setError).toHaveBeenCalledWith(abortedErr)
    })

    it('非 aborted 错误时调用 showAIErrorToast 与 onError', async () => {
      vi.mocked(chatStream).mockImplementationOnce(() => {
        throw new Error('network down')
      })
      const netErr: AIError = {
        type: 'network_error',
        message: '无法连接到 LLM 服务',
        retryable: true,
      }
      vi.mocked(mapError).mockReturnValueOnce(netErr)

      const onError = vi.fn()
      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'm',
        onError,
      })

      await stream.sendMessage('q')

      expect(showAIErrorToast).toHaveBeenCalledWith(netErr)
      expect(onError).toHaveBeenCalledWith(netErr)
      expect(bundle.spies.removeLastAssistant).not.toHaveBeenCalled()
    })
  })

  describe('stopGeneration', () => {
    it('调用 controller.abort 并将 controller 置 null、setStreaming(false)', () => {
      const ctrl = new AbortController()
      const abortSpy = vi.spyOn(ctrl, 'abort')
      bundle.store.setAbortController(ctrl)

      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'm',
      })

      stream.stopGeneration()

      expect(abortSpy).toHaveBeenCalledTimes(1)
      expect(bundle.spies.setAbortController).toHaveBeenLastCalledWith(null)
      expect(bundle.spies.setStreaming).toHaveBeenLastCalledWith(false)
    })

    it('controller 为 null 时只调用 setStreaming(false)', () => {
      const stream = useAIStream(bundle.store, {
        getMessages: () => bundle.store.messages.value,
        getModel: () => 'm',
      })

      stream.stopGeneration()

      expect(bundle.spies.setStreaming).toHaveBeenLastCalledWith(false)
      expect(bundle.spies.setAbortController).not.toHaveBeenCalled()
    })
  })
})
