<script setup lang="ts">
import { computed, inject } from 'vue'
import { useAIAgentStore } from '@/stores/ai/agent'
import { INJECT_DRAFT_KEY } from '@/composables/injectDraftKey'

const props = defineProps<{
  sessionId: string
}>()

const agentStore = useAIAgentStore()
const injectDraft = inject(INJECT_DRAFT_KEY, null)

const results = computed(() => agentStore.keywordResults.get(props.sessionId) ?? [])

function isCollapsed(analyzedAt: number): boolean {
  return Date.now() - analyzedAt > 5 * 60 * 1000
}

function removeResult(id: string) {
  const current = agentStore.keywordResults.get(props.sessionId) ?? []
  const filtered = current.filter((r) => r.id !== id)
  const newMap = new Map(agentStore.keywordResults)
  if (filtered.length > 0) {
    newMap.set(props.sessionId, filtered)
  } else {
    newMap.delete(props.sessionId)
  }
  agentStore.keywordResults = newMap
}

function handleInject(text: string) {
  if (injectDraft) {
    injectDraft(text)
  }
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  return `${hours} 小时前`
}
</script>

<template>
  <div class="agent-keyword-card">
    <div v-if="results.length === 0" class="keyword-empty">
      暂无关键词匹配
    </div>

    <div v-else class="keyword-results">
      <div
        v-for="result in results"
        :key="result.id"
        class="keyword-result-item"
        :class="{ collapsed: isCollapsed(result.analyzedAt) }"
      >
        <div class="result-header">
          <el-tag size="small" type="warning" effect="dark">
            {{ result.matchedPattern }}
          </el-tag>
          <span class="result-time">{{ formatTime(result.analyzedAt) }}</span>
          <el-button text size="small" @click="removeResult(result.id)">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>

        <template v-if="!isCollapsed(result.analyzedAt)">
          <div class="result-summary">{{ result.summary }}</div>

          <div v-if="result.mentionContext" class="mention-context">
            <el-icon :size="12"><ChatDotRound /></el-icon>
            来自 {{ result.mentionContext.mentionedBy }} 的提及：
            {{ result.mentionContext.whatTheyAsk }}
          </div>

          <div v-if="result.replySuggestion" class="reply-suggestion">
            <div class="reply-text">{{ result.replySuggestion }}</div>
            <el-button size="small" type="primary" plain @click="handleInject(result.replySuggestion!)">
              填入输入框
            </el-button>
          </div>
        </template>

        <div v-if="result.status === 'error' && result.error" class="result-error">
          {{ result.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.agent-keyword-card {
  max-height: 240px;
  overflow-y: auto;
}

.keyword-empty {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.keyword-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.keyword-result-item {
  padding: 8px 12px;
  border-radius: 6px;
  background: #f5f7fa;

  &.collapsed {
    opacity: 0.7;
  }
}

.result-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.result-time {
  flex: 1;
  font-size: 11px;
  color: #909399;
}

.result-summary {
  margin-top: 6px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

.mention-context {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.reply-suggestion {
  margin-top: 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;

  .reply-text {
    flex: 1;
    font-size: 13px;
    color: #303133;
    background: #ecf5ff;
    padding: 6px 10px;
    border-radius: 4px;
    line-height: 1.5;
  }
}

.result-error {
  margin-top: 4px;
  font-size: 12px;
  color: #f56c6c;
}
</style>
