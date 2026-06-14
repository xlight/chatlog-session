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
})
