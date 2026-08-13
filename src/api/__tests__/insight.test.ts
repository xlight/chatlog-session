import { describe, it, expect, vi, beforeEach } from 'vitest'
import { insightAPI } from '@/api/insight'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

describe('InsightAPI - 端点接入', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getContactStats：verify_flag map 透传 + labels/room_sizes 元素 camelCase transform', async () => {
    mockGet.mockResolvedValueOnce({
      verify_flag: { 好友: 120, 公众号: 8 },
      labels: [
        { label_id: 1, label_name: '家人', sort_order: 0 },
        { label_id: 2, label_name: '同事', sort_order: 1 },
      ],
      room_sizes: [{ user_name: 'room@chatroom', members: 200 }],
    })

    const stats = await insightAPI.getContactStats()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/insight/contact')
    expect(stats.verifyFlag).toEqual({ 好友: 120, 公众号: 8 })
    expect(stats.labels).toEqual([
      { labelId: 1, labelName: '家人', sortOrder: 0 },
      { labelId: 2, labelName: '同事', sortOrder: 1 },
    ])
    expect(stats.roomSizes).toEqual([{ userName: 'room@chatroom', members: 200 }])
  })

  it('getEmoticonStats：stats 为 map（非数组）透传', async () => {
    mockGet.mockResolvedValueOnce({ stats: { '大笑': 15, '哭': 3 } })

    const stats = await insightAPI.getEmoticonStats()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/insight/emoticon')
    expect(stats.stats).toEqual({ '大笑': 15, '哭': 3 })
  })

  it('getResourceStats：types/senders 元素 camelCase transform + monthly 透传', async () => {
    mockGet.mockResolvedValueOnce({
      types: [{ type: 'image', media_type: 'jpg', count: 10, total_size: 102400 }],
      senders: [{ user_name: 'wxid_a', count: 5, total_size: 51200 }],
      monthly: [{ month: '2026-01', count: 10 }],
    })

    const stats = await insightAPI.getResourceStats()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/insight/resource')
    expect(stats.types).toEqual([{ type: 'image', mediaType: 'jpg', count: 10, totalSize: 102400 }])
    expect(stats.senders).toEqual([{ userName: 'wxid_a', count: 5, totalSize: 51200 }])
    expect(stats.monthly).toEqual([{ month: '2026-01', count: 10 }])
  })

  it('getRevokeRecords：透传 time/limit/offset，items snake_case → camelCase transform', async () => {
    mockGet.mockResolvedValueOnce({
      items: [
        {
          sender_nickname: '联系人A',
          content: '撤回了一条消息',
          revoke_time: 1723075200,
          session_name: 'wxid_b',
          seq: 1000000000001,
          create_time: 1723075201,
        },
      ],
      total: 1,
    })

    const response = await insightAPI.getRevokeRecords({ time: 'last-7d', limit: 20 })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/insight/revoke', { time: 'last-7d', limit: 20 })
    expect(response.total).toBe(1)
    expect(response.items[0]).toEqual({
      senderNickname: '联系人A',
      content: '撤回了一条消息',
      revokeTime: 1723075200,
      sessionName: 'wxid_b',
      seq: 1000000000001,
      createTime: 1723075201,
    })
  })
})
