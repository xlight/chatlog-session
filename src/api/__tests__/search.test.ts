import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchAPI } from '@/api/search'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendResponse = {
  hits: [
    {
      message: {
        seq: 1000000000001,
        time: '2026-01-01T10:00:00+08:00',
        talker: 'wxid_a',
        talkerName: '会话A',
        isChatRoom: false,
        sender: 'wxid_b',
        senderName: '发送者B',
        isSelf: false,
        type: 1,
        subType: 0,
        content: '命中关键词的消息内容',
      },
      snippet: '…命中<em>关键词</em>的…',
      score: -3.14,
    },
  ],
  total: 1,
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
  start: '',
  end: '',
  limit: 500,
  offset: 0,
}

describe('SearchAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('透传 q/scope/limit，显式注入默认 limit 覆盖拦截器 200', async () => {
    mockGet.mockResolvedValue(backendResponse)

    await searchAPI.search({ q: '关键词' })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/search', {
      q: '关键词',
      scope: 'messages',
      limit: 500,
    })
  })

  it('透传可选参数（talker/sender/time/start/end/offset/skip_total）', async () => {
    mockGet.mockResolvedValue({ ...backendResponse, hits: [] })

    await searchAPI.search({
      q: '关键词',
      scope: 'all',
      talker: 'wxid_a',
      sender: 'wxid_b',
      time: '2026-01-01~2026-01-31',
      start: '2026-01-01',
      end: '2026-01-31',
      offset: 500,
      skip_total: true,
      limit: 1000,
    })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/search', {
      q: '关键词',
      scope: 'all',
      talker: 'wxid_a',
      sender: 'wxid_b',
      time: '2026-01-01~2026-01-31',
      start: '2026-01-01',
      end: '2026-01-31',
      offset: 500,
      skip_total: true,
      limit: 1000,
    })
  })

  it('转换响应：hits 的 message 复用 transformMessage（seq→id、time→createTime）', async () => {
    mockGet.mockResolvedValue(backendResponse)

    const result = await searchAPI.search({ q: '关键词' })

    expect(result.total).toBe(1)
    expect(result.duration_ms).toBe(12)
    expect(result.index_status.ready).toBe(true)
    expect(result.hits).toHaveLength(1)
    const hit = result.hits[0]
    expect(hit.message.id).toBe(1000000000001)
    expect(hit.message.createTime).toBe(Math.floor(new Date('2026-01-01T10:00:00+08:00').getTime() / 1000))
    expect(hit.message.content).toBe('命中关键词的消息内容')
    expect(hit.snippet).toBe('…命中<em>关键词</em>的…')
    expect(hit.score).toBe(-3.14)
  })

  it('hits 缺失时兜底为空数组（索引未就绪场景）', async () => {
    mockGet.mockResolvedValue({
      ...backendResponse,
      hits: undefined,
      total: 0,
      index_status: { ...backendResponse.index_status, ready: false, in_progress: true, progress: 0.42 },
    })

    const result = await searchAPI.search({ q: '关键词' })

    expect(result.hits).toEqual([])
    expect(result.index_status.in_progress).toBe(true)
  })
})
