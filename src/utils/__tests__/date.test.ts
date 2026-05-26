import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDateCategory,
  formatTimestamp,
  formatFullDate,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatMessageTime,
  formatSessionTime,
  formatDateGroup,
  isSameDay,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  padZero,
  getTimestamp,
  getTimestampMs,
  formatDuration,
  getTimeDiff,
} from '@/utils/date'

const FROZEN_DATE = new Date('2026-05-15T12:00:00.000Z')

function hoursAgo(h: number): Date {
  return new Date(FROZEN_DATE.getTime() - h * 3600000)
}

function daysAgo(d: number): Date {
  return new Date(FROZEN_DATE.getTime() - d * 86400000)
}

describe('date utils', () => {
  beforeEach(() => {
    vi.setSystemTime(FROZEN_DATE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getDateCategory', () => {
    it('should return "today" for current time', () => {
      expect(getDateCategory(new Date())).toBe('today')
    })

    it('should return "yesterday" for 1 day ago', () => {
      expect(getDateCategory(daysAgo(1))).toBe('yesterday')
    })

    it('should return "thisWeek" for 2-6 days ago', () => {
      expect(getDateCategory(daysAgo(2))).toBe('thisWeek')
      expect(getDateCategory(daysAgo(5))).toBe('thisWeek')
    })

    it('should return "thisYear" for dates this year but not this week', () => {
      expect(getDateCategory(new Date('2026-03-01'))).toBe('thisYear')
    })

    it('should return "older" for previous years', () => {
      expect(getDateCategory(new Date('2025-12-31'))).toBe('older')
    })
  })

  describe('formatTimestamp', () => {
    it('formats full by default', () => {
      const result = formatTimestamp(FROZEN_DATE.getTime())
      expect(result).toContain('2026')
    })

    it('formats date only', () => {
      const result = formatTimestamp(FROZEN_DATE.getTime(), 'date')
      expect(result).toBe('2026-05-15')
    })

    it('formats time only', () => {
      const result = formatTimestamp(FROZEN_DATE.getTime() / 1000, 'time')
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('handles seconds timestamps', () => {
      const ts = Math.floor(FROZEN_DATE.getTime() / 1000)
      expect(formatTimestamp(ts, 'date')).toBe('2026-05-15')
    })

    it('returns empty for empty', () => {
      expect(formatTimestamp(0)).toBe('')
    })
  })

  describe('formatFullDate', () => {
    it('formats full Chinese date', () => {
      const result = formatFullDate(new Date('2026-05-15T12:30:45'))
      expect(result).toContain('2026')
      expect(result).toContain('12:30:45')
    })
  })

  describe('formatDate', () => {
    it('formats as YYYY-MM-DD', () => {
      expect(formatDate(new Date('2026-05-15'))).toBe('2026-05-15')
      expect(formatDate(new Date('2026-01-03'))).toBe('2026-01-03')
    })
  })

  describe('formatTime', () => {
    it('formats as HH:mm:ss', () => {
      expect(formatTime(new Date('2026-05-15T09:05:03'))).toBe('09:05:03')
    })
  })

  describe('formatDateTime', () => {
    it('combines date and time', () => {
      const result = formatDateTime(new Date('2026-05-15T14:30:00'))
      expect(result).toBe('2026-05-15 14:30:00')
    })
  })

  describe('formatRelativeTime', () => {
    it('shows "刚刚" for less than 1 minute', () => {
      const date = new Date(FROZEN_DATE.getTime() - 30000)
      expect(formatRelativeTime(date)).toBe('刚刚')
    })

    it('shows minutes for under an hour', () => {
      const date = new Date(FROZEN_DATE.getTime() - 5 * 60000)
      expect(formatRelativeTime(date)).toContain('分钟前')
    })

    it('shows hour ago for earlier today', () => {
      expect(formatRelativeTime(hoursAgo(2))).toContain('小时前')
    })

    it('shows today time for 5+ hours ago today', () => {
      expect(formatRelativeTime(hoursAgo(6))).toContain('今天')
    })

    it('shows yesterday for yesterday', () => {
      expect(formatRelativeTime(daysAgo(1))).toContain('昨天')
    })

    it('shows date for thisYear', () => {
      const result = formatRelativeTime(new Date('2026-04-10T10:00:00'))
      expect(result).toMatch(/4-10/)
    })

    it('shows full date for older', () => {
      expect(formatRelativeTime(new Date('2025-12-31'))).toBe('2025-12-31')
    })
  })

  describe('formatMessageTime', () => {
    it('shows time for today', () => {
      const result = formatMessageTime(hoursAgo(1).getTime() / 1000)
      expect(result).toMatch(/^\d{2}:\d{2}$/)
    })

    it('shows "昨天" for yesterday', () => {
      const result = formatMessageTime(daysAgo(1).getTime() / 1000)
      expect(result).toContain('昨天')
    })

    it('shows weekday for this week', () => {
      const result = formatMessageTime(daysAgo(2).getTime() / 1000)
      expect(result).toMatch(/周/)
    })

    it('shows month-day for this year', () => {
      expect(formatMessageTime(new Date('2026-03-01').getTime() / 1000)).toMatch(/3月/)
    })

    it('handles string timestamp', () => {
      expect(formatMessageTime('2026-05-15T10:00:00')).toMatch(/10:00|今天/)
    })

    it('returns empty for 0', () => {
      expect(formatMessageTime(0)).toBe('')
    })
  })

  describe('formatSessionTime', () => {
    it('shows time for today', () => {
      const result = formatSessionTime(FROZEN_DATE.getTime() / 1000)
      expect(result).toMatch(/^\d{2}:\d{2}$/)
    })

    it('shows "昨天" for yesterday', () => {
      expect(formatSessionTime(daysAgo(1).getTime() / 1000)).toBe('昨天')
    })

    it('handles milliseconds', () => {
      const result = formatSessionTime(FROZEN_DATE.getTime())
      expect(result).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('formatDateGroup', () => {
    it('returns "今天" for today', () => {
      expect(formatDateGroup(FROZEN_DATE.getTime() / 1000)).toBe('今天')
    })

    it('returns "昨天" for yesterday', () => {
      expect(formatDateGroup(daysAgo(1).getTime() / 1000)).toBe('昨天')
    })

    it('does not return empty', () => {
      expect(formatDateGroup(new Date('2026-01-01').getTime() / 1000)).not.toBe('')
    })
  })

  describe('isSameDay', () => {
    it('returns true for same day', () => {
      const a = new Date('2026-05-15T10:00:00')
      const b = new Date('2026-05-15T18:00:00')
      expect(isSameDay(a, b)).toBe(true)
    })

    it('returns false for different days', () => {
      expect(isSameDay(new Date('2026-05-15'), new Date('2026-05-16'))).toBe(false)
    })
  })

  describe('isToday', () => {
    it('returns true for current day', () => {
      expect(isToday(new Date())).toBe(true)
    })

    it('returns false for yesterday', () => {
      expect(isToday(daysAgo(1))).toBe(false)
    })
  })

  describe('isYesterday', () => {
    it('returns true for yesterday', () => {
      expect(isYesterday(daysAgo(1))).toBe(true)
    })

    it('returns false for today', () => {
      expect(isYesterday(new Date())).toBe(false)
    })
  })

  describe('isThisWeek', () => {
    it('returns true for days within this week', () => {
      expect(isThisWeek(daysAgo(2))).toBe(true)
    })

    it('returns false for older', () => {
      expect(isThisWeek(daysAgo(10))).toBe(false)
    })
  })

  describe('isThisYear', () => {
    it('returns true for current year', () => {
      expect(isThisYear(new Date('2026-01-01'))).toBe(true)
    })

    it('returns false for previous year', () => {
      expect(isThisYear(new Date('2025-06-01'))).toBe(false)
    })
  })

  describe('padZero', () => {
    it('adds zero to single digit', () => {
      expect(padZero(5)).toBe('05')
    })

    it('preserves two digits', () => {
      expect(padZero(12)).toBe('12')
    })
  })

  describe('getTimestamp', () => {
    it('returns seconds timestamp close to frozen', () => {
      const ts = getTimestamp()
      const expected = Math.floor(FROZEN_DATE.getTime() / 1000)
      expect(ts).toBeGreaterThanOrEqual(expected)
    })
  })

  describe('getTimestampMs', () => {
    it('returns ms timestamp', () => {
      const ms = getTimestampMs()
      expect(ms).toBeGreaterThanOrEqual(FROZEN_DATE.getTime())
    })
  })

  describe('formatDuration', () => {
    it('formats seconds as MM:SS', () => {
      expect(formatDuration(45)).toBe('00:45')
    })

    it('formats minutes as MM:SS', () => {
      expect(formatDuration(125)).toBe('02:05')
    })

    it('formats hours as HH:MM:SS', () => {
      expect(formatDuration(3661)).toBe('01:01:01')
    })

    it('returns 00:00 for zero', () => {
      expect(formatDuration(0)).toBe('00:00')
    })
  })

  describe('getTimeDiff', () => {
    it('shows "刚刚" for very recent', () => {
      const justNow = (FROZEN_DATE.getTime() - 10000) / 1000
      expect(getTimeDiff(justNow)).toBe('刚刚')
    })

    it('returns a string', () => {
      expect(typeof getTimeDiff(Date.now() - 3600000)).toBe('string')
    })
  })
})