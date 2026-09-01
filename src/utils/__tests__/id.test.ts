import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateId } from '@/utils/id'

describe('generateId（spec: 共享 ID 生成）', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('优先使用 crypto.randomUUID（spec scenario: 统一 ID 来源）', () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234-5678-9abc' as never)
    const id = generateId()
    expect(uuidSpy).toHaveBeenCalledOnce()
    expect(id).toBe('test-uuid-1234-5678-9abc')
  })

  it('crypto.randomUUID 不可用时回退时间戳+随机数', () => {
    // 临时移除 randomUUID
    const original = crypto.randomUUID
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    })

    try {
      const id = generateId('msg')
      expect(id).toMatch(/^msg-\d+-[a-z0-9]+$/)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', {
        value: original,
        configurable: true,
      })
    }
  })

  it('回退模式默认前缀为 id', () => {
    const original = crypto.randomUUID
    Object.defineProperty(crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    })

    try {
      const id = generateId()
      expect(id).toMatch(/^id-\d+-[a-z0-9]+$/)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', {
        value: original,
        configurable: true,
      })
    }
  })

  it('每次调用生成不同 ID', () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('uuid-1-aaaa-bbbb-cccc' as never)
      .mockReturnValueOnce('uuid-2-dddd-eeee-ffff' as never)

    expect(generateId()).toBe('uuid-1-aaaa-bbbb-cccc')
    expect(generateId()).toBe('uuid-2-dddd-eeee-ffff')
  })
})
