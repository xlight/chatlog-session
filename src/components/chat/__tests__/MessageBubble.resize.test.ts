/**
 * MessageBubble ResizeObserver 移除回归测试
 *
 * 验证移除 ResizeObserver 后：
 * 1. 源码不再创建 ResizeObserver 实例
 * 2. 源码不再 emit resize 事件
 * 3. 虚拟滚动高度测量由 TanStack Virtual measureElement 覆盖（MessageList 侧）
 *
 * 采用源码静态断言而非 mount 运行时验证，因为 MessageBubble 依赖
 * appStore/settingsStore/chatStore + useMessageType + useMessageUrl，
 * mount 需大量 mock 且无法精确断言"未创建 observer"。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const bubbleSource = readFileSync(resolve('src/components/chat/MessageBubble.vue'), 'utf-8')
const listSource = readFileSync(resolve('src/components/chat/MessageList.vue'), 'utf-8')

describe('MessageBubble ResizeObserver 移除回归', () => {
  it('源码不含 new ResizeObserver', () => {
    expect(bubbleSource).not.toContain('new ResizeObserver')
  })

  it('源码不含 setupResizeObserver 函数定义', () => {
    expect(bubbleSource).not.toContain('setupResizeObserver')
  })

  it('源码不含 resize emit 声明', () => {
    expect(bubbleSource).not.toMatch(/emit\(['"]resize['"]\)/)
    expect(bubbleSource).not.toMatch(/resize:\s*\[\]/)
  })

  it('源码不含 onBeforeUnmount 清理 observer', () => {
    expect(bubbleSource).not.toContain('resizeObserver?.disconnect')
  })

  it('源码不含 @vue:mounted="setupResizeObserver" 绑定', () => {
    expect(bubbleSource).not.toContain('@vue:mounted="setupResizeObserver"')
  })
})

describe('MessageList @resize 绑定移除回归', () => {
  it('源码不含 handleBubbleResize 函数定义', () => {
    expect(listSource).not.toContain('handleBubbleResize')
  })

  it('源码不含 @resize 事件绑定', () => {
    expect(listSource).not.toContain('@resize="handleBubbleResize"')
  })
})
