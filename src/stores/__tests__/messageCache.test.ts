import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useMessageCacheStore } from '@/stores/messageCache'

function createMockMessage(id: number) {
  return { id, talker: 'test', content: `msg${id}`, createTime: Date.now() + id } as any
}

function createStore() {
  createTestingPinia({ stubActions: false, createSpy: vi.fn })
  return useMessageCacheStore()
}

describe('useMessageCacheStore', () => {
  let store: ReturnType<typeof useMessageCacheStore>

  beforeEach(() => {
    sessionStorage.clear()
    store = createStore()
    store.init()
  })

  describe('getOrFetch', () => {
    const sid = 'wxid_test'
    const messages = [createMockMessage(1), createMockMessage(2)]

    it('缓存命中时返回缓存数据，不调用 fetcher', async () => {
      store.set(sid, messages)
      const fetcher = vi.fn()

      const result = await store.getOrFetch(sid, fetcher)

      expect(result).toEqual(messages)
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('缓存未命中时调用 fetcher 并写入缓存', async () => {
      const fetcher = vi.fn().mockResolvedValue(messages)

      const result = await store.getOrFetch(sid, fetcher)

      expect(result).toEqual(messages)
      expect(fetcher).toHaveBeenCalledOnce()
      // 缓存已被写入
      const cached = store.get(sid)
      expect(cached).toEqual(messages)
    })

    it('fetcher 异常时返回空数组，不写入缓存', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('API error'))

      const result = await store.getOrFetch(sid, fetcher)

      expect(result).toEqual([])
      expect(fetcher).toHaveBeenCalledOnce()
      // 缓存未被写入
      const cached = store.get(sid)
      expect(cached).toBeNull()
    })

    it('fetcher 返回空数组时不写入缓存', async () => {
      const fetcher = vi.fn().mockResolvedValue([])

      const result = await store.getOrFetch(sid, fetcher)

      expect(result).toEqual([])
      expect(fetcher).toHaveBeenCalledOnce()
      const cached = store.get(sid)
      expect(cached).toBeNull()
    })
  })

  describe('get - 低频写入（spec scenario: 读取不触发全量重写）', () => {
    const sid = 'wxid_lowfreq'
    const messages = [createMockMessage(1), createMockMessage(2)]

    it('距上次访问 < TTL/4 时不重写缓存项', () => {
      store.set(sid, messages)
      const cacheKey = `chatlog_cache_${sid}`
      // 立即读取：距上次访问几乎为 0，远小于 TTL/4（30min/4 = 7.5min）
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      const result = store.get(sid)

      expect(result).toEqual(messages)
      // 不应重写缓存项本身（metadata 更新允许，但缓存项 JSON 不重写）
      const cacheItemWrite = setItemSpy.mock.calls.find(([k]) => k === cacheKey)
      expect(cacheItemWrite).toBeUndefined()
      setItemSpy.mockRestore()
    })

    it('距上次访问 ≥ TTL/4 时更新 lastAccess 并重写', () => {
      store.set(sid, messages)
      const cacheKey = `chatlog_cache_${sid}`
      // 手动将 lastAccess 设为足够久之前，触发更新
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const item = JSON.parse(raw)
        // 设为 10 分钟前（TTL/4 = 7.5 分钟，超过阈值）
        item.lastAccess = Date.now() - 10 * 60 * 1000
        sessionStorage.setItem(cacheKey, JSON.stringify(item))
      }

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      store.get(sid)

      // 应重写缓存项本身（更新 lastAccess）
      const cacheItemWrite = setItemSpy.mock.calls.find(([k]) => k === cacheKey)
      expect(cacheItemWrite).toBeDefined()
      setItemSpy.mockRestore()
    })
  })
})
