<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import type { Message } from '@/types'
import MessageBubble from './MessageBubble.vue'

interface Props {
  sessionId?: string
  showDate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sessionId: '',
  showDate: true
})

const chatStore = useChatStore()

// 引用
const messageListRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const error = ref<string | null>(null)

// 当前消息列表
const messages = computed(() => {
  if (!props.sessionId) return []
  return chatStore.messages
})

// 按日期分组的消息
const messagesByDate = computed(() => {
  return chatStore.messagesByDate
})

// 是否显示"加载更多"
const showLoadMore = computed(() => {
  return hasMore.value && messages.value.length > 0 && !loading.value
})

// 加载消息
const loadMessages = async (loadMore = false) => {
  if (!props.sessionId) return

  if (loadMore) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  
  error.value = null

  try {
    const page = loadMore ? chatStore.currentPage + 1 : 1
    await chatStore.loadMessages(props.sessionId, page, loadMore)

    hasMore.value = chatStore.hasMore

    // 如果是首次加载，滚动到底部
    if (!loadMore) {
      await nextTick()
      scrollToBottom()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载消息失败'
    console.error('加载消息失败:', err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多消息
const handleLoadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  // 保存当前滚动位置
  const scrollTop = messageListRef.value?.scrollTop || 0
  const scrollHeight = messageListRef.value?.scrollHeight || 0

  await loadMessages(true)

  // 恢复滚动位置（加载历史消息后保持当前位置）
  await nextTick()
  if (messageListRef.value) {
    const newScrollHeight = messageListRef.value.scrollHeight
    messageListRef.value.scrollTop = scrollTop + (newScrollHeight - scrollHeight)
  }
}

// 滚动到底部
const scrollToBottom = (smooth = false) => {
  if (!messageListRef.value) return

  messageListRef.value.scrollTo({
    top: messageListRef.value.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

// 滚动到指定消息
const scrollToMessage = (messageId: string) => {
  const element = document.getElementById(`message-${messageId}`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // 高亮消息
    element.classList.add('message-highlight')
    setTimeout(() => {
      element.classList.remove('message-highlight')
    }, 2000)
  }
}

// 处理滚动事件
const handleScroll = () => {
  if (!messageListRef.value) return

  const { scrollTop } = messageListRef.value

  // 接近顶部时自动加载更多
  if (scrollTop < 100 && hasMore.value && !loadingMore.value) {
    handleLoadMore()
  }
}

// 刷新消息列表
const handleRefresh = () => {
  hasMore.value = true
  loadMessages(false)
}

// 判断是否显示头像（连续消息优化）
const shouldShowAvatar = (index: number, messages: Message[]) => {
  if (index === messages.length - 1) return true
  
  const current = messages[index]
  const next = messages[index + 1]
  
  // 不同发送者显示头像
  if (current.sender !== next.sender) return true
  
  // 时间间隔超过5分钟显示头像
  const currentTime = current.createTime ? current.createTime * 1000 : new Date(current.time).getTime()
  const nextTime = next.createTime ? next.createTime * 1000 : new Date(next.time).getTime()
  const timeDiff = nextTime - currentTime
  if (timeDiff > 5 * 60 * 1000) return true
  
  return false
}

// 判断是否显示时间
const shouldShowTime = (index: number, messages: Message[]) => {
  if (index === 0) return true
  
  const current = messages[index]
  const prev = messages[index - 1]
  
  // 时间间隔超过5分钟显示时间
  // 使用 createTime（Unix 时间戳秒）或 time（ISO 字符串）
  const currentTime = current.createTime ? current.createTime * 1000 : new Date(current.time).getTime()
  const prevTime = prev.createTime ? prev.createTime * 1000 : new Date(prev.time).getTime()
  const timeDiff = currentTime - prevTime
  return timeDiff > 5 * 60 * 1000
}

// 判断是否显示名称（群聊中）
const shouldShowName = (index: number, messages: Message[]) => {
  if (index === 0) return true
  
  const current = messages[index]
  const prev = messages[index - 1]
  
  // 不同发送者显示名称
  return current.sender !== prev.sender
}

// 监听会话ID变化
watch(() => props.sessionId, (newId) => {
  if (newId) {
    hasMore.value = true
    loadMessages(false)
  }
}, { immediate: true })

// 组件挂载
onMounted(() => {
  if (props.sessionId) {
    loadMessages(false)
  }
})

// 暴露方法给父组件
defineExpose({
  refresh: handleRefresh,
  scrollToBottom,
  scrollToMessage,
  loadMessages
})
</script>

<template>
  <div class="message-list">
    <!-- 加载状态 -->
    <div v-if="loading" class="message-list__loading">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="message-list__error">
      <el-empty description="加载失败">
        <template #image>
          <el-icon size="48" color="var(--el-color-danger)">
            <CircleClose />
          </el-icon>
        </template>
        <p class="error-message">{{ error }}</p>
        <el-button type="primary" @click="handleRefresh">重试</el-button>
      </el-empty>
    </div>

    <!-- 空状态 -->
    <div v-else-if="messages.length === 0" class="message-list__empty">
      <el-empty description="暂无消息">
        <template #image>
          <el-icon size="64" color="var(--el-text-color-secondary)">
            <ChatLineSquare />
          </el-icon>
        </template>
      </el-empty>
    </div>

    <!-- 消息列表 -->
    <div
      v-else
      ref="messageListRef"
      class="message-list__content"
      @scroll="handleScroll"
    >
      <!-- 加载更多按钮 -->
      <div v-if="showLoadMore" class="message-list__load-more">
        <el-button
          text
          :loading="loadingMore"
          @click="handleLoadMore"
        >
          {{ loadingMore ? '加载中...' : '加载更多消息' }}
        </el-button>
      </div>

      <!-- 没有更多消息提示 -->
      <div v-else-if="messages.length > 0 && !hasMore" class="message-list__no-more">
        <el-divider>没有更多消息了</el-divider>
      </div>

      <!-- 按日期分组显示 -->
      <template v-if="showDate">
        <div
          v-for="(group, date) in messagesByDate"
          :key="date"
          class="message-group"
        >
          <!-- 日期分隔符 -->
          <div class="message-date">
            <span>{{ date }}</span>
          </div>

          <!-- 消息列表 -->
          <MessageBubble
            v-for="(message, index) in group"
            :id="`message-${message.id}`"
            :key="message.id"
            :message="message"
            :show-avatar="shouldShowAvatar(index, group)"
            :show-time="shouldShowTime(index, group)"
            :show-name="shouldShowName(index, group)"
          />
        </div>
      </template>

      <!-- 不分组显示 -->
      <template v-else>
        <MessageBubble
          v-for="(message, index) in messages"
          :id="`message-${message.id}`"
          :key="message.id"
          :message="message"
          :show-avatar="shouldShowAvatar(index, messages)"
          :show-time="shouldShowTime(index, messages)"
          :show-name="shouldShowName(index, messages)"
        />
      </template>
    </div>

    <!-- 滚动到底部按钮 -->
    <transition name="fade">
      <div
        v-show="messages.length > 0"
        class="message-list__scroll-bottom"
      >
        <el-button
          circle
          size="small"
          @click="scrollToBottom(true)"
        >
          <el-icon><ArrowDown /></el-icon>
        </el-button>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.message-list {
  position: relative;
  height: 100%;
  background-color: var(--el-bg-color-page);

  &__loading,
  &__error,
  &__empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  &__error {
    .error-message {
      margin: 12px 0;
      font-size: 13px;
      color: var(--el-color-danger);
    }
  }

  &__content {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px 0;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;

      &:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    }
  }

  &__load-more,
  &__no-more {
    text-align: center;
    padding: 16px;
  }

  &__load-more {
    .el-button {
      font-size: 13px;
      color: var(--el-text-color-secondary);

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }

  &__no-more {
    .el-divider {
      margin: 0;
      
      :deep(.el-divider__text) {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        background-color: var(--el-bg-color-page);
      }
    }
  }

  &__scroll-bottom {
    position: absolute;
    bottom: 24px;
    right: 24px;
    z-index: 10;

    .el-button {
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      background-color: var(--el-bg-color);

      &:hover {
        background-color: var(--el-bg-color);
      }
    }
  }
}

.message-group {
  margin-bottom: 16px;
}

.message-date {
  text-align: center;
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 1;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.8);

  span {
    display: inline-block;
    padding: 4px 12px;
    background-color: var(--el-fill-color-light);
    border-radius: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

// 消息高亮动画
:deep(.message-highlight) {
  animation: highlight 0.5s ease-in-out;
}

@keyframes highlight {
  0%, 100% {
    background-color: transparent;
  }
  50% {
    background-color: var(--el-color-primary-light-9);
  }
}

// 淡入淡出动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 暗色模式
.dark-mode {
  .message-list {
    &__content {
      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }
  }

  .message-date {
    background-color: rgba(0, 0, 0, 0.3);
  }

  @keyframes highlight {
    0%, 100% {
      background-color: transparent;
    }
    50% {
      background-color: rgba(64, 158, 255, 0.2);
    }
  }
}
</style>