<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { useSessionStore } from '@/stores/session'
import { useChatMessagesStore } from '@/stores/chatMessages'
import { useSettingsStore } from '@/stores/settings'
import { useAutoRefreshManager } from '@/composables/useAutoRefreshManager'
import { useMobileGesture } from '@/composables/useMobileGesture'
import { useMobileSessionInfo } from '@/composables/useMobileSessionInfo'
import { useSessionDetail } from '@/composables/useSessionDetail'
import { useMessageSearch } from '@/composables/useMessageSearch'
import { useContactAutoLoad } from '@/composables/useContactAutoLoad'
import SessionList from '@/components/chat/SessionList.vue'
import MessageList from '@/components/chat/MessageList.vue'
import SendBox from '@/components/chat/SendBox.vue'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import MobileNavBar from '@/components/layout/MobileNavBar.vue'
import SearchDialog from '@/components/chat/SearchDialog.vue'
import ContactDetail from '@/views/Contact/ContactDetail.vue'
import ChatExportDialog from '@/components/chat/ChatExportDialog.vue'
import { useDisplayName } from '@/components/chat/composables'
import type { Session, SessionFilterType } from '@/types'

const appStore = useAppStore()
const sessionStore = useSessionStore()
const chatMessagesStore = useChatMessagesStore()
const settingsStore = useSettingsStore()

// 引用
const sessionListRef = ref()
const messageListComponent = ref()

// 移动端手势管理器
const { bindGestureEvents, unbindGestureEvents } = useMobileGesture()

// 自动刷新管理器
const {
  autoRefreshEnabled,
  autoRefreshInterval,
  toggleAutoRefresh,
  init: initAutoRefresh,
  cleanup: cleanupAutoRefresh,
} = useAutoRefreshManager(sessionListRef)

// 搜索文本
const searchText = ref('')

// 筛选类型
const filterType = ref<SessionFilterType>('chat')

// 导出对话框可见性
const showExportDialog = ref(false)

// 导出中状态（用于 beforeunload 提示）
const isExporting = ref(false)

// 当前选中的会话
const currentSession = computed(() => {
  const id = sessionStore.currentSessionId
  if (!id) return null
  return sessionStore.sessions.find((s: Session) => s.id === id) || null
})

// 当前会话的初始时间（用于消息加载）
const currentSessionTime = ref<string | undefined>(undefined)

// 使用 displayName composable 获取移动端显示名称
const { displayName: mobileDisplayName } = useDisplayName({
  id: computed(() => currentSession.value?.id),
  defaultName: computed(() => currentSession.value?.name || currentSession.value?.talkerName || ''),
})

// 处理会话选择
const handleSessionSelect = (session: Session) => {
  // 直接使用 session.lastTime 作为时间参数
  currentSessionTime.value = session.lastTime

  // 移动端：导航到消息列表页
  if (appStore.isMobile) {
    appStore.navigateToDetail('messageList', { sessionId: session.id })
  }
  // MessageList 会自动监听 sessionId 变化并加载消息
}

// 移动端会话信息管理器
const { mobileSubtitle } = useMobileSessionInfo(() => currentSession.value)

// 会话详情管理器
const {
  sessionDetailDrawerVisible,
  sessionDetailContactId,
  sessionDetailDrawerTitle,
  handleShowSessionDetail,
} = useSessionDetail(() => currentSession.value)

// 消息搜索管理器
const { searchDialogVisible, handleSearchMessages, handleSearchMessageClick } = useMessageSearch(
  () => currentSession.value,
  handleSessionSelect,
  (messageId: string) => {
    setTimeout(() => {
      messageListComponent.value?.scrollToMessage(messageId)
    }, 300)
  }
)

// 联系人自动加载管理器
const { initAutoLoad } = useContactAutoLoad()

// 自动刷新相关 - 已移动到 useAutoRefreshManager composable

// 处理会话列表搜索
const handleSearch = (value: string) => {
  searchText.value = value
}

// 搜索对话框、会话详情抽屉等逻辑已移动到对应的 composable

// 手动刷新数据（刷新会话列表和消息列表）
const handleRefresh = () => {
  //sessionListRef.value?.refresh()
  messageListComponent.value?.refresh()
}

// 只刷新消息列表（移动端消息页面使用）
const handleRefreshMessages = () => {
  messageListComponent.value?.refresh()
}

// 自动刷新相关 - 已移动到 useAutoRefreshManager composable

// 切换侧边栏（移动端）
const toggleSidebar = () => {
  appStore.toggleSidebar()
}

// 移动端返回
const handleMobileBack = () => {
  appStore.navigateBack()
}

// 处理导出聊天记录
const handleExport = () => {
  if (!currentSession.value) {
    ElMessage.warning('请先选择一个会话')
    return
  }
  showExportDialog.value = true
}

// 处理导出完成
const handleExportSuccess = () => {
  isExporting.value = false
}

// 处理导出对话框关闭
const handleExportClose = () => {
  isExporting.value = false
}

// beforeunload 事件处理器
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isExporting.value) {
    e.preventDefault()
    e.returnValue = '正在导出聊天记录，确定要离开吗？'
    return e.returnValue
  }
}

// 手势相关 - 已移动到 useMobileGesture composable

onMounted(async () => {
  // 初始化 chatStore（缓存、自动刷新、事件监听）
  chatMessagesStore.init()

  // 初始化 sessionStore（本地置顶数据）
  sessionStore.init()

  // 初始化自动刷新管理器
  initAutoRefresh()

  // 绑定移动端手势事件
  if (appStore.isMobile) {
    const chatPageElement = document.querySelector('.chat-page') as HTMLElement
    if (chatPageElement) {
      bindGestureEvents(chatPageElement)
    }
  }

  // 初始化联系人自动加载
  initAutoLoad()

  // 添加 beforeunload 事件监听
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  // 清理自动刷新管理器
  cleanupAutoRefresh()

  // 解绑移动端手势事件
  unbindGestureEvents()

  // 清理 chatMessagesStore 事件监听器
  chatMessagesStore.cleanup()

  // 移除 beforeunload 事件监听
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="chat-page" :class="{ 'mobile-page': appStore.isMobile }">
    <div class="chat-container">
      <!-- 会话列表区域 -->
      <div
        class="session-panel"
        :class="{
          'mobile-hidden': appStore.isMobile && appStore.showMessageList,
        }"
      >
        <div class="session-header">
          <div class="session-header__title">
            <h2>聊天</h2>
            <el-tag v-if="sessionStore.totalUnreadCount > 0" size="small">
              {{ sessionStore.totalUnreadCount }}
            </el-tag>
            <el-tooltip
              :content="
                autoRefreshEnabled ? `自动刷新已启用（${autoRefreshInterval}秒）` : '自动刷新已停用'
              "
              placement="bottom"
            >
              <el-button
                :type="autoRefreshEnabled ? 'primary' : 'default'"
                :icon="autoRefreshEnabled ? 'VideoPlay' : 'VideoPause'"
                size="small"
                circle
                @click="toggleAutoRefresh"
              />
            </el-tooltip>
          </div>

          <!-- 搜索框 -->
          <el-input
            v-model="searchText"
            placeholder="搜索会话、备注、群名、微信号、最近消息"
            prefix-icon="Search"
            clearable
            size="small"
            class="session-search"
            @input="handleSearch"
          />

          <!-- 筛选按钮 -->
          <div class="session-filter">
            <el-radio-group v-model="filterType" size="small">
              <el-radio-button value="chat">聊天</el-radio-button>
              <el-radio-button value="private">私聊</el-radio-button>
              <el-radio-button value="group">群聊</el-radio-button>
              <el-radio-button value="official">公众号</el-radio-button>
              <el-radio-button value="all">全部</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 会话列表 -->
        <SessionList
          ref="sessionListRef"
          :search-text="searchText"
          :filter-type="filterType"
          @select="handleSessionSelect"
        />
      </div>

      <!-- 消息区域 -->
      <div
        class="message-panel"
        :class="{
          'mobile-visible': appStore.isMobile && appStore.showMessageList,
        }"
      >
        <!-- 移动端顶部导航栏 -->
        <MobileNavBar
          v-if="appStore.isMobile && currentSession"
          :title="
            mobileDisplayName ||
            currentSession.remark ||
            currentSession.name ||
            currentSession.talkerName ||
            '聊天'
          "
          :subtitle="mobileSubtitle"
          :show-back="true"
          :show-refresh="true"
          :show-search="true"
          :show-more="true"
          @back="handleMobileBack"
          @refresh="handleRefreshMessages"
          @search="handleSearchMessages"
          @more="handleShowSessionDetail"
        />

        <!-- 未选中会话时的欢迎页 -->
        <div v-if="!currentSession" class="message-welcome">
          <el-result icon="success" title="Chatlog Session" sub-title="微信聊天记录查看器">
            <template #icon>
              <el-icon size="80" color="var(--el-color-primary)">
                <ChatLineSquare />
              </el-icon>
            </template>
            <template #extra>
              <el-space direction="vertical" alignment="center" :size="16">
                <div class="welcome-features">
                  <el-tag type="success" effect="plain">✅ 浏览聊天记录</el-tag>
                  <el-tag type="info" effect="plain">🔍 搜索消息内容</el-tag>
                  <el-tag type="warning" effect="plain">📁 导出聊天数据</el-tag>
                  <el-tag effect="plain">🎨 深色模式支持</el-tag>
                </div>
                <div class="welcome-tip">
                  <p>👈 从左侧选择一个会话开始浏览</p>
                </div>
              </el-space>
            </template>
          </el-result>
        </div>

        <!-- 已选中会话时显示消息 -->
        <template v-else>
          <!-- 消息头部（PC端） -->
          <ChatHeader
            v-if="!appStore.isMobile"
            :session="currentSession"
            :show-back="false"
            @back="toggleSidebar"
            @refresh="handleRefresh"
            @search="handleSearchMessages"
            @export="handleExport"
            @info="handleShowSessionDetail"
          />

          <!-- 搜索对话框 -->
          <SearchDialog
            v-model="searchDialogVisible"
            :session-id="currentSession?.talker"
            :session-name="currentSession?.name || currentSession?.talkerName || ''"
            @message-click="handleSearchMessageClick"
          />

          <!-- 导出对话框 -->
          <ChatExportDialog
            v-model:visible="showExportDialog"
            :session-id="currentSession?.talker"
            :session-name="currentSession?.name || currentSession?.talkerName || ''"
            @close="handleExportClose"
            @success="handleExportSuccess"
          />

          <!-- 会话详情抽屉 -->
          <el-drawer
            v-model="sessionDetailDrawerVisible"
            :title="sessionDetailDrawerTitle"
            :size="appStore.isMobile ? '100%' : '500px'"
            direction="rtl"
          >
            <ContactDetail
              v-if="sessionDetailDrawerVisible && sessionDetailContactId"
              :contact-id="sessionDetailContactId"
              :session="currentSession"
              :hide-nav-bar="true"
            />
          </el-drawer>

          <!-- 消息列表 -->
          <div class="message-list-wrapper">
            <MessageList
              ref="messageListComponent"
              :session-id="currentSession.id"
              :show-date="true"
              :initial-time="currentSessionTime"
            />
          </div>

          <!-- 消息发送框 -->
          <SendBox
            v-if="settingsStore.sendmsg.enabled"
            :session="currentSession"
            @refresh="handleRefreshMessages"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-page {
  width: 100%;
  height: 100%;
  background-color: var(--el-bg-color);
}

.chat-container {
  display: flex;
  width: 100%;
  height: 100%;
}

// 会话面板
.session-panel {
  width: 320px;
  height: 100%;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.3s ease-out;

  .session-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;

    &__title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      h2 {
        font-size: 20px;
        font-weight: 600;
      }
    }

    .session-search {
      margin-bottom: 12px;
    }

    .session-filter {
      :deep(.el-radio-group) {
        width: 100%;

        .el-radio-button {
          flex: 1;

          .el-radio-button__inner {
            width: 100%;
          }
        }
      }
    }
  }
}

// 消息面板
.message-panel {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  min-width: 0;
  transition: transform 0.3s ease-out;

  .message-list-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .message-welcome {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;

    .welcome-features {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .welcome-tip {
      margin-top: 16px;
      text-align: center;

      p {
        font-size: 14px;
        color: var(--el-text-color-regular);
      }
    }
  }
}

// 移动端页面
.mobile-page {
  .chat-container {
    position: relative;
    height: 100%;
  }

  .session-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    border-right: none;
    z-index: 1;
    transform: translateX(0);

    &.mobile-hidden {
      transform: translateX(-100%);
    }
  }

  .message-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    z-index: 2;
    transform: translateX(100%);

    &.mobile-visible {
      transform: translateX(0);
    }
  }

  // 移动端隐藏欢迎页
  .message-welcome {
    display: none;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .session-panel {
    width: 100%;
    border-right: none;
  }

  .message-panel {
    width: 100%;
  }
}

// 工具类
.text-secondary {
  color: var(--el-text-color-secondary);
}
</style>
