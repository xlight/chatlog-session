import { config } from '@vue/test-utils'

// 注册 Element Plus 全局组件 stub
config.global.stubs = {
  ElButton: true,
  ElDialog: true,
  ElInput: true,
  ElSelect: true,
  ElOption: true,
  ElCheckbox: true,
  ElRadio: true,
  ElRadioGroup: true,
  ElRadioButton: true,
  ElSwitch: true,
  ElSlider: true,
  ElTooltip: true,
  ElPopover: true,
  ElDropdown: true,
  ElDropdownMenu: true,
  ElDropdownItem: true,
  ElMenu: true,
  ElMenuItem: true,
  ElSubMenu: true,
  ElIcon: true,
  ElMessage: true,
  ElMessageBox: true,
  ElNotification: true,
  ElLoading: true,
  ElForm: true,
  ElFormItem: true,
  ElTable: true,
  ElTableColumn: true,
  ElPagination: true,
  ElTag: true,
  ElBadge: true,
  ElAvatar: true,
  ElCard: true,
  ElCollapse: true,
  ElCollapseItem: true,
  ElTabs: true,
  ElTabPane: true,
  ElBreadcrumb: true,
  ElBreadcrumbItem: true,
  ElSteps: true,
  ElStep: true,
  ElAlert: true,
  ElProgress: true,
  ElImage: true,
  ElLink: true,
  ElDivider: true,
  ElEmpty: true,
  ElResult: true,
  ElContainer: true,
  ElHeader: true,
  ElAside: true,
  ElMain: true,
  ElFooter: true,
  ElDrawer: true,
  ElUpload: true,
  ElDatePicker: true,
  ElTimePicker: true,
  ElScrollbox: true,
  ElScrollbar: true,
}

// mock ResizeObserver（jsdom 中不存在）
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

// mock IntersectionObserver（jsdom 中不存在）
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver = IntersectionObserverMock

// mock window.scrollTo
globalThis.scrollTo = vi.fn()

// mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})