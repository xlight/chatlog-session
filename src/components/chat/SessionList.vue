<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSessionStore } from '@/stores/session'
import type { Session } from '@/types'
import SessionItem from './SessionItem.vue'

interface Props {
  searchText?: string
  filterType?: 'all' | 'private' | 'group' | 'official' | 'unknown'
}

const props = withDefaults(defineProps<Props>(), {
  searchText: '',
  filterType: 'all'
})

const emit = defineEmits<{
  select: [session: Session]
}>()

const router = useRouter()
const sessionStore = useSessionStore()

// 加载状态
const loading = ref(false)
const error = ref<string | null>(null)

// 后台刷新状态（无感知刷新）
const silentRefreshing = ref(false)

// 排序方式
const sortType = ref<'time' | 'name' | 'unread'>('time')

// 计算会话列表
const sessionList = computed(() => {
  let list = sessionStore.sessions

  // 按类型筛选
  if (props.filterType === 'private') {
    list = sessionStore.privateSessions
  } else if (props.filterType === 'group') {
    list = sessionStore.groupSessions
  } else if (props.filterType === 'official') {
    list = sessionStore.officialSessions
  } else if (props.filterType === 'unknown') {
    list = sessionStore.unknownSessions
  }

  // 搜索过滤
  if (props.searchText) {
    list = list.filter(session =>
      (session.name || session.talkerName).toLowerCase().includes(props.searchText.toLowerCase())
    )
  }

  // 排序
  return list.sort((a, b) => {
    switch (sortType.value) {
      case 'time':
        return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
      case 'name':
        return (a.name || a.talkerName).localeCompare(b.name || b.talkerName)
      case 'unread':
        return (b.unreadCount || 0) - (a.unreadCount || 0)
      default:
        return 0
    }
  })
})

// 置顶会话
const pinnedSessions = computed(() =>
  sessionList.value.filter((s: Session) => s.isPinned)
)

// 普通会话
const normalSessions = computed(() =>
  sessionList.value.filter((s: Session) => !s.isPinned)
)

// 当前选中的会话
const activeSessionId = computed(() => sessionStore.currentSessionId)

// 加载会话列表（首次加载，显示 loading）
const loadSessions = async () => {
  loading.value = true
  error.value = null

  try {
    await sessionStore.loadSessions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载会话列表失败'
    console.error('加载会话列表失败:', err)
  } finally {
    loading.value = false
  }
}

// 无感知刷新会话列表（后台刷新，不影响 UI）
const silentRefresh = async () => {
  // 如果正在首次加载或已经在刷新，则跳过
  if (loading.value || silentRefreshing.value) {
    return
  }

  silentRefreshing.value = true

  try {
    // 保存当前选中的会话 ID
    const currentId = activeSessionId.value
    
    // 后台加载新数据
    await sessionStore.loadSessions()
    
    // 恢复选中状态（如果之前有选中）
    if (currentId && sessionStore.currentSessionId !== currentId) {
      sessionStore.currentSessionId = currentId
    }
    
    // 清除错误状态（刷新成功）
    error.value = null
  } catch (err) {
    // 静默处理错误，不影响用户操作
    console.warn('后台刷新会话列表失败:', err)
    // 不更新 error 状态，保持界面正常显示
  } finally {
    silentRefreshing.value = false
  }
}

// 选择会话
const handleSelectSession = (session: Session) => {
  sessionStore.currentSessionId = session.id
  emit('select', session)
}

// 处理会话操作菜单
const handleSessionAction = async (command: string, session: Session) => {
  switch (command) {
    case 'pin':
      sessionStore.pinSession(session.talker)
      break
    case 'unpin':
      sessionStore.unpinSession(session.talker)
      break
    case 'read':
      sessionStore.markAsRead(session.talker)
      break
    case 'unread':
      sessionStore.updateSession(session.talker, { unreadCount: 1 })
      break
    case 'delete':
      try {
        await ElMessageBox.confirm(
          '确定要从列表中移除该会话吗？',
          '移除会话',
          {
            confirmButtonText: '移除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        sessionStore.deleteSession(session.talker)
        ElMessage.success('会话已移除')
      } catch {
        // 取消
      }
      break
  }
}

// 刷新列表（根据当前状态选择刷新方式）
const handleRefresh = () => {
  // 如果当前有数据，使用无感知刷新
  if (sessionList.value.length > 0) {
    silentRefresh()
  } else {
    // 如果没有数据，使用常规加载
    loadSessions()
  }
}

// 跳转到设置页面
const goToSettings = () => {
  router.push('/settings')
}

// 切换排序
const handleSortChange = (type: 'time' | 'name' | 'unread') => {
  sortType.value = type
}

// 监听搜索文本变化
watch(() => props.searchText, () => {
  // 可以在这里添加防抖搜索逻辑
})

// 组件挂载时加载数据
onMounted(() => {
  loadSessions()
})

// 暴露方法给父组件
defineExpose({
  refresh: handleRefresh,
  silentRefresh,
  loadSessions
})
</script>

<template>
  <div class="session-list">
    <!-- 工具栏 -->
    <div class="session-list__toolbar">
      <el-dropdown trigger="click" @command="handleSortChange">
        <el-button text size="small">
          <el-icon><Sort /></el-icon>
          <span class="ml-1">排序</span>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="time" :disabled="sortType === 'time'">
              按时间排序
            </el-dropdown-item>
            <el-dropdown-item command="name" :disabled="sortType === 'name'">
              按名称排序
            </el-dropdown-item>
            <el-dropdown-item command="unread" :disabled="sortType === 'unread'">
              按未读排序
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-button text size="small" :loading="silentRefreshing" @click="handleRefresh">
        <el-icon><Refresh /></el-icon>
      </el-button>
      
      <!-- 后台刷新指示器（非侵入式） -->
      <el-tooltip 
        v-if="silentRefreshing && sessionList.length > 0" 
        content="正在刷新..." 
        placement="left"
      >
        <el-icon class="refreshing-indicator" :size="12">
          <Loading />
        </el-icon>
      </el-tooltip>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="session-list__loading">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="session-list__error">
      <el-empty description="加载失败">
        <template #image>
          <el-icon size="48" color="var(--el-color-danger)">
            <CircleClose />
          </el-icon>
        </template>
        <p class="error-message">{{ error }}</p>
        <div class="error-actions">
          <el-button type="primary" @click="handleRefresh">重试</el-button>
          <el-button @click="goToSettings">
            <el-icon><Setting /></el-icon>
            检查 API 设置
          </el-button>
        </div>
        <p class="error-tip">
          请确认 API 地址配置正确，并且服务正常运行
        </p>
      </el-empty>
    </div>

    <!-- 空状态 -->
    <div v-else-if="sessionList.length === 0" class="session-list__empty">
      <el-empty :description="searchText ? '未找到匹配的会话' : '暂无会话'">
        <template #image>
          <el-icon size="48" color="var(--el-text-color-secondary)">
            <ChatLineSquare />
          </el-icon>
        </template>
        <div v-if="!searchText" class="empty-tip">
          <p>请确保 Chatlog API 服务正在运行</p>
          <p class="text-secondary">默认地址: http://127.0.0.1:5030</p>
        </div>
      </el-empty>
    </div>

    <!-- 会话列表 -->
    <div v-else class="session-list__content">
      <!-- 置顶会话 -->
      <div v-if="pinnedSessions.length > 0" class="session-group">
        <div class="session-group__header">
          <span>置顶会话</span>
          <el-tag size="small" type="warning">{{ pinnedSessions.length }}</el-tag>
        </div>
        <SessionItem
          v-for="session in pinnedSessions"
          :key="session.id"
          :session="session"
          :active="session.id === activeSessionId"
          @click="handleSelectSession"
          @action="handleSessionAction"
        />
      </div>

      <!-- 普通会话 -->
      <div v-if="normalSessions.length > 0" class="session-group">
        <div v-if="pinnedSessions.length > 0" class="session-group__header">
          <span>全部会话</span>
          <el-tag size="small">{{ normalSessions.length }}</el-tag>
        </div>
        <SessionItem
          v-for="session in normalSessions"
          :key="session.id"
          :session="session"
          :active="session.id === activeSessionId"
          @click="handleSelectSession"
          @action="handleSessionAction"
        />
      </div>

      <!-- 统计信息 -->
      <div class="session-list__footer">
        <span class="text-secondary">
          共 {{ sessionList.length }} 个会话
          <template v-if="sessionStore.totalUnreadCount > 0">
            · {{ sessionStore.totalUnreadCount }} 条未读
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.session-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .ml-1 {
      margin-left: 4px;
    }
  }

  &__loading,
  &__error,
  &__empty {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  &__error,
  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;

    .error-message {
      margin: 12px 0;
      font-size: 13px;
      color: var(--el-color-danger);
    }

    .error-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 16px;
    }

    .error-tip {
      margin-top: 16px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      line-height: 1.6;
    }

    .empty-tip {
      margin-top: 16px;
      text-align: center;

      p {
        margin: 8px 0;
        font-size: 13px;
        color: var(--el-text-color-regular);
      }

      .text-secondary {
        color: var(--el-text-color-secondary);
      }
    }
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  &__footer {
    padding: 12px 16px;
    text-align: center;
    border-top: 1px solid var(--el-border-color-lighter);
    font-size: 12px;

    .text-secondary {
      color: var(--el-text-color-secondary);
    }
  }
}

.session-group {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
    background-color: var(--el-fill-color-lighter);
    position: sticky;
    top: 0;
    z-index: 1;

    span {
      flex: 1;
    }
  }
}

// 滚动条优化
.session-list__content {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
    }
  }
}

// 后台刷新指示器样式
.refreshing-indicator {
  color: var(--el-color-primary);
  animation: rotating 1s linear infinite;
  margin-left: 8px;
}

@keyframes rotating {
from {
  transform: rotate(0deg);
}
to {
  transform: rotate(360deg);
}
}

.dark-mode {
  .session-list__content {
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }
}
</style>
