import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  setLocal,
  getLocal,
  removeLocal,
  clearLocal,
  setSession,
  getSession,
  removeSession,
} from '@/utils/storage'

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('setLocal / getLocal', () => {
    it('stores and retrieves a string value', () => {
      setLocal('foo', 'bar')
      expect(getLocal<string>('foo')).toBe('bar')
    })

    it('stores and retrieves an object', () => {
      const obj = { a: 1, b: { c: 'x' } }
      setLocal('obj', obj)
      expect(getLocal('obj')).toEqual(obj)
    })

    it('returns null for non-existent key', () => {
      expect(getLocal('nope')).toBeNull()
    })

    it('uses prefixed key under the hood', () => {
      setLocal('foo', 'bar')
      const stored = localStorage.getItem('chatlog_foo')
      expect(stored).not.toBeNull()
      expect(JSON.parse(stored!).value).toBe('bar')
    })
  })

  describe('expire', () => {
    it('returns the value before expiry', () => {
      setLocal('foo', 'bar', 60)
      vi.advanceTimersByTime(30 * 1000)
      expect(getLocal<string>('foo')).toBe('bar')
    })

    it('returns null after expiry and removes the key', () => {
      setLocal('foo', 'bar', 60)
      vi.advanceTimersByTime(61 * 1000)
      expect(getLocal('foo')).toBeNull()
      expect(localStorage.getItem('chatlog_foo')).toBeNull()
    })
  })

  describe('removeLocal / clearLocal', () => {
    it('removes a single key', () => {
      setLocal('foo', 'bar')
      removeLocal('foo')
      expect(getLocal('foo')).toBeNull()
    })

    it('clears only chatlog_ prefixed keys', () => {
      setLocal('a', '1')
      setLocal('b', '2')
      localStorage.setItem('unrelated', 'keep')
      clearLocal()
      expect(getLocal('a')).toBeNull()
      expect(getLocal('b')).toBeNull()
      expect(localStorage.getItem('unrelated')).toBe('keep')
    })
  })

  describe('sessionStorage variants', () => {
    it('setSession / getSession round-trip', () => {
      setSession('foo', 42)
      expect(getSession<number>('foo')).toBe(42)
    })

    it('removeSession works', () => {
      setSession('foo', 'x')
      removeSession('foo')
      expect(getSession('foo')).toBeNull()
    })

    it('local and session storage do not collide', () => {
      setLocal('k', 'local')
      setSession('k', 'session')
      expect(getLocal<string>('k')).toBe('local')
      expect(getSession<string>('k')).toBe('session')
    })
  })
})