/**
 * SearchDialog 状态管理重构回归测试
 *
 * 验证 refactor-searchdialog-state change 的修改：
 * 1. 日期范围统一单状态：无 startDate/endDate ref，有 mobileStartDate/mobileEndDate computed
 * 2. clearSearch 用 isClearing flag 守卫
 * 3. watch(dateRange) 有 isClearing 守卫
 * 4. watch(dialogVisible) 不调用 searchStore.setSearchType/setSelectedTalker
 * 5. watch(dateRange) 不调用 searchStore.setTimeRange
 * 6. getDefaultDateRange 缓存为 defaultDateRange 常量
 *
 * 采用源码静态断言而非 mount 运行时验证，因为 SearchDialog 依赖
 * searchStore/appStore + el-dialog + MessageSearchResults，mount 需大量 mock。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve('src/components/chat/SearchDialog.vue'),
  'utf-8',
)

describe('SearchDialog 状态管理重构回归', () => {
  it('无 startDate/endDate ref 声明', () => {
    expect(source).not.toMatch(/const startDate = ref/)
    expect(source).not.toMatch(/const endDate = ref/)
  })

  it('有 mobileStartDate/mobileEndDate computed get/set', () => {
    expect(source).toMatch(/mobileStartDate = computed/)
    expect(source).toMatch(/mobileEndDate = computed/)
    expect(source).toMatch(/mobileStartDate[\s\S]*get:[\s\S]*dateRange/)
    expect(source).toMatch(/mobileEndDate[\s\S]*get:[\s\S]*dateRange/)
  })

  it('缓存 defaultDateRange 常量', () => {
    expect(source).toContain('const defaultDateRange = getDefaultDateRange()')
  })

  it('有 isClearing flag', () => {
    expect(source).toContain('let isClearing = false')
  })

  it('clearSearch 设置 isClearing = true', () => {
    expect(source).toMatch(/clearSearch[\s\S]*isClearing = true/)
  })

  it('clearSearch 用 defaultDateRange 而非 getDefaultDateRange()', () => {
    expect(source).toMatch(/clearSearch[\s\S]*dateRange\.value = defaultDateRange/)
  })

  it('watch(dateRange) 有 isClearing 守卫', () => {
    expect(source).toMatch(/watch\(dateRange[\s\S]*if \(isClearing\) return/)
  })

  it('watch(dateRange) 不调用 searchStore.setTimeRange', () => {
    // watch(dateRange) 块内不应有 setTimeRange
    expect(source).not.toContain('searchStore.setTimeRange')
  })

  it('watch(dialogVisible) 不调用 searchStore.setSearchType', () => {
    expect(source).not.toContain('searchStore.setSearchType')
  })

  it('watch(dialogVisible) 不调用 searchStore.setSelectedTalker', () => {
    expect(source).not.toContain('searchStore.setSelectedTalker')
  })

  it('无双向 watch(startDate, endDate)', () => {
    expect(source).not.toMatch(/watch\(\[startDate, endDate\]/)
  })

  it('移动端 el-date-picker 用 mobileStartDate/mobileEndDate', () => {
    expect(source).toContain('v-model="mobileStartDate"')
    expect(source).toContain('v-model="mobileEndDate"')
  })

  it('移动端 el-date-picker 无 value-format="YYYY-MM-DD"', () => {
    expect(source).not.toContain('value-format="YYYY-MM-DD"')
  })
})
