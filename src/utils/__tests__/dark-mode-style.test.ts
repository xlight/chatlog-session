import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

describe('暗色模式样式可用', () => {
  it('main.ts 引入 dark css-vars', () => {
    const mainTs = readFileSync(resolve(__dirname, '../../main.ts'), 'utf-8')
    expect(mainTs).toContain('dark/css-vars.css')
  })

  it('main.ts 引入 ElMessage/ElMessageBox/ElLoading 样式兜底', () => {
    const mainTs = readFileSync(resolve(__dirname, '../../main.ts'), 'utf-8')
    expect(mainTs).toContain('message/style/css')
    expect(mainTs).toContain('message-box/style/css')
    expect(mainTs).toContain('loading/style/css')
  })

  it('main.ts 不再全量注册 Element Plus', () => {
    const mainTs = readFileSync(resolve(__dirname, '../../main.ts'), 'utf-8')
    expect(mainTs).not.toContain('app.use(ElementPlus)')
    expect(mainTs).not.toContain("import ElementPlus from 'element-plus'")
    expect(mainTs).not.toContain('element-plus/dist/index.css')
  })

  it('main.ts 不再全量循环注册图标', () => {
    const mainTs = readFileSync(resolve(__dirname, '../../main.ts'), 'utf-8')
    expect(mainTs).not.toContain("import * as ElementPlusIconsVue")
    expect(mainTs).not.toContain('Object.entries(ElementPlusIconsVue)')
  })

  it('highlight.ts 存在且注册语言子集', () => {
    const path = resolve(__dirname, '../highlight.ts')
    expect(existsSync(path)).toBe(true)
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('highlight.js/lib/core')
    expect(content).not.toContain("from 'highlight.js'")
  })
})
