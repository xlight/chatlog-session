<script setup lang="ts">
// Console 活动日志 Tab：倒序时间线，分页加载更多
// 顶部"清空日志"按钮带 ElMessageBox 二次确认

import { computed, ref, type Component } from 'vue'
import { useAIActivityLogStore } from '@/stores/ai/activityLog'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatLineRound,
  UploadFilled,
  MagicStick,
  DataLine,
  Delete,
} from '@element-plus/icons-vue'
import type { ActivityLogEntry } from '@/types/ai/console'

const activityLog = useAIActivityLogStore()

const PAGE_SIZE = 50
const currentPage = ref(1)

// 当前页可见条目
const pageItems = computed<ActivityLogEntry[]>(() =>
  activityLog.getPaginated(currentPage.value, PAGE_SIZE)
)

// 剩余可加载页数（避免按钮一直可点）
const hasMore = computed(
  () => currentPage.value * PAGE_SIZE < activityLog.entries.length
)

const isEmpty = computed(() => activityLog.entries.length === 0)

// 相对时间：刚刚 / X分钟前 / X小时前 / X天前 / 绝对时间
function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  const days = Math.floor(diff / 86_400_000)
  if (days < 7) return `${days}天前`
  const d = new Date(ts)
  const YYYY = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  return `${YYYY}-${MM}-${DD}`
}

// 动作类型 → 图标
function getActionIcon(action: ActivityLogEntry['action']): Component {
  if (action === 'console_chat') return ChatLineRound
  if (action === 'context_feed') return UploadFilled
  if (action === 'ai_reply') return MagicStick
  if (action === 'ai_analyze') return DataLine
  return ChatLineRound
}

// 动作类型 → 中文标签（用于 tooltip / 调试）
function getActionLabel(action: ActivityLogEntry['action']): string {
  if (action === 'console_chat') return '对话'
  if (action === 'context_feed') return '投喂'
  if (action === 'ai_reply') return 'AI 回复'
  if (action === 'ai_analyze') return 'AI 分析'
  return '活动'
}

function loadMore() {
  currentPage.value += 1
}

async function handleClear() {
  if (isEmpty.value) return
  try {
    await ElMessageBox.confirm(
      '确定要清空全部活动日志吗？该操作不可恢复。',
      '清空确认',
      {
        type: 'warning',
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      }
    )
    activityLog.clearAll()
    currentPage.value = 1
    ElMessage.success('已清空活动日志')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="console-activity-log">
    <div class="log-header">
      <h2 class="page-title">活动日志</h2>
      <el-button
        type="danger"
        plain
        :icon="Delete"
        :disabled="isEmpty"
        @click="handleClear"
      >
        清空日志
      </el-button>
    </div>

    <el-empty
      v-if="isEmpty"
      description="暂无活动记录"
      class="log-empty"
    />

    <template v-else>
      <ul class="log-list">
        <li
          v-for="entry in pageItems"
          :key="entry.id"
          class="log-item"
        >
          <div class="log-item__icon">
            <el-icon size="16">
              <component :is="getActionIcon(entry.action)" />
            </el-icon>
          </div>
          <div class="log-item__body">
            <div class="log-item__detail">{{ entry.detail }}</div>
            <div class="log-item__meta">
              <el-tag size="small" type="info" effect="plain">
                {{ getActionLabel(entry.action) }}
              </el-tag>
              <span class="log-item__time">{{ formatRelative(entry.timestamp) }}</span>
            </div>
          </div>
        </li>
      </ul>

      <div v-if="hasMore" class="log-more">
        <el-button @click="loadMore">加载更多</el-button>
      </div>
      <div v-else class="log-more log-more--end">已显示全部日志</div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.console-activity-log {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.log-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }

  &__icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 6px;
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__detail {
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  &__time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.log-more {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  flex-shrink: 0;

  &--end {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
