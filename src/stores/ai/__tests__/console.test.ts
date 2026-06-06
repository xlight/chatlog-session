/**
 * useAIConsoleStore 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { nextTick } from 'vue'
import { useAIConsoleStore } from '@/stores/ai/console'
import type { ChatMessage } from '@/types/ai'
import type { ContextSource } from '@/types/ai/console'

function createStore() {
  const pinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
    plugins: [piniaPluginPersistedstate],
  })
  setActivePinia(pinia)
  return useAIConsoleStore(pinia)
}

const SAMPLE_CONTEXT: ContextSource = {
  sessionId: 'wxid_xxx',
  sessionName: '测试会话',
  messageCount: 10,
  timeRange: '2026-01-01 ~ 2026-01-02',
  fedAt: 1700000000000,
}

describe('useAIConsoleStore', () => {
  let store: ReturnType<typeof createStore>
  let uuidCounter = 0

  beforeEach(() => {
    sessionStorage.clear()
    uuidCounter = 0
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      () => `uuid-${++uuidCounter}-0000-0000-0000-000000000000` as `${string}-${string}-${string}-${string}-${string}`
    )
    store = createStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== createSession ====================

  describe('createSession', () => {
    it('默认 auto-title 形如 "对话 月/日"', () => {
      const id = store.createSession()
      const session = store.sessions.find((s) => s.id === id)!
      expect(session.title).toMatch(/^对话 \d{1,2}\/\d{1,2}$/)
      expect(session.id).toBe('uuid-1-0000-0000-0000-000000000000')
      expect(store.currentSessionId).toBe(id)
    })

    it('支持自定义 title', () => {
      const id = store.createSession('我的自定义标题')
      expect(store.sessions.find((s) => s.id === id)!.title).toBe('我的自定义标题')
    })

    it('第 51 个会话抛错（上限 50）', () => {
      for (let i = 0; i < 50; i++) {
        store.createSession(`s-${i}`)
      }
      expect(() => store.createSession('overflow')).toThrowError(/上限/)
      expect(store.sessions.length).toBe(50)
    })
  })

  // ==================== switchSession ====================

  describe('switchSession', () => {
    it('切到不存在的 id 时 currentSessionId 不变', () => {
      const id = store.createSession('a')
      store.switchSession('non-exist-id')
      expect(store.currentSessionId).toBe(id)
    })

    it('切到存在的 id 时 currentSessionId 更新', () => {
      const a = store.createSession('a')
      const b = store.createSession('b')
      store.switchSession(a)
      expect(store.currentSessionId).toBe(a)
      store.switchSession(b)
      expect(store.currentSessionId).toBe(b)
    })
  })

  // ==================== deleteSession ====================

  describe('deleteSession', () => {
    it('删除时自动 abort streamingMap 中的状态', () => {
      const id = store.createSession('s1')
      const ctrl = new AbortController()
      const abortSpy = vi.spyOn(ctrl, 'abort')
      store.setAbortController(id, ctrl)
      store.setStreaming(id, true)

      store.deleteSession(id)

      expect(abortSpy).toHaveBeenCalledTimes(1)
      expect(store.streamingMap[id]).toBeUndefined()
      expect(store.abortControllers[id]).toBeUndefined()
    })

    it('删除当前 active session 后切换到第一个剩余会话', () => {
      const a = store.createSession('a')
      const b = store.createSession('b')
      store.switchSession(b)
      expect(store.currentSessionId).toBe(b)

      store.deleteSession(b)

      expect(store.sessions.length).toBe(1)
      expect(store.currentSessionId).toBe(a)
    })

    it('删除最后一个会话后 currentSessionId 变 null', () => {
      const id = store.createSession('only')
      store.deleteSession(id)
      expect(store.currentSessionId).toBeNull()
    })
  })

  // ==================== addMessage ====================

  describe('addMessage', () => {
    it('给消息自动加 id（基于 crypto.randomUUID）', () => {
      const sid = store.createSession()
      const msg: ChatMessage = { role: 'user', content: '你好' }
      store.addMessage(sid, msg)
      const session = store.sessions.find((s) => s.id === sid)!
      expect(session.messages.length).toBe(1)
      expect(session.messages[0].id).toMatch(/^uuid-\d+-/)
      expect(session.messages[0].content).toBe('你好')
    })

    it('已带 id 的消息保持原 id', () => {
      const sid = store.createSession()
      store.addMessage(sid, { id: 'custom-id', role: 'user', content: 'hi' })
      const session = store.sessions.find((s) => s.id === sid)!
      expect(session.messages[0].id).toBe('custom-id')
    })

    it('不存在的 sessionId 静默 (不抛错)', () => {
      expect(() =>
        store.addMessage('not-exists', { role: 'user', content: 'x' })
      ).not.toThrow()
    })
  })

  // ==================== updateLastContent ====================

  describe('updateLastContent', () => {
    it('找到最后一条 assistant 消息并修改 content', () => {
      const sid = store.createSession()
      store.addMessage(sid, { role: 'user', content: 'q1' })
      store.addMessage(sid, { role: 'assistant', content: 'old' })
      store.addMessage(sid, { role: 'user', content: 'q2' })

      store.updateLastContent(sid, 'new content')

      const session = store.sessions.find((s) => s.id === sid)!
      const lastAssistant = [...session.messages].reverse().find((m) => m.role === 'assistant')!
      expect(lastAssistant.content).toBe('new content')
    })

    it('没有 assistant 消息时不抛错', () => {
      const sid = store.createSession()
      store.addMessage(sid, { role: 'user', content: 'q' })
      expect(() => store.updateLastContent(sid, 'x')).not.toThrow()
    })
  })

  // ==================== appendStreamContent ====================

  describe('appendStreamContent', () => {
    it('累加 delta 到最后一条 assistant 消息', () => {
      const sid = store.createSession()
      store.addMessage(sid, { role: 'assistant', content: 'Hello' })
      store.appendStreamContent(sid, ' World')
      store.appendStreamContent(sid, '!')

      const session = store.sessions.find((s) => s.id === sid)!
      expect(session.messages[0].content).toBe('Hello World!')
    })

    it('没有 assistant 时新建一条 assistant 消息', () => {
      const sid = store.createSession()
      store.appendStreamContent(sid, 'init')
      const session = store.sessions.find((s) => s.id === sid)!
      expect(session.messages.length).toBe(1)
      expect(session.messages[0].role).toBe('assistant')
      expect(session.messages[0].content).toBe('init')
    })
  })

  // ==================== feedContext ====================

  describe('feedContext', () => {
    it('追加 system message 并记录 contextFeed', () => {
      const sid = store.createSession()
      store.feedContext(sid, '【背景上下文】abc', SAMPLE_CONTEXT)

      const session = store.sessions.find((s) => s.id === sid)!
      expect(session.messages[0].role).toBe('system')
      expect(session.messages[0].content).toBe('【背景上下文】abc')
      expect(session.contextFeed).toEqual([SAMPLE_CONTEXT])
    })

    it('空 contextText 不写入', () => {
      const sid = store.createSession()
      store.feedContext(sid, '', SAMPLE_CONTEXT)

      const session = store.sessions.find((s) => s.id === sid)!
      expect(session.messages.length).toBe(0)
      expect(session.contextFeed ?? []).toEqual([])
    })
  })

  // ==================== streaming 控制 ====================

  describe('streaming 控制', () => {
    it('setStreaming(true) → isStreaming(id) 返回 true', () => {
      const sid = store.createSession()
      store.setStreaming(sid, true)
      expect(store.isStreaming(sid)).toBe(true)
      expect(store.streamingMap[sid]).toBe(true)
    })

    it('setStreaming(false) 时 abortController 被清 null', () => {
      const sid = store.createSession()
      store.setAbortController(sid, new AbortController())
      store.setStreaming(sid, false)
      expect(store.abortControllers[sid]).toBeNull()
    })

    it('abortStream 清 streamingMap[id] 为 false 并 abort controller', () => {
      const sid = store.createSession()
      const ctrl = new AbortController()
      const abortSpy = vi.spyOn(ctrl, 'abort')
      store.setAbortController(sid, ctrl)
      store.setStreaming(sid, true)

      store.abortStream(sid)

      expect(abortSpy).toHaveBeenCalledTimes(1)
      expect(store.streamingMap[sid]).toBe(false)
      expect(store.abortControllers[sid]).toBeNull()
    })

    it('abortAllStreams 清掉所有会话的流式状态', () => {
      const a = store.createSession('a')
      const b = store.createSession('b')
      const ctrlA = new AbortController()
      const ctrlB = new AbortController()
      const spyA = vi.spyOn(ctrlA, 'abort')
      const spyB = vi.spyOn(ctrlB, 'abort')
      store.setAbortController(a, ctrlA)
      store.setAbortController(b, ctrlB)
      store.setStreaming(a, true)
      store.setStreaming(b, true)

      store.abortAllStreams()

      expect(spyA).toHaveBeenCalledTimes(1)
      expect(spyB).toHaveBeenCalledTimes(1)
      expect(store.streamingMap[a]).toBe(false)
      expect(store.streamingMap[b]).toBe(false)
    })
  })

  // ==================== getStats ====================

  describe('getStats', () => {
    it('返回正确的统计信息', () => {
      const a = store.createSession('a')
      store.addMessage(a, { role: 'user', content: '1' })
      store.addMessage(a, { role: 'assistant', content: '2' })
      const b = store.createSession('b')
      store.addMessage(b, { role: 'user', content: '3' })

      const stats = store.getStats()
      expect(stats.totalSessions).toBe(2)
      expect(stats.totalMessages).toBe(3)
      expect(stats.lastActivityAt).toBeTypeOf('number')
    })

    it('空 store 时 lastActivityAt 为 null', () => {
      const stats = store.getStats()
      expect(stats.totalSessions).toBe(0)
      expect(stats.totalMessages).toBe(0)
      expect(stats.lastActivityAt).toBeNull()
    })
  })

  // ==================== $reset ====================

  describe('$reset', () => {
    it('清空所有 state 并触发 abortAllStreams', () => {
      const sid = store.createSession('a')
      const ctrl = new AbortController()
      const abortSpy = vi.spyOn(ctrl, 'abort')
      store.setAbortController(sid, ctrl)
      store.setStreaming(sid, true)
      store.switchTab('overview')

      store.$reset()

      expect(abortSpy).toHaveBeenCalledTimes(1)
      expect(store.sessions).toEqual([])
      expect(store.currentSessionId).toBeNull()
      expect(store.activeTab).toBe('chat')
      expect(store.streamingMap).toEqual({})
      expect(store.abortControllers).toEqual({})
      expect(store.errorsBySession).toEqual({})
    })
  })

  // ==================== persist ====================

  describe('sessionStorage 持久化', () => {
    it('mutation 后 sessionStorage 写入 sessions/currentSessionId/activeTab', async () => {
      const sid = store.createSession('persisted')
      store.switchTab('overview')
      await nextTick()

      const raw = sessionStorage.getItem('aiConsole')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!) as Record<string, unknown>
      expect(parsed.sessions).toBeDefined()
      expect(parsed.currentSessionId).toBe(sid)
      expect(parsed.activeTab).toBe('overview')
    })
  })
})
