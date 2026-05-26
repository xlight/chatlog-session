/**
 * useOnboardingStore 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useOnboardingStore } from '@/stores/onboarding'

function createStore() {
  return useOnboardingStore(createTestingPinia({ stubActions: false }))
}

describe('useOnboardingStore', () => {
  let store: ReturnType<typeof createStore>

  beforeEach(() => {
    store = createStore()
    localStorage.clear()
  })

  // ==================== 默认状态 ====================

  describe('默认状态', () => {
    it('currentStep 默认为 1', () => {
      expect(store.currentStep).toBe(1)
    })

    it('apiBaseUrl 默认为空字符串', () => {
      expect(store.apiBaseUrl).toBe('')
    })

    it('apiTestStatus 默认为 idle', () => {
      expect(store.apiTestStatus).toBe('idle')
    })

    it('apiTestError 默认为 null', () => {
      expect(store.apiTestError).toBeNull()
    })

    it('completed 默认为 false', () => {
      expect(store.completed).toBe(false)
    })

    it('totalSteps 为 4', () => {
      expect(store.totalSteps).toBe(4)
    })
  })

  // ==================== 步骤导航 ====================

  describe('步骤导航', () => {
    it('nextStep 递增 currentStep', () => {
      store.nextStep()
      expect(store.currentStep).toBe(2)

      store.nextStep()
      expect(store.currentStep).toBe(3)
    })

    it('nextStep 不能超过 totalSteps', () => {
      store.goToStep(4)
      store.nextStep()
      expect(store.currentStep).toBe(4)
    })

    it('prevStep 递减 currentStep', () => {
      store.goToStep(3)
      store.prevStep()
      expect(store.currentStep).toBe(2)
    })

    it('prevStep 不能低于 1', () => {
      store.prevStep()
      expect(store.currentStep).toBe(1)
    })

    it('goToStep 跳转到指定步骤', () => {
      store.goToStep(3)
      expect(store.currentStep).toBe(3)
    })

    it('goToStep 无效步骤（小于1）保持不变', () => {
      store.goToStep(0)
      expect(store.currentStep).toBe(1)

      store.goToStep(-1)
      expect(store.currentStep).toBe(1)
    })

    it('goToStep 无效步骤（超过 totalSteps）保持不变', () => {
      store.goToStep(5)
      expect(store.currentStep).toBe(1)

      store.goToStep(10)
      expect(store.currentStep).toBe(1)
    })
  })

  // ==================== API URL 设置 ====================

  describe('setApiBaseUrl', () => {
    it('设置 API URL', () => {
      store.setApiBaseUrl('http://example.com:5030')
      expect(store.apiBaseUrl).toBe('http://example.com:5030')
    })

    it('设置空 URL', () => {
      store.setApiBaseUrl('http://test.com')
      store.setApiBaseUrl('')
      expect(store.apiBaseUrl).toBe('')
    })
  })

  // ==================== API 测试 ====================

  describe('API 连接测试', () => {
    it('空 URL 时 testApiConnection 返回错误', async () => {
      const result = await store.testApiConnection()
      expect(result.success).toBe(false)
      expect(result.error).toBe('请输入 API 地址')
      expect(store.apiTestStatus).toBe('error')
      expect(store.apiTestError).toBe('请输入 API 地址')
    })

    it('resetApiTest 重置测试状态', () => {
      store.apiTestStatus = 'error'
      store.apiTestError = 'some error'
      store.resetApiTest()
      expect(store.apiTestStatus).toBe('idle')
      expect(store.apiTestError).toBeNull()
    })
  })

  // ==================== 引导完成 ====================

  describe('completeOnboarding', () => {
    it('完成引导设置 completed 为 true', () => {
      store.completeOnboarding()
      expect(store.completed).toBe(true)
    })

    it('完成引导保存 API URL 到 localStorage', () => {
      store.setApiBaseUrl('http://myapi.com/api/')
      store.completeOnboarding()
      expect(localStorage.getItem('apiBaseUrl')).toBe('http://myapi.com/api')
    })

    it('完成引导保存后去除尾部斜杠', () => {
      store.setApiBaseUrl('http://myapi.com/')
      store.completeOnboarding()
      expect(localStorage.getItem('apiBaseUrl')).toBe('http://myapi.com')
    })

    it('完成引导标记 onboardingCompleted', () => {
      store.completeOnboarding()
      expect(localStorage.getItem('onboardingCompleted')).toBe('true')
    })
  })

  // ==================== 跳过引导 ====================

  describe('skipOnboarding', () => {
    it('跳过引导记录时间戳', () => {
      store.skipOnboarding()
      const timestamp = localStorage.getItem('onboardingSkippedAt')
      expect(timestamp).toBeTruthy()
      expect(Number(timestamp)).toBeGreaterThan(0)
    })

    it('跳过引导不设置 onboardingCompleted', () => {
      store.skipOnboarding()
      expect(localStorage.getItem('onboardingCompleted')).toBeNull()
    })
  })

  // ==================== Computed ====================

  describe('canProceed computed', () => {
    it('步骤 1（欢迎页）始终可继续', () => {
      expect(store.canProceed).toBe(true)
    })

    it('步骤 2 需要 API 测试成功', () => {
      store.goToStep(2)
      expect(store.canProceed).toBe(false)

      store.apiTestStatus = 'success'
      expect(store.canProceed).toBe(true)
    })

    it('步骤 3（功能介绍）始终可继续', () => {
      store.goToStep(3)
      expect(store.canProceed).toBe(true)
    })

    it('步骤 4（完成页）始终可继续', () => {
      store.goToStep(4)
      expect(store.canProceed).toBe(true)
    })
  })

  // ==================== 加载已有配置 ====================

  describe('loadExistingConfig', () => {
    it('从 localStorage 加载已有 API URL', () => {
      localStorage.setItem('apiBaseUrl', 'http://saved-url:5030')
      store.loadExistingConfig()
      expect(store.apiBaseUrl).toBe('http://saved-url:5030')
    })

    it('无缓存时不修改 apiBaseUrl', () => {
      store.loadExistingConfig()
      expect(store.apiBaseUrl).toBe('')
    })
  })

  // ==================== shouldShowOnboarding ====================

  describe('shouldShowOnboarding', () => {
    it('未完成引导且无 API URL 时返回 true', () => {
      expect(store.shouldShowOnboarding()).toBe(true)
    })

    it('已完成引导且有 API URL 时返回 false', () => {
      localStorage.setItem('onboardingCompleted', 'true')
      localStorage.setItem('apiBaseUrl', 'http://example.com')
      expect(store.shouldShowOnboarding()).toBe(false)
    })

    it('仅完成引导但无 API URL 时返回 true', () => {
      localStorage.setItem('onboardingCompleted', 'true')
      expect(store.shouldShowOnboarding()).toBe(true)
    })
  })

  // ==================== $reset ====================

  describe('$reset', () => {
    it('恢复所有状态为默认值', () => {
      store.setApiBaseUrl('http://example.com')
      store.goToStep(3)
      store.apiTestStatus = 'success'
      store.completed = true

      store.$reset()

      expect(store.currentStep).toBe(1)
      expect(store.apiBaseUrl).toBe('')
      expect(store.apiTestStatus).toBe('idle')
      expect(store.apiTestError).toBeNull()
      expect(store.completed).toBe(false)
    })
  })
})
