import { describe, it, expect } from 'vitest'
import hljs, { registeredLanguages } from '../highlight'

describe('highlight.ts 语言子集', () => {
  it('已注册 12 种语言', () => {
    expect(registeredLanguages).toHaveLength(12)
    expect(hljs.listLanguages()).toContain('javascript')
    expect(hljs.listLanguages()).toContain('typescript')
    expect(hljs.listLanguages()).toContain('python')
    expect(hljs.listLanguages()).toContain('plaintext')
  })

  it('已注册语言正确高亮', () => {
    const result = hljs.highlight('const x = 1', { language: 'javascript' })
    expect(result.value).toContain('hljs-keyword')
  })

  it('未注册语言降级为纯文本（不报错）', () => {
    // rust 未注册
    expect(hljs.listLanguages()).not.toContain('rust')
    // highlightElement 对未注册语言不抛错，仅不添加高亮类
    const el = document.createElement('code')
    el.className = 'language-rust'
    el.textContent = 'fn main() {}'
    expect(() => hljs.highlightElement(el)).not.toThrow()
  })

  it('plaintext 语言总是可用', () => {
    const result = hljs.highlight('hello world', { language: 'plaintext' })
    expect(result.value).toBe('hello world')
  })
})
