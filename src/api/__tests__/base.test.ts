import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseAPI } from '@/api/base'

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}))

import { request } from '@/utils/request'

interface BackendItem {
  id: number
  name: string
}

interface FrontendItem {
  id: number
  label: string
}

class TestAPI extends BaseAPI<BackendItem, FrontendItem> {
  resourcePath = 'test'

  transform(data: BackendItem): FrontendItem {
    return { id: data.id, label: data.name }
  }
}

describe('BaseAPI', () => {
  let api: TestAPI

  beforeEach(() => {
    vi.clearAllMocks()
    api = new TestAPI()
  })

  describe('resourceUrl', () => {
    it('computes resourceUrl from apiBasePath + resourcePath', () => {
      expect((api as any).resourceUrl).toBe('/api/v1/test')
    })

    it('uses custom apiBasePath when overridden', () => {
      class CustomAPI extends BaseAPI<BackendItem, FrontendItem> {
        resourcePath = 'custom'
        apiBasePath = '/api/v2'
        transform(data: BackendItem): FrontendItem {
          return { id: data.id, label: data.name }
        }
      }
      const custom = new CustomAPI()
      expect((custom as any).resourceUrl).toBe('/api/v2/custom')
    })
  })

  describe('transformAll', () => {
    it('transforms each item in the array', () => {
      const input = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]
      const result = (api as any).transformAll(input)
      expect(result).toEqual([
        { id: 1, label: 'Alice' },
        { id: 2, label: 'Bob' },
      ])
    })

    it('returns empty array for empty input', () => {
      expect((api as any).transformAll([])).toEqual([])
    })
  })

  describe('normalizeItems', () => {
    it('extracts items from { items: [...] } response', () => {
      const response = { items: [{ id: 1, name: 'a' }], total: 10 }
      const result = (api as any).normalizeItems(response)
      expect(result).toEqual([{ id: 1, name: 'a' }])
    })

    it('returns direct array response as-is', () => {
      const response = [{ id: 1, name: 'a' }]
      const result = (api as any).normalizeItems(response)
      expect(result).toEqual([{ id: 1, name: 'a' }])
    })

    it('returns empty array for null/undefined', () => {
      expect((api as any).normalizeItems(null)).toEqual([])
      expect((api as any).normalizeItems(undefined)).toEqual([])
    })

    it('returns empty array for non-object non-array', () => {
      expect((api as any).normalizeItems('string')).toEqual([])
      expect((api as any).normalizeItems(42)).toEqual([])
    })

    it('returns empty array when items is not an array', () => {
      const response = { items: 'not-array' }
      expect((api as any).normalizeItems(response)).toEqual([])
    })
  })

  describe('normalizeItemsWithTotal', () => {
    it('extracts items and total from { items, total } response', () => {
      const response = { items: [{ id: 1, name: 'a' }], total: 42 }
      const result = (api as any).normalizeItemsWithTotal(response)
      expect(result.items).toEqual([{ id: 1, name: 'a' }])
      expect(result.total).toBe(42)
    })

    it('falls back to items.length when total is missing', () => {
      const response = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] }
      const result = (api as any).normalizeItemsWithTotal(response)
      expect(result.total).toBe(2)
    })

    it('handles direct array response', () => {
      const response = [{ id: 1, name: 'a' }]
      const result = (api as any).normalizeItemsWithTotal(response)
      expect(result.items).toEqual([{ id: 1, name: 'a' }])
      expect(result.total).toBe(1)
    })

    it('returns empty for null/undefined', () => {
      const result = (api as any).normalizeItemsWithTotal(null)
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    it('returns empty for non-object non-array', () => {
      const result = (api as any).normalizeItemsWithTotal('x')
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('getList', () => {
    it('calls request.get with resourceUrl and params', async () => {
      const mockData = { items: [{ id: 1, name: 'a' }] }
      vi.mocked(request.get).mockResolvedValue(mockData)

      const result = await (api as any).getList({ page: 1 })

      expect(request.get).toHaveBeenCalledWith('/api/v1/test', { page: 1 })
      expect(result).toEqual([{ id: 1, label: 'a' }])
    })

    it('handles direct array response', async () => {
      vi.mocked(request.get).mockResolvedValue([{ id: 1, name: 'a' }])

      const result = await (api as any).getList()

      expect(result).toEqual([{ id: 1, label: 'a' }])
    })

    it('returns empty array when response is empty', async () => {
      vi.mocked(request.get).mockResolvedValue(null)

      const result = await (api as any).getList()

      expect(result).toEqual([])
    })
  })

  describe('getDetail', () => {
    it('calls request.get with resourceUrl/id and params', async () => {
      vi.mocked(request.get).mockResolvedValue({ id: 1, name: 'Alice' })

      const result = await (api as any).getDetail('user-1', { format: 'json' })

      expect(request.get).toHaveBeenCalledWith(
        '/api/v1/test/user-1',
        { format: 'json' }
      )
      expect(result).toEqual({ id: 1, label: 'Alice' })
    })

    it('encodes URI component for id', async () => {
      vi.mocked(request.get).mockResolvedValue({ id: 1, name: 'x' })

      await (api as any).getDetail('user/1')

      expect(request.get).toHaveBeenCalledWith(
        '/api/v1/test/user%2F1',
        undefined
      )
    })
  })

  })