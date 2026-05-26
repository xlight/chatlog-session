import { describe, it, expect } from 'vitest'
import {
  getContactIndexKey,
  getContactSortKey,
  compareContactNames,
} from '@/utils/pinyin'

describe('getContactIndexKey', () => {
  it('returns ⭐ for starred contacts', () => {
    expect(getContactIndexKey('张三', true)).toBe('⭐')
    expect(getContactIndexKey('', true)).toBe('⭐')
  })

  it('returns # for empty/whitespace names', () => {
    expect(getContactIndexKey('')).toBe('#')
    expect(getContactIndexKey('   ')).toBe('#')
  })

  it('returns uppercase letter for English names', () => {
    expect(getContactIndexKey('alice')).toBe('A')
    expect(getContactIndexKey('Bob')).toBe('B')
    expect(getContactIndexKey('zoe')).toBe('Z')
  })

  it('returns pinyin first letter for Chinese names', () => {
    expect(getContactIndexKey('张三')).toBe('Z')
    expect(getContactIndexKey('李四')).toBe('L')
    expect(getContactIndexKey('王五')).toBe('W')
  })

  it('returns # for symbols and numbers', () => {
    expect(getContactIndexKey('123')).toBe('#')
    expect(getContactIndexKey('@user')).toBe('#')
  })

  it('handles names with leading whitespace', () => {
    expect(getContactIndexKey('  alice')).toBe('A')
  })
})

describe('getContactSortKey', () => {
  it('returns empty string for empty input', () => {
    expect(getContactSortKey('')).toBe('')
    expect(getContactSortKey('   ')).toBe('')
  })

  it('returns lowercase pinyin for Chinese names', () => {
    const key = getContactSortKey('张三')
    expect(key).toMatch(/^zhangsan$|^[a-z]+$/)
    expect(key).toBe(key.toLowerCase())
  })

  it('returns lowercase original for English names', () => {
    expect(getContactSortKey('Alice')).toBe('alice')
    expect(getContactSortKey('BoB')).toBe('bob')
  })
})

describe('compareContactNames', () => {
  it('returns 0 for equal names', () => {
    expect(compareContactNames('alice', 'alice')).toBe(0)
  })

  it('orders names alphabetically', () => {
    expect(compareContactNames('alice', 'bob')).toBeLessThan(0)
    expect(compareContactNames('bob', 'alice')).toBeGreaterThan(0)
  })

  it('orders Chinese names by pinyin', () => {
    expect(compareContactNames('张三', '李四')).toBeGreaterThan(0)
    expect(compareContactNames('李四', '张三')).toBeLessThan(0)
  })
})