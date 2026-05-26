import { describe, it, expect } from 'vitest'
import {
  toCST,
  formatCSTTime,
  fromCST,
  nowCST,
  formatCSTRange,
  timestampToCST,
  formatCSTDate,
  getCSTDayStart,
  getCSTDayEnd,
  getCSTDaysDiff,
  isSameCSTDay,
  getCSTDaysAgo,
} from '@/utils/timezone'

describe('toCST', () => {
  it('converts UTC to CST ISO string', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    expect(toCST(date)).toBe('2024-01-15T18:30:00.000+08:00')
  })

  it('handles midnight UTC', () => {
    const date = new Date('2024-01-15T00:00:00Z')
    expect(toCST(date)).toBe('2024-01-15T08:00:00.000+08:00')
  })

  it('handles late UTC time crossing day boundary', () => {
    const date = new Date('2024-01-15T20:00:00Z')
    expect(toCST(date)).toBe('2024-01-16T04:00:00.000+08:00')
  })
})

describe('formatCSTTime', () => {
  it('formats hours/minutes/seconds in CST', () => {
    const date = new Date('2024-01-15T10:30:45Z')
    expect(formatCSTTime(date)).toBe('18:30:45')
  })

  it('wraps hour past 24', () => {
    const date = new Date('2024-01-15T20:00:00Z')
    expect(formatCSTTime(date)).toBe('04:00:00')
  })
})

describe('fromCST', () => {
  it('parses CST ISO string back to Date', () => {
    const cst = '2024-01-15T18:30:00.000+08:00'
    expect(fromCST(cst).getTime()).toBe(new Date('2024-01-15T10:30:00Z').getTime())
  })
})

describe('nowCST', () => {
  it('returns CST formatted now', () => {
    const result = nowCST()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+08:00$/)
  })
})

describe('formatCSTRange', () => {
  it('joins start~end CST', () => {
    const start = new Date('2024-01-15T00:00:00Z')
    const end = new Date('2024-01-16T00:00:00Z')
    expect(formatCSTRange(start, end)).toBe(
      '2024-01-15T08:00:00.000+08:00~2024-01-16T08:00:00.000+08:00'
    )
  })
})

describe('timestampToCST', () => {
  it('converts unix seconds to CST ISO', () => {
    const ts = Math.floor(new Date('2024-01-15T10:30:00Z').getTime() / 1000)
    expect(timestampToCST(ts)).toBe('2024-01-15T18:30:00.000+08:00')
  })
})

describe('formatCSTDate', () => {
  it('returns YYYY-MM-DD in CST', () => {
    expect(formatCSTDate(new Date('2024-01-15T10:30:00Z'))).toBe('2024-01-15')
  })

  it('shifts late UTC to next CST day', () => {
    expect(formatCSTDate(new Date('2024-01-15T20:00:00Z'))).toBe('2024-01-16')
  })
})

describe('getCSTDayStart / getCSTDayEnd', () => {
  it('returns start of CST day', () => {
    const date = new Date('2024-01-15T10:00:00Z')
    expect(getCSTDayStart(date)).toBe('2024-01-15T00:00:00.000+08:00')
  })

  it('returns end of CST day', () => {
    const date = new Date('2024-01-15T10:00:00Z')
    expect(getCSTDayEnd(date)).toBe('2024-01-15T23:59:59.999+08:00')
  })
})

describe('getCSTDaysDiff', () => {
  it('returns 0 for same day', () => {
    const d1 = new Date('2024-01-15T05:00:00Z')
    const d2 = new Date('2024-01-15T15:00:00Z')
    expect(getCSTDaysDiff(d1, d2)).toBe(0)
  })

  it('returns positive diff', () => {
    const d1 = new Date('2024-01-15T10:00:00Z')
    const d2 = new Date('2024-01-17T10:00:00Z')
    expect(getCSTDaysDiff(d1, d2)).toBe(2)
  })
})

describe('isSameCSTDay', () => {
  it('returns true for same CST day', () => {
    const d1 = new Date('2024-01-15T16:00:00Z')
    const d2 = new Date('2024-01-15T20:00:00Z')
    expect(isSameCSTDay(d1, d2)).toBe(true)
  })

  it('returns false for different CST days', () => {
    const d1 = new Date('2024-01-14T15:00:00Z')
    const d2 = new Date('2024-01-15T01:00:00Z')
    expect(isSameCSTDay(d1, d2)).toBe(false)
  })
})

describe('getCSTDaysAgo', () => {
  it('returns CST string for N days ago', () => {
    const base = new Date('2024-01-15T10:00:00Z')
    const result = getCSTDaysAgo(7, base)
    expect(result).toBe('2024-01-08T18:00:00.000+08:00')
  })
})