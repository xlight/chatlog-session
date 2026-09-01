/**
 * SessionList 虚拟化测试
 *
 * 验证：
 * 1. SessionList 引入 useVirtualizer
 * 2. unpinnedSessions 使用虚拟滚动（getVirtualItems + getTotalSize）
 * 3. pinnedSessions 保持常驻渲染（v-for，非虚拟化）
 * 4. isSearchMode 时全量渲染（非虚拟化）
 * 5. scrollRef 绑定到 session-list__content
 * 6. pinned 区域有 max-height 兜底
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve('src/components/chat/SessionList.vue'), 'utf-8')

describe('SessionList 虚拟化结构', () => {
  it('引入 useVirtualizer', () => {
    expect(source).toContain('useVirtualizer')
    expect(source).toContain('@tanstack/vue-virtual')
  })

  it('有 scrollRef 作为虚拟滚动容器', () => {
    expect(source).toMatch(/const scrollRef\s*=\s*ref/)
    expect(source).toContain('ref="scrollRef"')
  })

  it('unpinnedSessions 使用虚拟滚动 getVirtualItems', () => {
    expect(source).toContain('virtualizer.getVirtualItems()')
  })

  it('unpinnedSessions 使用 getTotalSize 设置容器高度', () => {
    expect(source).toContain('virtualizer.getTotalSize()')
  })

  it('虚拟项使用 absolute + translateY 定位', () => {
    expect(source).toContain("position: 'absolute'")
    expect(source).toContain('translateY')
  })
})

describe('pinnedSessions 保持常驻渲染', () => {
  it('pinnedSessions 使用 v-for（非虚拟化）', () => {
    expect(source).toContain('v-for="session in sessionStore.pinnedSessions"')
  })

  it('pinned 区域有 max-height 兜底 class', () => {
    expect(source).toContain('session-group__pinned-list')
    expect(source).toContain('max-height')
    expect(source).toContain('overflow-y: auto')
  })
})

describe('isSearchMode 时全量渲染', () => {
  it('isSearchMode 分支使用 v-for 全量渲染', () => {
    expect(source).toContain('v-if="isSearchMode"')
    expect(source).toContain('v-for="session in sessionList"')
  })

  it('isSearchMode 切换时重置虚拟列表滚动位置', () => {
    expect(source).toMatch(/watch\(isSearchMode/)
    expect(source).toContain('scrollToIndex(0)')
  })
})
