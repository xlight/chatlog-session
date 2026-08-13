import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSearchStore } from '@/stores/search'
import { searchAPI } from '@/api/search'

vi.mock('@/api/search', () => ({
  searchAPI: {
    search: vi.fn(),
  },
}))

const mockSearch = searchAPI.search as unknown as ReturnType<typeof vi.fn>

// searchAPI.search 已做响应转换（api 层测试覆盖），此处 mock 返回转换后结构
const frontendMessage = (seq: number, content: string, time = '2026-01-01T10:00:00+08:00') => ({
  id: seq,
  seq,
  time,
  createTime: Math.floor(new Date(time).getTime() / 1000),
  talker: 'wxid_a',
  talkerName: '会话A',
  isChatRoom: false,
  sender: 'wxid_b',
  senderName: '发送者B',
  isSelf: false,
  isSend: 0,
  type: 1,
  subType: 0,
  content,
})

const hit = (seq: number, content: string) => ({ message: frontendMessage(seq, content), snippet: '…命中…', score: -seq })

const backendResponse = {
  hits: [hit(1000000000001, '命中关键词的消息内容'), hit(1000000000002, '另一条命中')],
  total: 2,
  duration_ms: 12,
  index_status: {
    ready: true,
    in_progress: false,
    progress: 1,
    last_completed_at: '2026-01-01T00:00:00Z',
    last_started_at: '2026-01-01T00:00:00Z',
    last_error: '',
  },
  query: '关键词',
  talker: '',
  sender: '',
  start: '2025-01-01',
  end: '2026-01-01',
  limit: 50,
  offset: 0,
}

describe('search store - 全文搜索（searchAPI）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 用 resetAllMocks 清空实现与 mockResolvedValueOnce 队列，防跨用例污染
    vi.resetAllMocks()
  })

  it('scope=session 且无 talker 时不发起请求并返回空', async () => {
    const store = useSearchStore()
    const result = await store.searchMessages({ keyword: '关键词', scope: 'session' })

    expect(result).toEqual([])
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('scope=all 无 talker 时发起全局搜索并映射后端 scope=all', async () => {
    mockSearch.mockResolvedValue(backendResponse)
    const store = useSearchStore()

    const result = await store.searchMessages({ keyword: '关键词', scope: 'all' })

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: '关键词', scope: 'all', talker: undefined })
    )
    expect(result).toHaveLength(2)
    expect(store.totalCount).toBe(2)
    expect(store.hasMore).toBe(false)
    // hits 同时挂到 searchHits（含 snippet/score）与 messageResults（Message）
    expect(store.searchHits).toHaveLength(2)
    expect(store.searchHits[0].snippet).toBe('…命中…')
    expect(store.messageResults[0].content).toBe('命中关键词的消息内容')
  })

  it('scope=session 带 talker 时请求 scope=messages 且携带 talker', async () => {
    mockSearch.mockResolvedValue({ ...backendResponse, total: 0, hits: [] })
    const store = useSearchStore()

    await store.searchMessages({ keyword: '关键词', scope: 'session', talker: 'wxid_a' })

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: '关键词', scope: 'messages', talker: 'wxid_a' })
    )
  })

  it('时间范围默认最近一年（start/end 日期）', async () => {
    mockSearch.mockResolvedValue({ ...backendResponse, hits: [] })
    const store = useSearchStore()

    await store.searchMessages({ keyword: '关键词', scope: 'all' })

    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    const expectedStart = lastYear.toISOString().split('T')[0]
    const expectedEnd = new Date().toISOString().split('T')[0]
    expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ start: expectedStart, end: expectedEnd }))
  })

  it('索引未就绪时挂载 index_status 到 store', async () => {
    mockSearch.mockResolvedValue({
      ...backendResponse,
      hits: [],
      total: 0,
      index_status: { ...backendResponse.index_status, ready: false, in_progress: true, progress: 0.42 },
    })
    const store = useSearchStore()

    await store.searchMessages({ keyword: '关键词', scope: 'all' })

    expect(store.indexStatus?.ready).toBe(false)
    expect(store.indexStatus?.in_progress).toBe(true)
    expect(store.indexStatus?.progress).toBe(0.42)
  })

  it('appendMode 按 message.id 去重追加，hasMore 基于 offset+hits<total', async () => {
    mockSearch
      .mockResolvedValueOnce(backendResponse)
      .mockResolvedValueOnce({
        ...backendResponse,
        offset: 2,
        hits: [hit(1000000000003, '第三条')],
        total: 3,
      })
    const store = useSearchStore()

    await store.searchMessages({ keyword: '关键词', scope: 'all' })
    const appended = await store.searchMessages({ keyword: '关键词', scope: 'all' }, true)

    expect(appended).toHaveLength(1)
    expect(store.searchHits).toHaveLength(3)
    expect(store.messageResults).toHaveLength(3)
    expect(store.hasMore).toBe(false)
  })

  it('performSearch 会话内搜索缺 talker 时置错误，全局搜索正常执行', async () => {
    // 强制清空 mock 实现与队列，隔离前序用例
    mockSearch.mockReset()
    mockSearch.mockResolvedValue(backendResponse)
    const store = useSearchStore()

    await store.performSearch({ keyword: '关键词', type: 'message', scope: 'session' })
    expect(store.error).toBeInstanceOf(Error)
    // 会话内缺 talker 不发起请求
    expect(mockSearch).not.toHaveBeenCalled()

    store.error = null
    await store.performSearch({ keyword: '关键词', type: 'message', scope: 'all' })
    expect(store.error).toBeNull()
    // 全局搜索发起请求（结果映射由上方 searchMessages 用例覆盖）
    expect(mockSearch).toHaveBeenCalledTimes(1)
  })
})
