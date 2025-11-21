<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { useSessionStore } from '@/stores/session'
import { useContactStore } from '@/stores/contact'
import { useChatStore } from '@/stores/chat'
import SessionList from '@/components/chat/SessionList.vue'
import MessageList from '@/components/chat/MessageList.vue'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import MobileNavBar from '@/components/layout/MobileNavBar.vue'
import SearchDialog from '@/components/chat/SearchDialog.vue'
import { useDisplayName } from '@/components/chat/composables'
import type { Session, Message } from '@/types'
import { ElMessage } from 'element-plus'

const appStore = useAppStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()
const chatStore = useChatStore()

// 引用
const sessionListRef = ref()
const messageListComponent = ref()

// 搜索文本
const searchText = ref('')

// 筛选类型
const filterType = ref<'all' | 'private' | 'group' | 'official' | 'unknown' >('all')

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
  defaultName: computed(() => currentSession.value?.name || currentSession.value?.talkerName || '')
})

// 移动端副标题（显示会话类型和消息数）
const mobileSubtitle = computed(() => {
  if (!currentSession.value || !appStore.isMobile) return ''

  const parts: string[] = []

  // 会话类型
  switch (currentSession.value.type) {
    case 'private':
      parts.push('私聊')
      break
    case 'group':
      parts.push('群聊')
      break
    case 'official':
      parts.push('公众号')
      break
  }

  // 显示消息总数
  const messageCount = chatStore.messages.length
  if (messageCount > 0) {
    parts.push(`${messageCount}条消息`)
  }

  return parts.join(' · ')
})

// 自动刷新相关
const autoRefreshTimer = ref<number | null>(null)
const autoRefreshEnabled = ref(false)
const autoRefreshInterval = ref(30)
const isAutoRefreshing = ref(false)

// 处理会话选择
const handleSessionSelect = (session: Session) => {
  console.log('📱 选中会话:', session.id, session.lastTime)
  // 直接使用 session.lastTime 作为时间参数
  currentSessionTime.value = session.lastTime
  
  // 移动端：导航到消息列表页
  if (appStore.isMobile) {
    appStore.navigateToDetail('messageList', { sessionId: session.id })
  }
  // MessageList 会自动监听 sessionId 变化并加载消息
}

// 处理会话列表搜索
const handleSearch = (value: string) => {
  searchText.value = value
}

// 搜索对话框
const searchDialogVisible = ref(false)

// 处理搜索消息（打开搜索对话框）
const handleSearchMessages = () => {
  if (!currentSession.value) {
    ElMessage.warning('请先选择一个会话')
    return
  }

  // 打开搜索对话框
  searchDialogVisible.value = true
}

// 处理搜索结果中的消息点击
const handleSearchMessageClick = (message: Message) => {
  // 如果点击的消息来自不同的会话，先切换会话
  if (message.talker && message.talker !== currentSession.value?.talker) {
    const targetSession = sessionStore.sessions.find((s: Session) => s.talker === message.talker)
    if (targetSession) {
      handleSessionSelect(targetSession)
    }
  }
  
  // 定位到消息
  if (message.id) {
    setTimeout(() => {
      messageListComponent.value?.scrollToMessage(message.id)
    }, 300)
  }
}



// 手动刷新数据（刷新会话列表和消息列表）
const handleRefresh = () => {
  sessionListRef.value?.refresh()
  messageListComponent.value?.refresh()
}

// 只刷新消息列表（移动端消息页面使用）
const handleRefreshMessages = () => {
  messageListComponent.value?.refresh()
}

// 自动刷新数据（只刷新会话列表）
const autoRefresh = () => {
  console.log('🔄 执行自动刷新会话列表...')
  sessionListRef.value?.refresh()
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
  }
  
  if (autoRefreshEnabled.value && autoRefreshInterval.value > 0) {
    console.log(`🔄 启动自动刷新，间隔: ${autoRefreshInterval.value}秒`)
    autoRefreshTimer.value = window.setInterval(() => {
      if (!isAutoRefreshing.value) {
        isAutoRefreshing.value = true
        autoRefresh()
        setTimeout(() => {
          isAutoRefreshing.value = false
        }, 1000)
      }
    }, autoRefreshInterval.value * 1000)
  }
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    console.log('⏸️ 停止自动刷新')
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// 切换自动刷新
const toggleAutoRefresh = () => {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  saveAutoRefreshSettings()
  
  if (autoRefreshEnabled.value) {
    ElMessage.success(`已启用自动刷新（${autoRefreshInterval.value}秒）`)
    startAutoRefresh()
  } else {
    ElMessage.info('已停止自动刷新')
    stopAutoRefresh()
  }
}

// 保存自动刷新设置
const saveAutoRefreshSettings = () => {
  const settings = localStorage.getItem('chatlog-settings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)
      parsed.autoRefresh = autoRefreshEnabled.value
      parsed.autoRefreshInterval = autoRefreshInterval.value
      localStorage.setItem('chatlog-settings', JSON.stringify(parsed))
    } catch (err) {
      console.error('保存自动刷新设置失败:', err)
    }
  }
}

// 加载自动刷新设置
const loadAutoRefreshSettings = () => {
  const settings = localStorage.getItem('chatlog-settings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)
      if (parsed.autoRefresh !== undefined) {
        autoRefreshEnabled.value = parsed.autoRefresh
      }
      if (parsed.autoRefreshInterval !== undefined) {
        autoRefreshInterval.value = parsed.autoRefreshInterval
      }
    } catch (err) {
      console.error('加载自动刷新设置失败:', err)
    }
  }
}

// 监听设置更新事件（从 Settings 页面同步）
const handleSettingsUpdate = (e: Event) => {
  const customEvent = e as CustomEvent
  const newSettings = customEvent.detail
  
  if (newSettings) {
    const oldEnabled = autoRefreshEnabled.value
    const oldInterval = autoRefreshInterval.value
    
    if (newSettings.autoRefresh !== undefined) {
      autoRefreshEnabled.value = newSettings.autoRefresh
    }
    if (newSettings.autoRefreshInterval !== undefined) {
      autoRefreshInterval.value = newSettings.autoRefreshInterval
    }
    
    // 如果设置发生变化，显示提示
    if (oldEnabled !== autoRefreshEnabled.value || oldInterval !== autoRefreshInterval.value) {
      console.log('🔄 自动刷新设置已更新:', {
        enabled: autoRefreshEnabled.value,
        interval: autoRefreshInterval.value
      })
    }
  }
}

// 监听 localStorage 变化（跨标签页同步）
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'chatlog-settings' && e.newValue) {
    try {
      const parsed = JSON.parse(e.newValue)
      handleSettingsUpdate(new CustomEvent('chatlog-settings-updated', { detail: parsed }))
    } catch (err) {
      console.error('处理 storage 变化失败:', err)
    }
  }
}

// 监听设置变化
watch([autoRefreshEnabled, autoRefreshInterval], () => {
  if (autoRefreshEnabled.value) {
    stopAutoRefresh()
    startAutoRefresh()
  }
})

// 切换侧边栏（移动端）
const toggleSidebar = () => {
  appStore.toggleSidebar()
}

// 移动端返回
const handleMobileBack = () => {
  appStore.navigateBack()
}

// 手势相关
const touchStartX = ref(0)
const touchCurrentX = ref(0)
const isDragging = ref(false)
const chatPageRef = ref<HTMLElement | null>(null)

// 处理触摸开始
const handleTouchStart = (e: TouchEvent) => {
  if (!appStore.isMobile || !appStore.showMessageList) return
  
  const touch = e.touches[0]
  touchStartX.value = touch.clientX
  touchCurrentX.value = touch.clientX
  
  // 只在左边缘20px内触发
  if (touch.clientX < 20) {
    isDragging.value = true
  }
}

// 处理触摸移动
const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return
  
  const touch = e.touches[0]
  touchCurrentX.value = touch.clientX
  const deltaX = touchCurrentX.value - touchStartX.value
  
  // 只允许向右滑动
  if (deltaX > 0) {
    e.preventDefault()
    
    if (chatPageRef.value) {
      const panel = chatPageRef.value.querySelector('.message-panel') as HTMLElement
      if (panel) {
        const offset = Math.min(deltaX, window.innerWidth)
        panel.style.transform = `translateX(${offset}px)`
        panel.style.transition = 'none'
      }
    }
  }
}

// 处理触摸结束
const handleTouchEnd = () => {
  if (!isDragging.value) return
  
  const deltaX = touchCurrentX.value - touchStartX.value
  const threshold = window.innerWidth * 0.3
  
  if (chatPageRef.value) {
    const panel = chatPageRef.value.querySelector('.message-panel') as HTMLElement
    if (panel) {
      panel.style.transition = 'transform 0.3s ease-out'
      
      if (deltaX > threshold) {
        // 完成返回
        panel.style.transform = `translateX(100%)`
        setTimeout(() => {
          handleMobileBack()
          panel.style.transform = ''
        }, 300)
      } else {
        // 回弹
        panel.style.transform = ''
      }
    }
  }
  
  isDragging.value = false
  touchStartX.value = 0
  touchCurrentX.value = 0
}

onMounted(async () => {
  // 加载自动刷新设置
  loadAutoRefreshSettings()
  
  // 如果启用了自动刷新，启动定时器
  if (autoRefreshEnabled.value) {
    startAutoRefresh()
  }
  
  // 监听设置更新事件（同一页面内同步）
  window.addEventListener('chatlog-settings-updated', handleSettingsUpdate)
  
  // 监听 localStorage 变化（跨标签页同步）
  window.addEventListener('storage', handleStorageChange)
  
  // 检查数据库中是否有联系人数据
  // 如果为空，自动启动后台加载
  try {
    const { db } = await import('@/utils/db')
    const contactCount = await db.getContactCount()

    if (contactCount === 0 && !contactStore.isBackgroundLoading) {
      console.log('📦 数据库为空，自动启动后台加载联系人...')

      // 启动后台加载
      contactStore.loadContactsInBackground({
        batchSize: 500,
        batchDelay: 100,
        useCache: true
      }).catch(err => {
        console.error('自动后台加载联系人失败:', err)
      })
    } else if (contactCount > 0) {
      console.log(`📦 数据库已有 ${contactCount} 个联系人，无需自动加载`)
    }
  } catch (err) {
    console.error('检查联系人数据失败:', err)
  }
})

onUnmounted(() => {
  // 组件卸载时停止自动刷新
  stopAutoRefresh()
  
  // 移除事件监听
  window.removeEventListener('chatlog-settings-updated', handleSettingsUpdate)
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<template>
  <div 
    ref="chatPageRef"
    class="chat-page" 
    :class="{ 'mobile-page': appStore.isMobile }"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div class="chat-container">
      <!-- 会话列表区域 -->
      <div 
        class="session-panel" 
        :class="{ 
          'mobile-hidden': appStore.isMobile && appStore.showMessageList 
        }"
      >
        <div class="session-header">
          <div class="session-header__title">
            <h2>聊天</h2>
            <el-tag v-if="sessionStore.totalUnreadCount > 0" size="small">
              {{ sessionStore.totalUnreadCount }}
            </el-tag>
            <el-tooltip 
              :content="autoRefreshEnabled ? `自动刷新已启用（${autoRefreshInterval}秒）` : '自动刷新已停用'" 
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
            placeholder="搜索会话"
            prefix-icon="Search"
            clearable
            size="small"
            class="session-search"
            @input="handleSearch"
          />

          <!-- 筛选按钮 -->
          <div class="session-filter">
            <el-radio-group v-model="filterType" size="small">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="private">私聊</el-radio-button>
              <el-radio-button label="group">群聊</el-radio-button>
              <el-radio-button label="official">公众号</el-radio-button>
              <el-radio-button label="unknown">其他</el-radio-button>
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
          'mobile-visible': appStore.isMobile && appStore.showMessageList
        }"
      >
        <!-- 移动端顶部导航栏 -->
        <MobileNavBar
          v-if="appStore.isMobile && currentSession"
          :title="mobileDisplayName || currentSession.remark || currentSession.name || currentSession.talkerName || '聊天'"
          :subtitle="mobileSubtitle"
          :show-back="true"
          :show-refresh="true"
          :show-search="true"
          @back="handleMobileBack"
          @refresh="handleRefreshMessages"
          @search="handleSearchMessages"
        />

        <!-- 未选中会话时的欢迎页 -->
        <div v-if="!currentSession" class="message-welcome">
          <el-result
            icon="success"
            title="Chatlog Session"
            sub-title="微信聊天记录查看器"
          >
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
            @export="() => {}"
            @info="() => {}"
          />

          <!-- 搜索对话框 -->
          <SearchDialog
            v-model="searchDialogVisible"
            :session-id="currentSession?.talker"
            :session-name="currentSession?.name || currentSession?.talkerName || ''"
            @message-click="handleSearchMessageClick"
          />

          <!-- 消息列表 -->
          <MessageList
            ref="messageListComponent"
            :session-id="currentSession.id"
            :show-date="true"
            :initial-time="currentSessionTime"
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
