import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Message } from '@/types/message'

vi.mock('@/api/llm', () => ({
  chatStream: vi.fn(),
}))

vi.mock('@/api/sendmsg', () => ({
  sendmsgAPI: { send: vi.fn() },
}))

vi.mock('@/utils/getContextMessages', () => ({
  getContextMessages: vi.fn(),
}))

import { chatStream } from '@/api/llm'
import { useAIAgentStore } from '@/stores/ai/agent'
import { triggerSessionAnalysis } from '@/composables/triggerSessionAnalysis'
import { getContextMessages } from '@/utils/getContextMessages'

function makeMessage(overrides: Partial<Message> & { id: number; createTime: number; isSelf: boolean }): Message {
  return {
    seq: overrides.id,
    time: new Date(overrides.createTime * 1000).toISOString(),
    talker: 'talker',
    talkerName: 'talker',
    sender: 'sender',
    senderName: 'sender',
    isSend: overrides.isSelf ? 1 : 0,
    isChatRoom: false,
    type: 1,
    subType: 0,
    content: 'hello',
    ...overrides,
  }
}

function mockChatStream(responseText: string) {
  const chunks = [
    { choices: [{ delta: { content: responseText } }] },
  ]
  ;(chatStream as ReturnType<typeof vi.fn>).mockImplementation(async function* () {
    for (const chunk of chunks) yield chunk
  })
}

function freshStore() {
  sessionStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAIAgentStore(pinia)
  return store
}

const ANALYSIS_RESPONSE = '【摘要】\n讨论了项目进度\n\n【关键点】\n- 进度正常\n\n【建议回复】\n- 继续加油'

describe('triggerSessionAnalysis incremental autoReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatStream(ANALYSIS_RESPONSE)
  })

  it('增量全部自消息时跳过 autoReply', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1 },
      sendPermission: 'auto',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1, 2]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1000, isSelf: false }),
      makeMessage({ id: 3, createTime: 1001, isSelf: true }),
      makeMessage({ id: 4, createTime: 1002, isSelf: true }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts).toHaveLength(0)
  })

  it('增量包含他人消息时触发 autoReply', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1 },
      sendPermission: 'draft_confirm',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1, 2]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1000, isSelf: false }),
      makeMessage({ id: 3, createTime: 1001, isSelf: true }),
      makeMessage({ id: 4, createTime: 1002, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
  })

  it('定时 tick 触发不 autoReply', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1 },
      sendPermission: 'draft_confirm',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1]) })

    const messages = [
      makeMessage({ id: 1, createTime: 999, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true, isTimerTick: true })

    expect(store.drafts).toHaveLength(0)
  })

  it('冷启动时允许 autoReply', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1 },
      sendPermission: 'draft_confirm',
    })

    const messages = [
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
      makeMessage({ id: 2, createTime: 1001, isSelf: true }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
  })

  it('分析完成后更新 lastAnalysisTime 为秒级', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1 },
    })

    const messages = [
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    const beforeSeconds = Math.floor(Date.now() / 1000)
    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })
    const afterSeconds = Math.floor(Date.now() / 1000)

    const state = store.getObserverState('s1')
    expect(state.lastAnalysisTime).toBeGreaterThanOrEqual(beforeSeconds)
    expect(state.lastAnalysisTime).toBeLessThanOrEqual(afterSeconds)
  })

  it('分析完成后更新 lastAnalyzedMessageIds', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: false, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1 },
    })

    const messages = [
      makeMessage({ id: 10, createTime: 1000, isSelf: false }),
      makeMessage({ id: 20, createTime: 1001, isSelf: true }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    const state = store.getObserverState('s1')
    expect(state.lastAnalyzedMessageIds).toBeDefined()
    expect(state.lastAnalyzedMessageIds!.has(10)).toBe(true)
    expect(state.lastAnalyzedMessageIds!.has(20)).toBe(true)
  })

  it('同秒内消息通过 lastAnalyzedMessageIds 精确区分', async () => {
    const store = freshStore()
    store.setSessionConfig('s1', {
      observer: { enabled: true, autoReply: true, intervalSeconds: 0, minNewMessages: 0, autoReplyCount: 1 },
      sendPermission: 'draft_confirm',
    })
    store.updateObserverState('s1', { lastAnalysisTime: 1000, lastAnalyzedMessageIds: new Set([1, 2]) })

    const messages = [
      makeMessage({ id: 1, createTime: 1000, isSelf: false }),
      makeMessage({ id: 2, createTime: 1000, isSelf: true }),
      makeMessage({ id: 3, createTime: 1000, isSelf: false }),
    ]
    ;(getContextMessages as ReturnType<typeof vi.fn>).mockResolvedValue(messages)

    await triggerSessionAnalysis('s1', { skipAccumulatedCheck: true })

    expect(store.drafts.length).toBeGreaterThanOrEqual(1)
  })
})
