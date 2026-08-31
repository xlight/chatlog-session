/**
 * Markdown 渲染工具
 * 使用 marked 解析 Markdown，marked-highlight 接线代码高亮，DOMPurify 安全过滤
 */
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import DOMPurify from 'dompurify'
import hljs from './highlight'

/**
 * HTML 转义辅助函数
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 自定义 renderer：mermaid 代码块输出 <pre class="mermaid-code">，其他语言由 markedHighlight 高亮
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  if (lang === 'mermaid') {
    return `<pre class="mermaid-code">${escapeHtml(text)}</pre>`
  }
  // 非 mermaid 代码块由 markedHighlight 处理高亮
  const langClass = lang ? ` class="language-${lang}"` : ''
  return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>`
}
renderer.link = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
  return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
}

// 配置 marked：启用 GFM + breaks + 代码高亮（marked-highlight + highlight.js 共用）
const markedWithHighlight = marked.use(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      try {
        return hljs.highlight(code, { language }).value
      } catch {
        return escapeHtml(code)
      }
    },
  })
)

markedWithHighlight.setOptions({
  gfm: true,
  breaks: true,
  renderer,
})

// DOMPurify 配置：使用 USE_PROFILES html+svg（替代手写白名单）
const purifyConfig = {
  USE_PROFILES: { html: true, svg: true },
  ADD_ATTR: ['target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
}

/**
 * 渲染 Markdown 内容为安全 HTML
 * @param content Markdown 原始文本
 * @returns 经过 DOMPurify 过滤的安全 HTML 字符串
 */
export function renderMarkdown(content: string): string {
  const html = markedWithHighlight.parse(content) as string
  return DOMPurify.sanitize(html, purifyConfig)
}
