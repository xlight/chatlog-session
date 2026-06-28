import { describe, it, expect } from 'vitest'

import { formatFileSize, formatNumber } from '@/utils/format'

describe('formatFileSize', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('returns "-" for negative or nullish', () => {
    expect(formatFileSize(-1)).toBe('-')
    expect(formatFileSize(NaN)).toBe('-')
  })

  it('formats KB correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats MB correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
  })

  it('respects decimals parameter', () => {
    expect(formatFileSize(1536, 0)).toBe('2 KB')
    expect(formatFileSize(1536, 3)).toBe('1.5 KB')
  })
})

describe('formatNumber', () => {
  it('adds thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('handles 0', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('returns "-" for nullish', () => {
    expect(formatNumber(null as unknown as number)).toBe('-')
    expect(formatNumber(undefined as unknown as number)).toBe('-')
  })
})