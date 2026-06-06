<script setup lang="ts">
// 会话侧边栏（PC 端 260px）— 展示 AI Console 多对话会话
// 顶部"新建对话"按钮、列表项标题/消息数/时间戳、删除带二次确认

import { computed } from 'vue'
import { useAIConsoleStore } from '@/stores/ai/console'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'

const consoleStore = useAIConsoleStore()

// 当前激活会话 ID
const currentSessionId = computed(() => consoleStore.currentSessionId)
// 按更新时间倒序的会话列表
const sessions = computed(() => consoleStore.sortedSessions)
// 是否正在流式输出（用于禁用删除，避免中断中的对话被误删）
const isStreamingCurrent = computed(() => consoleStore.isStreamingCurrent)
// 单实例最大会话数（与 store 内部保持一致）
const maxSessions = 50

// 处理新建按钮点击：通知父组件创建新会话
function handleNewSession() {
  if (sessions.value.length >= maxSessions) {
    ElMessage.warning(`已达上限（${maxSessions}个），请先删除部分会话`)
    return
  }
  emit('new-session')
}

// 切换当前会话
function handleSelect(id: string) {
  if (id !== currentSessionId.value) {
    consoleStore.switchSession(id)
  }
}

// 删除按钮的二次确认
async function handleDelete(session: { id: string; title: string }) {
  try {
    await ElMessageBox.confirm(
      `确定要删除会话「${session.title}」吗？该操作不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      }
    )
    consoleStore.deleteSession(session.id)
    ElMessage.success('已删除')
  } catch {
    // 用户取消
  }
}

// 时间戳格式化（短形式：MM-DD HH:mm）
function formatTime(ts: number): string {
  const d = new Date(ts)
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${MM}-${DD} ${HH}:${mm}`
}

const emit = defineEmits<{
  (e: 'new-session'): void
}>()
</script>

<template>
  <aside class="console-session-list">
    <div class="console-session-list__header">
      <el-button
        type="primary"
        :icon="Plus"
        class="console-session-list__new-btn"
        :disabled="sessions.length >= maxSessions"
        @click="handleNewSession"
      >
        新建对话
      </el-button>
    </div>

    <el-scrollbar class="console-session-list__scroll">
      <template v-if="sessions.length > 0">
        <ul class="console-session-list__items">
          <li
            v-for="s in sessions"
            :key="s.id"
            class="session-item"
            :class="{
              'session-item--active': s.id === currentSessionId,
            }"
            @click="handleSelect(s.id)"
          >
            <div class="session-item__main">
              <div class="session-item__title" :title="s.title">
                {{ s.title }}
              </div>
              <div class="session-item__meta">
                <span class="session-item__count">{{ s.messages.length }} 条</span>
                <span class="session-item__time">{{ formatTime(s.updatedAt) }}</span>
              </div>
            </div>
            <el-button
              class="session-item__delete"
              :icon="Delete"
              link
              size="small"
              :disabled="isStreamingCurrent && s.id === currentSessionId"
              @click.stop="handleDelete(s)"
            />
          </li>
        </ul>
      </template>

      <div v-else class="console-session-list__empty">
        <div class="empty-icon">💬</div>
        <div class="empty-text">暂无对话</div>
        <div class="empty-hint">点击"新建对话"开始</div>
      </div>
    </el-scrollbar>

    <div v-if="sessions.length > 0" class="console-session-list__footer">
      {{ sessions.length }} / {{ maxSessions }}
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.console-session-list {
  display: flex;
  flex-direction: column;
  width: 260px;
  height: 100%;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-page);

  &__header {
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__new-btn {
    width: 100%;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
  }

  &__items {
    list-style: none;
    margin: 0;
    padding: 4px 0;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    color: var(--el-text-color-secondary);

    .empty-icon {
      font-size: 36px;
      margin-bottom: 8px;
      opacity: 0.5;
    }
    .empty-text {
      font-size: 14px;
      margin-bottom: 4px;
    }
    .empty-hint {
      font-size: 12px;
      opacity: 0.7;
    }
  }

  &__footer {
    padding: 8px 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &--active {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);

    &:hover {
      background-color: var(--el-color-primary-light-8);
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__count {
    flex-shrink: 0;
  }

  &__time {
    margin-left: 8px;
    white-space: nowrap;
  }

  &__delete {
    flex-shrink: 0;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }
}
</style>
