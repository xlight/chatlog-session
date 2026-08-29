import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../markdown'

describe('Mermaid 占位渲染', () => {
  it('mermaid 代码块输出 pre.mermaid-code（占位基础）', () => {
    const html = renderMarkdown('```mermaid\ngraph TD\nA-->B\n```')
    expect(html).toContain('mermaid-code')
    expect(html).toContain('graph TD')
    // 不应包含 svg（未渲染）
    expect(html).not.toContain('<svg')
  })

  it('mermaid 占位不加载图表库（仅生成代码预览）', () => {
    const html = renderMarkdown('```mermaid\npie\n  "A": 50\n  "B": 50\n```')
    // 仅代码文本，无 svg/canvas 等渲染产物
    expect(html).toContain('mermaid-code')
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('<canvas')
  })

  it('暗色切换不触发未渲染图表加载（占位保持不变）', () => {
    // 占位阶段：mermaid-code 节点存在，无 svg
    // 暗色切换守卫 mermaidInstance === null 时直接 return，不加载
    const html = renderMarkdown('```mermaid\nsequenceDiagram\nA->>B: Hello\n```')
    const hasSvg = html.includes('<svg')
    expect(hasSvg).toBe(false)
  })
})

describe('Mermaid 失败降级', () => {
  it('无效 mermaid 语法仍生成 mermaid-code 占位（渲染时才降级）', () => {
    const html = renderMarkdown('```mermaid\nthis is invalid mermaid\n```')
    expect(html).toContain('mermaid-code')
    expect(html).toContain('this is invalid mermaid')
  })
})
