import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseTimeRangeStart,
  parseTimeRangeEnd,
  createEmptyRangeMessage,
  createGapMessage,
} from '@/utils/message-factory'
import { MessageType } from '@/types/message'

const FROZEN = new Date('2026-05-15T12:00:00.000Z')

describe('message-factory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('parseTimeRangeStart / parseTimeRangeEnd', () => {
    it('parses ISO range correctly', () => {
      const range = '2024-01-15T08:00:00.000+08:00~2024-01-16T08:00:00.000+08:00'
      expect(parseTimeRangeStart(range)).toBe(new Date('2024-01-15T08:00:00.000+08:00').getTime())
      expect(parseTimeRangeEnd(range)).toBe(new Date('2024-01-16T08:00:00.000+08:00').getTime())
    })

    it('returns Date.now() when range is malformed', () => {
      expect(parseTimeRangeStart('garbage')).toBe(FROZEN.getTime())
      expect(parseTimeRangeEnd('garbage')).toBe(FROZEN.getTime())
    })

    it('trims whitespace around range parts', () => {
      const range = ' 2024-01-15T08:00:00.000+08:00 ~ 2024-01-16T08:00:00.000+08:00 '
      expect(parseTimeRangeStart(range)).toBe(new Date('2024-01-15T08:00:00.000+08:00').getTime())
    })
  })

  describe('createEmptyRangeMessage', () => {
    const range = '2026-05-14T08:00:00.000+08:00~2026-05-14T20:00:00.000+08:00'

    it('produces an EmptyRange message with the expected shape', () => {
      const msg = createEmptyRangeMessage('wxid_user', range, undefined, 0, 1747188000000)
      expect(msg.type).toBe(MessageType.EmptyRange)
      expect(msg.isEmptyRange).toBe(true)
      expect(msg.emptyRangeData).toBeDefined()
      expect(msg.emptyRangeData?.timeRange).toBe(range)
      expect(msg.emptyRangeData?.triedTimes).toBe(0)
      expect(msg.emptyRangeData?.suggestedBeforeTime).toBe(1747188000000)
    })

    it('uses single-day format when start and end are the same CST day', () => {
      const msg = createEmptyRangeMessage('w', range, undefined, 1, 0)
      expect(msg.content).toMatch(/没有消息/)
      expect(msg.content).not.toContain(' ~ 2026-')
    })

    it('uses cross-day format when start and end span multiple CST days', () => {
      const crossDayRange = '2026-05-13T08:00:00.000+08:00~2026-05-14T20:00:00.000+08:00'
      const msg = createEmptyRangeMessage('w', crossDayRange, undefined, 1, 0)
      expect(msg.content).toContain('2026-05-13')
      expect(msg.content).toContain('2026-05-14')
    })

    it('uses negative id with -1000 offset', () => {
      const msg = createEmptyRangeMessage('w', range, undefined, 0, 0)
      expect(msg.id).toBe(-FROZEN.getTime() - 1000)
    })

    it('overrides end with newestMsgTime when provided', () => {
      const newest = '2026-05-14T19:00:00.000+08:00'
      const msg = createEmptyRangeMessage('w', range, newest, 0, 0)
      expect(msg.content).toBeTruthy()
    })
  })

  describe('createGapMessage', () => {
    it('produces a Gap message with the expected shape', () => {
      const start = '2026-05-15T08:00:00.000+08:00'
      const end = '2026-05-15T09:00:00.000+08:00'
      const msg = createGapMessage('wxid_user', start, end)
      expect(msg.type).toBe(MessageType.Gap)
      expect(msg.isGap).toBe(true)
      expect(msg.gapData?.beforeTime).toBe(new Date(end).getTime())
      expect(msg.gapData?.timeRange).toContain('+08:00')
    })

    it('shows estimated count when confidence is high', () => {
      const msg = createGapMessage(
        'w',
        '2026-05-15T08:00:00.000+08:00',
        '2026-05-15T09:00:00.000+08:00',
        50,
        'high'
      )
      expect(msg.content).toContain('约 50')
    })

    it('falls back to "更多消息" when confidence is low', () => {
      const msg = createGapMessage(
        'w',
        '2026-05-15T08:00:00.000+08:00',
        '2026-05-15T09:00:00.000+08:00',
        50,
        'low'
      )
      expect(msg.content).toContain('更多消息')
      expect(msg.content).not.toContain('约 50')
    })

    it('uses negative Date.now() id', () => {
      const msg = createGapMessage(
        'w',
        '2026-05-15T08:00:00.000+08:00',
        '2026-05-15T09:00:00.000+08:00'
      )
      expect(msg.id).toBe(-FROZEN.getTime())
    })

    it('time field equals CST representation of end time (anchor semantics)', () => {
      const start = '2026-05-15T08:00:00.000+08:00'
      const end = '2026-05-15T09:00:00.000+08:00'
      const msg = createGapMessage('w', start, end)
      expect(msg.time).toBe('2026-05-15T09:00:00.000+08:00')
    })

    it('accepts numeric timestamps', () => {
      const startTs = new Date('2026-05-15T08:00:00.000+08:00').getTime()
      const endTs = new Date('2026-05-15T09:00:00.000+08:00').getTime()
      const msg = createGapMessage('w', startTs, endTs)
      expect(msg.gapData?.beforeTime).toBe(endTs)
    })
  })
})