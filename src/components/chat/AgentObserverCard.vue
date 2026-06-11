<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useAIAgentStore } from '@/stores/ai/agent'

const props = defineProps<{
  sessionId: string
}>()

const agentStore = useAIAgentStore()

const state = computed(() => agentStore.observerStates.get(props.sessionId))
const results = computed(() => agentStore.observerResults.get(props.sessionId) ?? [])

/** 用户主动展开的结果 ID 集合 */
const expandedIds = reactive(new Set<string>())

function isCollapsed(result: { id: string; analyzedAt: number }): boolean {
  const timeCollapsed = Date.now() - result.analyzedAt > 5 * 60 * 1000
  if (!timeCollapsed) return false
  return !expandedIds.has(result.id)
}

function toggleExpand(id: string) {
  if (expandedIds.has(id)) {
    expandedIds.delete(id)
  } else {
    expandedIds.add(id)
  }
}

function removeResult(id: string) {
  const current = agentStore.observerResults.get(props.sessionId) ?? []
  const filtered = current.filter((r) => r.id !== id)
  const newMap = new Map(agentStore.observerResults)
  if (filtered.length > 0) {
    newMap.set(props.sessionId, filtered)
  } else {
    newMap.delete(props.sessionId)
  }
  agentStore.observerResults = newMap
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  return `${hours} 小时前`
}

function formatTimeRange(start?: number, end?: number): string {
  if (start === undefined || end === undefined) return ''

  // Unix 秒级时间戳 → Date
  const startDate = new Date(start * 1000)
  const endDate = new Date(end * 1000)

  // 格式化 HH:mm
  const fmtTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  // 同一条消息或同一分钟
  if (start === end) return fmtTime(startDate)

  // 同一天
  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate()
  ) {
    return `${fmtTime(startDate)}-${fmtTime(endDate)}`
  }

  // 跨天
  const fmtDate = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()} ${fmtTime(d)}`
  return `${fmtDate(startDate)} - ${fmtDate(endDate)}`
}
</script>

<template>
  <div class="agent-observer-card">
    <div v-if="state?.isAnalyzing" class="observer-loading">
      <el-skeleton :rows="2" animated />
      <span class="loading-text">分析中...</span>
    </div>

    <div v-else-if="results.length === 0" class="observer-empty">
      暂无分析结果
    </div>

    <div v-else class="observer-results">
      <div
        v-for="result in results"
        :key="result.id"
        class="observer-result-item"
        :class="{ collapsed: isCollapsed(result) }"
      >
        <div class="result-header" @click="toggleExpand(result.id)">
          <el-icon :size="14" class="expand-icon" :class="{ rotated: !isCollapsed(result) }">
            <ArrowRight />
          </el-icon>
          <el-icon v-if="result.status === 'success'" color="#67c23a" :size="16">
            <SuccessFilled />
          </el-icon>
          <el-icon v-else color="#f56c6c" :size="16">
            <WarningFilled />
          </el-icon>
          <span class="result-summary">{{ result.summary }}</span>
          <el-badge :value="result.messageCount" type="info" class="msg-count-badge" />
          <span v-if="formatTimeRange(result.startTime, result.endTime)" class="result-timerange">
            {{ formatTimeRange(result.startTime, result.endTime) }}
          </span>
          <span class="result-time">{{ formatTime(result.analyzedAt) }}</span>
          <el-button text size="small" @click.stop="removeResult(result.id)">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>

        <template v-if="!isCollapsed(result)">
          <ul v-if="result.keyPoints.length > 0" class="key-points">
            <li v-for="(point, i) in result.keyPoints" :key="i">{{ point }}</li>
          </ul>
          <div v-if="result.suggestions.length > 0" class="suggestions">
            <el-tag
              v-for="(sug, i) in result.suggestions"
              :key="i"
              size="small"
              type="primary"
              class="suggestion-tag"
            >
              {{ sug }}
            </el-tag>
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
.agent-observer-card {
  max-height: 240px;
  overflow-y: auto;
}

.observer-loading {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .loading-text {
    font-size: 12px;
    color: #909399;
  }
}

.observer-empty {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.observer-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.observer-result-item {
  padding: 8px 12px;
  border-radius: 6px;
  background: #f5f7fa;

  &.collapsed {
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }
}

.result-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.expand-icon {
  transition: transform 0.2s ease;
  flex-shrink: 0;

  &.rotated {
    transform: rotate(90deg);
  }
}

.result-summary {
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-count-badge {
  :deep(.el-badge__content) {
    font-size: 10px;
    height: 16px;
    line-height: 16px;
  }
}

.result-time {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
}

.result-timerange {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
  margin-left: 6px;
}

.key-points {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
}

.suggestions {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  .suggestion-tag {
    font-size: 11px;
  }
}

.result-error {
  margin-top: 4px;
  font-size: 12px;
  color: #f56c6c;
}
</style>
