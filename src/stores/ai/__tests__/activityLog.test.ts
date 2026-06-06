/**
 * useAIActivityLogStore 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { nextTick } from 'vue'
import { useAIActivityLogStore } from '@/stores/ai/activityLog'

function createStore() {
  const pinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
    plugins: [piniaPluginPersistedstate],
  })
  setActivePinia(pinia)
  return useAIActivityLogStore(pinia)
}

describe('useAIActivityLogStore', () => {
  let store: ReturnType<typeof createStore>
  let uuidCounter = 0

  beforeEach(() => {
    sessionStorage.clear()
    uuidCounter = 0
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      () => `log-${++uuidCounter}-0000-0000-0000-000000000000` as `${string}-${string}-${string}-${string}-${string}`
    )
    store = createStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('addEntry', () => {
    it('推入新条目并自动生成 id / timestamp', () => {
      store.addEntry('console_chat', '发送消息', 'sess-1')

      expect(store.entries.length).toBe(1)
      const e = store.entries[0]
      expect(e.id).toBe('log-1-0000-0000-0000-000000000000')
      expect(e.action).toBe('console_chat')
      expect(e.detail).toBe('发送消息')
      expect(e.sessionId).toBe('sess-1')
      expect(e.timestamp).toBeTypeOf('number')
    })

    it('sessionId 可省略', () => {
      store.addEntry('ai_reply', '回复成功')
      expect(store.entries[0].sessionId).toBeUndefined()
    })
  })

  describe('recentEntries', () => {
    it('按 timestamp 倒序返回最多 50 条', () => {
      const baseTs = 1_700_000_000_000
      for (let i = 0; i < 60; i++) {
        vi.spyOn(Date, 'now').mockReturnValueOnce(baseTs + i * 1000)
        store.addEntry('console_chat', `第 ${i} 条`)
      }
      const recent = store.recentEntries
      expect(recent.length).toBe(50)
      expect(recent[0].detail).toBe('第 59 条')
      expect(recent[49].detail).toBe('第 10 条')
    })
  })

  describe('getPaginated', () => {
    beforeEach(() => {
      const baseTs = 1_700_000_000_000
      for (let i = 0; i < 25; i++) {
        vi.spyOn(Date, 'now').mockReturnValueOnce(baseTs + i * 1000)
        store.addEntry('console_chat', `n-${i}`)
      }
    })

    it('第 1 页返回前 10 条（按 ts 倒序）', () => {
      const page = store.getPaginated(1, 10)
      expect(page.length).toBe(10)
      expect(page[0].detail).toBe('n-24')
      expect(page[9].detail).toBe('n-15')
    })

    it('越界 page 返回空数组', () => {
      const page = store.getPaginated(99, 10)
      expect(page).toEqual([])
    })

    it('page < 1 也返回空数组', () => {
      const page = store.getPaginated(0, 10)
      expect(page).toEqual([])
    })
  })

  describe('clearAll', () => {
    it('清空 entries', () => {
      store.addEntry('console_chat', 'a')
      store.addEntry('ai_reply', 'b')
      expect(store.entries.length).toBe(2)
      store.clearAll()
      expect(store.entries).toEqual([])
    })
  })

  describe('sessionStorage 持久化', () => {
    it('mutation 后 sessionStorage 写入 entries', async () => {
      store.addEntry('context_feed', '投喂上下文', 'sid-x')
      await nextTick()

      const raw = sessionStorage.getItem('aiActivityLog')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!) as Record<string, unknown>
      expect(parsed.entries).toBeDefined()
      expect(Array.isArray(parsed.entries)).toBe(true)
    })
  })
})
