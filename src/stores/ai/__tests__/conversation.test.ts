import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useAIConversationStore } from '@/stores/ai/conversation'
import type { ChatMessage } from '@/types/ai'

function createStore() {
  const pinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
    plugins: [piniaPluginPersistedstate],
  })
  setActivePinia(pinia)
  return useAIConversationStore(pinia)
}

const SESSION_A = 'session_a'

const SAMPLE_MSG: ChatMessage = {
  role: 'user',
  content: '你好',
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('saveToSession', () => {
  it('将当前对话状态保存到 sessionStorage', () => {
    const store = createStore()
    store.addMessage(SAMPLE_MSG)
    store.hasMermaidPrompt = true
    store.thinkingContent = '思考中...'

    store.saveToSession(SESSION_A)

    const raw = sessionStorage.getItem(`chatlog_ai_conv_${SESSION_A}`)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.version).toBe(1)
    expect(parsed.messages).toHaveLength(1)
    expect(parsed.messages[0].content).toBe('你好')
    expect(parsed.hasMermaidPrompt).toBe(true)
    expect(parsed.thinkingContent).toBe('思考中...')
  })

  it('不保存 currentModel 和 lastReply', () => {
    const store = createStore()
    store.addMessage(SAMPLE_MSG)
    store.setCurrentModel('gpt-4')
    store.setLastReply({ messageId: '1', content: '草稿', promptType: 'reply', sourceMessageId: '1', generatedAt: Date.now(), injected: false })

    store.saveToSession(SESSION_A)

    const raw = sessionStorage.getItem(`chatlog_ai_conv_${SESSION_A}`)
    const parsed = JSON.parse(raw!)
    expect(parsed).not.toHaveProperty('currentModel')
    expect(parsed).not.toHaveProperty('lastReply')
  })

  it('消息超过 100 条时正确截断', () => {
    const store = createStore()
    for (let i = 0; i < 150; i++) {
      store.addMessage({ role: 'user', content: `msg-${i}` })
    }

    store.saveToSession(SESSION_A)

    const raw = sessionStorage.getItem(`chatlog_ai_conv_${SESSION_A}`)
    const parsed = JSON.parse(raw!)
    expect(parsed.messages).toHaveLength(100)
    expect(parsed.messages[0].content).toBe('msg-0')
    expect(parsed.messages[99].content).toBe('msg-99')
  })
})

describe('loadFromSession', () => {
  it('恢复已保存的对话状态', () => {
    const store = createStore()
    // 先保存一些数据
    store.addMessage(SAMPLE_MSG)
    store.hasMermaidPrompt = true
    store.thinkingContent = '推理中'
    store.saveToSession(SESSION_A)

    // 新建 store 实例
    const store2 = createStore()

    const tags = store2.loadFromSession(SESSION_A)

    expect(store2.messages).toHaveLength(1)
    expect(store2.messages[0].content).toBe('你好')
    expect(store2.hasMermaidPrompt).toBe(true)
    expect(store2.thinkingContent).toBe('推理中')
    expect(tags).toEqual([])
  })

  it('版本号不匹配时清除数据并返回空数组', () => {
    const store = createStore()
    store.addMessage(SAMPLE_MSG)
    // 手动写入版本号为 0 的数据
    const key = `chatlog_ai_conv_${SESSION_A}`
    sessionStorage.setItem(key, JSON.stringify({
      version: 0,
      messages: [{ role: 'user', content: '旧格式数据' }],
      hasMermaidPrompt: false,
      thinkingContent: '',
      thinkingVisible: true,
      contextTags: [],
    }))

    // 实际使用流程中 loadFromSession 前会先 clearConversation
    store.clearConversation()
    const tags = store.loadFromSession(SESSION_A)

    expect(store.messages).toHaveLength(0)
    expect(tags).toEqual([])
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it('数据损坏时静默降级', () => {
    const store = createStore()
    const key = `chatlog_ai_conv_${SESSION_A}`
    sessionStorage.setItem(key, 'invalid json{{{')

    const tags = store.loadFromSession(SESSION_A)

    expect(store.messages).toHaveLength(0)
    expect(tags).toEqual([])
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it('无保存数据时返回空数组', () => {
    const store = createStore()
    const tags = store.loadFromSession('nonexistent')
    expect(tags).toEqual([])
    expect(store.messages).toHaveLength(0)
  })
})

describe('removeSession', () => {
  it('删除 sessionStorage 中的对应数据', () => {
    const store = createStore()
    store.addMessage(SAMPLE_MSG)
    store.saveToSession(SESSION_A)

    expect(sessionStorage.getItem(`chatlog_ai_conv_${SESSION_A}`)).not.toBeNull()

    store.removeSession(SESSION_A)

    expect(sessionStorage.getItem(`chatlog_ai_conv_${SESSION_A}`)).toBeNull()
  })

  it('不存在的 key 不会报错', () => {
    const store = createStore()
    expect(() => store.removeSession('nonexistent')).not.toThrow()
  })
})

describe('上下文切换流程', () => {
  it('切换后恢复时保留 contextTags', () => {
    const store = createStore()
    store.addMessage(SAMPLE_MSG)
    const tags = [
      {
        id: 'ctx-1',
        sessionId: SESSION_A,
        sessionName: '测试会话',
        messageCount: 10,
        timeRange: '10:00 ~ 11:00',
        fedAt: Date.now(),
      },
    ]
    store.saveToSession(SESSION_A, tags)

    // 切到 B 再切回 A
    store.clearConversation()
    const restored = store.loadFromSession(SESSION_A)

    expect(store.messages).toHaveLength(1)
    expect(store.messages[0].content).toBe('你好')
    expect(restored).toEqual(tags)
  })

  it('不传 contextTags 时恢复为空数组（兼容旧调用）', () => {
    const store = createStore()
    store.addMessage(SAMPLE_MSG)
    store.saveToSession(SESSION_A)

    store.clearConversation()
    const restored = store.loadFromSession(SESSION_A)

    expect(restored).toEqual([])
  })
})
