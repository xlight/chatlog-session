import { describe, it, expect, vi, beforeEach } from 'vitest'
import { emoticonAPI } from '@/api/emoticon'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

const mockGet = request.get as unknown as ReturnType<typeof vi.fn>

const backendEmoticon = (overrides: Record<string, unknown> = {}) => ({
  md5: 'abc123',
  caption: '大笑',
  cdn_url: 'https://example.com/emoticon.gif',
  thumb_url: 'https://example.com/emoticon_thumb.gif',
  type: 1,
  ...overrides,
})

const backendPackage = (overrides: Record<string, unknown> = {}) => ({
  package_id: 1001,
  package_name: '精选表情包',
  payment_status: 0,
  download_status: 1,
  install_time: 1723075200,
  sort_order: 3,
  author: '微信团队',
  count: 20,
  ...overrides,
})

describe('EmoticonAPI - 端点接入', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getEmoticons 显式传 limit 默认 50（对齐后端，规避拦截器 200）并 transform snake_case', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendEmoticon()], total: 1 })

    const response = await emoticonAPI.getEmoticons()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/emoticon', { limit: 50 })
    const item = response.items[0]
    expect(item.md5).toBe('abc123')
    expect(item.caption).toBe('大笑')
    expect(item.cdnUrl).toBe('https://example.com/emoticon.gif')
    expect(item.thumbUrl).toBe('https://example.com/emoticon_thumb.gif')
    expect(item.type).toBe(1)
  })

  it('getEmoticons 透传 caption 参数', async () => {
    mockGet.mockResolvedValueOnce({ items: [], total: 0 })

    await emoticonAPI.getEmoticons({ caption: '大笑', limit: 100 })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/emoticon', { caption: '大笑', limit: 100 })
  })

  it('getEmoticonPackages 显式传 limit 默认 50 并透传 name/author', async () => {
    mockGet.mockResolvedValueOnce({ items: [backendPackage()], total: 1 })

    const response = await emoticonAPI.getEmoticonPackages({ name: '精选', author: '微信' })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/emoticon/package', {
      name: '精选',
      author: '微信',
      limit: 50,
    })
    const item = response.items[0]
    expect(item.packageId).toBe(1001)
    expect(item.packageName).toBe('精选表情包')
    expect(item.paymentStatus).toBe(0)
    expect(item.downloadStatus).toBe(1)
    expect(item.installTime).toBe(1723075200)
    expect(item.sortOrder).toBe(3)
    expect(item.author).toBe('微信团队')
    expect(item.count).toBe(20)
  })
})
