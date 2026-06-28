import { describe, it, expect } from 'vitest'
import { toCST, formatCSTTime, formatCSTRange, formatCSTDate } from '@/utils/timezone'

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

describe('formatCSTRange', () => {
  it('joins start~end CST', () => {
    const start = new Date('2024-01-15T00:00:00Z')
    const end = new Date('2024-01-16T00:00:00Z')
    expect(formatCSTRange(start, end)).toBe(
      '2024-01-15T08:00:00.000+08:00~2024-01-16T08:00:00.000+08:00'
    )
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