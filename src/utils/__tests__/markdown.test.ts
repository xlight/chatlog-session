/**
 * markdown.ts 基线测试
 *
 * 迁移高亮接线前锁定现有行为，迁移后全量跑通即证明等价。
 */
import { describe, it, expect } from 'vitest'
import { renderMarkdown, escapeHtml } from '../markdown'

describe('markdown.ts 基线测试', () => {
  describe('escapeHtml', () => {
    it('转义特殊字符', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      )
    })

    it('转义 & 符号', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b')
    })

    it('转义单引号', () => {
      expect(escapeHtml("it's")).toBe('it&#39;s')
    })
  })

  describe('renderMarkdown — 基础渲染', () => {
    it('渲染标题', () => {
      const result = renderMarkdown('# 标题')
      expect(result).toContain('<h1>')
      expect(result).toContain('标题')
    })

    it('渲染段落', () => {
      const result = renderMarkdown('普通文本')
      expect(result).toContain('普通文本')
    })

    it('渲染加粗', () => {
      const result = renderMarkdown('**加粗**')
      expect(result).toContain('<strong>')
      expect(result).toContain('加粗')
    })

    it('渲染链接（含 target=_blank）', () => {
      const result = renderMarkdown('[链接](https://example.com)')
      expect(result).toContain('<a')
      expect(result).toContain('href="https://example.com"')
      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
    })
  })

  describe('renderMarkdown — 代码块', () => {
    it('渲染普通代码块（无语言）', () => {
      const result = renderMarkdown('```\nconst x = 1\n```')
      expect(result).toContain('<pre>')
      expect(result).toContain('<code>')
      expect(result).toContain('const x = 1')
    })

    it('渲染带语言标记的代码块（高亮后包含 hljs class）', () => {
      const result = renderMarkdown('```javascript\nconst x = 1\n```')
      expect(result).toContain('<pre>')
      expect(result).toContain('language-javascript')
      // 高亮后 const/1 被 highlight.js 包裹为 <span class="hljs-keyword"> 等
      expect(result).toContain('hljs-keyword')
      expect(result).toContain('hljs-number')
    })

    it('mermaid 代码块输出 mermaid-code class', () => {
      const result = renderMarkdown('```mermaid\ngraph TD\nA-->B\n```')
      expect(result).toContain('mermaid-code')
      expect(result).toContain('graph TD')
    })
  })

  describe('renderMarkdown — HTML 安全', () => {
    it('过滤 script 标签', () => {
      const result = renderMarkdown('<script>alert("xss")</script>')
      expect(result).not.toContain('<script>')
    })

    it('保留 SVG 标签（Mermaid 渲染需要）', () => {
      const result = renderMarkdown('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>')
      expect(result).toContain('<svg')
      expect(result).toContain('<circle')
    })
  })
})
