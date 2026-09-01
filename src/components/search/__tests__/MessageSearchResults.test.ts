/**
 * MessageSearchResults UI 重设计回归测试
 *
 * 验证 redesign-searchdialog-ui change 的修改：
 * 1. MessageBubble 传 show-avatar=false/show-time=false/show-name=false
 * 2. 空状态用 Empty 组件（非 el-empty）
 * 3. hover 效果用 box-shadow（非 translateX）
 *
 * 采用源码静态断言而非 mount 运行时验证，因为 MessageSearchResults 依赖
 * MessageBubble（间接依赖 appStore/settingsStore + useMessageType + useMessageUrl），
 * mount 需大量 mock 且无法精确断言 prop 传递。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve('src/components/search/MessageSearchResults.vue'),
  'utf-8',
)

describe('MessageSearchResults UI 重设计回归', () => {
  it('MessageBubble 传 :show-avatar="false"', () => {
    expect(source).toContain(':show-avatar="false"')
  })

  it('MessageBubble 传 :show-time="false"', () => {
    expect(source).toContain(':show-time="false"')
  })

  it('MessageBubble 传 :show-name="false"', () => {
    expect(source).toContain(':show-name="false"')
  })

  it('空状态用 Empty 组件（非 el-empty）', () => {
    expect(source).toContain('import Empty')
    expect(source).not.toMatch(/<el-empty/)
  })

  it('hover 用 box-shadow（非 translateX）', () => {
    expect(source).toContain('box-shadow')
    expect(source).not.toContain('translateX')
  })
})
