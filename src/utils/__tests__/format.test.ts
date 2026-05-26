import { describe, it, expect, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((s: string) => s),
  },
}))

import {
  formatFileSize,
  formatNumber,
  formatPercent,
  formatPhone,
  formatIdCard,
  formatBankCard,
  formatMessageContent,
  formatMessagePreview,
  formatContactName,
  formatVoiceDuration,
  formatVideoDuration,
  formatUrl,
  truncateText,
  highlightKeyword,
  escapeRegExp,
  escapeHtml,
  formatQueryString,
  parseQueryString,
  formatUserStatus,
  formatError,
  camelToSnake,
  snakeToCamel,
  capitalize,
} from '@/utils/format'

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

describe('formatPercent', () => {
  it('calculates percent correctly', () => {
    expect(formatPercent(50, 100)).toBe('50.00%')
    expect(formatPercent(1, 3, 2)).toBe('33.33%')
  })

  it('returns "0%" when total is 0 or missing', () => {
    expect(formatPercent(10, 0)).toBe('0%')
    expect(formatPercent(10, null as unknown as number)).toBe('0%')
  })

  it('respects decimals', () => {
    expect(formatPercent(1, 3, 0)).toBe('33%')
  })
})

describe('formatPhone', () => {
  it('masks middle 4 digits', () => {
    expect(formatPhone('13812345678')).toBe('138****5678')
  })

  it('returns empty string for empty input', () => {
    expect(formatPhone('')).toBe('')
  })

  it('does not modify non-matching strings', () => {
    expect(formatPhone('abc')).toBe('abc')
  })
})

describe('formatIdCard', () => {
  it('masks middle 8 digits', () => {
    expect(formatIdCard('110101199001011234')).toBe('110101********1234')
  })

  it('returns empty string for empty', () => {
    expect(formatIdCard('')).toBe('')
  })
})

describe('formatBankCard', () => {
  it('formats bank card', () => {
    const result = formatBankCard('6228480402564890018')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty string for empty', () => {
    expect(formatBankCard('')).toBe('')
  })
})

describe('formatMessageContent', () => {
  it('returns string for normal content', () => {
    expect(typeof formatMessageContent('hello')).toBe('string')
  })

  it('handles empty content', () => {
    expect(formatMessageContent('')).toBe('')
  })

  it('respects maxLength', () => {
    const long = 'a'.repeat(1000)
    const result = formatMessageContent(long, 50)
    expect(result.length).toBeLessThanOrEqual(53)
  })
})

describe('formatMessagePreview', () => {
  it('returns text content for type 1', () => {
    expect(formatMessagePreview(1, 'hello')).toBe('hello')
  })

  it('returns icon label for image type 3', () => {
    const result = formatMessagePreview(3)
    expect(result).toContain('图片')
  })

  it('returns icon label for voice type 34', () => {
    const result = formatMessagePreview(34)
    expect(result).toContain('语音')
  })
})

describe('formatContactName', () => {
  it('prefers remark', () => {
    expect(formatContactName({ remark: 'R', nickname: 'N', wxid: 'W' })).toBe('R')
  })

  it('falls back to nickname', () => {
    expect(formatContactName({ nickname: 'N', wxid: 'W' })).toBe('N')
  })

  it('falls back to wxid', () => {
    expect(formatContactName({ wxid: 'W' })).toBe('W')
  })
})

describe('formatVoiceDuration', () => {
  it('formats duration in seconds', () => {
    expect(formatVoiceDuration(5)).toContain('5')
    expect(formatVoiceDuration(0)).toBeTruthy()
  })
})

describe('formatVideoDuration', () => {
  it('formats short duration', () => {
    expect(formatVideoDuration(45)).toMatch(/00:45|0:45/)
  })

  it('formats minutes', () => {
    expect(formatVideoDuration(125)).toMatch(/2:05|02:05/)
  })

  it('formats hours', () => {
    const result = formatVideoDuration(3661)
    expect(result).toMatch(/1:01:01|01:01:01/)
  })
})

describe('formatUrl', () => {
  it('preserves http URLs', () => {
    expect(formatUrl('http://example.com')).toContain('example.com')
  })

  it('handles protocol-less URLs', () => {
    const result = formatUrl('example.com')
    expect(typeof result).toBe('string')
  })
})

describe('truncateText', () => {
  it('does not truncate short text', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('truncates with default suffix', () => {
    expect(truncateText('hello world', 5)).toBe('he...')
  })

  it('uses custom suffix', () => {
    expect(truncateText('hello world', 5, '~')).toBe('hell~')
  })

  it('returns empty for empty input', () => {
    expect(truncateText('', 5)).toBe('')
  })
})

describe('highlightKeyword', () => {
  it('returns string', () => {
    expect(typeof highlightKeyword('hello world', 'world')).toBe('string')
  })

  it('handles empty keyword', () => {
    expect(highlightKeyword('hello', '')).toBe('hello')
  })
})

describe('escapeRegExp', () => {
  it('escapes special regex chars', () => {
    expect(escapeRegExp('a.b*c+d?')).toBe('a\\.b\\*c\\+d\\?')
  })

  it('preserves plain text', () => {
    expect(escapeRegExp('abc')).toBe('abc')
  })
})

describe('escapeHtml', () => {
  it('escapes HTML special chars', () => {
    const result = escapeHtml('<div>&"</div>')
    expect(result).not.toContain('<div>')
    expect(result).toContain('&lt;')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('formatQueryString', () => {
  it('builds query string from object', () => {
    const result = formatQueryString({ a: 1, b: 'two' })
    expect(result).toContain('a=1')
    expect(result).toContain('b=two')
  })

  it('returns empty string for empty object', () => {
    expect(formatQueryString({})).toBe('')
  })

  it('skips null/undefined', () => {
    const result = formatQueryString({ a: 1, b: null, c: undefined })
    expect(result).toContain('a=1')
    expect(result).not.toContain('b=')
    expect(result).not.toContain('c=')
  })
})

describe('parseQueryString', () => {
  it('parses query string', () => {
    expect(parseQueryString('a=1&b=two')).toEqual({ a: '1', b: 'two' })
  })

  it('returns empty object for empty string', () => {
    expect(parseQueryString('')).toEqual({})
  })

  it('handles ? prefix', () => {
    expect(parseQueryString('?a=1')).toEqual({ a: '1' })
  })

  it('decodes URL-encoded values', () => {
    expect(parseQueryString('a=hello%20world')).toEqual({ a: 'hello world' })
  })
})

describe('formatUserStatus', () => {
  it('returns a string for valid status', () => {
    expect(typeof formatUserStatus(1)).toBe('string')
    expect(typeof formatUserStatus(0)).toBe('string')
    expect(typeof formatUserStatus('online')).toBe('string')
  })
})

describe('formatError', () => {
  it('extracts message from Error', () => {
    expect(formatError(new Error('oops'))).toBe('oops')
  })

  it('returns string as-is', () => {
    expect(formatError('plain')).toBe('plain')
  })

  it('handles undefined', () => {
    expect(typeof formatError(undefined)).toBe('string')
  })

  it('handles object with message', () => {
    expect(formatError({ message: 'm' })).toBe('m')
  })
})

describe('camelToSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(camelToSnake('helloWorld')).toBe('hello_world')
    expect(camelToSnake('myVeryLongName')).toBe('my_very_long_name')
  })

  it('preserves all-lowercase', () => {
    expect(camelToSnake('hello')).toBe('hello')
  })
})

describe('snakeToCamel', () => {
  it('converts snake_case to camelCase', () => {
    expect(snakeToCamel('hello_world')).toBe('helloWorld')
    expect(snakeToCamel('my_very_long_name')).toBe('myVeryLongName')
  })

  it('preserves no-underscore', () => {
    expect(snakeToCamel('hello')).toBe('hello')
  })
})

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('handles empty', () => {
    expect(capitalize('')).toBe('')
  })

  it('handles single char', () => {
    expect(capitalize('a')).toBe('A')
  })
})
