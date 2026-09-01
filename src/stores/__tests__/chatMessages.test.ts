import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatMessagesStore } from '@/stores/chatMessages'
import type { Message } from '@/types/message'

// mock 依赖
vi.mock('@/utils/db', () => ({
  db: {
    init: vi.fn(),
    getAllContacts: vi.fn(() => Promise.resolve([])),
    saveContacts: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@/stores/messageCache', () => ({
  useMessageCacheStore: () => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
    getStats: vi.fn(() => ({ items: [], totalSize: 0, itemCount: 0 })),
  }),
}))

const makeMessage = (type: number, seq: number, content = ''): Message => ({
  id: seq,
  seq,
  time: '2026-01-01T10:00:00+08:00',
  createTime: 1735689600,
  talker: 'wxid_test',
  talkerName: '测试',
  sender: 'wxid_sender',
  senderName: '发送者',
  isSelf: false,
  isSend: 0,
  isChatRoom: false,
  type: type as never,
  subType: 0,
  content,
})

describe('useChatMessagesStore - classifiedMessages（spec: 消息分类单遍计算）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('单遍分类产出 media/image/video/file（spec scenario: 单遍分类）', () => {
    const store = useChatMessagesStore()
    const messages = [
      makeMessage(1, 1, '文本'), // 文本，不分类
      makeMessage(3, 2, '图片'), // image + media
      makeMessage(43, 3, '视频'), // video + media
      makeMessage(49, 4, '文件'), // file + media
      makeMessage(34, 5, '语音'), // media only
      makeMessage(47, 6, '表情'), // media only
      makeMessage(1, 7, '文本2'), // 文本，不分类
    ]
    store.messages = messages
    store.currentTalker = 'wxid_test'

    expect(store.imageMessages.map((m) => m.seq)).toEqual([2])
    expect(store.videoMessages.map((m) => m.seq)).toEqual([3])
    expect(store.fileMessages.map((m) => m.seq)).toEqual([4])
    // media = image + video + file + 语音(34) + 表情(47)
    expect(store.mediaMessages.map((m) => m.seq)).toEqual([2, 3, 4, 5, 6])
  })

  it('空消息集合返回空分类', () => {
    const store = useChatMessagesStore()
    store.messages = []
    store.currentTalker = 'wxid_test'

    expect(store.mediaMessages).toHaveLength(0)
    expect(store.imageMessages).toHaveLength(0)
    expect(store.videoMessages).toHaveLength(0)
    expect(store.fileMessages).toHaveLength(0)
  })

  it('非媒体类型不进入任何分类', () => {
    const store = useChatMessagesStore()
    store.messages = [
      makeMessage(1, 1, '文本'),
      makeMessage(100, 2, '系统消息'),
      makeMessage(42, 3, '名片'),
    ]
    store.currentTalker = 'wxid_test'

    expect(store.mediaMessages).toHaveLength(0)
    expect(store.imageMessages).toHaveLength(0)
    expect(store.videoMessages).toHaveLength(0)
    expect(store.fileMessages).toHaveLength(0)
  })

  it('多次读取复用 computed 缓存（不重复遍历）', () => {
    const store = useChatMessagesStore()
    store.messages = [makeMessage(3, 1, '图片'), makeMessage(49, 2, '文件')]
    store.currentTalker = 'wxid_test'

    const m1 = store.mediaMessages
    const m2 = store.mediaMessages
    // computed 缓存：同一依赖下返回同一引用
    expect(m1).toBe(m2)
  })
})
