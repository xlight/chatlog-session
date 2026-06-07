<script setup lang="ts">
// Console 总览 Tab：统计卡片 + 最近活动
// 3 个核心指标来自 consoleStore.getStats()，第 4 个卡片从活动日志按时间窗口计算

import { computed, type Component } from 'vue'
import { useAIConsoleStore } from '@/stores/ai/console'
import { useAIActivityLogStore } from '@/stores/ai/activityLog'
import { useAppStore } from '@/stores/app'
import { ChatLineRound, MagicStick, Clock, DataLine } from '@element-plus/icons-vue'
import type { ActivityLogEntry } from '@/types/ai/console'

const consoleStore = useAIConsoleStore()
const activityLog = useAIActivityLogStore()
const appStore = useAppStore()

const stats = computed(() => consoleStore.getStats())

// 本周 AI 调用次数：最近 7 天内 ai_reply / ai_analyze 计数
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const weeklyAiCalls = computed(() => {
  const cutoff = Date.now() - WEEK_MS
  return activityLog.recentEntries.filter(
    (e) =>
      e.timestamp >= cutoff && (e.action === 'ai_reply' || e.action === 'ai_analyze')
  ).length
})

// 最近 5 条活动
const recentActivities = computed<ActivityLogEntry[]>(() =>
  activityLog.recentEntries.slice(0, 5)
)

// 调试日志门控示例（保持与其他模块一致的写法）
if (appStore.isDebug) {
   
  console.log('📊 ConsoleOverview 渲染', stats.value)
}

// 绝对时间（短形式：MM-DD HH:mm），最后活跃卡片使用
function formatLastActive(ts: number | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${MM}-${DD} ${HH}:${mm}`
}

// 相对时间（活动列表使用）
function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  const days = Math.floor(diff / 86_400_000)
  if (days < 7) return `${days}天前`
  return formatLastActive(ts)
}

// 动作类型 → 图标组件映射
function getActionIcon(action: ActivityLogEntry['action']): Component {
  if (action === 'console_chat') return ChatLineRound
  if (action === 'ai_reply') return MagicStick
  if (action === 'ai_analyze') return DataLine
  return ChatLineRound
}

function goToChat() {
  consoleStore.switchTab('chat')
}
</script>

<template>
  <div class="console-overview">
    <h2 class="page-title">总览</h2>

    <div class="stat-grid">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-card__icon stat-card__icon--primary">
          <el-icon size="32">
            <ChatLineRound />
          </el-icon>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__label">总对话数</div>
          <div class="stat-card__value">{{ stats.totalSessions }}</div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-card__icon stat-card__icon--success">
          <el-icon size="32">
            <MagicStick />
          </el-icon>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__label">总消息数</div>
          <div class="stat-card__value">{{ stats.totalMessages }}</div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-card__icon stat-card__icon--warning">
          <el-icon size="32">
            <Clock />
          </el-icon>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__label">最后活跃</div>
          <div class="stat-card__value stat-card__value--text">
            {{ formatLastActive(stats.lastActivityAt) }}
          </div>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-card__icon stat-card__icon--danger">
          <el-icon size="32">
            <DataLine />
          </el-icon>
        </div>
        <div class="stat-card__body">
          <div class="stat-card__label">本周 AI 调用</div>
          <div class="stat-card__value">{{ weeklyAiCalls }}</div>
        </div>
      </el-card>
    </div>

    <el-card class="recent-card" shadow="never">
      <template #header>
        <span class="section-title">最近活动</span>
      </template>

      <ul v-if="recentActivities.length > 0" class="recent-list">
        <li
          v-for="entry in recentActivities"
          :key="entry.id"
          class="recent-item"
        >
          <el-icon size="16" class="recent-item__icon">
            <component :is="getActionIcon(entry.action)" />
          </el-icon>
          <span class="recent-item__detail">{{ entry.detail }}</span>
          <span class="recent-item__time">{{ formatRelative(entry.timestamp) }}</span>
        </li>
      </ul>

      <el-empty v-else description="还没有活动记录">
        <el-button type="primary" @click="goToChat">开始第一次对话</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.console-overview {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: 8px;

    &--primary {
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }
    &--success {
      color: var(--el-color-success);
      background-color: var(--el-color-success-light-9);
    }
    &--warning {
      color: var(--el-color-warning);
      background-color: var(--el-color-warning-light-9);
    }
    &--danger {
      color: var(--el-color-danger);
      background-color: var(--el-color-danger-light-9);
    }
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__value {
    font-size: 22px;
    font-weight: 600;
    margin-top: 2px;
    line-height: 1.2;

    &--text {
      font-size: 14px;
      font-weight: 500;
    }
  }
}

.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }

  &__icon {
    color: var(--el-color-primary);
    flex-shrink: 0;
  }

  &__detail {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  &__time {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
