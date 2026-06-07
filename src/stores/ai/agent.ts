import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AgentConfig,
  AgentDraft,
  AgentSendingStatus,
  AgentSessionFilter,
} from '@/types/ai/agent'

const DEFAULT_CONFIG: AgentConfig = {
  enabled: false,
  mode: 'draft',
  targetSessions: [],
  promptTemplateId: 'builtin-reply',
  requireConfirm: true,
  maxAutoReplies: 0,
  cooldownMs: 5000,
}

const MAX_DRAFTS = 20
const MAX_SENDING_STATUS = 50

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useAIAgentStore = defineStore('aiAgent', () => {
  // ==================== State ====================

  const config = ref<AgentConfig>({ ...DEFAULT_CONFIG })

  const drafts = ref<AgentDraft[]>([])

  const sendingStatuses = ref<AgentSendingStatus[]>([])

  const autoReplyCount = ref(0)

  const lastAutoReplyAt = ref<number | null>(null)

  // ==================== Getters ====================

  const pendingDrafts = computed(() =>
    drafts.value.filter((d) => !d.sent)
  )

  const hasPendingDrafts = computed(() => pendingDrafts.value.length > 0)

  const activeSendings = computed(() =>
    sendingStatuses.value.filter((s) => s.status === 'sending')
  )

  const hasActiveSendings = computed(() => activeSendings.value.length > 0)

  const canAutoReply = computed(() => {
    if (!config.value.enabled) return false
    if (config.value.mode !== 'auto') return false
    if (config.value.maxAutoReplies > 0 && autoReplyCount.value >= config.value.maxAutoReplies) return false
    if (config.value.cooldownMs > 0 && lastAutoReplyAt.value) {
      if (Date.now() - lastAutoReplyAt.value < config.value.cooldownMs) return false
    }
    return true
  })

  // ==================== Config Actions ====================

  function updateConfig(partial: Partial<AgentConfig>): void {
    config.value = { ...config.value, ...partial }
  }

  function resetConfig(): void {
    config.value = { ...DEFAULT_CONFIG }
  }

  function addTargetSession(filter: AgentSessionFilter): void {
    if (config.value.targetSessions.some((f) => f.sessionId === filter.sessionId)) return
    config.value.targetSessions.push(filter)
  }

  function removeTargetSession(sessionId: string): void {
    config.value.targetSessions = config.value.targetSessions.filter(
      (f) => f.sessionId !== sessionId
    )
  }

  function isSessionTargeted(sessionId: string): boolean {
    if (config.value.targetSessions.length === 0) return true
    return config.value.targetSessions.some((f) => f.sessionId === sessionId)
  }

  // ==================== Draft Actions ====================

  function addDraft(draft: Omit<AgentDraft, 'id' | 'sent'>): AgentDraft {
    if (drafts.value.length >= MAX_DRAFTS) {
      drafts.value = drafts.value.filter((d) => d.sent).concat(
        drafts.value.filter((d) => !d.sent).slice(-(MAX_DRAFTS - drafts.value.filter((d) => d.sent).length))
      )
    }

    const newDraft: AgentDraft = {
      ...draft,
      id: generateId(),
      sent: false,
    }
    drafts.value.push(newDraft)
    return newDraft
  }

  function removeDraft(draftId: string): void {
    drafts.value = drafts.value.filter((d) => d.id !== draftId)
  }

  function markDraftSent(draftId: string, jobId: number): void {
    const draft = drafts.value.find((d) => d.id === draftId)
    if (draft) {
      draft.sent = true
      draft.jobId = jobId
    }
  }

  function clearDrafts(): void {
    drafts.value = []
  }

  function clearSentDrafts(): void {
    drafts.value = drafts.value.filter((d) => !d.sent)
  }

  // ==================== Sending Status Actions ====================

  function addSendingStatus(status: Omit<AgentSendingStatus, 'startedAt'>): AgentSendingStatus {
    const newStatus: AgentSendingStatus = {
      ...status,
      startedAt: Date.now(),
    }
    sendingStatuses.value.push(newStatus)

    if (sendingStatuses.value.length > MAX_SENDING_STATUS) {
      sendingStatuses.value = sendingStatuses.value.slice(-MAX_SENDING_STATUS)
    }

    return newStatus
  }

  function updateSendingStatus(draftId: string, update: Partial<AgentSendingStatus>): void {
    const status = sendingStatuses.value.find((s) => s.draftId === draftId)
    if (status) {
      Object.assign(status, update)
    }
  }

  function removeSendingStatus(draftId: string): void {
    sendingStatuses.value = sendingStatuses.value.filter((s) => s.draftId !== draftId)
  }

  function clearSendingStatuses(): void {
    sendingStatuses.value = []
  }

  // ==================== Auto Reply Tracking ====================

  function incrementAutoReplyCount(): void {
    autoReplyCount.value++
    lastAutoReplyAt.value = Date.now()
  }

  function resetAutoReplyCount(): void {
    autoReplyCount.value = 0
    lastAutoReplyAt.value = null
  }

  // ==================== Reset ====================

  function $reset(): void {
    config.value = { ...DEFAULT_CONFIG }
    drafts.value = []
    sendingStatuses.value = []
    autoReplyCount.value = 0
    lastAutoReplyAt.value = null
  }

  return {
    // State
    config,
    drafts,
    sendingStatuses,
    autoReplyCount,
    lastAutoReplyAt,

    // Getters
    pendingDrafts,
    hasPendingDrafts,
    activeSendings,
    hasActiveSendings,
    canAutoReply,

    // Config Actions
    updateConfig,
    resetConfig,
    addTargetSession,
    removeTargetSession,
    isSessionTargeted,

    // Draft Actions
    addDraft,
    removeDraft,
    markDraftSent,
    clearDrafts,
    clearSentDrafts,

    // Sending Status Actions
    addSendingStatus,
    updateSendingStatus,
    removeSendingStatus,
    clearSendingStatuses,

    // Auto Reply Tracking
    incrementAutoReplyCount,
    resetAutoReplyCount,

    // Reset
    $reset,
  }
}, {
  persist: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    pick: ['config', 'drafts'],
  },
} as never)
