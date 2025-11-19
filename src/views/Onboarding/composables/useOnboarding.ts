/**
 * useOnboarding Composable - 封装引导流程逻辑
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '@/stores/onboarding'
import { useSessionStore } from '@/stores/session'

export function useOnboarding() {
  const router = useRouter()
  const onboardingStore = useOnboardingStore()
  const sessionStore = useSessionStore()

  // 当前步骤信息
  const currentStepInfo = computed(() => {
    const steps = [
      { number: 1, title: '欢迎', description: '了解 ChatLog Session' },
      { number: 2, title: 'API 配置', description: '连接到服务器' },
      { number: 3, title: '功能介绍', description: '快速上手' },
      { number: 4, title: '完成', description: '开始使用' },
    ]
    return steps[onboardingStore.currentStep - 1] || steps[0]
  })

  // 进度百分比
  const progress = computed(() => {
    return (onboardingStore.currentStep / onboardingStore.totalSteps) * 100
  })

  // 是否是第一步
  const isFirstStep = computed(() => onboardingStore.currentStep === 1)

  // 是否是最后一步
  const isLastStep = computed(() => onboardingStore.currentStep === onboardingStore.totalSteps)

  /**
   * 下一步
   */
  const handleNext = () => {
    if (!onboardingStore.canProceed) {
      return
    }
    onboardingStore.nextStep()
  }

  /**
   * 上一步
   */
  const handlePrev = () => {
    onboardingStore.prevStep()
  }

  /**
   * 跳过引导
   */
  const handleSkip = async () => {
    // 如果在 API 配置步骤跳过，导航到设置页面
    if (onboardingStore.currentStep === 2) {
      onboardingStore.skipOnboarding()
      await router.push('/settings')
      return
    }

    // 其他步骤跳过，直接进入应用
    onboardingStore.skipOnboarding()
    await router.push('/')
  }

  /**
   * 完成引导
   */
  const handleComplete = async () => {
    // 保存配置并标记完成
    onboardingStore.completeOnboarding()

    // 初始化应用数据
    try {
      await sessionStore.loadSessions()
    } catch (error) {
      console.error('加载会话列表失败:', error)
    }

    // 导航到主页
    await router.push('/')
  }

  /**
   * 测试 API 连接
   */
  const handleTestConnection = async () => {
    return await onboardingStore.testApiConnection()
  }

  /**
   * URL 格式验证
   */
  const validateUrl = (url: string): { valid: boolean; message?: string } => {
    if (!url) {
      return { valid: false, message: '请输入 API 地址' }
    }

    // 检查是否以 http:// 或 https:// 开头
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, message: 'URL 必须以 http:// 或 https:// 开头' }
    }

    // 简单的 URL 格式检查
    try {
      new URL(url)
      return { valid: true }
    } catch {
      return { valid: false, message: 'URL 格式不正确' }
    }
  }

  /**
   * 规范化 URL（去除尾部斜杠）
   */
  const normalizeUrl = (url: string): string => {
    return url.replace(/\/$/, '')
  }

  return {
    // Store 引用
    store: onboardingStore,

    // 计算属性
    currentStepInfo,
    progress,
    isFirstStep,
    isLastStep,

    // 方法
    handleNext,
    handlePrev,
    handleSkip,
    handleComplete,
    handleTestConnection,
    validateUrl,
    normalizeUrl,
  }
}