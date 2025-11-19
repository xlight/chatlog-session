<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useSessionStore } from '@/stores/session'
import SessionList from '@/components/chat/SessionList.vue'
import MessageList from '@/components/chat/MessageList.vue'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import type { Session } from '@/types'

const appStore = useAppStore()
const sessionStore = useSessionStore()

// 引用
const sessionListRef = ref()
const messageListRef = ref()

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

// 处理会话选择
const handleSessionSelect = (session: Session) => {
  console.log('选中会话:', session)
  // MessageList 会自动监听 sessionId 变化并加载消息
}

// 处理搜索
const handleSearch = (value: string) => {
  searchText.value = value
}



// 刷新数据
const handleRefresh = () => {
  sessionListRef.value?.refresh()
  messageListRef.value?.refresh()
}

// 切换侧边栏（移动端）
const toggleSidebar = () => {
  appStore.toggleSidebar()
}

onMounted(() => {
  // 初始化
})
</script>

<template>
  <div class="chat-page">
    <div class="chat-container">
      <!-- 会话列表区域 -->
      <div class="session-panel" :class="{ 'mobile-show': appStore.isMobile && appStore.sidebarCollapsed }">
        <div class="session-header">
          <div class="session-header__title">
            <h2>聊天</h2>
            <el-tag v-if="sessionStore.totalUnreadCount > 0" size="small">
              {{ sessionStore.totalUnreadCount }}
            </el-tag>
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
      <div class="message-panel">
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
          <!-- 消息头部 -->
          <ChatHeader
            :session="currentSession"
            :show-back="appStore.isMobile"
            @back="toggleSidebar"
            @refresh="handleRefresh"
            @search="() => {}"
            @export="() => {}"
            @info="() => {}"
          />

          <!-- 消息列表 -->
          <MessageList
            ref="messageListRef"
            :session-id="currentSession.id"
            :show-date="true"
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

// 响应式设计
@media (max-width: 768px) {
  .session-panel {
    width: 100%;
    border-right: none;

    &.mobile-show {
      display: flex;
    }
  }

  .message-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
  }

  // 未选中会话时隐藏消息面板
  .message-welcome {
    display: none;
  }
}

// 工具类
.text-secondary {
  color: var(--el-text-color-secondary);
}
</style>
