import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('vitest runs and jsdom works', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
    expect(document.createElement('div')).toBeTruthy()
  })
})