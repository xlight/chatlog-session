import { describe, it, expect, vi, beforeEach } from 'vitest'
import { favoriteAPI } from '@/api/favorite'
import { FAVORITE_TYPE_MAP } from '@/types/social'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendFavorite = (overrides: Record<string, unknown> = {}) => ({
  local_id: 5,
  server_id: 1000005,
  type: 5,
  update_seq: 1005,
  update_time: 1723075200,
  version: 1,
  content: '<favitem type="5"><title>示例</title></favitem>',
  content_type: 'text',
  source_id: '1000005',
  sync_status: 0,
  upload_status: 0,
  from_usr: 'wxid_a',
  real_chat_name: 'wxid_a',
  tags: ['工作', '重要'],
  ...overrides,
})

describe('FavoriteAPI - 对齐与 tag 前端过滤', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transform 后端 snake_case 到前端 camelCase，tags string[] 转 FavoriteTag[]', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendFavorite()], total: 1, tags: ['工作'] })

    const response = await favoriteAPI.getFavorites()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/favorite', {})
    const item = response.items[0]
    expect(item.localId).toBe(5)
    expect(item.serverId).toBe(1000005)
    expect(item.fromUser).toBe('wxid_a')
    expect(item.chatName).toBe('wxid_a')
    expect(item.updateTime).toBe(1723075200)
    expect(item.contentType).toBe('text')
    expect(item.tags).toEqual([
      { localId: 0, serverId: 0, name: '工作' },
      { localId: 0, serverId: 0, name: '重要' },
    ])
  })

  it('请求携带 content/from_usr 参数（keyword 已移除）', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendFavorite()], total: 1 })

    await favoriteAPI.getFavorites({ content: '示例', fromUsr: 'wxid_a' })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/favorite', {
      content: '示例',
      from_usr: 'wxid_a',
    })
  })

  it('transform parsed（title/desc/link/cdnDataUrl）+ contentType 保留后端原值', async () => {
    mockGet.mockResolvedValueOnce({
      items: [
        backendFavorite({
          content_type: 'link',
          parsed: {
            desc: '示例描述',
            link: 'https://example.com',
            title: '示例标题',
            cdn_data_url: 'https://example.com/data',
          },
        }),
      ],
      total: 1,
    })

    const response = await favoriteAPI.getFavorites()

    const item = response.items[0]
    expect(item.contentType).toBe('link')
    expect(item.parsed).toEqual({
      desc: '示例描述',
      link: 'https://example.com',
      title: '示例标题',
      cdnDataUrl: 'https://example.com/data',
    })
  })

  it('FAVORITE_TYPE_MAP 与后端 type 枚举语义对齐（14 文件/15 笔记/16 视频/18 笔记/19 小程序卡片）', () => {
    expect(FAVORITE_TYPE_MAP[6]).toBeUndefined()
    expect(FAVORITE_TYPE_MAP[14]).toBe('文件')
    expect(FAVORITE_TYPE_MAP[15]).toBe('笔记')
    expect(FAVORITE_TYPE_MAP[16]).toBe('视频')
    expect(FAVORITE_TYPE_MAP[18]).toBe('笔记')
    expect(FAVORITE_TYPE_MAP[19]).toBe('小程序卡片')
  })

  it('请求不再携带 tag 参数（后端忽略），tag 过滤拉大 limit 后前端过滤', async () => {
    mockGet
      .mockResolvedValueOnce({ items: [backendFavorite()], total: 3 })
      .mockResolvedValueOnce({
        items: [
          backendFavorite({ local_id: 1, tags: ['工作'] }),
          backendFavorite({ local_id: 2, tags: ['其他'] }),
          backendFavorite({ local_id: 3, tags: ['工作'] }),
        ],
        total: 3,
      })

    const response = await favoriteAPI.getFavorites({ tag: '工作', limit: 20, offset: 0 })

    // 第一页请求不含 tag（limit 正常透传）
    expect(mockGet.mock.calls[0]).toEqual(['/api/v1/favorite', { limit: 20 }])
    // 过滤请求用大 limit
    expect(mockGet.mock.calls[1]).toEqual(['/api/v1/favorite', { limit: 5000, offset: 0 }])
    expect(response.total).toBe(2)
    expect(response.items.map(i => i.localId)).toEqual([1, 3])
  })

  it('getTags 走独立端点 /favorite/tag，snake_case 转 camelCase', async () => {
    mockGet.mockResolvedValueOnce({
      items: [
        { local_id: 5, server_id: 1005, name: '工作', seq: 1 },
        { local_id: 6, server_id: 1006, name: '重要', seq: 2 },
      ],
    })

    const tags = await favoriteAPI.getTags()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/favorite/tag')
    expect(tags).toEqual([
      { localId: 5, serverId: 1005, name: '工作' },
      { localId: 6, serverId: 1006, name: '重要' },
    ])
  })
})
