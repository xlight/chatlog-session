import { describe, it, expect, vi, beforeEach } from 'vitest'
import { momentsAPI } from '@/api/moments'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendMoment = (overrides: Record<string, unknown> = {}) => ({
  tid: 1000005,
  user_name: 'wxid_a',
  nickname: '联系人A',
  content_type: 'text',
  text_content: '今天天气不错',
  create_time: 1723075200,
  ...overrides,
})

describe('MomentsAPI - 数据层对齐', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transform snake_case 到 camelCase，likes/comments 缺失兜底为空数组', async () => {
    // 后端 comments/likes 为 omitempty：无互动时 JSON 缺失
    mockGet.mockResolvedValueOnce({ items: [backendMoment()], total: 1 })

    const response = await momentsAPI.getMoments({ limit: 20 })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/moment', { limit: 20 })
    const moment = response.items[0]
    expect(moment.tid).toBe(1000005)
    expect(moment.username).toBe('wxid_a')
    expect(moment.nickname).toBe('联系人A')
    expect(moment.createTime).toBe(1723075200)
    expect(moment.contentType).toBe('text')
    expect(moment.content).toBe('今天天气不错')
    expect(moment.comments).toEqual([])
    expect(moment.likes).toEqual([])
  })

  it('likes/comments 有值时转换；非 text 内容归 protobuf（不预览）', async () => {
    mockGet.mockResolvedValueOnce({
      items: [
        backendMoment({
          content_type: 'image',
          comments: [
            {
              from_username: 'wxid_b',
              from_nickname: '联系人B',
              content: '好照片',
              create_time: 1723075260,
            },
          ],
          likes: [{ from_username: 'wxid_c', from_nickname: '联系人C' }],
        }),
      ],
      total: 1,
    })

    const response = await momentsAPI.getMoments({ limit: 20 })

    const moment = response.items[0]
    expect(moment.contentType).toBe('protobuf')
    expect(moment.comments).toEqual([
      {
        fromUsername: 'wxid_b',
        fromNickname: '联系人B',
        content: '好照片',
        createTime: 1723075260,
      },
    ])
    expect(moment.likes).toEqual([{ fromUsername: 'wxid_c', fromNickname: '联系人C' }])
  })
})
