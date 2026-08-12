import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Message } from '@/types/message'
import { useMessageCacheStore } from '@/stores/messageCache'
import { useContextFeed } from '@/composables/useContextFeed'

function makeMessage(id: number, createTime: number): Message {
  return {
    id,
    seq: id,
    createTime,
    time: new Date(createTime * 1000).toISOString(),
    talker: 'talker',
    talkerName: 'talker',
    sender: 'sender',
    senderName: 'sender',
    isSelf: false,
    isSend: 0,
    isChatRoom: false,
    type: 1,
    subType: 0,
    content: `消息${id}`,
  }
}

function freshFeed() {
  sessionStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const feed = useContextFeed()
  return { feed, cacheStore: useMessageCacheStore(pinia) }
}

describe('useContextFeed feedCachedContext（自动投喂）', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('缓存为空时返回空字符串且不添加标签', () => {
    const { feed } = freshFeed()
    const result = feed.feedCachedContext('s1', 200)
    expect(result).toBe('')
    expect(feed.contextTags.value).toHaveLength(0)
  })

  it('缓存不足 limit 时投喂全部并记录标签', () => {
    const { feed, cacheStore } = freshFeed()
    cacheStore.set(
      's1',
      Array.from({ length: 50 }, (_, i) => makeMessage(i + 1, 1000 + i))
    )

    const result = feed.feedCachedContext('s1', 200)

    const lines = result.split('\n')
    expect(lines).toHaveLength(50)
    expect(feed.contextTags.value).toHaveLength(1)
    expect(feed.contextTags.value[0].messageCount).toBe(50)
    expect(feed.contextTags.value[0].timeRange).toContain('~')
    expect(feed.contextTags.value[0].sessionId).toBe('s1')
  })

  it('缓存超过 limit 时只投喂最近 limit 条', () => {
    const { feed, cacheStore } = freshFeed()
    cacheStore.set(
      's1',
      Array.from({ length: 250 }, (_, i) => makeMessage(i + 1, 1000 + i))
    )

    const result = feed.feedCachedContext('s1', 200)

    const lines = result.split('\n')
    expect(lines).toHaveLength(200)
    expect(feed.contextTags.value[0].messageCount).toBe(200)
    // 取的是最近 200 条：首条为消息51、末条为最新消息250
    expect(lines[0]).toContain('消息51')
    expect(lines[199]).toContain('消息250')
    expect(result).not.toContain('sender: 消息1\n')
  })

  it('多次投喂追加标签', () => {
    const { feed, cacheStore } = freshFeed()
    cacheStore.set(
      's1',
      Array.from({ length: 10 }, (_, i) => makeMessage(i + 1, 1000 + i))
    )

    feed.feedCachedContext('s1', 200)
    feed.feedCachedContext('s1', 200)

    expect(feed.contextTags.value).toHaveLength(2)
  })
})
