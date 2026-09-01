/**
 * 媒体预览上提等价性测试
 *
 * 验证：
 * 1. MessageList 层有 imagePreviewList/videoPreviewList computed
 * 2. MessageList 将预览列表通过 props 传给 MessageBubble
 * 3. MessageBubble 从 props 读取预览列表（非内部 filter）
 * 4. MessageBubble 不再含 currentTalker 守卫 + chatStore.imageMessages filter 逻辑
 * 5. imagePreviewIndex/videoPreviewIndex 保留在 MessageBubble 内（依赖当前消息 URL）
 *
 * 采用源码静态断言，因为预览逻辑涉及 chatStore.imageMessages（基于 currentTalker）
 * 的 computed 链路，mount 需完整 pinia + store mock，且无法精确断言"计算次数"。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const bubbleSource = readFileSync(resolve('src/components/chat/MessageBubble.vue'), 'utf-8')
const listSource = readFileSync(resolve('src/components/chat/MessageList.vue'), 'utf-8')

describe('MessageList 预览上提', () => {
  it('MessageList 含 imagePreviewList computed', () => {
    expect(listSource).toMatch(/const imagePreviewList\s*=\s*computed/)
  })

  it('MessageList 含 videoPreviewList computed', () => {
    expect(listSource).toMatch(/const videoPreviewList\s*=\s*computed/)
  })

  it('MessageList imagePreviewList 复用 chatStore.imageMessages', () => {
    expect(listSource).toContain('chatStore.imageMessages')
  })

  it('MessageList videoPreviewList 复用 chatStore.videoMessages', () => {
    expect(listSource).toContain('chatStore.videoMessages')
  })

  it('MessageList 将 imagePreviewList 通过 props 传给 MessageBubble', () => {
    expect(listSource).toContain(':image-preview-list="imagePreviewList"')
  })

  it('MessageList 将 videoPreviewList 通过 props 传给 MessageBubble', () => {
    expect(listSource).toContain(':video-preview-list="videoPreviewList"')
  })
})

describe('MessageBubble 预览从 props 读取', () => {
  it('MessageBubble Props 含 imagePreviewList', () => {
    expect(bubbleSource).toContain('imagePreviewList?:')
  })

  it('MessageBubble Props 含 videoPreviewList', () => {
    expect(bubbleSource).toContain('videoPreviewList?:')
  })

  it('MessageBubble 不再含 currentTalker 守卫 + chatStore.imageMessages filter', () => {
    expect(bubbleSource).not.toContain('chatStore.imageMessages')
    expect(bubbleSource).not.toContain('chatStore.videoMessages')
  })

  it('MessageBubble 不再含 useChatMessagesStore import', () => {
    expect(bubbleSource).not.toContain('useChatMessagesStore')
  })

  it('MessageBubble 不再含 currentTalker 守卫逻辑', () => {
    expect(bubbleSource).not.toMatch(/currentTalker.*!==.*props\.message\.talker/)
  })

  it('MessageBubble imagePreviewIndex 保留（依赖当前消息 URL）', () => {
    expect(bubbleSource).toMatch(/const imagePreviewIndex\s*=\s*computed/)
    expect(bubbleSource).toContain('props.imagePreviewList.findIndex')
  })

  it('MessageBubble videoPreviewIndex 保留（依赖当前消息 URL）', () => {
    expect(bubbleSource).toMatch(/const videoPreviewIndex\s*=\s*computed/)
    expect(bubbleSource).toContain('props.videoPreviewList.findIndex')
  })

  it('MessageBubble context 传 props.imagePreviewList（非内部 computed）', () => {
    expect(bubbleSource).toContain('imagePreviewList: props.imagePreviewList')
    expect(bubbleSource).toContain('videoPreviewList: props.videoPreviewList')
  })
})
