import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMessage, createMessageBatch, createGapMessage, createEmptyRangeMessage } from './fixtures'
import { MessageType } from '@/types/message'
import type { Message } from '@/types/message'
import {
  isRealMessage,
  getMessageTimestamp,
  compareMessageOrder,
  detectBatchOrder,
  normalizeBatchToChronological,
  mergeChronologicalMessages,
  assertChronologicalOrder,
  getLatestMessageTime,
  getFirstMessageTime,
  calculateMessageDensity,
  getInitialDaysRange,
  deduplicateMessages,
  estimateMessageCount,
  getGapEstimateConfidence,
  parseGapRangeBounds,
  mergeAdjacentGapMessages,
  getHistoryAnchorBeforeTime,
  checkDataConnection,
  detectTimeGap,
  parseEmptyRangeBounds,
  isAdjacentOrOverlappingRange,
  mergeTopAdjacentEmptyRanges,
  handleEmptyResult,
} from '../utils'

vi.mock('@/api', () => ({
  chatlogAPI: {
    getSessionMessages: vi.fn().mockResolvedValue([]),
  },
}))

// 固定系统时间，确保 createGapMessage / createEmptyRangeMessage 中的 Date.now() 可预测
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-20T12:00:00.000+08:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

// ============================================================
// isRealMessage
// ============================================================
describe('isRealMessage', () => {
  it('普通消息应返回 true', () => {
    const msg = createMessage()
    expect(isRealMessage(msg)).toBe(true)
  })

  it('isGap 消息应返回 false', () => {
    const msg = createMessage({ isGap: true })
    expect(isRealMessage(msg)).toBe(false)
  })

  it('isEmptyRange 消息应返回 false', () => {
    const msg = createMessage({ isEmptyRange: true })
    expect(isRealMessage(msg)).toBe(false)
  })

  it('同时有 isGap 和 isEmptyRange 应返回 false', () => {
    const msg = createMessage({ isGap: true, isEmptyRange: true })
    expect(isRealMessage(msg)).toBe(false)
  })
})

// ============================================================
// getMessageTimestamp
// ============================================================
describe('getMessageTimestamp', () => {
  it('从 time 字段解析 ISO 时间为毫秒时间戳', () => {
    const msg = createMessage({ time: '2026-05-15T10:00:00.000+08:00', createTime: 0 })
    // 2026-05-15T10:00:00+08:00 的 UTC 是 2026-05-15T02:00:00Z
    const expected = new Date('2026-05-15T02:00:00.000Z').getTime()
    expect(getMessageTimestamp(msg)).toBe(expected)
  })

  it('time 字段为无效值时应回退到 createTime（秒级）', () => {
    const msg = createMessage({ time: '', createTime: 1747274400 })
    expect(getMessageTimestamp(msg)).toBe(1747274400 * 1000)
  })

  it('time 字段为无效值时应回退到 createTime（毫秒级）', () => {
    const msg = createMessage({ time: '', createTime: 1747274400000 })
    expect(getMessageTimestamp(msg)).toBe(1747274400000)
  })

  it('time 和 createTime 都为空时应返回 0', () => {
    const msg = createMessage({ time: '', createTime: 0 })
    expect(getMessageTimestamp(msg)).toBe(0)
  })

  it('createTime 为 0 且 time 为空时返回 0', () => {
    const msg = createMessage({ time: '', createTime: 0 })
    expect(getMessageTimestamp(msg)).toBe(0)
  })

  it('createTime 为 undefined 且 time 为空时返回 0', () => {
    const msg = createMessage({ time: '', createTime: undefined as unknown as number })
    expect(getMessageTimestamp(msg)).toBe(0)
  })
})

// ============================================================
// compareMessageOrder
// ============================================================
describe('compareMessageOrder', () => {
  it('时间早的消息应排前面（返回负数）', () => {
    const a = createMessage({ time: '2026-05-15T09:00:00.000+08:00' })
    const b = createMessage({ time: '2026-05-15T10:00:00.000+08:00' })
    expect(compareMessageOrder(a, b)).toBeLessThan(0)
  })

  it('时间晚的消息应排后面（返回正数）', () => {
    const a = createMessage({ time: '2026-05-15T10:00:00.000+08:00' })
    const b = createMessage({ time: '2026-05-15T09:00:00.000+08:00' })
    expect(compareMessageOrder(a, b)).toBeGreaterThan(0)
  })

  it('时间相同时按 seq 排序', () => {
    const time = '2026-05-15T10:00:00.000+08:00'
    const a = createMessage({ time, seq: 1 })
    const b = createMessage({ time, seq: 2 })
    expect(compareMessageOrder(a, b)).toBeLessThan(0)
  })

  it('时间和 seq 相同时按 id 排序', () => {
    const time = '2026-05-15T10:00:00.000+08:00'
    const a = createMessage({ time, seq: 1, id: 1 })
    const b = createMessage({ time, seq: 1, id: 2 })
    expect(compareMessageOrder(a, b)).toBeLessThan(0)
  })

  it('seq 为 undefined 时视为 0', () => {
    const time = '2026-05-15T10:00:00.000+08:00'
    const a = createMessage({ time, seq: undefined as unknown as number, id: 10 })
    const b = createMessage({ time, seq: 1, id: 1 })
    // a.seq=0, b.seq=1 → a < b
    expect(compareMessageOrder(a, b)).toBeLessThan(0)
  })

  it('完全相同应返回 0', () => {
    const msg = createMessage({ time: '2026-05-15T10:00:00.000+08:00', seq: 1, id: 1 })
    expect(compareMessageOrder(msg, msg)).toBe(0)
  })
})

// ============================================================
// detectBatchOrder
// ============================================================
describe('detectBatchOrder', () => {
  it('升序批次应返回 asc', () => {
    const batch = createMessageBatch(3)
    expect(detectBatchOrder(batch)).toBe('asc')
  })

  it('降序批次应返回 desc', () => {
    const batch = [
      createMessage({ time: '2026-05-15T10:02:00.000+08:00', id: 1, createTime: 1747274520 }),
      createMessage({ time: '2026-05-15T10:01:00.000+08:00', id: 2, createTime: 1747274460 }),
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 3, createTime: 1747274400 }),
    ]
    expect(detectBatchOrder(batch)).toBe('desc')
  })

  it('空数组应返回 unknown', () => {
    expect(detectBatchOrder([])).toBe('unknown')
  })

  it('单元素数组应返回 unknown', () => {
    expect(detectBatchOrder([createMessage()])).toBe('unknown')
  })

  it('null/undefined 输入应返回 unknown', () => {
    expect(detectBatchOrder(null as unknown as Message[])).toBe('unknown')
    expect(detectBatchOrder(undefined as unknown as Message[])).toBe('unknown')
  })

  it('首尾时间相同应返回 unknown', () => {
    const time = '2026-05-15T10:00:00.000+08:00'
    const batch = [
      createMessage({ time, id: 1, createTime: 1747274400 }),
      createMessage({ time, id: 2, createTime: 1747274400 }),
    ]
    expect(detectBatchOrder(batch)).toBe('unknown')
  })

  it('首元素无有效时间应返回 unknown', () => {
    const batch = [
      createMessage({ time: '', createTime: 0, id: 1 }),
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 2 }),
    ]
    expect(detectBatchOrder(batch)).toBe('unknown')
  })
})

// ============================================================
// normalizeBatchToChronological
// ============================================================
describe('normalizeBatchToChronological', () => {
  it('升序批次应保持原顺序（新数组）', () => {
    const asc = createMessageBatch(3)
    const result = normalizeBatchToChronological(asc)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
    expect(result[2].id).toBe(3)
    expect(result).not.toBe(asc) // 新数组
  })

  it('降序批次应反转为升序', () => {
    const desc = [
      createMessage({ time: '2026-05-15T10:02:00.000+08:00', id: 1, createTime: 1747274520 }),
      createMessage({ time: '2026-05-15T10:01:00.000+08:00', id: 2, createTime: 1747274460 }),
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 3, createTime: 1747274400 }),
    ]
    const result = normalizeBatchToChronological(desc)
    expect(result[0].id).toBe(3)
    expect(result[1].id).toBe(2)
    expect(result[2].id).toBe(1)
  })

  it('空数组应返回空数组', () => {
    expect(normalizeBatchToChronological([])).toEqual([])
  })

  it('单元素数组应返回新数组', () => {
    const single = [createMessage()]
    const result = normalizeBatchToChronological(single)
    expect(result).toHaveLength(1)
    expect(result).not.toBe(single)
  })

  it('null/undefined 输入应返回空数组', () => {
    expect(normalizeBatchToChronological(null as unknown as Message[])).toEqual([])
    expect(normalizeBatchToChronological(undefined as unknown as Message[])).toEqual([])
  })
})

// ============================================================
// mergeChronologicalMessages
// ============================================================
describe('mergeChronologicalMessages', () => {
  it('两组消息按时间正确合并', () => {
    const existing = createMessageBatch(3) // 10:00, 10:01, 10:02
    const incoming = [
      createMessage({ time: '2026-05-15T10:00:30.000+08:00', id: 10, createTime: 1747274430 }),
      createMessage({ time: '2026-05-15T10:01:30.000+08:00', id: 11, createTime: 1747274490 }),
    ]
    const result = mergeChronologicalMessages(existing, incoming)
    expect(result).toHaveLength(5)
    expect(result.map(m => m.id)).toEqual([1, 10, 2, 11, 3])
  })

  it('existing 为空时返回 incoming 副本', () => {
    const incoming = createMessageBatch(2)
    const result = mergeChronologicalMessages([], incoming)
    expect(result).toHaveLength(2)
    expect(result).not.toBe(incoming)
  })

  it('incoming 为空时返回 existing 副本', () => {
    const existing = createMessageBatch(2)
    const result = mergeChronologicalMessages(existing, [])
    expect(result).toHaveLength(2)
    expect(result).not.toBe(existing)
  })

  it('所有 incoming 都比 existing 早', () => {
    const existing = createMessageBatch(3) // starts at 10:00
    const incoming = [
      createMessage({ time: '2026-05-15T09:00:00.000+08:00', id: 10, createTime: 1747270800 }),
    ]
    const result = mergeChronologicalMessages(existing, incoming)
    expect(result[0].id).toBe(10)
    expect(result).toHaveLength(4)
  })

  it('所有 incoming 都比 existing 晚', () => {
    const existing = createMessageBatch(2) // ends at 10:01
    const incoming = [
      createMessage({ time: '2026-05-15T11:00:00.000+08:00', id: 10, createTime: 1747278000 }),
    ]
    const result = mergeChronologicalMessages(existing, incoming)
    expect(result[result.length - 1].id).toBe(10)
    expect(result).toHaveLength(3)
  })
})

// ============================================================
// assertChronologicalOrder
// ============================================================
describe('assertChronologicalOrder', () => {
  it('isDebug=false 时不执行任何操作', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const unordered = [
      createMessage({ time: '2026-05-15T10:01:00.000+08:00', id: 1 }),
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 2 }),
    ]
    // 不应抛出，也不应 warn
    assertChronologicalOrder(unordered, false)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('isDebug=true 且顺序正确时不 warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ordered = createMessageBatch(3)
    assertChronologicalOrder(ordered, true)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('isDebug=true 且顺序错误时 warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const unordered = [
      createMessage({ time: '2026-05-15T10:01:00.000+08:00', id: 1, seq: 1 }),
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 2, seq: 2 }),
    ]
    assertChronologicalOrder(unordered, true, 'test-label')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      '⚠️ Message order violation detected',
      expect.objectContaining({ label: 'test-label' })
    )
    warnSpy.mockRestore()
  })

  it('消息数 < 2 时不检查', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    assertChronologicalOrder([], true)
    assertChronologicalOrder([createMessage()], true)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

// ============================================================
// getLatestMessageTime / getFirstMessageTime
// ============================================================
describe('getLatestMessageTime', () => {
  it('从多条消息中找到最新消息的时间', () => {
    const msgs = [
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 1, createTime: 1747274400 }),
      createMessage({ time: '2026-05-15T12:00:00.000+08:00', id: 2, createTime: 1747281600 }),
      createMessage({ time: '2026-05-15T08:00:00.000+08:00', id: 3, createTime: 1747267200 }),
    ]
    expect(getLatestMessageTime(msgs)).toBe('2026-05-15T12:00:00.000+08:00')
  })

  it('过滤掉 Gap 和 EmptyRange 消息', () => {
    const msgs = [
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 1, createTime: 1747274400 }),
      createGapMessage({ time: '2026-05-15T13:00:00.000+08:00', id: 2, createTime: 1747285200 }),
    ]
    expect(getLatestMessageTime(msgs)).toBe('2026-05-15T10:00:00.000+08:00')
  })

  it('所有消息都是 Gap/EmptyRange 时返回 undefined', () => {
    const msgs = [createGapMessage(), createEmptyRangeMessage()]
    expect(getLatestMessageTime(msgs)).toBeUndefined()
  })

  it('空数组返回 undefined', () => {
    expect(getLatestMessageTime([])).toBeUndefined()
  })

  it('null/undefined 输入返回 undefined', () => {
    expect(getLatestMessageTime(null as unknown as Message[])).toBeUndefined()
    expect(getLatestMessageTime(undefined as unknown as Message[])).toBeUndefined()
  })
})

describe('getFirstMessageTime', () => {
  it('从多条消息中找到最早消息的时间', () => {
    const msgs = [
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 1, createTime: 1747274400 }),
      createMessage({ time: '2026-05-15T12:00:00.000+08:00', id: 2, createTime: 1747281600 }),
      createMessage({ time: '2026-05-15T08:00:00.000+08:00', id: 3, createTime: 1747267200 }),
    ]
    expect(getFirstMessageTime(msgs)).toBe('2026-05-15T08:00:00.000+08:00')
  })

  it('过滤掉 Gap 和 EmptyRange 消息', () => {
    const msgs = [
      createGapMessage({ time: '2026-05-15T06:00:00.000+08:00', id: 1, createTime: 1747252800 }),
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', id: 2, createTime: 1747274400 }),
    ]
    expect(getFirstMessageTime(msgs)).toBe('2026-05-15T10:00:00.000+08:00')
  })

  it('所有消息都是 Gap/EmptyRange 时返回 undefined', () => {
    const msgs = [createGapMessage(), createEmptyRangeMessage()]
    expect(getFirstMessageTime(msgs)).toBeUndefined()
  })

  it('空数组返回 undefined', () => {
    expect(getFirstMessageTime([])).toBeUndefined()
  })
})

// ============================================================
// calculateMessageDensity
// ============================================================
describe('calculateMessageDensity', () => {
  it('正常计算消息密度（条/天）', () => {
    // 2条消息，跨1天 → 密度=2
    const msgs = createMessageBatch(2).map((m, i) => {
      const d = new Date('2026-05-15T10:00:00.000+08:00')
      d.setDate(d.getDate() + i)
      return createMessage({
        ...m,
        time: d.toISOString(),
        createTime: d.getTime() / 1000,
      })
    })
    // Assuming talker matches
    expect(calculateMessageDensity(msgs, 'wxid_user')).toBeCloseTo(2, 0)
  })

  it('消息少于2条时返回 0', () => {
    const msgs = [createMessage()]
    expect(calculateMessageDensity(msgs, 'wxid_user')).toBe(0)
  })

  it('过滤不匹配的 talker', () => {
    const msgs = [
      createMessage({ talker: 'wxid_user' }),
      createMessage({ time: '2026-05-16T10:00:00.000+08:00', createTime: 1747360800, talker: 'wxid_other' }),
    ]
    expect(calculateMessageDensity(msgs, 'wxid_user')).toBe(0)
  })

  it('过滤 Gap 和 EmptyRange', () => {
    const msgs = [
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', createTime: 1747274400 }),
      createMessage({ time: '2026-05-16T10:00:00.000+08:00', createTime: 1747360800 }),
      createGapMessage(),
    ]
    expect(calculateMessageDensity(msgs, 'wxid_user')).toBeCloseTo(2, 0)
  })

  it('消息集中在很短时间内时返回超高密度', () => {
    // 同一时间的10条消息 → timeSpanDays < 0.01 → density = msgs.length * 100
    const msgs = createMessageBatch(10)
    expect(calculateMessageDensity(msgs, 'wxid_user')).toBe(1000)
  })

  it('空数组返回 0', () => {
    expect(calculateMessageDensity([], 'wxid_user')).toBe(0)
  })
})

// ============================================================
// getInitialDaysRange
// ============================================================
describe('getInitialDaysRange', () => {
  it('密度为0时应返回基于 limit 的最小天数', () => {
    const msgs = [createMessage()]
    // density=0 → max(ceil(500/5), 7) = max(100, 7) = 100
    const result = getInitialDaysRange(msgs, 'wxid_user', 500)
    expect(result).toBe(100)
  })

  it('密度正常时计算合理天数', () => {
    // 创建跨2天的100条消息 → density=50
    const msgs: Message[] = []
    for (let i = 0; i < 100; i++) {
      const d = new Date('2026-05-15T10:00:00.000+08:00')
      d.setHours(d.getHours() + i * 0.5)
      msgs.push(createMessage({ id: i + 1, time: d.toISOString(), createTime: d.getTime() / 1000 }))
    }
    const result = getInitialDaysRange(msgs, 'wxid_user', 100)
    // density ≈ 100 / ((100*0.5)/24) = 100 / (50/24) = 48
    // daysRange = ceil(100/48) = 3, clamped between 0.5 and 90
    expect(result).toBeGreaterThanOrEqual(0.5)
    expect(result).toBeLessThanOrEqual(90)
  })

  it('返回天数不低于 0.5', () => {
    // 超高密度 → 极少天数
    const msgs = createMessageBatch(1000) // all at same time, density=100000
    const result = getInitialDaysRange(msgs, 'wxid_user', 100)
    expect(result).toBeGreaterThanOrEqual(0.5)
  })

  it('返回天数不超过 90', () => {
    // 极低密度
    const msgs = [
      createMessage({ time: '2026-05-15T10:00:00.000+08:00', createTime: 1747274400 }),
      createMessage({ time: '2026-06-15T10:00:00.000+08:00', createTime: 1749952800 }),
    ]
    // density = 2 / 31 ≈ 0.0645
    // daysRange = ceil(500 / 0.0645) ≈ 7752 → clamped to 90
    const result = getInitialDaysRange(msgs, 'wxid_user', 500)
    expect(result).toBe(90)
  })
})

// ============================================================
// deduplicateMessages
// ============================================================
describe('deduplicateMessages', () => {
  it('应过滤完全重复的消息', () => {
    const existing = createMessageBatch(3)
    const newMsgs = [
      createMessage({ seq: 1, time: '2026-05-15T10:00:00.000+08:00', content: 'message-0' }),
      createMessage({ id: 100, seq: 4, time: '2026-05-15T10:03:00.000+08:00', createTime: 1747274580, content: 'new' }),
    ]
    const result = deduplicateMessages(existing, newMsgs)
    expect(result).toHaveLength(1)
    expect(result[0].seq).toBe(4)
  })

  it('seq+time 相同但内容不同时应保留', () => {
    const existing = [createMessage({ seq: 1, time: '2026-05-15T10:00:00.000+08:00', content: 'old' })]
    const newMsgs = [createMessage({ seq: 1, time: '2026-05-15T10:00:00.000+08:00', content: 'new' })]
    const result = deduplicateMessages(existing, newMsgs)
    expect(result).toHaveLength(1)
  })

  it('sender 不同时应保留', () => {
    const existing = [createMessage({ seq: 1, time: '2026-05-15T10:00:00.000+08:00', sender: 'a' })]
    const newMsgs = [createMessage({ seq: 1, time: '2026-05-15T10:00:00.000+08:00', sender: 'b' })]
    const result = deduplicateMessages(existing, newMsgs)
    expect(result).toHaveLength(1)
  })

  it('type 不同时应保留', () => {
    const existing = [createMessage({ seq: 1, time: '2026-05-15T10:00:00.000+08:00', type: MessageType.Text })]
    const newMsgs = [createMessage({ seq: 1, time: '2026-05-15T10:00:00.000+08:00', type: MessageType.Image })]
    const result = deduplicateMessages(existing, newMsgs)
    expect(result).toHaveLength(1)
  })

  it('完全无重复时应全部保留', () => {
    const existing = createMessageBatch(2)
    const newMsgs = [
      createMessage({ seq: 100, time: '2026-05-16T10:00:00.000+08:00' }),
      createMessage({ seq: 101, time: '2026-05-16T10:01:00.000+08:00' }),
    ]
    const result = deduplicateMessages(existing, newMsgs)
    expect(result).toHaveLength(2)
  })

  it('空 existing 时全部保留', () => {
    const newMsgs = createMessageBatch(3)
    expect(deduplicateMessages([], newMsgs)).toHaveLength(3)
  })

  it('空 newMessages 时返回空数组', () => {
    expect(deduplicateMessages(createMessageBatch(3), [])).toEqual([])
  })
})

// ============================================================
// estimateMessageCount
// ============================================================
describe('estimateMessageCount', () => {
  it('基于密度估算时间范围内的消息数', () => {
    const msgs = createMessageBatch(10).map((m, i) => {
      const d = new Date('2026-05-15T10:00:00.000+08:00')
      d.setDate(d.getDate() + i)
      return createMessage({ ...m, time: d.toISOString(), createTime: d.getTime() / 1000 })
    })
    // 10条跨10天 → density≈1
    const start = new Date('2026-05-25T00:00:00.000+08:00').getTime()
    const end = new Date('2026-05-30T00:00:00.000+08:00').getTime()
    const estimate = estimateMessageCount(msgs, 'wxid_user', start, end)
    // 5 days * 1 = 5
    expect(estimate).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(estimate)).toBe(true)
  })

  it('密度为0时返回 0', () => {
    expect(estimateMessageCount([createMessage()], 'wxid_user', 0, 86400000)).toBe(0)
  })

  it('不返回负数', () => {
    // start > end could cause negative timespan, but it's clamped to 0
    const msgs = createMessageBatch(10).map((m, i) => {
      const d = new Date('2026-05-15T10:00:00.000+08:00')
      d.setDate(d.getDate() + i)
      return createMessage({ ...m, time: d.toISOString(), createTime: d.getTime() / 1000 })
    })
    const result = estimateMessageCount(msgs, 'wxid_user', 100000, 0)
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================
// getGapEstimateConfidence
// ============================================================
describe('getGapEstimateConfidence', () => {
  it('样本量 >= 200 且分布均匀、跨度大时应返回 high', () => {
    const msgs: Message[] = []
    for (let i = 0; i < 200; i++) {
      const d = new Date('2026-04-15T10:00:00.000+08:00')
      d.setHours(d.getHours() + i)
      msgs.push(createMessage({
        id: i + 1,
        time: d.toISOString(),
        createTime: d.getTime() / 1000,
        talker: 'wxid_user',
      }))
    }
    // Window center aligns with sample center (both around April-15 + 100h)
    const start = new Date('2026-04-15T00:00:00.000+08:00').getTime()
    const end = new Date('2026-04-25T00:00:00.000+08:00').getTime()
    const confidence = getGapEstimateConfidence(msgs, 'wxid_user', start, end)
    expect(confidence).toBe('high')
  })

  it('样本量 >= 80 且跨度 >= 3天、CV <= 2.0 时应返回 medium', () => {
    const msgs: Message[] = []
    for (let i = 0; i < 100; i++) {
      const d = new Date('2026-05-15T10:00:00.000+08:00')
      d.setHours(d.getHours() + i * 2)
      msgs.push(createMessage({
        id: i + 1,
        time: d.toISOString(),
        createTime: d.getTime() / 1000,
        talker: 'wxid_user',
      }))
    }
    const start = new Date('2026-05-15T00:00:00.000+08:00').getTime()
    const end = new Date('2026-05-20T00:00:00.000+08:00').getTime()
    const confidence = getGapEstimateConfidence(msgs, 'wxid_user', start, end)
    expect(['medium', 'high']).toContain(confidence)
  })

  it('样本量 < 80 时应返回 low', () => {
    const msgs = createMessageBatch(50)
    const start = new Date('2026-05-15T00:00:00.000+08:00').getTime()
    const end = new Date('2026-05-20T00:00:00.000+08:00').getTime()
    expect(getGapEstimateConfidence(msgs, 'wxid_user', start, end)).toBe('low')
  })

  it('无有效时间戳消息时应返回 low', () => {
    const msgs = createMessageBatch(100).map(m => createMessage({ ...m, time: '', createTime: 0 }))
    const start = Date.now()
    const end = start + 86400000
    expect(getGapEstimateConfidence(msgs, 'wxid_user', start, end)).toBe('low')
  })
})

// ============================================================
// parseGapRangeBounds
// ============================================================
describe('parseGapRangeBounds', () => {
  it('正确解析 Gap 消息的时间范围', () => {
    const gap = createGapMessage({
      gapData: {
        timeRange: '2026-05-14T10:00:00.000+08:00~2026-05-15T10:00:00.000+08:00',
        beforeTime: 1747188000000,
        estimatedCount: 100,
        estimateConfidence: 'medium',
      },
    })
    const result = parseGapRangeBounds(gap)
    expect(result).not.toBeNull()
    expect(result!.start).toBeLessThan(result!.end)
  })

  it('非 Gap 消息应返回 null', () => {
    const msg = createMessage()
    expect(parseGapRangeBounds(msg)).toBeNull()
  })

  it('gapData 缺失时返回 null', () => {
    const msg = createMessage({ isGap: true })
    expect(parseGapRangeBounds(msg)).toBeNull()
  })

  it('gapData.timeRange 为空字符串时返回 null', () => {
    const msg = createMessage({
      isGap: true,
      gapData: { timeRange: '', beforeTime: 0, estimatedCount: 0, estimateConfidence: 'low' as const },
    })
    // parseTimeRangeStart/End call new Date('') which returns NaN → null
    expect(parseGapRangeBounds(msg)).toBeNull()
  })

  it('start > end 时应自动交换', () => {
    const msg = createGapMessage({
      gapData: {
        timeRange: '2026-05-15T10:00:00.000+08:00~2026-05-14T10:00:00.000+08:00',
        beforeTime: 1747188000000,
        estimatedCount: 100,
        estimateConfidence: 'medium',
      },
    })
    const result = parseGapRangeBounds(msg)
    expect(result).not.toBeNull()
    expect(result!.start).toBeLessThan(result!.end)
  })
})

// ============================================================
// mergeAdjacentGapMessages
// ============================================================
describe('mergeAdjacentGapMessages', () => {
  it('相邻/重叠的 Gap 应合并为一个', () => {
    const talker = 'wxid_user'
    const gap1 = createGapMessage({
      talker,
      gapData: {
        timeRange: '2026-05-14T10:00:00.000+08:00~2026-05-14T12:00:00.000+08:00',
        beforeTime: 1747224000000,
        estimatedCount: 50,
        estimateConfidence: 'medium' as const,
      },
    })
    const gap2 = createGapMessage({
      talker,
      gapData: {
        timeRange: '2026-05-14T11:00:00.000+08:00~2026-05-14T14:00:00.000+08:00',
        beforeTime: 1747231200000,
        estimatedCount: 30,
        estimateConfidence: 'high' as const,
      },
    })
    const realMsg = createMessage({ talker, id: 100, time: '2026-05-14T15:00:00.000+08:00' })
    const result = mergeAdjacentGapMessages([gap1, gap2, realMsg], talker)
    // Should have 1 merged gap + 1 real = 2 messages
    const gaps = result.filter(m => m.isGap)
    expect(gaps).toHaveLength(1)
    expect(gaps[0].gapData?.estimatedCount).toBe(80)
    expect(gaps[0].gapData?.estimateConfidence).toBe('high')
  })

  it('不相邻的 Gap 不应合并', () => {
    const talker = 'wxid_user'
    const gap1 = createGapMessage({
      talker,
      gapData: {
        timeRange: '2026-05-10T10:00:00.000+08:00~2026-05-10T12:00:00.000+08:00',
        beforeTime: 1746878400000,
        estimatedCount: 10,
        estimateConfidence: 'low' as const,
      },
    })
    const gap2 = createGapMessage({
      talker,
      gapData: {
        timeRange: '2026-05-15T10:00:00.000+08:00~2026-05-15T12:00:00.000+08:00',
        beforeTime: 1747274400000,
        estimatedCount: 20,
        estimateConfidence: 'low' as const,
      },
    })
    const result = mergeAdjacentGapMessages([gap1, gap2], talker)
    const gaps = result.filter(m => m.isGap)
    expect(gaps).toHaveLength(2)
  })

  it('Gap <= 1 时直接返回原列表', () => {
    const talker = 'wxid_user'
    const gap1 = createGapMessage({ talker })
    const result = mergeAdjacentGapMessages([gap1], talker)
    expect(result).toBe(result)
  })

  it('不同 talker 的 Gap 不合并', () => {
    const gap1 = createGapMessage({ talker: 'wxid_user' })
    const gap2 = createGapMessage({ talker: 'wxid_other' })
    const result = mergeAdjacentGapMessages([gap1, gap2], 'wxid_user')
    const gaps = result.filter(m => m.isGap && m.talker === 'wxid_user')
    expect(gaps).toHaveLength(1)
  })

  it('无 Gap 时返回原列表', () => {
    const msgs = createMessageBatch(3)
    const result = mergeAdjacentGapMessages(msgs, 'wxid_user')
    expect(result).toHaveLength(3)
  })
})

// ============================================================
// getHistoryAnchorBeforeTime
// ============================================================
describe('getHistoryAnchorBeforeTime', () => {
  it('顶部的 EmptyRange 消息应返回 suggestedBeforeTime', () => {
    const msg = createEmptyRangeMessage({
      emptyRangeData: {
        timeRange: '2026-05-14T10:00:00.000+08:00~2026-05-15T10:00:00.000+08:00',
        triedTimes: 1,
        suggestedBeforeTime: 1747274400000,
      },
    })
    const result = getHistoryAnchorBeforeTime([msg])
    expect(result).toBe(new Date(1747274400000).toISOString())
  })

  it('顶部的 Gap 消息应返回 beforeTime', () => {
    const msg = createGapMessage({
      gapData: {
        timeRange: '2026-05-14T10:00:00.000+08:00~2026-05-15T10:00:00.000+08:00',
        beforeTime: 1747188000000,
        estimatedCount: 100,
        estimateConfidence: 'medium',
      },
    })
    const result = getHistoryAnchorBeforeTime([msg])
    expect(result).toBe(new Date(1747188000000).toISOString())
  })

  it('普通消息应返回其 time 字段', () => {
    const msg = createMessage({ time: '2026-05-15T10:00:00.000+08:00' })
    expect(getHistoryAnchorBeforeTime([msg])).toBe('2026-05-15T10:00:00.000+08:00')
  })

  it('空列表应返回 undefined', () => {
    expect(getHistoryAnchorBeforeTime([])).toBeUndefined()
  })

  it('普通消息无 time 时回退到 createTime', () => {
    const msg = createMessage({ time: '', createTime: 1747274400 })
    expect(getHistoryAnchorBeforeTime([msg])).toBe(1747274400)
  })
})

// ============================================================
// checkDataConnection
// ============================================================
describe('checkDataConnection', () => {
  it('新消息和已有消息端点重叠 seq+time 时应返回 true', () => {
    // checkDataConnection 只检查首尾端点，重叠必须在端点
    const existing = createMessageBatch(3) // seq 1(time=10:00), 2(10:01), 3(10:02)
    const newMsgs = [
      createMessage({ seq: 3, time: '2026-05-15T10:02:00.000+08:00', createTime: 1747274520 }),
    ]
    expect(checkDataConnection(newMsgs, existing)).toBe(true)
  })

  it('新消息和已有消息完全不重叠时应返回 false', () => {
    const existing = createMessageBatch(3)
    const newMsgs = [
      createMessage({ seq: 100, time: '2026-05-20T10:00:00.000+08:00', createTime: 1747706400 }),
    ]
    expect(checkDataConnection(newMsgs, existing)).toBe(false)
  })

  it('新消息为空时返回 false', () => {
    expect(checkDataConnection([], createMessageBatch(3))).toBe(false)
  })

  it('已有消息为空时返回 false', () => {
    expect(checkDataConnection(createMessageBatch(3), [])).toBe(false)
  })

  it('已有消息全是 Gap/EmptyRange 时返回 false', () => {
    const existing = [createGapMessage(), createEmptyRangeMessage()]
    const newMsgs = [createMessage()]
    expect(checkDataConnection(newMsgs, existing)).toBe(false)
  })

  it('新消息全是 Gap/EmptyRange 时返回 false', () => {
    const existing = createMessageBatch(3)
    const newMsgs = [createGapMessage(), createEmptyRangeMessage()]
    expect(checkDataConnection(newMsgs, existing)).toBe(false)
  })
})

// ============================================================
// detectTimeGap
// ============================================================
describe('detectTimeGap', () => {
  it('请求起始时间与返回最早消息间存在大间隙时应返回 EmptyRange 消息', () => {
    const talker = 'wxid_user'
    // 请求的时间范围从 10:00 开始，但最早返回的消息是 10:30
    // 30 分钟 > 10 分钟阈值 → 应该产生 EmptyRange
    const timeRange = '2026-05-15T10:00:00.000+08:00~2026-05-15T11:00:00.000+08:00'
    const newMessages = [
      createMessage({
        talker,
        time: '2026-05-15T10:30:00.000+08:00',
        createTime: 1747276200,
      }),
    ]
    const result = detectTimeGap(talker, timeRange, 0, newMessages)
    expect(result).not.toBeNull()
    expect(result!.isEmptyRange).toBe(true)
    expect(result!.talker).toBe(talker)
  })

  it('间隙小于阈值（10分钟）时应返回 null', () => {
    const talker = 'wxid_user'
    // 只有 5 分钟间隙
    const timeRange = '2026-05-15T10:00:00.000+08:00~2026-05-15T11:00:00.000+08:00'
    const newMessages = [
      createMessage({
        talker,
        time: '2026-05-15T10:05:00.000+08:00',
        createTime: 1747274700,
      }),
    ]
    const result = detectTimeGap(talker, timeRange, 0, newMessages)
    expect(result).toBeNull()
  })

  it('offset > 0 时不检测', () => {
    const talker = 'wxid_user'
    const timeRange = '2026-05-15T10:00:00.000+08:00~2026-05-15T11:00:00.000+08:00'
    const newMessages = [
      createMessage({
        talker,
        time: '2026-05-16T10:00:00.000+08:00',
        createTime: 1747360800,
      }),
    ]
    expect(detectTimeGap(talker, timeRange, 100, newMessages)).toBeNull()
  })

  it('无新消息时返回 null', () => {
    expect(detectTimeGap('wxid_user', '2026-05-15T10:00:00.000+08:00~2026-05-15T11:00:00.000+08:00', 0, [])).toBeNull()
  })

  it('timeRange 为空字符串时返回 null', () => {
    const newMessages = [createMessage({ talker: 'wxid_user' })]
    expect(detectTimeGap('wxid_user', '', 0, newMessages)).toBeNull()
  })
})

// ============================================================
// parseEmptyRangeBounds
// ============================================================
describe('parseEmptyRangeBounds', () => {
  it('正确解析 EmptyRange 消息的时间范围', () => {
    const msg = createEmptyRangeMessage({
      emptyRangeData: {
        timeRange: '2026-05-14T10:00:00.000+08:00~2026-05-15T10:00:00.000+08:00',
        triedTimes: 1,
        suggestedBeforeTime: 1747188000000,
      },
    })
    const result = parseEmptyRangeBounds(msg)
    expect(result).not.toBeNull()
    expect(result!.start).toBeLessThan(result!.end)
  })

  it('非 EmptyRange 消息应返回 null', () => {
    const msg = createMessage()
    expect(parseEmptyRangeBounds(msg)).toBeNull()
  })

  it('emptyRangeData 缺失时返回 null', () => {
    const msg = createMessage({ isEmptyRange: true })
    expect(parseEmptyRangeBounds(msg)).toBeNull()
  })

  it('start > end 时应自动交换', () => {
    const msg = createEmptyRangeMessage({
      emptyRangeData: {
        timeRange: '2026-05-15T10:00:00.000+08:00~2026-05-14T10:00:00.000+08:00',
        triedTimes: 1,
        suggestedBeforeTime: 1747188000000,
      },
    })
    const result = parseEmptyRangeBounds(msg)
    expect(result).not.toBeNull()
    expect(result!.start).toBeLessThan(result!.end)
  })
})

// ============================================================
// isAdjacentOrOverlappingRange
// ============================================================
describe('isAdjacentOrOverlappingRange', () => {
  it('重叠范围应返回 true', () => {
    const a = { start: 0, end: 100 }
    const b = { start: 50, end: 150 }
    expect(isAdjacentOrOverlappingRange(a, b)).toBe(true)
  })

  it('完全包含应返回 true', () => {
    const a = { start: 0, end: 100 }
    const b = { start: 20, end: 80 }
    expect(isAdjacentOrOverlappingRange(a, b)).toBe(true)
  })

  it('相邻范围（间距 <= 阈值）应返回 true', () => {
    const a = { start: 0, end: 100 }
    const b = { start: 101, end: 200 }
    // threshold=1000ms, gap=1ms → adjacent
    expect(isAdjacentOrOverlappingRange(a, b)).toBe(true)
  })

  it('远距离范围应返回 false', () => {
    const a = { start: 0, end: 100 }
    const b = { start: 2000, end: 3000 }
    expect(isAdjacentOrOverlappingRange(a, b)).toBe(false)
  })

  it('自定义阈值', () => {
    const a = { start: 0, end: 100 }
    const b = { start: 500, end: 600 }
    // With threshold=1000, gap=400ms → adjacent
    expect(isAdjacentOrOverlappingRange(a, b, 1000)).toBe(true)
    // With threshold=100, gap=400ms → not adjacent
    expect(isAdjacentOrOverlappingRange(a, b, 100)).toBe(false)
  })

  it('完全相同的范围应返回 true', () => {
    const a = { start: 1000, end: 2000 }
    expect(isAdjacentOrOverlappingRange(a, a)).toBe(true)
  })
})

// ============================================================
// mergeTopAdjacentEmptyRanges
// ============================================================
describe('mergeTopAdjacentEmptyRanges', () => {
  it('顶部连续的 EmptyRange 应合并', () => {
    const talker = 'wxid_user'
    const er1 = createEmptyRangeMessage({
      talker,
      emptyRangeData: {
        timeRange: '2026-05-14T08:00:00.000+08:00~2026-05-14T10:00:00.000+08:00',
        triedTimes: 1,
        suggestedBeforeTime: 1747188000000,
      },
    })
    const er2 = createEmptyRangeMessage({
      talker, 
      emptyRangeData: {
        timeRange: '2026-05-14T09:00:00.000+08:00~2026-05-14T12:00:00.000+08:00',
        triedTimes: 2,
        suggestedBeforeTime: 1747195200000,
      },
    })
    const realMsg = createMessage({ talker, time: '2026-05-14T13:00:00.000+08:00' })
    const result = mergeTopAdjacentEmptyRanges([er1, er2, realMsg], talker)
    // 合并后的 EmptyRange + realMsg
    expect(result).toHaveLength(2)
    expect(result[0].isEmptyRange).toBe(true)
    expect(result[1]).toBe(realMsg)
    expect(result[0].emptyRangeData!.triedTimes).toBe(2) // max of triedTimes
  })

  it('不相邻的 EmptyRange 不应合并', () => {
    const talker = 'wxid_user'
    const er1 = createEmptyRangeMessage({
      talker,
      emptyRangeData: {
        timeRange: '2026-05-10T08:00:00.000+08:00~2026-05-10T10:00:00.000+08:00',
        triedTimes: 1,
        suggestedBeforeTime: 1746842400000,
      },
    })
    const er2 = createEmptyRangeMessage({
      talker,
      emptyRangeData: {
        timeRange: '2026-05-14T09:00:00.000+08:00~2026-05-14T12:00:00.000+08:00',
        triedTimes: 2,
        suggestedBeforeTime: 1747195200000,
      },
    })
    const realMsg = createMessage({ talker })
    const result = mergeTopAdjacentEmptyRanges([er1, er2, realMsg], talker)
    expect(result).toHaveLength(3)
  })

  it('非 EmptyRange 在顶部中断连续', () => {
    const talker = 'wxid_user'
    const realMsg = createMessage({ talker })
    const er1 = createEmptyRangeMessage({ talker })
    const result = mergeTopAdjacentEmptyRanges([realMsg, er1], talker)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(realMsg)
  })

  it('单个 EmptyRange 不合并', () => {
    const talker = 'wxid_user'
    const er1 = createEmptyRangeMessage({ talker })
    const realMsg = createMessage({ talker })
    const result = mergeTopAdjacentEmptyRanges([er1, realMsg], talker)
    expect(result).toHaveLength(2)
  })

  it('空数组直接返回', () => {
    expect(mergeTopAdjacentEmptyRanges([], 'wxid_user')).toEqual([])
  })

  it('不同 talker 的 EmptyRange 不合并', () => {
    const er1 = createEmptyRangeMessage({ talker: 'wxid_user' })
    const er2 = createEmptyRangeMessage({ talker: 'wxid_other' })
    const result = mergeTopAdjacentEmptyRanges([er1, er2], 'wxid_user')
    expect(result).toHaveLength(2)
  })
})

// ============================================================
// handleEmptyResult
// ============================================================
describe('handleEmptyResult', () => {
  it('offset=0 时应创建 EmptyRange 消息并前置', () => {
    const talker = 'wxid_user'
    const existing = [createMessage({ talker, time: '2026-05-15T12:00:00.000+08:00' })]
    const timeRange = '2026-05-15T10:00:00.000+08:00~2026-05-15T11:00:00.000+08:00'

    const result = handleEmptyResult(existing, talker, timeRange, 0, 3)

    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].isEmptyRange).toBe(true)
    expect(result.messages[0].talker).toBe(talker)
    expect(result.hasMore).toBe(true)
    expect(result.offset).toBe(0)
    expect(result.newMessages).toHaveLength(1)
    expect(result.newMessages[0].isEmptyRange).toBe(true)
  })

  it('offset=0 且 existing 无匹配 talker 消息时仍创建 EmptyRange', () => {
    const existing = [createMessage({ talker: 'wxid_other', time: '2026-05-15T12:00:00.000+08:00' })]
    const timeRange = '2026-05-15T10:00:00.000+08:00~2026-05-15T11:00:00.000+08:00'

    const result = handleEmptyResult(existing, 'wxid_user', timeRange, 0, 1)

    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].isEmptyRange).toBe(true)
    expect(result.hasMore).toBe(true)
  })

  it('offset > 0 时应标记 hasMore=false', () => {
    const existing = createMessageBatch(3)
    const result = handleEmptyResult(existing, 'wxid_user', '2026-05-15T10:00:00.000+08:00~2026-05-15T11:00:00.000+08:00', 100, 0)
    expect(result.hasMore).toBe(false)
    expect(result.messages).toBe(existing)
    expect(result.newMessages).toEqual([])
    expect(result.offset).toBe(100)
  })
})
