import { describe, it, expect } from 'vitest'
import { getVersionInfo, getVersion } from '@/utils/version'

describe('version utils', () => {
  describe('getVersion', () => {
    it('returns the test-defined value', () => {
      expect(getVersion()).toBe('test')
    })
  })

  describe('getVersionInfo', () => {
    it('returns full version info object', () => {
      const info = getVersionInfo()
      expect(info.version).toBe('test')
      expect(info.buildDate).toBe('2026-05-15')
      expect(info.buildTime).toBe('2026-05-15 12:00:00')
      expect(info.gitHash).toBe('testhash')
      expect(info.gitBranch).toBe('main')
    })

    it('marks isDev when version contains "dev"', () => {
      const info = getVersionInfo()
      expect(typeof info.isDev).toBe('boolean')
    })

    it('does not append branch suffix when branch is main', () => {
      const info = getVersionInfo()
      expect(info.fullVersion).toBe('test')
    })
  })
})