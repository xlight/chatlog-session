import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAIAgentStore, deriveLevelPreset, applyLevelPreset } from '@/stores/ai/agent'
import type { SessionAgentConfig } from '@/types/ai/agent'

function freshStore() {
  sessionStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAIAgentStore(pinia)
  return store
}

describe('config', () => {
  it('默认配置正确', () => {
    const store = freshStore()
    expect(store.config.enabled).toBe(false)
    expect(store.config.mode).toBe('draft')
    expect(store.config.requireConfirm).toBe(true)
    expect(store.config.maxAutoReplies).toBe(0)
    expect(store.config.cooldownMs).toBe(600000)
  })

  it('updateConfig 部分更新', () => {
    const store = freshStore()
    store.updateConfig({ enabled: true, mode: 'auto' })
    expect(store.config.enabled).toBe(true)
    expect(store.config.mode).toBe('auto')
    expect(store.config.requireConfirm).toBe(true)
  })

  it('resetConfig 恢复默认', () => {
    const store = freshStore()
    store.updateConfig({ enabled: true, mode: 'auto' })
    store.resetConfig()
    expect(store.config.enabled).toBe(false)
    expect(store.config.mode).toBe('draft')
  })

  it('addTargetSession / removeTargetSession', () => {
    const store = freshStore()
    store.addTargetSession({ sessionId: 's1', sessionName: '会话1' })
    store.addTargetSession({ sessionId: 's2', sessionName: '会话2' })
    expect(store.config.targetSessions).toHaveLength(2)

    store.addTargetSession({ sessionId: 's1', sessionName: '会话1' })
    expect(store.config.targetSessions).toHaveLength(2)

    store.removeTargetSession('s1')
    expect(store.config.targetSessions).toHaveLength(1)
    expect(store.config.targetSessions[0].sessionId).toBe('s2')
  })

  it('isSessionTargeted', () => {
    const store = freshStore()
    store.config.targetSessions = []
    expect(store.isSessionTargeted('any')).toBe(true)

    store.addTargetSession({ sessionId: 's1', sessionName: '会话1' })
    expect(store.isSessionTargeted('s1')).toBe(true)
    expect(store.isSessionTargeted('s2')).toBe(false)
  })
})

describe('drafts', () => {
  it('addDraft 创建草稿', () => {
    const store = freshStore()
    const draft = store.addDraft({
      sourceMessageId: 'msg1',
      sessionId: 's1',
      sessionName: '会话1',
      contactName: '张三',
      content: '你好',
      generatedAt: Date.now(),
    })

    expect(draft.id).toBeTruthy()
    expect(draft.sent).toBe(false)
    expect(store.drafts).toHaveLength(1)
  })

  it('pendingDrafts 只返回未发送的', () => {
    const store = freshStore()
    const draft = store.addDraft({
      sourceMessageId: 'msg1',
      sessionId: 's1',
      sessionName: '会话1',
      contactName: '张三',
      content: '你好',
      generatedAt: Date.now(),
    })

    expect(store.pendingDrafts).toHaveLength(1)
    expect(store.hasPendingDrafts).toBe(true)

    store.markDraftSent(draft.id, 123)
    expect(store.pendingDrafts).toHaveLength(0)
    expect(store.hasPendingDrafts).toBe(false)
  })

  it('removeDraft 删除草稿', () => {
    const store = freshStore()
    const draft = store.addDraft({
      sourceMessageId: 'msg1',
      sessionId: 's1',
      sessionName: '会话1',
      contactName: '张三',
      content: '你好',
      generatedAt: Date.now(),
    })

    store.removeDraft(draft.id)
    expect(store.drafts).toHaveLength(0)
  })

  it('markDraftSent 标记已发送', () => {
    const store = freshStore()
    const draft = store.addDraft({
      sourceMessageId: 'msg1',
      sessionId: 's1',
      sessionName: '会话1',
      contactName: '张三',
      content: '你好',
      generatedAt: Date.now(),
    })

    store.markDraftSent(draft.id, 456)
    expect(draft.sent).toBe(true)
    expect(draft.jobId).toBe(456)
  })

  it('clearDrafts 清空所有草稿', () => {
    const store = freshStore()
    store.addDraft({
      sourceMessageId: 'msg1',
      sessionId: 's1',
      sessionName: '会话1',
      contactName: '张三',
      content: '你好',
      generatedAt: Date.now(),
    })
    store.addDraft({
      sourceMessageId: 'msg2',
      sessionId: 's2',
      sessionName: '会话2',
      contactName: '李四',
      content: '再见',
      generatedAt: Date.now(),
    })

    store.clearDrafts()
    expect(store.drafts).toHaveLength(0)
  })

  it('clearSentDrafts 只清除已发送的', () => {
    const store = freshStore()
    const d1 = store.addDraft({
      sourceMessageId: 'msg1',
      sessionId: 's1',
      sessionName: '会话1',
      contactName: '张三',
      content: '你好',
      generatedAt: Date.now(),
    })
    store.addDraft({
      sourceMessageId: 'msg2',
      sessionId: 's2',
      sessionName: '会话2',
      contactName: '李四',
      content: '再见',
      generatedAt: Date.now(),
    })

    store.markDraftSent(d1.id, 1)
    store.clearSentDrafts()
    expect(store.drafts).toHaveLength(1)
    expect(store.drafts[0].sent).toBe(false)
  })
})

describe('canAutoReply', () => {
  it('未启用时不可自动回复', () => {
    const store = freshStore()
    expect(store.canAutoReply).toBe(false)
  })

  it('启用且模式为 auto 时可自动回复', () => {
    const store = freshStore()
    store.updateConfig({ enabled: true, mode: 'auto' })
    expect(store.canAutoReply).toBe(true)
  })

  it('草稿模式不可自动回复', () => {
    const store = freshStore()
    store.updateConfig({ enabled: true, mode: 'draft' })
    expect(store.canAutoReply).toBe(false)
  })

  it('达到最大次数后不可自动回复 (per-session)', () => {
    const store = freshStore()
    store.enabled = true
    store.setSessionConfig('s1', {
      sendPermission: 'auto',
      observer: { enabled: true, autoReply: true, intervalSeconds: 300, minNewMessages: 5, autoReplyCount: 1, maxContextMessages: 20 },
      maxAutoReplies: 2,
    })
    store.incrementAutoReplyTracker('s1')
    store.incrementAutoReplyTracker('s1')
    expect(store.canAutoReplySession('s1')).toBe(false)
  })

  it('resetAutoReplyTracker 重置计数', () => {
    const store = freshStore()
    store.enabled = true
    store.setSessionConfig('s1', {
      sendPermission: 'auto',
      observer: { enabled: true, autoReply: true, intervalSeconds: 300, minNewMessages: 5, autoReplyCount: 1, maxContextMessages: 20 },
      maxAutoReplies: 2,
    })
    store.incrementAutoReplyTracker('s1')
    store.incrementAutoReplyTracker('s1')
    expect(store.canAutoReplySession('s1')).toBe(false)

    store.resetAutoReplyTracker('s1')
    expect(store.canAutoReplySession('s1')).toBe(true)
  })
})

describe('persistedConfig defaults', () => {
  it('Phase C 默认值正确', () => {
    const store = freshStore()
    expect(store.persistedConfig.defaults.levelPreset).toBe('Custom')
    expect(store.persistedConfig.defaults.sendPermission).toBe('draft_confirm')
    expect(store.persistedConfig.defaults.observerEnabled).toBe(false)
    expect(store.persistedConfig.defaults.observerIntervalSeconds).toBe(300)
    expect(store.persistedConfig.defaults.observerMinNewMessages).toBe(5)
    expect(store.persistedConfig.defaults.observerAutoReply).toBe(false)
    expect(store.persistedConfig.defaults.keywordEnabled).toBe(false)
    expect(store.persistedConfig.defaults.keywordMatchPatterns).toEqual([])
    expect(store.persistedConfig.defaults.promptTemplateId).toBe('builtin-reply')
    expect(store.persistedConfig.defaults.maxAutoReplies).toBe(0)
    expect(store.persistedConfig.defaults.cooldownMs).toBe(600000)
  })
})

describe('getEffectiveConfig', () => {
  it('无会话覆盖时返回全局默认值', () => {
    const store = freshStore()
    const config = store.getEffectiveConfig('test-session')
    expect(config.sessionId).toBe('test-session')
    expect(config.levelPreset).toBe('Custom')
    expect(config.sendPermission).toBe('draft_confirm')
    expect(config.observer.enabled).toBe(false)
    expect(config.observer.intervalSeconds).toBe(300)
    expect(config.observer.minNewMessages).toBe(5)
    expect(config.keywordMonitor.enabled).toBe(false)
    expect(config.keywordMonitor.matchPatterns).toEqual([])
    expect(config.maxAutoReplies).toBe(0)
    expect(config.cooldownMs).toBe(600000)
  })

  it('会话覆盖 observer 字段', () => {
    const store = freshStore()
    store.setSessionConfig('s1', { observer: { enabled: true, intervalSeconds: 600, minNewMessages: 10, autoReply: false, autoReplyCount: 1, maxContextMessages: 20 } })
    const config = store.getEffectiveConfig('s1')
    expect(config.observer.enabled).toBe(true)
    expect(config.observer.intervalSeconds).toBe(600)
    expect(config.observer.minNewMessages).toBe(10)
  })

  it('会话覆盖 sendPermission', () => {
    const store = freshStore()
    store.setSessionConfig('s1', { sendPermission: 'auto' })
    expect(store.getEffectiveConfig('s1').sendPermission).toBe('auto')
  })

  it('清除会话配置后恢复全局默认', () => {
    const store = freshStore()
    store.setSessionConfig('s1', { sendPermission: 'auto' })
    store.clearSessionConfig('s1')
    expect(store.getEffectiveConfig('s1').sendPermission).toBe('draft_confirm')
  })
})

describe('canAutoReplySession', () => {
  it('enabled 为 false 时不可自动回复', () => {
    const store = freshStore()
    store.enabled = false
    expect(store.canAutoReplySession('s1')).toBe(false)
  })

  it('sendPermission 不为 auto 时不可自动回复', () => {
    const store = freshStore()
    store.enabled = true
    store.setSessionConfig('s1', { sendPermission: 'draft_confirm' })
    expect(store.canAutoReplySession('s1')).toBe(false)
  })

  it('auto + observer.autoReply 时可自动回复', () => {
    const store = freshStore()
    store.enabled = true
    store.setSessionConfig('s1', {
      sendPermission: 'auto',
      observer: { enabled: true, autoReply: true, intervalSeconds: 300, minNewMessages: 5, autoReplyCount: 1, maxContextMessages: 20 },
    })
    expect(store.canAutoReplySession('s1')).toBe(true)
  })

  it('达到 maxAutoReplies 后不可自动回复', () => {
    const store = freshStore()
    store.enabled = true
    store.setSessionConfig('s1', {
      sendPermission: 'auto',
      observer: { enabled: true, autoReply: true, intervalSeconds: 300, minNewMessages: 5, autoReplyCount: 1, maxContextMessages: 20 },
      maxAutoReplies: 1,
    })
    store.incrementAutoReplyTracker('s1')
    expect(store.canAutoReplySession('s1')).toBe(false)
  })
})

describe('observer state actions', () => {
  it('getObserverState 返回默认状态', () => {
    const store = freshStore()
    const state = store.getObserverState('s1')
    expect(state.sessionId).toBe('s1')
    expect(state.lastAnalysisTime).toBe(0)
    expect(state.accumulatedMessageCount).toBe(0)
    expect(state.isAnalyzing).toBe(false)
  })

  it('updateObserverState 部分更新', () => {
    const store = freshStore()
    store.updateObserverState('s1', { accumulatedMessageCount: 5, isAnalyzing: true })
    const state = store.getObserverState('s1')
    expect(state.accumulatedMessageCount).toBe(5)
    expect(state.isAnalyzing).toBe(true)
    expect(state.lastAnalysisTime).toBe(0)
  })

  it('addObserverResult 存入结果', () => {
    const store = freshStore()
    const result = {
      id: 'r1',
      sessionId: 's1',
      status: 'success' as const,
      summary: '测试摘要',
      keyPoints: ['点1'],
      suggestions: ['建议1'],
      analyzedAt: Date.now(),
      messageCount: 10,
    }
    store.addObserverResult('s1', result)
    const results = store.observerResults.get('s1')
    expect(results).toHaveLength(1)
    expect(results![0].summary).toBe('测试摘要')
  })

  it('clearObserverResults 清空结果', () => {
    const store = freshStore()
    const result = {
      id: 'r1',
      sessionId: 's1',
      status: 'success' as const,
      summary: '测试',
      keyPoints: [],
      suggestions: [],
      analyzedAt: Date.now(),
      messageCount: 5,
    }
    store.addObserverResult('s1', result)
    store.clearObserverResults('s1')
    expect(store.observerResults.get('s1')).toBeUndefined()
  })
})

describe('keyword actions', () => {
  it('addKeywordResult 存入结果', () => {
    const store = freshStore()
    const result = {
      id: 'k1',
      sessionId: 's1',
      sourceMessageId: 'msg1',
      matchedPattern: '测试',
      status: 'success' as const,
      summary: '匹配摘要',
      replySuggestion: '好的',
      analyzedAt: Date.now(),
    }
    store.addKeywordResult('s1', result)
    const results = store.keywordResults.get('s1')
    expect(results).toHaveLength(1)
    expect(results![0].matchedPattern).toBe('测试')
  })

  it('clearKeywordResults 清空结果', () => {
    const store = freshStore()
    store.addKeywordResult('s1', {
      id: 'k1',
      sessionId: 's1',
      sourceMessageId: 'msg1',
      matchedPattern: '测试',
      status: 'success' as const,
      summary: '摘要',
      analyzedAt: Date.now(),
    })
    store.clearKeywordResults('s1')
    expect(store.keywordResults.get('s1')).toBeUndefined()
  })
})

describe('deriveLevelPreset', () => {
  function baseConfig(overrides: Partial<SessionAgentConfig> = {}): SessionAgentConfig {
    return {
      sessionId: 'test',
      levelPreset: 'L0',
      sendPermission: 'draft_confirm',
      userActions: { enabled: true, allowedActions: ['draft_reply', 'analyze'] },
      allowScheduledMessages: false,
      observer: { enabled: false, intervalSeconds: 300, minNewMessages: 5, autoReply: false, autoReplyCount: 1, maxContextMessages: 20 },
      keywordMonitor: { enabled: false, matchPatterns: [] },
      promptTemplateId: 'builtin-reply',
      maxAutoReplies: 0,
      cooldownMs: 5000,
      mcpTools: { enabled: false, requireConfirmation: true, allowedTools: [], deniedTools: [], callTimeoutMs: 30000, maxLoopCount: 10 },
      ...overrides,
    }
  }

  it('L0: forbidden + obs off + kw off', () => {
    expect(deriveLevelPreset(baseConfig({
      sendPermission: 'forbidden',
    }))).toBe('L0')
  })

  it('L1: forbidden + obs on', () => {
    expect(deriveLevelPreset(baseConfig({
      sendPermission: 'forbidden',
      observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: false, autoReplyCount: 1, maxContextMessages: 20 },
    }))).toBe('L1')
  })

  it('L2: draft_confirm + obs on', () => {
    expect(deriveLevelPreset(baseConfig({
      sendPermission: 'draft_confirm',
      observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: false, autoReplyCount: 1, maxContextMessages: 20 },
    }))).toBe('L2')
  })

  it('L3: auto + obs on + kw on + autoReply off', () => {
    expect(deriveLevelPreset(baseConfig({
      sendPermission: 'auto',
      observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: false, autoReplyCount: 1, maxContextMessages: 20 },
      keywordMonitor: { enabled: true, matchPatterns: [] },
    }))).toBe('L3')
  })

  it('L4: auto + obs on + autoReply on + kw off', () => {
    expect(deriveLevelPreset(baseConfig({
      sendPermission: 'auto',
      observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: true, autoReplyCount: 1, maxContextMessages: 20 },
    }))).toBe('L4')
  })

  it('Custom: auto + obs on + kw on + autoReply on', () => {
    expect(deriveLevelPreset(baseConfig({
      sendPermission: 'auto',
      observer: { enabled: true, intervalSeconds: 300, minNewMessages: 5, autoReply: true, autoReplyCount: 1, maxContextMessages: 20 },
      keywordMonitor: { enabled: true, matchPatterns: [] },
    }))).toBe('Custom')
  })
})

describe('applyLevelPreset', () => {
  it('L0: forbidden + obs off + kw off', () => {
    const result = applyLevelPreset('L0')
    expect(result.sendPermission).toBe('forbidden')
    expect(result.observer?.enabled).toBe(false)
    expect(result.keywordMonitor?.enabled).toBe(false)
  })

  it('L1: forbidden + obs on + kw off', () => {
    const result = applyLevelPreset('L1')
    expect(result.sendPermission).toBe('forbidden')
    expect(result.observer?.enabled).toBe(true)
    expect(result.keywordMonitor?.enabled).toBe(false)
  })

  it('L2: draft_confirm + obs on + kw off', () => {
    const result = applyLevelPreset('L2')
    expect(result.sendPermission).toBe('draft_confirm')
    expect(result.observer?.enabled).toBe(true)
    expect(result.keywordMonitor?.enabled).toBe(false)
  })

  it('L3: auto + obs on + kw on', () => {
    const result = applyLevelPreset('L3')
    expect(result.sendPermission).toBe('auto')
    expect(result.observer?.enabled).toBe(true)
    expect(result.keywordMonitor?.enabled).toBe(true)
    expect(result.observer?.autoReply).toBe(false)
  })

  it('L4: auto + obs on + kw off + autoReply on', () => {
    const result = applyLevelPreset('L4')
    expect(result.sendPermission).toBe('auto')
    expect(result.observer?.enabled).toBe(true)
    expect(result.keywordMonitor?.enabled).toBe(false)
    expect(result.observer?.autoReply).toBe(true)
  })

  it('Custom: 空对象', () => {
    expect(applyLevelPreset('Custom')).toEqual({})
  })
})

describe('migratePersistedConfig', () => {
  it('full_auto+obs+kw+autoReply → Custom', () => {
    const store = freshStore()
    store.resetPersistedConfig()
    store.persistedConfig.defaults = {
      ...store.persistedConfig.defaults,
      sendPermission: 'full_auto' as any,
      observerEnabled: true,
      keywordEnabled: true,
      observerAutoReply: true,
    }
    store.migratePersistedConfig()
    expect(store.persistedConfig.defaults.sendPermission).toBe('auto')
    expect(store.persistedConfig.defaults.levelPreset).toBe('Custom')
  })

  it('full_auto+obs+autoReply → L4', () => {
    const store = freshStore()
    store.resetPersistedConfig()
    store.persistedConfig.defaults = {
      ...store.persistedConfig.defaults,
      sendPermission: 'full_auto' as any,
      observerEnabled: true,
      observerAutoReply: true,
    }
    store.migratePersistedConfig()
    expect(store.persistedConfig.defaults.sendPermission).toBe('auto')
    expect(store.persistedConfig.defaults.levelPreset).toBe('L4')
  })

  it('full_auto+kw → L3', () => {
    const store = freshStore()
    store.resetPersistedConfig()
    store.persistedConfig.defaults = {
      ...store.persistedConfig.defaults,
      sendPermission: 'full_auto' as any,
      observerEnabled: true,
      keywordEnabled: true,
    }
    store.migratePersistedConfig()
    expect(store.persistedConfig.defaults.sendPermission).toBe('auto')
    expect(store.persistedConfig.defaults.levelPreset).toBe('L3')
  })

  it('draft_confirm+obs → L2', () => {
    const store = freshStore()
    store.resetPersistedConfig()
    store.persistedConfig.defaults = {
      ...store.persistedConfig.defaults,
      sendPermission: 'draft_confirm',
      observerEnabled: true,
    }
    store.migratePersistedConfig()
    expect(store.persistedConfig.defaults.sendPermission).toBe('draft_confirm')
    expect(store.persistedConfig.defaults.levelPreset).toBe('L2')
  })

  it('forbidden+obs → L1', () => {
    const store = freshStore()
    store.resetPersistedConfig()
    store.persistedConfig.defaults = {
      ...store.persistedConfig.defaults,
      sendPermission: 'forbidden',
      observerEnabled: true,
    }
    store.migratePersistedConfig()
    expect(store.persistedConfig.defaults.sendPermission).toBe('forbidden')
    expect(store.persistedConfig.defaults.levelPreset).toBe('L1')
  })

  it('forbidden → L0', () => {
    const store = freshStore()
    store.resetPersistedConfig()
    store.persistedConfig.defaults = {
      ...store.persistedConfig.defaults,
      sendPermission: 'forbidden',
      observerEnabled: false,
      keywordEnabled: false,
    }
    store.migratePersistedConfig()
    expect(store.persistedConfig.defaults.sendPermission).toBe('forbidden')
    expect(store.persistedConfig.defaults.levelPreset).toBe('L0')
  })

  it('send_cancellable → auto', () => {
    const store = freshStore()
    store.resetPersistedConfig()
    store.persistedConfig.defaults = {
      ...store.persistedConfig.defaults,
      sendPermission: 'send_cancellable' as any,
    }
    store.migratePersistedConfig()
    expect(store.persistedConfig.defaults.sendPermission).toBe('auto')
  })
})

describe('autoReplyTrackers', () => {
  it('session A 触发不影响 session B', () => {
    const store = freshStore()
    store.incrementAutoReplyTracker('s1')
    expect(store.getAutoReplyTracker('s1').count).toBe(1)
    expect(store.getAutoReplyTracker('s2').count).toBe(0)
  })

  it('session A 冷却独立', () => {
    const store = freshStore()
    store.incrementAutoReplyTracker('s1')
    store.incrementAutoReplyTracker('s2')
    expect(store.getAutoReplyTracker('s1').lastAt).toBeGreaterThan(0)
    expect(store.getAutoReplyTracker('s2').lastAt).toBeGreaterThan(0)
  })

  it('resetAutoReplyTracker 只重置目标 session', () => {
    const store = freshStore()
    store.incrementAutoReplyTracker('s1')
    store.incrementAutoReplyTracker('s2')
    store.resetAutoReplyTracker('s1')
    expect(store.getAutoReplyTracker('s1').count).toBe(0)
    expect(store.getAutoReplyTracker('s2').count).toBe(1)
  })
})

describe('canKeywordAutoSend', () => {
  it('kw enabled + auto → true', () => {
    const store = freshStore()
    store.enabled = true
    store.setSessionConfig('s1', { sendPermission: 'auto', keywordMonitor: { enabled: true, matchPatterns: ['test'] } })
    expect(store.canKeywordAutoSend('s1')).toBe(true)
  })

  it('kw enabled + draft_confirm → false', () => {
    const store = freshStore()
    store.enabled = true
    store.setSessionConfig('s1', { sendPermission: 'draft_confirm', keywordMonitor: { enabled: true, matchPatterns: ['test'] } })
    expect(store.canKeywordAutoSend('s1')).toBe(false)
  })

  it('kw disabled + auto → false', () => {
    const store = freshStore()
    store.enabled = true
    store.setSessionConfig('s1', { sendPermission: 'auto', keywordMonitor: { enabled: false, matchPatterns: [] } })
    expect(store.canKeywordAutoSend('s1')).toBe(false)
  })
})

describe('$reset', () => {
  it('重置所有状态', () => {
    const store = freshStore()
    store.updateConfig({ enabled: true })
    store.addDraft({
      sourceMessageId: 'msg1',
      sessionId: 's1',
      sessionName: '会话1',
      contactName: '张三',
      content: '你好',
      generatedAt: Date.now(),
    })
    store.incrementAutoReplyTracker('s1')

    // 设置 observer/keyword 状态
    store.updateObserverState('s1', { accumulatedMessageCount: 5, isAnalyzing: true })
    store.addObserverResult('s1', {
      id: 'r1',
      sessionId: 's1',
      status: 'success' as const,
      summary: '测试',
      keyPoints: [],
      suggestions: [],
      analyzedAt: Date.now(),
      messageCount: 5,
    })
    store.addKeywordResult('s1', {
      id: 'k1',
      sessionId: 's1',
      sourceMessageId: 'msg1',
      matchedPattern: '测试',
      status: 'success' as const,
      summary: '摘要',
      analyzedAt: Date.now(),
    })

    store.$reset()

    expect(store.config.enabled).toBe(false)
    expect(store.drafts).toHaveLength(0)

    expect(store.autoReplyTrackers.size).toBe(0)
    expect(store.observerStates.size).toBe(0)
    expect(store.observerResults.size).toBe(0)
    expect(store.keywordResults.size).toBe(0)
  })
})
