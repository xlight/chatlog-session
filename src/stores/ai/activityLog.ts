import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ActivityAction, ActivityLogEntry } from '@/types/ai/console'

const RECENT_LIMIT = 50

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useAIActivityLogStore = defineStore(
  'aiActivityLog',
  () => {
    const entries = ref<ActivityLogEntry[]>([])
    const isLoading = ref(false)

    const recentEntries = computed(() =>
      [...entries.value].sort((a, b) => b.timestamp - a.timestamp).slice(0, RECENT_LIMIT)
    )

    function addEntry(action: ActivityAction, detail: string, sessionId?: string): void {
      entries.value.push({
        id: generateId(),
        timestamp: Date.now(),
        action,
        detail,
        sessionId,
      })
    }

    function clearAll(): void {
      entries.value = []
    }

    function getPaginated(page: number, pageSize: number): ActivityLogEntry[] {
      const start = (page - 1) * pageSize
      if (start < 0 || start >= entries.value.length) return []
      return [...entries.value]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(start, start + pageSize)
    }

    function $reset(): void {
      entries.value = []
      isLoading.value = false
    }

    return {
      entries,
      isLoading,
      recentEntries,
      addEntry,
      clearAll,
      getPaginated,
      $reset,
    }
  },
  {
    persist: {
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      paths: ['entries'],
    },
  }
)
