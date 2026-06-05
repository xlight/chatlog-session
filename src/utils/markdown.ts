/**
 * Markdown 渲染工具
 * 使用 marked 解析 Markdown，DOMPurify 安全过滤，支持 Mermaid 代码块识别
 */
import { marked } from 'marked'
import DOMPurify from 'dompurify'

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

// 自定义 renderer：mermaid 代码块输出 <pre class="mermaid-code">，其他语言输出标准 <pre><code>
const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const escaped = escapeHtml(text)
  if (lang === 'mermaid') {
    return `<pre class="mermaid-code">${escaped}</pre>`
  }
  const langClass = lang ? ` class="language-${lang}"` : ''
  return `<pre><code${langClass}>${escaped}</code></pre>`
}

// 配置 marked：启用 GFM + breaks
marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
})

// DOMPurify 白名单：允许 SVG 标签和属性（Mermaid 渲染需要）
const purifyConfig = {
  ADD_TAGS: [
    'svg', 'path', 'g', 'circle', 'rect', 'line', 'polygon', 'polyline',
    'text', 'foreignObject', 'defs', 'marker', 'title', 'desc', 'tspan',
    'clipPath', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'image',
    'use', 'switch', 'symbol', 'feGaussianBlur', 'filter', 'style',
  ],
  ADD_ATTR: [
    'class', 'viewBox', 'fill', 'stroke', 'd', 'cx', 'cy', 'r', 'x', 'y',
    'width', 'height', 'points', 'transform', 'xmlns', 'xmlns:xlink',
    'x1', 'y1', 'x2', 'y2', 'rx', 'ry', 'offset', 'stop-color', 'stop-opacity',
    'id', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient',
    'clip-path', 'filter', 'font-family', 'font-size', 'font-weight',
    'text-anchor', 'dominant-baseline', 'alignment-baseline',
    'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin',
    'fill-opacity', 'fill-rule', 'opacity', 'preserveAspectRatio',
    'gradientUnits', 'gradientTransform', 'patternUnits', 'scale',
  ],
  ALLOW_DATA_ATTR: false,
}

/**
 * 渲染 Markdown 内容为安全 HTML
 * @param content Markdown 原始文本
 * @returns 经过 DOMPurify 过滤的安全 HTML 字符串
 */
export function renderMarkdown(content: string): string {
  const html = marked.parse(content) as string
  return DOMPurify.sanitize(html, purifyConfig)
}
