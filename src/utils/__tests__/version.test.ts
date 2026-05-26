import { describe, it, expect, vi } from 'vitest'
import {
  getVersionInfo,
  getVersion,
  getBuildDate,
  getBuildTime,
  getGitHash,
  getGitBranch,
  formatVersionInfo,
  printVersionInfo,
  checkVersion,
} from '@/utils/version'

describe('version utils', () => {
  describe('getVersion / getBuildDate / getBuildTime / getGitHash / getGitBranch', () => {
    it('returns the test-defined values', () => {
      expect(getVersion()).toBe('test')
      expect(getBuildDate()).toBe('2026-05-15')
      expect(getBuildTime()).toBe('2026-05-15 12:00:00')
      expect(getGitHash()).toBe('testhash')
      expect(getGitBranch()).toBe('main')
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

  describe('formatVersionInfo', () => {
    it('formats version string with hash and build date', () => {
      const result = formatVersionInfo()
      expect(result).toContain('vtest')
      expect(result).toContain('testhash')
      expect(result).toContain('2026-05-15')
    })
  })

  describe('printVersionInfo', () => {
    it('logs to console without throwing', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {})
      printVersionInfo()
      expect(logSpy).toHaveBeenCalled()
      expect(tableSpy).toHaveBeenCalled()
      logSpy.mockRestore()
      tableSpy.mockRestore()
    })
  })

  describe('checkVersion', () => {
    it('compares semver-like versions correctly when current >= required', () => {
      expect(checkVersion('0.0.0')).toBe(true)
    })

    it('returns false when current is less than required', () => {
      expect(checkVersion('999.0.0')).toBe(false)
    })

    it('handles versions with hash/branch suffixes', () => {
      expect(checkVersion('0.0.0+abc')).toBe(true)
    })
  })
})