/**
 * Onboarding Store - 管理引导流程状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ApiTestStatus = 'idle' | 'testing' | 'success' | 'error'

export interface TestResult {
  success: boolean
  error?: string
}

export const useOnboardingStore = defineStore('onboarding', () => {
  // 状态
  const currentStep = ref<number>(1)
  const apiBaseUrl = ref<string>('')
  const apiTestStatus = ref<ApiTestStatus>('idle')
  const apiTestError = ref<string | null>(null)
  const completed = ref<boolean>(false)

  // 计算属性
  const totalSteps = computed(() => 4)
  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 1:
        return true // 欢迎页面总是可以继续
      case 2:
        return apiTestStatus.value === 'success' // API 配置需要测试成功
      case 3:
        return true // 功能介绍可以跳过
      case 4:
        return true // 完成页面
      default:
        return false
    }
  })

  // Actions
  const nextStep = () => {
    if (currentStep.value < totalSteps.value) {
      currentStep.value++
    }
  }

  const prevStep = () => {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps.value) {
      currentStep.value = step
    }
  }

  const setApiBaseUrl = (url: string) => {
    apiBaseUrl.value = url
  }

  /**
   * 测试 API 连接
   */
  const testApiConnection = async (): Promise<TestResult> => {
    if (!apiBaseUrl.value) {
      apiTestStatus.value = 'error'
      apiTestError.value = '请输入 API 地址'
      return { success: false, error: '请输入 API 地址' }
    }

    apiTestStatus.value = 'testing'
    apiTestError.value = null

    try {
      // 1. 规范化 URL（去除尾部斜杠）
      const normalizedUrl = apiBaseUrl.value.replace(/\/$/, '')

      // 2. 构建测试请求
      const testUrl = `${normalizedUrl}/api/v1/session?format=json`

      // 3. 发起请求（10秒超时）
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // 4. 验证响应状态
      if (response.status !== 200) {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`
        apiTestStatus.value = 'error'
        apiTestError.value = errorMsg
        return { success: false, error: errorMsg }
      }

      // 5. 验证 JSON 格式
      try {
        await response.json()
      } catch (e) {
        const errorMsg = '响应格式错误：无法解析 JSON'
        apiTestStatus.value = 'error'
        apiTestError.value = errorMsg
        return { success: false, error: errorMsg }
      }

      // 6. 测试成功
      apiTestStatus.value = 'success'
      apiTestError.value = null
      return { success: true }
    } catch (error: any) {
      let errorMsg = '连接失败'

      // 错误分类处理
      if (error.name === 'AbortError') {
        errorMsg = '连接超时，请检查服务器是否运行'
      } else if (error.name === 'TypeError' || error.message?.includes('fetch')) {
        errorMsg = '网络错误，请检查 URL 是否正确'
      } else if (error.message) {
        errorMsg = error.message
      }

      apiTestStatus.value = 'error'
      apiTestError.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * 重置 API 测试状态
   */
  const resetApiTest = () => {
    apiTestStatus.value = 'idle'
    apiTestError.value = null
  }

  /**
   * 完成引导流程
   */
  const completeOnboarding = () => {
    // 1. 保存 API 配置到 localStorage
    const normalizedUrl = apiBaseUrl.value.replace(/\/$/, '')
    localStorage.setItem('apiBaseUrl', normalizedUrl)

    // 2. 标记引导完成
    localStorage.setItem('onboardingCompleted', 'true')

    // 3. 更新状态
    completed.value = true
  }

  /**
   * 跳过引导
   */
  const skipOnboarding = () => {
    // 记录跳过时间戳
    localStorage.setItem('onboardingSkippedAt', Date.now().toString())
    // 不设置 onboardingCompleted，下次启动仍会提示
  }

  /**
   * 重置引导流程（用于重新运行引导）
   */
  const resetOnboarding = () => {
    currentStep.value = 1
    apiBaseUrl.value = ''
    apiTestStatus.value = 'idle'
    apiTestError.value = null
    completed.value = false
  }

  /**
   * 从 localStorage 加载现有配置
   */
  const loadExistingConfig = () => {
    const savedUrl = localStorage.getItem('apiBaseUrl')
    if (savedUrl) {
      apiBaseUrl.value = savedUrl
    }
  }

  /**
   * 检查是否需要显示引导
   */
  const shouldShowOnboarding = (): boolean => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted')
    const apiBaseUrl = localStorage.getItem('apiBaseUrl')

    // 如果已完成引导且配置了 API，不显示引导
    if (onboardingCompleted === 'true' && apiBaseUrl) {
      return false
    }

    // 否则显示引导
    return true
  }

  return {
    // 状态
    currentStep,
    apiBaseUrl,
    apiTestStatus,
    apiTestError,
    completed,

    // 计算属性
    totalSteps,
    canProceed,

    // Actions
    nextStep,
    prevStep,
    goToStep,
    setApiBaseUrl,
    testApiConnection,
    resetApiTest,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    loadExistingConfig,
    shouldShowOnboarding,
  }
})