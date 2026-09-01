/**
 * MessageList 日期导航懒渲染测试
 *
 * 验证：
 * 1. showDate 仍作为外层功能开关
 * 2. isDateNavHovered 作为内层展开控制
 * 3. date-nav 用 v-if="showDate && isDateNavHovered" 控制（hover=false 时不渲染）
 * 4. mouseenter/mouseleave 控制 isDateNavHovered
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve('src/components/chat/MessageList.vue'), 'utf-8')

describe('MessageList 日期导航懒渲染', () => {
  it('有 isDateNavHovered ref', () => {
    expect(source).toMatch(/const isDateNavHovered\s*=\s*ref\(false\)/)
  })

  it('date-nav 用 v-if="showDate && isDateNavHovered" 控制', () => {
    expect(source).toContain('v-if="showDate && isDateNavHovered"')
  })

  it('scroll-bottom 区域有 mouseenter 事件设置 isDateNavHovered = true', () => {
    expect(source).toContain('@mouseenter="isDateNavHovered = true"')
  })

  it('scroll-bottom 区域有 mouseleave 事件设置 isDateNavHovered = false', () => {
    expect(source).toContain('@mouseleave="isDateNavHovered = false"')
  })

  it('不再单独用 v-if="showDate" 控制 date-nav', () => {
    // 确保旧的单独 showDate 控制已被替换
    expect(source).not.toMatch(/<div v-if="showDate" class="date-nav"/)
  })
})
