/**
 * 应用全局状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppConfig } from '@/types'
import { useSettingsStore } from './settings'

// 系统主题监听器引用
let systemThemeMediaQuery: MediaQueryList | null = null
let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null

/**
 * 导航栈项
 */
export interface NavigationStackItem {
  view: 'sessionList' | 'messageList' | 'contactList' | 'contactDetail' | 'search' | 'settings'
  params?: {
    sessionId?: string
    contactId?: string
    [key: string]: any
  }
}

/**
 * app.ts 独有的用户设置（非重叠字段）
 * 重叠字段（theme, language, showMediaResources, enableServerPinning）由 useSettingsStore 管理
 */
export interface AppOnlySettings {
  fontSize: string
  messageDensity: string
  enterToSend: boolean
  autoPlayVoice: boolean
  showMessagePreview: boolean
  timeFormat: string
}

export const useAppStore = defineStore('app', () => {
  const settingsStore = useSettingsStore()

  // ==================== State ====================

  /**
   * 应用配置
   */
  const config = ref<AppConfig>({
    title: import.meta.env.VITE_APP_TITLE || 'Chatlog Session',
    version: import.meta.env.VITE_APP_VERSION || 'dev',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5030',
    apiTimeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
    pageSize: Number(import.meta.env.VITE_PAGE_SIZE) || 500,
    maxPageSize: Number(import.meta.env.VITE_MAX_PAGE_SIZE) || 5000,
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    enableMock: import.meta.env.VITE_ENABLE_MOCK === 'true',
  })

  /**
   * app 独有的用户设置（非重叠字段）
   * 重叠字段通过 settingsStore 读取
   */
  const settings = ref<AppOnlySettings>({
    fontSize: 'medium',
    messageDensity: 'comfortable',
    enterToSend: true,
    autoPlayVoice: false,
    showMessagePreview: true,
    timeFormat: '24h',
  })

  /**
   * 加载状态
   */
  const loading = ref({
    app: false,
    sessions: false,
    messages: false,
    contacts: false,
    search: false,
    history: false,
  })

  const sidebarCollapsed = ref(false)
  const isMobile = ref(false)
  const activeNav = ref('chat')

  const navigationStack = ref<NavigationStackItem[]>([
    { view: 'sessionList' }
  ])

  const showMessageList = ref(false)
  const showContactDetail = ref(false)
  const currentMobileSessionId = ref<string | undefined>(undefined)
  const currentMobileContactId = ref<string | undefined>(undefined)
  const error = ref<Error | null>(null)

  /** AI 面板是否打开 */
  const aiPanelOpen = ref(false)
  /** AI 面板宽度百分比 */
  const aiPanelWidth = ref(40)

  // ==================== Getters ====================

  /**
   * 是否为暗色主题（ref，由 updateIsDark 主动同步）
   */
  const isDark = ref(false)

  /**
   * 根据 settingsStore.appearance.theme 和系统偏好更新 isDark
   */
  function updateIsDark() {
    const theme = settingsStore.appearance.theme
    if (theme === 'auto') {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      isDark.value = theme === 'dark'
    }
  }

  /**
   * 是否启用调试模式
   */
  const isDebug = computed(() => config.value.enableDebug)

  const hasError = computed(() => error.value !== null)

  const isLoading = computed(() => {
    return Object.values(loading.value).some(v => v)
  })

  // ==================== Actions ====================

  async function init() {
    await loadSettings()

    checkMobile()
    window.addEventListener('resize', checkMobile)

    updateIsDark()
    setupThemeListener()
    applyTheme()

    if (isDebug.value) {
      console.log('📱 App initialized', {
        config: config.value,
        settings: settings.value,
        isMobile: isMobile.value,
      })
    }
  }

  async function loadSettings() {
    try {
      // 加载 app 独有设置
      const saved = localStorage.getItem('app-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        settings.value = { ...settings.value, ...parsed }
      }

      // 从 settingsStore 获取 enableDebug（单一数据源）
      if (settingsStore.api.enableDebug !== undefined) {
        config.value.enableDebug = settingsStore.api.enableDebug
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings.value))
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  /**
   * 更新设置
   * 重叠字段（theme, language, showMediaResources, enableServerPinning）写入 settingsStore
   * 非重叠字段写入 app-settings
   */
  function updateSettings(newSettings: Partial<AppOnlySettings & {
    theme?: string
    language?: string
    showMediaResources?: boolean
    disableServerPinning?: boolean
  }>) {
    const oldTheme = settingsStore.appearance.theme

    // 重叠字段 → settingsStore
    if (newSettings.theme !== undefined) {
      settingsStore.appearance.theme = newSettings.theme
    }
    if (newSettings.language !== undefined) {
      settingsStore.appearance.language = newSettings.language
    }
    if (newSettings.showMediaResources !== undefined) {
      settingsStore.chat.showMediaResources = newSettings.showMediaResources
    }
    if (newSettings.disableServerPinning !== undefined) {
      settingsStore.chat.enableServerPinning = !newSettings.disableServerPinning
    }

    // 非重叠字段 → app settings
    const appOnlyUpdates: Partial<AppOnlySettings> = {}
    let hasAppOnlyUpdates = false
    for (const key of Object.keys(newSettings) as (keyof AppOnlySettings)[]) {
      if (key in settings.value) {
        (appOnlyUpdates as any)[key] = newSettings[key]
        hasAppOnlyUpdates = true
      }
    }
    if (hasAppOnlyUpdates) {
      settings.value = { ...settings.value, ...appOnlyUpdates }
      saveSettings()
    }

    // 如果更新了主题，重新设置监听器并应用主题
    if (newSettings.theme && newSettings.theme !== oldTheme) {
      updateIsDark()
      setupThemeListener()
      applyTheme()
    }
  }

  function setupThemeListener() {
    if (systemThemeMediaQuery && systemThemeListener) {
      systemThemeMediaQuery.removeEventListener('change', systemThemeListener)
      systemThemeMediaQuery = null
      systemThemeListener = null
    }

    if (settingsStore.appearance.theme === 'auto') {
      systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemThemeListener = () => {
        updateIsDark()
        applyTheme()
      }
      systemThemeMediaQuery.addEventListener('change', systemThemeListener)
    }
  }

  function toggleTheme() {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(settingsStore.appearance.theme as any)
    const nextIndex = (currentIndex + 1) % themes.length
    updateSettings({ theme: themes[nextIndex] })
  }

  function applyTheme() {
    const html = document.documentElement
    if (isDark.value) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  function checkMobile() {
    const wasMobile = isMobile.value
    isMobile.value = window.innerWidth <= 768
    if (wasMobile && !isMobile.value) {
      resetMobileNavigation()
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function navigateToDetail(view: NavigationStackItem['view'], params?: NavigationStackItem['params']) {
    if (!isMobile.value) return

    navigationStack.value.push({ view, params })

    if (view === 'messageList') {
      showMessageList.value = true
      currentMobileSessionId.value = params?.sessionId
    } else if (view === 'contactDetail') {
      showContactDetail.value = true
      currentMobileContactId.value = params?.contactId
    }

    if (isDebug.value) {
      console.log('📱 Navigate to detail:', view, params, 'Stack:', navigationStack.value)
    }
  }

  function navigateBack() {
    if (!isMobile.value || navigationStack.value.length <= 1) return

    const current = navigationStack.value.pop()

    if (current?.view === 'messageList') {
      showMessageList.value = false
      currentMobileSessionId.value = undefined
    } else if (current?.view === 'contactDetail') {
      showContactDetail.value = false
      currentMobileContactId.value = undefined
    }

    if (isDebug.value) {
      console.log('📱 Navigate back, Stack:', navigationStack.value)
    }
  }

  function switchMobileView(view: string) {
    if (!isMobile.value) return

    setActiveNav(view)

    if (navigationStack.value.length > 1) {
      resetMobileNavigation()
    }

    if (isDebug.value) {
      console.log('📱 Switch mobile view:', view, 'Stack depth:', navigationStack.value.length)
    }
  }

  function resetMobileNavigation() {
    navigationStack.value = [{ view: 'sessionList' }]
    showMessageList.value = false
    showContactDetail.value = false
    currentMobileSessionId.value = undefined
    currentMobileContactId.value = undefined
  }

  function canNavigateBack() {
    return isMobile.value && navigationStack.value.length > 1
  }

  function setActiveNav(nav: string) {
    activeNav.value = nav
  }

  function setLoading(key: keyof typeof loading.value, value: boolean) {
    loading.value[key] = value
  }

  function setError(err: Error | null) {
    error.value = err
  }

  function clearError() {
    error.value = null
  }

  function $reset() {
    settings.value = {
      fontSize: 'medium',
      messageDensity: 'comfortable',
      enterToSend: true,
      autoPlayVoice: false,
      showMessagePreview: true,
      timeFormat: '24h',
    }
    sidebarCollapsed.value = false
    activeNav.value = 'chat'
    aiPanelOpen.value = false
    aiPanelWidth.value = 40
    error.value = null
    Object.keys(loading.value).forEach(key => {
      loading.value[key as keyof typeof loading.value] = false
    })
    resetMobileNavigation()
  }

  // ==================== Return ====================

  return {
    // State
    config,
    settings,
    loading,
    sidebarCollapsed,
    isMobile,
    activeNav,
    error,
    navigationStack,
    showMessageList,
    showContactDetail,
    currentMobileSessionId,
    currentMobileContactId,
    aiPanelOpen,
    aiPanelWidth,

    // Getters
    isDark,
    isDebug,
    hasError,
    isLoading,

    // Actions
    init,
    loadSettings,
    saveSettings,
    updateSettings,
    updateIsDark,
    toggleTheme,
    applyTheme,
    setupThemeListener,
    checkMobile,
    toggleSidebar,
    setActiveNav,
    setLoading,
    setError,
    clearError,
    $reset,
    navigateToDetail,
    navigateBack,
    switchMobileView,
    resetMobileNavigation,
    canNavigateBack,
  }
})
