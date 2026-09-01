<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSessionStore } from '@/stores/session'
import { useAutoRefreshStore } from '@/stores/autoRefresh'
import { useAppStore } from '@/stores/app'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { Session, SessionFilterType } from '@/types'
import SessionItem from './SessionItem.vue'

interface Props {
  searchText?: string
  filterType?: SessionFilterType
}

const props = withDefaults(defineProps<Props>(), {
  searchText: '',
  filterType: 'all',
})

const emit = defineEmits<{
  select: [session: Session]
}>()

const router = useRouter()
const sessionStore = useSessionStore()
const autoRefreshStore = useAutoRefreshStore()
const appStore = useAppStore()

// 后台刷新状态（无感知刷新）
const silentRefreshing = ref(false)

// 置顶会话折叠状态
const isPinnedCollapsed = ref(false)

// 同步 props 到 store
watch(
  () => props.filterType,
  val => {
    sessionStore.setFilterType(val)
  },
  { immediate: true }
)

watch(
  () => props.searchText,
  val => {
    sessionStore.setSearchKeyword(val)
  },
  { immediate: true }
)

// 直接使用 store 的计算属性和状态
const sessionList = computed(() => sessionStore.filteredSessions)
const isSearchMode = computed(() => sessionStore.isSearchMode)
const currentSessionFilteredOut = computed(() => {
  if (!isSearchMode.value || !sessionStore.currentSessionId) {
    return false
  }

  return !sessionList.value.some(session => {
    return (
      session.id === sessionStore.currentSessionId ||
      session.talker === sessionStore.currentSessionId
    )
  })
})

// 加载会话列表（首次加载，显示 loading）
const loadSessions = async () => {
  try {
    await sessionStore.loadSessions()
  } catch (err) {
    console.error('加载会话列表失败:', err)
  }
}

// 无感知刷新会话列表（后台刷新，不影响 UI）
const silentRefresh = async () => {
  // 如果正在首次加载或已经在刷新，则跳过
  if (sessionStore.loading || silentRefreshing.value) {
    return
  }

  silentRefreshing.value = true

  try {
    // 保存当前选中的会话 ID
    const currentId = sessionStore.currentSessionId

    // 后台加载新数据
    await sessionStore.loadSessions()

    // 恢复选中状态（如果之前有选中）
    if (currentId && sessionStore.currentSessionId !== currentId) {
      sessionStore.currentSessionId = currentId
    }

    // 清除错误状态（刷新成功）
    sessionStore.clearError()
  } catch (err) {
    // 静默处理错误，不影响用户操作
    console.warn('后台刷新会话列表失败:', err)
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
        await ElMessageBox.confirm('确定要从列表中移除该会话吗？', '移除会话', {
          confirmButtonText: '移除',
          cancelButtonText: '取消',
          type: 'warning',
        })
        sessionStore.deleteSession(session.talker)
        ElMessage.success('会话已移除')
      } catch {
        // 取消
      }
      break
  }
}

// 刷新列表（等同于一次自动刷新周期）
const handleRefresh = async () => {
  // 如果当前有数据，使用无感知刷新
  if (sessionStore.hasSessions) {
    await silentRefresh()
  } else {
    // 如果没有数据，使用常规加载
    await loadSessions()
  }

  // 检测需要刷新消息的会话（与自动刷新一致）
  if (autoRefreshStore.config.enabled) {
    try {
      await autoRefreshStore.detectNeedsRefresh()

      const needsRefreshCount = autoRefreshStore.needsRefreshTalkers.length
      if (appStore.isDebug && needsRefreshCount > 0) {
        ElMessage.info({
          message: `正在后台刷新 ${needsRefreshCount} 个会话的消息...`,
          duration: 2000,
        })
      }
    } catch (error) {
      console.error('❌ 检测需要刷新的会话失败:', error)
    }
  }
}

// 自动刷新（等同于手动刷新按钮）
const autoRefresh = async () => {
  await handleRefresh()
}

// 跳转到设置页面
const goToSettings = () => {
  router.push('/settings')
}

// 切换排序
const handleSortChange = (type: 'time' | 'name' | 'unread') => {
  sessionStore.setSortBy(type)
}

// ==================== 虚拟滚动（unpinnedSessions）====================
const scrollRef = ref<HTMLElement | null>(null)
const unpinnedSessions = computed(() => sessionStore.unpinnedSessions)

const virtualizer = useVirtualizer(computed(() => ({
  count: unpinnedSessions.value.length,
  getScrollElement: () => scrollRef.value,
  estimateSize: () => 64, // SessionItem 估计高度
  overscan: 4,
})))

// 搜索切换时重置虚拟列表滚动位置
watch(isSearchMode, () => {
  virtualizer.value.scrollToIndex(0)
})

// 组件挂载时加载数据
onMounted(() => {
  if (!sessionStore.hasSessions) {
    loadSessions()
  }
})

// 暴露方法给父组件
defineExpose({
  refresh: handleRefresh,
  silentRefresh,
  loadSessions,
  autoRefresh,
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
            <el-dropdown-item command="time" :disabled="sessionStore.sortBy === 'time'">
              按时间排序
            </el-dropdown-item>
            <el-dropdown-item command="name" :disabled="sessionStore.sortBy === 'name'">
              按名称排序
            </el-dropdown-item>
            <el-dropdown-item command="unread" :disabled="sessionStore.sortBy === 'unread'">
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
        v-if="silentRefreshing && sessionStore.hasSessions"
        content="正在刷新..."
        placement="left"
      >
        <el-icon class="refreshing-indicator" :size="12">
          <Loading />
        </el-icon>
      </el-tooltip>
    </div>

    <!-- 加载状态 -->
    <div v-if="!silentRefreshing && sessionStore.loading" class="session-list__loading">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="sessionStore.error" class="session-list__error">
      <el-empty description="加载失败">
        <template #image>
          <el-icon size="48" color="var(--el-color-danger)">
            <CircleClose />
          </el-icon>
        </template>
        <p class="error-message">{{ sessionStore.error?.message || '加载会话列表失败' }}</p>
        <div class="error-actions">
          <el-button type="primary" @click="handleRefresh">重试</el-button>
          <el-button @click="goToSettings">
            <el-icon><Setting /></el-icon>
            检查 API 设置
          </el-button>
        </div>
        <p class="error-tip">请确认 API 地址配置正确，并且服务正常运行</p>
      </el-empty>
    </div>

    <!-- 空状态 -->
    <div v-else-if="sessionList.length === 0" class="session-list__empty">
      <el-empty :description="sessionStore.searchKeyword ? '没有找到匹配的会话' : '暂无会话'">
        <template #image>
          <el-icon size="48" color="var(--el-text-color-secondary)">
            <ChatLineSquare />
          </el-icon>
        </template>
        <div v-if="!sessionStore.searchKeyword" class="empty-tip">
          <p>请确保 Chatlog API 服务正在运行</p>
          <p class="text-secondary">默认地址: http://127.0.0.1:5030</p>
        </div>
        <div v-else class="empty-tip">
          <p>可尝试搜索备注、昵称、群名、微信号或最近一条消息内容</p>
          <p v-if="sessionStore.searchIndexIncomplete" class="text-secondary">
            联系人信息仍在后台加载，部分结果可能稍后出现
          </p>
        </div>
      </el-empty>
    </div>

    <!-- 会话列表 -->
    <div v-else ref="scrollRef" class="session-list__content">
      <div v-if="isSearchMode" class="session-list__search-meta">
        <span>匹配到 {{ sessionStore.searchResultCount }} 个会话</span>
        <span v-if="sessionStore.searchIndexIncomplete" class="text-secondary">
          联系人信息仍在后台加载，结果可能继续补全
        </span>
      </div>

      <div v-if="currentSessionFilteredOut" class="session-list__search-tip">
        当前会话未匹配本次搜索，右侧消息仍保持打开
      </div>

      <template v-if="isSearchMode">
        <SessionItem
          v-for="session in sessionList"
          :key="session.id"
          :session="session"
          :active="
            session.id === sessionStore.currentSessionId ||
            session.talker === sessionStore.currentSessionId
          "
          @click="handleSelectSession"
          @action="handleSessionAction"
        />
      </template>

      <template v-else>
        <!-- 置顶会话 -->
        <div v-if="sessionStore.pinnedSessions.length > 0" class="session-group">
          <div
            class="session-group__header clickable"
            @click="isPinnedCollapsed = !isPinnedCollapsed"
          >
            <div class="header-left">
              <el-icon class="collapse-icon" :class="{ 'is-collapsed': isPinnedCollapsed }">
                <CaretBottom />
              </el-icon>
              <span>置顶会话</span>
            </div>
            <el-tag size="small" type="warning">{{ sessionStore.pinnedSessions.length }}</el-tag>
          </div>
          <div v-show="!isPinnedCollapsed" class="session-group__pinned-list">
            <SessionItem
              v-for="session in sessionStore.pinnedSessions"
              :key="session.id"
              :session="session"
              :active="
                session.id === sessionStore.currentSessionId ||
                session.talker === sessionStore.currentSessionId
              "
              @click="handleSelectSession"
              @action="handleSessionAction"
            />
          </div>
        </div>

        <!-- 普通会话（虚拟滚动） -->
        <div v-if="unpinnedSessions.length > 0" class="session-group">
          <div v-if="sessionStore.pinnedSessions.length > 0" class="session-group__header">
            <span>全部会话</span>
            <el-tag size="small">{{ unpinnedSessions.length }}</el-tag>
          </div>
          <div
            :style="{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }"
          >
            <div
              v-for="virtualRow in virtualizer.getVirtualItems()"
              :key="unpinnedSessions[virtualRow.index]!.id"
              :style="{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }"
            >
              <SessionItem
                :session="unpinnedSessions[virtualRow.index]!"
                :active="
                  unpinnedSessions[virtualRow.index]!.id === sessionStore.currentSessionId ||
                  unpinnedSessions[virtualRow.index]!.talker === sessionStore.currentSessionId
                "
                @click="handleSelectSession"
                @action="handleSessionAction"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- 统计信息 -->
      <div class="session-list__footer">
        <span class="text-secondary">
          <template v-if="isSearchMode">
            搜索结果 {{ sessionStore.searchResultCount }} 个
          </template>
          <template v-else> 共 {{ sessionStore.filteredSessions.length }} 个会话 </template>
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

  &__search-meta,
  &__search-tip {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 16px;
    font-size: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__search-meta {
    color: var(--el-text-color-regular);
    background-color: var(--el-fill-color-lighter);
  }

  &__search-tip {
    color: var(--el-color-warning);
    background-color: rgba(230, 162, 60, 0.08);
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

    &.clickable {
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--el-fill-color);
      }
    }

    .header-left {
      display: flex;
      align-items: center;
      flex: 1;
      gap: 4px;
    }

    .collapse-icon {
      transition: transform 0.2s;
      font-size: 12px;

      &.is-collapsed {
        transform: rotate(-90deg);
      }
    }
  }

  // 置顶会话列表兜底：max-height + overflow-y:auto 防止过多置顶项撑高
  &__pinned-list {
    max-height: 40vh;
    overflow-y: auto;
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

html.dark {
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
