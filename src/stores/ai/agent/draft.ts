/**
 * aiAgent store - draft 子模块
 *
 * Draft 相关 getters（pendingDrafts / hasPendingDrafts）与 actions
 * （addDraft / removeDraft / markDraftSent / clearDrafts / clearSentDrafts）。
 */
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { AgentDraft } from '@/types/ai/agent'
import { generateId } from '@/utils/id'
import type { AiAgentConfigContext } from './config'

const MAX_DRAFTS = 20

export interface AiAgentDraftContext {
  pendingDrafts: ComputedRef<AgentDraft[]>
  hasPendingDrafts: ComputedRef<boolean>
  addDraft: (draft: Omit<AgentDraft, 'id' | 'sent'>) => AgentDraft
  removeDraft: (draftId: string) => void
  markDraftSent: (draftId: string, jobId: number) => void
  clearDrafts: () => void
  clearSentDrafts: () => void
  $resetDrafts: () => void
}

export function useAiAgentDraft(core: AiAgentConfigContext): AiAgentDraftContext {
  const { drafts } = core

  // ==================== Getters ====================

  const pendingDrafts = computed(() =>
    drafts.value.filter((d) => !d.sent)
  )

  const hasPendingDrafts = computed(() => pendingDrafts.value.length > 0)

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

  // ==================== Reset (draft 部分) ====================

  function $resetDrafts(): void {
    drafts.value = []
  }

  return {
    pendingDrafts,
    hasPendingDrafts,
    addDraft,
    removeDraft,
    markDraftSent,
    clearDrafts,
    clearSentDrafts,
    $resetDrafts,
  }
}
