<script setup lang="ts">
// Console 会话管理 Tab：完整会话列表 + 搜索 + 重命名 + 删除
// 与 ConsoleSessionList.vue（侧边栏）不同，此处为全屏管理视图

import { computed, ref } from 'vue'
import { useAIConsoleStore } from '@/stores/ai/console'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Search, ChatLineRound } from '@element-plus/icons-vue'

const consoleStore = useAIConsoleStore()

// 搜索关键字
const searchKeyword = ref('')

// 过滤后的会话列表（按 title 包含匹配，大小写不敏感）
const filteredSessions = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const all = consoleStore.sortedSessions
  if (!keyword) return all
  return all.filter((s) => s.title.toLowerCase().includes(keyword))
})

const isEmpty = computed(() => filteredSessions.value.length === 0)

// 短时间格式：MM-DD HH:mm
function formatTime(ts: number): string {
  const d = new Date(ts)
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${MM}-${DD} ${HH}:${mm}`
}

// 点击会话：切换为当前会话 + 跳到 Chat Tab
function handleSelect(id: string) {
  consoleStore.switchSession(id)
  consoleStore.switchTab('chat')
}

// 重命名：ElMessageBox.prompt 输入新 title
async function handleRename(session: { id: string; title: string }) {
  try {
    const result = await ElMessageBox.prompt('请输入新的会话标题', '重命名会话', {
      inputValue: session.title,
      inputValidator: (val: string) => {
        if (!val || !val.trim()) return '标题不能为空'
        return true
      },
      confirmButtonText: '保存',
      cancelButtonText: '取消',
    })
    const newTitle = (result as { value: string }).value.trim()
    // 直接修改 store 内部 sessions 数组（Pinia 在 composition store 下可直接索引写）
    const target = consoleStore.sessions.find((s) => s.id === session.id)
    if (target) {
      target.title = newTitle
      target.updatedAt = Date.now()
      ElMessage.success('已重命名')
    } else {
      ElMessage.error('会话不存在')
    }
  } catch (err) {
    // 用户取消或输入校验失败（ElMessageBox.prompt 校验失败会 reject）
    if (err instanceof Error) {
      ElMessage.warning(err.message)
    }
  }
}

// 删除：ElMessageBox.confirm 二次确认
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
</script>

<template>
  <div class="console-sessions">
    <div class="sessions-header">
      <h2 class="page-title">监听会话</h2>
      <el-input
        v-model="searchKeyword"
        :prefix-icon="Search"
        placeholder="搜索会话标题"
        clearable
        class="sessions-search"
      />
    </div>

    <el-empty
      v-if="isEmpty"
      :description="searchKeyword ? '没有匹配的会话' : '还没有对话会话'"
      class="sessions-empty"
    />

    <ul v-else class="sessions-list">
      <li
        v-for="session in filteredSessions"
        :key="session.id"
        class="session-row"
        @click="handleSelect(session.id)"
      >
        <div class="session-row__main">
          <el-icon size="18" class="session-row__icon">
            <ChatLineRound />
          </el-icon>
          <div class="session-row__info">
            <div class="session-row__title">{{ session.title }}</div>
            <div class="session-row__meta">
              <span>{{ session.messages.length }} 条消息</span>
              <span class="dot">·</span>
              <span>{{ formatTime(session.updatedAt) }}</span>
            </div>
          </div>
        </div>
        <div class="session-row__actions" @click.stop>
          <el-button
            size="small"
            :icon="Edit"
            plain
            @click="handleRename(session)"
          >
            重命名
          </el-button>
          <el-button
            size="small"
            type="danger"
            :icon="Delete"
            plain
            @click="handleDelete(session)"
          >
            删除
          </el-button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.console-sessions {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sessions-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.sessions-search {
  width: 260px;
  margin-left: auto;
}

.sessions-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sessions-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s;
  margin-bottom: 4px;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &__main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  &__icon {
    color: var(--el-color-primary);
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    gap: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;

    .dot {
      opacity: 0.5;
    }
  }

  &__actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
}
</style>
