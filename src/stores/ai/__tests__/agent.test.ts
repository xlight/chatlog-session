import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useAIAgentStore } from '@/stores/ai/agent'

function createStore() {
  sessionStorage.clear()
  const pinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
    plugins: [piniaPluginPersistedstate],
  })
  setActivePinia(pinia)
  return useAIAgentStore(pinia)
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('config', () => {
  it('默认配置正确', () => {
    const store = createStore()
    expect(store.config.enabled).toBe(false)
    expect(store.config.mode).toBe('draft')
    expect(store.config.requireConfirm).toBe(true)
    expect(store.config.maxAutoReplies).toBe(0)
    expect(store.config.cooldownMs).toBe(5000)
  })

  it('updateConfig 部分更新', () => {
    const store = createStore()
    store.updateConfig({ enabled: true, mode: 'auto' })
    expect(store.config.enabled).toBe(true)
    expect(store.config.mode).toBe('auto')
    expect(store.config.requireConfirm).toBe(true)
  })

  it('resetConfig 恢复默认', () => {
    const store = createStore()
    store.updateConfig({ enabled: true, mode: 'auto' })
    store.resetConfig()
    expect(store.config.enabled).toBe(false)
    expect(store.config.mode).toBe('draft')
  })

  it('addTargetSession / removeTargetSession', () => {
    const store = createStore()
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
    const store = createStore()
    expect(store.config.targetSessions).toHaveLength(0)
    expect(store.isSessionTargeted('any')).toBe(true)

    store.addTargetSession({ sessionId: 's1', sessionName: '会话1' })
    expect(store.isSessionTargeted('s1')).toBe(true)
    expect(store.isSessionTargeted('s2')).toBe(false)
  })
})

describe('drafts', () => {
  it('addDraft 创建草稿', () => {
    const store = createStore()
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
    const store = createStore()
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
    const store = createStore()
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
    const store = createStore()
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
    const store = createStore()
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
    const store = createStore()
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

describe('sendingStatuses', () => {
  it('addSendingStatus 添加状态', () => {
    const store = createStore()
    const status = store.addSendingStatus({
      draftId: 'd1',
      messageId: 100,
      contactName: '张三',
      contentPreview: '你好...',
      status: 'sending',
    })

    expect(status.startedAt).toBeGreaterThan(0)
    expect(store.sendingStatuses).toHaveLength(1)
  })

  it('updateSendingStatus 更新状态', () => {
    const store = createStore()
    store.addSendingStatus({
      draftId: 'd1',
      messageId: 100,
      contactName: '张三',
      contentPreview: '你好...',
      status: 'sending',
    })

    store.updateSendingStatus('d1', { status: 'completed' })
    expect(store.sendingStatuses[0].status).toBe('completed')
  })

  it('removeSendingStatus 删除状态', () => {
    const store = createStore()
    store.addSendingStatus({
      draftId: 'd1',
      messageId: 100,
      contactName: '张三',
      contentPreview: '你好...',
      status: 'sending',
    })

    store.removeSendingStatus('d1')
    expect(store.sendingStatuses).toHaveLength(0)
  })

  it('activeSendings 只返回 sending 状态', () => {
    const store = createStore()
    store.addSendingStatus({
      draftId: 'd1',
      messageId: 100,
      contactName: '张三',
      contentPreview: '你好...',
      status: 'sending',
    })
    store.addSendingStatus({
      draftId: 'd2',
      messageId: 101,
      contactName: '李四',
      contentPreview: '再见...',
      status: 'completed',
    })

    expect(store.activeSendings).toHaveLength(1)
    expect(store.hasActiveSendings).toBe(true)
  })
})

describe('canAutoReply', () => {
  it('未启用时不可自动回复', () => {
    const store = createStore()
    expect(store.canAutoReply).toBe(false)
  })

  it('启用且模式为 auto 时可自动回复', () => {
    const store = createStore()
    store.updateConfig({ enabled: true, mode: 'auto' })
    expect(store.canAutoReply).toBe(true)
  })

  it('草稿模式不可自动回复', () => {
    const store = createStore()
    store.updateConfig({ enabled: true, mode: 'draft' })
    expect(store.canAutoReply).toBe(false)
  })

  it('达到最大次数后不可自动回复', () => {
    const store = createStore()
    store.updateConfig({ enabled: true, mode: 'auto', maxAutoReplies: 2 })
    store.incrementAutoReplyCount()
    store.incrementAutoReplyCount()
    expect(store.canAutoReply).toBe(false)
  })

  it('resetAutoReplyCount 重置计数', () => {
    const store = createStore()
    store.updateConfig({ enabled: true, mode: 'auto', maxAutoReplies: 2 })
    store.incrementAutoReplyCount()
    store.incrementAutoReplyCount()
    expect(store.canAutoReply).toBe(false)

    store.resetAutoReplyCount()
    expect(store.canAutoReply).toBe(true)
  })
})

describe('$reset', () => {
  it('重置所有状态', () => {
    const store = createStore()
    store.updateConfig({ enabled: true })
    store.addDraft({
      sourceMessageId: 'msg1',
      sessionId: 's1',
      sessionName: '会话1',
      contactName: '张三',
      content: '你好',
      generatedAt: Date.now(),
    })
    store.incrementAutoReplyCount()

    store.$reset()

    expect(store.config.enabled).toBe(false)
    expect(store.drafts).toHaveLength(0)
    expect(store.sendingStatuses).toHaveLength(0)
    expect(store.autoReplyCount).toBe(0)
  })
})
