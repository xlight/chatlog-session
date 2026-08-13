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

  it('likes/comments 有值时转换；contentType 保留后端原值（image 不再归 protobuf）', async () => {
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
    expect(moment.contentType).toBe('image')
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

  it('透传 content 参数（正文关键词过滤）', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendMoment()], total: 1 })

    await momentsAPI.getMoments({ content: '天气', limit: 20 })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/moment', { content: '天气', limit: 20 })
  })

  it('transform 消费 media_list/title/url/source_nick_name/is_top/location', async () => {
    mockGet.mockResolvedValueOnce({
      items: [
        backendMoment({
          content_type: 'image',
          title: '示例标题',
          url: 'https://example.com/article',
          source_nick_name: '分享者',
          is_top: true,
          location: { lat: 39.9, lng: 116.4, poi_name: '示例地点', poi_address: '北京市' },
          media_list: [
            { type: 1, thumb: 'https://example.com/thumb.jpg', hd_thumb: 'https://example.com/hd.jpg', url: 'https://example.com/img.jpg', description: '图1' },
          ],
        }),
      ],
      total: 1,
    })

    const response = await momentsAPI.getMoments({ limit: 20 })

    const moment = response.items[0]
    expect(moment.contentType).toBe('image')
    expect(moment.title).toBe('示例标题')
    expect(moment.url).toBe('https://example.com/article')
    expect(moment.sourceNickName).toBe('分享者')
    expect(moment.isTop).toBe(true)
    expect(moment.location).toEqual({ lat: 39.9, lng: 116.4, poiName: '示例地点', poiAddress: '北京市' })
    expect(moment.mediaList).toEqual([
      { type: 1, thumb: 'https://example.com/thumb.jpg', hdThumb: 'https://example.com/hd.jpg', url: 'https://example.com/img.jpg', description: '图1' },
    ])
  })
})
