import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useContactStore } from '@/stores/contact'
import { ContactType } from '@/types/contact'

// mock 依赖
vi.mock('@/api/contact', () => ({
  contactAPI: {
    getContacts: vi.fn(),
    getContact: vi.fn(),
  },
  getAvatarUrl: vi.fn(() => ''),
}))

vi.mock('@/utils/db', () => ({
  db: {
    init: vi.fn(),
    getAllContacts: vi.fn(() => Promise.resolve([])),
    saveContacts: vi.fn(() => Promise.resolve()),
    getContact: vi.fn(),
  },
}))

const makeContact = (wxid: string, nickname: string, type: ContactType, sortKey = '', lastContactTime = 0) => ({
  wxid,
  nickname,
  type,
  sortKey,
  lastContactTime,
})

describe('useContactStore - filteredContacts（spec: 大列表过滤排序缓存）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('搜索先过滤后排序（spec scenario: 搜索先过滤后排序）', () => {
    const store = useContactStore()
    const contacts = [
      makeContact('wxid_1', '张三', ContactType.Friend, 'zhangsan', 100),
      makeContact('wxid_2', '李四', ContactType.Friend, 'lisi', 200),
      makeContact('wxid_3', '张伟', ContactType.Friend, 'zhangwei', 300),
    ]
    store.contacts = contacts
    store.setSortBy('pinyin')
    store.setSearchKeyword('张')

    const result = store.filteredContacts
    // 过滤后只剩张三、张伟
    expect(result).toHaveLength(2)
    expect(result.map((c) => c.wxid)).toEqual(['wxid_1', 'wxid_3'])
  })

  it('排序结果复用：条件未变化时多次读取返回一致（spec scenario: 排序结果复用）', () => {
    const store = useContactStore()
    const contacts = [
      makeContact('wxid_1', '张三', ContactType.Friend, 'zhangsan', 100),
      makeContact('wxid_2', '李四', ContactType.Friend, 'lisi', 200),
    ]
    store.contacts = contacts
    store.setSortBy('pinyin')

    const r1 = store.filteredContacts
    const r2 = store.filteredContacts
    // computed 缓存：同一依赖下多次读取返回同一引用
    expect(r1).toBe(r2)
    // 排序按 sortKey：lisi < zhangsan
    expect(r1.map((c) => c.wxid)).toEqual(['wxid_2', 'wxid_1'])
  })

  it('按类型筛选（filterType=friend）', () => {
    const store = useContactStore()
    store.contacts = [
      makeContact('wxid_1', '张三', ContactType.Friend, 'a'),
      makeContact('wxid_2', '群聊A', ContactType.Chatroom, 'b'),
      makeContact('wxid_3', '公众号A', ContactType.Official, 'c'),
    ]
    store.setFilterType('friend')
    expect(store.filteredContacts).toHaveLength(1)
    expect(store.filteredContacts[0].wxid).toBe('wxid_1')
  })

  it('按 time 排序使用 lastContactTime 降序', () => {
    const store = useContactStore()
    store.contacts = [
      makeContact('wxid_1', 'A', ContactType.Friend, 'a', 100),
      makeContact('wxid_2', 'B', ContactType.Friend, 'b', 300),
      makeContact('wxid_3', 'C', ContactType.Friend, 'c', 200),
    ]
    store.setSortBy('time')
    const result = store.filteredContacts
    expect(result.map((c) => c.wxid)).toEqual(['wxid_2', 'wxid_3', 'wxid_1'])
  })

  it('空关键词返回全部（仅排序）', () => {
    const store = useContactStore()
    store.contacts = [
      makeContact('wxid_1', 'A', ContactType.Friend, 'a'),
      makeContact('wxid_2', 'B', ContactType.Friend, 'b'),
    ]
    store.setSearchKeyword('')
    expect(store.filteredContacts).toHaveLength(2)
  })

  it('20000+ 联系人搜索/排序不阻塞主线程（spec scenario: 大列表性能）', () => {
    const store = useContactStore()
    // 构造 20000 联系人
    const bigList = Array.from({ length: 20000 }, (_, i) =>
      makeContact(`wxid_${i}`, `用户${i}`, ContactType.Friend, `user${i.toString().padStart(5, '0')}`, i),
    )
    store.contacts = bigList
    store.setSortBy('pinyin')
    store.setSearchKeyword('用户1')

    const start = performance.now()
    const result = store.filteredContacts
    const elapsed = performance.now() - start

    // 过滤后应只剩名字含 "用户1" 的（用户1, 用户10-19, 用户100-199, 用户1000-1999, 用户10000-19999）
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThan(20000)
    // 单次计算应 < 500ms（不阻塞主线程；含 pinyin 搜索，宽松阈值避免 CI 抖动）
    expect(elapsed).toBeLessThan(500)
  })
})
