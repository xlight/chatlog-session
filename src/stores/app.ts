/**
 * 应用全局状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserSettings, AppConfig } from '@/types'

export const useAppStore = defineStore('app', () => {
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
   * 用户设置
   */
  const settings = ref<UserSettings>({
    theme: 'light',
    language: 'zh-CN',
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

  /**
   * 侧边栏展开状态
   */
  const sidebarCollapsed = ref(false)

  /**
   * 移动端状态
   */
  const isMobile = ref(false)

  /**
   * 当前激活的导航项
   */
  const activeNav = ref('chat')

  /**
   * 全局错误信息
   */
  const error = ref<Error | null>(null)

  // ==================== Getters ====================

  /**
   * 是否为暗色主题
   */
  const isDark = computed(() => {
    if (settings.value.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return settings.value.theme === 'dark'
  })

  /**
   * 是否启用调试模式
   */
  const isDebug = computed(() => config.value.enableDebug)

  /**
   * 是否有错误
   */
  const hasError = computed(() => error.value !== null)

  /**
   * 是否正在加载
   */
  const isLoading = computed(() => {
    return Object.values(loading.value).some(v => v)
  })

  // ==================== Actions ====================

  /**
   * 初始化应用
   */
  function init() {
    // 从 localStorage 加载设置
    loadSettings()

    // 检测移动端
    checkMobile()

    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile)

    // 监听系统主题变化
    if (settings.value.theme === 'auto') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
    }

    // 应用主题
    applyTheme()

    if (isDebug.value) {
      console.log('📱 App initialized', {
        config: config.value,
        settings: settings.value,
        isMobile: isMobile.value,
      })
    }
  }

  /**
   * 加载设置
   */
  function loadSettings() {
    try {
      const saved = localStorage.getItem('app-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        settings.value = { ...settings.value, ...parsed }
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  /**
   * 保存设置
   */
  function saveSettings() {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings.value))
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  /**
   * 更新设置
   */
  function updateSettings(newSettings: Partial<UserSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings()

    // 如果更新了主题，应用主题
    if (newSettings.theme) {
      applyTheme()
    }
  }

  /**
   * 切换主题
   */
  function toggleTheme() {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(settings.value.theme)
    const nextIndex = (currentIndex + 1) % themes.length
    updateSettings({ theme: themes[nextIndex] })
  }

  /**
   * 应用主题
   */
  function applyTheme() {
    const html = document.documentElement
    if (isDark.value) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  /**
   * 检测移动端
   */
  function checkMobile() {
    isMobile.value = window.innerWidth < 768
  }

  /**
   * 切换侧边栏
   */
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  /**
   * 设置激活的导航项
   */
  function setActiveNav(nav: string) {
    activeNav.value = nav
  }

  /**
   * 设置加载状态
   */
  function setLoading(key: keyof typeof loading.value, value: boolean) {
    loading.value[key] = value
  }

  /**
   * 设置错误
   */
  function setError(err: Error | null) {
    error.value = err
  }

  /**
   * 清除错误
   */
  function clearError() {
    error.value = null
  }

  /**
   * 重置状态
   */
  function $reset() {
    settings.value = {
      theme: 'light',
      language: 'zh-CN',
      fontSize: 'medium',
      messageDensity: 'comfortable',
      enterToSend: true,
      autoPlayVoice: false,
      showMessagePreview: true,
      timeFormat: '24h',
    }
    sidebarCollapsed.value = false
    activeNav.value = 'chat'
    error.value = null
    Object.keys(loading.value).forEach(key => {
      loading.value[key as keyof typeof loading.value] = false
    })
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
    toggleTheme,
    applyTheme,
    checkMobile,
    toggleSidebar,
    setActiveNav,
    setLoading,
    setError,
    clearError,
    $reset,
  }
})
