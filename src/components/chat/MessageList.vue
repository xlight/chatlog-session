<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import type { Message } from '@/types'
import MessageBubble from './MessageBubble.vue'

interface Props {
  sessionId?: string
  showDate?: boolean
  initialTime?: string
}

const props = withDefaults(defineProps<Props>(), {
  sessionId: '',
  showDate: true,
  initialTime: undefined
})

const chatStore = useChatStore()

// 引用
const messageListRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const loadingHistory = ref(false)
const hasMoreHistory = ref(true)
const error = ref<string | null>(null)
const historyLoadMessage = ref('')

// 历史消息加载的上下文（用于同一时间范围内的分页）
const historyLoadContext = ref<{
  timeRange: string
  offset: number
  beforeTime: string | number
} | null>(null)

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
  return hasMoreHistory.value && messages.value.length > 0 && !loading.value
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
    const beforeCount = messages.value.length

    await chatStore.loadMessages(props.sessionId, page, loadMore, props.initialTime)

    // 计算本次实际加载的消息数
    const loadedCount = messages.value.length - beforeCount

    // 如果是首次加载，滚动到底部
    if (!loadMore) {
      await nextTick()
      // 使用多次延迟确保 DOM 完全渲染后再滚动
      setTimeout(() => {
        scrollToBottom()
        // 再次确保滚动到底部（处理图片等异步加载）
        setTimeout(() => {
          scrollToBottom()
          // 检查是否需要继续加载
          checkAndLoadMore(loadedCount)
        }, 200)
      }, 50)
    } else {
      // 加载更多后也检查是否需要继续
      await nextTick()
      setTimeout(() => {
        checkAndLoadMore(loadedCount)
      }, 100)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载消息失败'
    console.error('加载消息失败:', err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多消息（加载更旧的历史消息）
const handleLoadMore = async () => {
  if (loadingHistory.value || !hasMoreHistory.value || messages.value.length === 0) {
    return
  }

  loadingHistory.value = true

  try {
    // 保存当前滚动位置
    const scrollTop = messageListRef.value?.scrollTop || 0
    const scrollHeight = messageListRef.value?.scrollHeight || 0

    // 判断是继续在同一时间范围内加载，还是加载更早的时间范围
    let beforeTime: string | number
    let offset: number = 0

    if (historyLoadContext.value && historyLoadContext.value.timeRange) {
      // 继续在同一时间范围内加载下一页
      beforeTime = historyLoadContext.value.beforeTime
      offset = historyLoadContext.value.offset
      console.log('📄 Continue loading in same time range:', {
        timeRange: historyLoadContext.value.timeRange,
        offset
      })
    } else {
      // 首次加载或加载更早的时间范围
      const oldestMessage = messages.value[0]
      beforeTime = oldestMessage.time || oldestMessage.createTime

      if (!beforeTime) {
        console.warn('无法获取最早消息时间')
        return
      }

      offset = 0
      console.log('🔍 Load new time range, beforeTime:', beforeTime)
    }

    // 调用 store 的历史消息加载方法
    const result = await chatStore.loadHistoryMessages(props.sessionId, beforeTime, offset)

    // 更新历史加载提示消息
    historyLoadMessage.value = chatStore.historyLoadMessage

    // 如果加载到消息，恢复滚动位置
    if (result.messages.length > 0) {
      await nextTick()
      if (messageListRef.value) {
        const newScrollHeight = messageListRef.value.scrollHeight
        const heightDiff = newScrollHeight - scrollHeight
        messageListRef.value.scrollTop = scrollTop + heightDiff
      }
    }

    // 更新 hasMoreHistory 状态和加载上下文
    if (result.messages.length === 0 && !chatStore.historyLoadMessage) {
      // 确实没有更多消息了（多次重试后仍无消息）
      hasMoreHistory.value = false
      historyLoadContext.value = null
    } else if (chatStore.historyLoadMessage) {
      // 有提示信息时，清空上下文，允许用户继续下拉加载更早的时间范围
      hasMoreHistory.value = true
      historyLoadContext.value = null
    } else {
      // 加载到了消息
      // 注意：即使当前时间范围加载完了，仍然可以加载更早的时间范围
      // 所以 hasMoreHistory 应该始终为 true（除非真的到了最早的消息）
      hasMoreHistory.value = true

      if (result.hasMore && result.timeRange) {
        // 当前时间范围还有更多，保存上下文用于继续分页
        historyLoadContext.value = {
          timeRange: result.timeRange,
          offset: result.offset,
          beforeTime: beforeTime
        }
        console.log('💾 Save context for pagination:', {
          timeRange: result.timeRange,
          offset: result.offset
        })
      } else {
        // 当前时间范围已加载完毕，清空上下文
        // 下次触发时会加载更早的时间范围
        historyLoadContext.value = null
        console.log('🔚 Current time range completed, ready for earlier range')
      }
    }

    // 如果返回了满载（等于 pageSize），自动继续加载同一时间范围的下一页
    if (result.messages.length > 0 && result.hasMore && result.messages.length >= chatStore.pageSize) {
      console.log('🔄 Auto continuing in same time range...', {
        loaded: result.messages.length,
        pageSize: chatStore.pageSize,
        nextOffset: result.offset,
        timeRange: result.timeRange
      })
      
      // 等待一小段时间后继续加载
      await nextTick()
      setTimeout(() => {
        if (!loadingHistory.value && hasMoreHistory.value && historyLoadContext.value) {
          handleLoadMore()
        }
      }, 100)
    }
  } catch (err) {
    console.error('加载历史消息失败:', err)
    historyLoadContext.value = null
  } finally {
    loadingHistory.value = false
  }
}

// 检查并自动加载更多（如果本次加载数量等于pageSize）
const checkAndLoadMore = async (loadedCount: number) => {
  if (!chatStore.hasMore || loadingMore.value || loading.value) {
    return
  }

  // 策略：如果本次加载的消息数等于pageSize，说明可能还有更多消息，继续加载
  const pageSize = chatStore.pageSize
  if (loadedCount === pageSize) {
    console.log('🔄 Auto loading more messages...', {
      loadedCount,
      pageSize,
      totalMessages: messages.value.length
    })

    await handleLoadMore()
  } else {
    console.log('✅ Loading complete', {
      loadedCount,
      pageSize,
      totalMessages: messages.value.length,
      reason: loadedCount < pageSize ? 'Reached end' : 'Manual stop'
    })
  }
}

// 滚动到底部
const scrollToBottom = (smooth = false) => {
  if (!messageListRef.value) return

  // 使用一个很大的数值确保滚动到底部
  const containerScrollHeight = messageListRef.value.scrollHeight
  const maxScroll = containerScrollHeight + 10000

  messageListRef.value.scrollTo({
    top: maxScroll,
    behavior: smooth ? 'smooth' : 'auto'
  })

  // 双保险：直接设置 scrollTop
  if (!smooth) {
    messageListRef.value.scrollTop = maxScroll
  }
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

// 处理滚动事件（防抖）
let scrollTimer: ReturnType<typeof setTimeout> | null = null
const handleScroll = () => {
  if (!messageListRef.value) return

  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }

  scrollTimer = setTimeout(() => {
    if (!messageListRef.value) return

    const { scrollTop } = messageListRef.value

    // 接近顶部时自动加载历史消息（触发距离 300px）
    if (scrollTop < 300 && hasMoreHistory.value && !loadingHistory.value && !loading.value) {
      handleLoadMore()
    }
  }, 100) // 100ms 防抖
}

// 刷新消息列表
const handleRefresh = () => {
  hasMoreHistory.value = true
  loadMessages(false)
}

// 判断是否显示头像（连续消息优化）
const shouldShowAvatar = (index: number, messages: Message[]) => {
  // 选项1：每条消息都显示头像
  // return true

  // 选项2：连续消息优化（当前使用）
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
  //if (index === 0) return true
  if (index === messages.length - 1) return true

  const current = messages[index]
  // const prev = messages[index - 1]

  // // 不同发送者显示名称
  // return current.sender !== prev.sender
  //
  const next = messages[index + 1]

  // 不同发送者显示头像
  if (current.sender !== next.sender) return true
}

// 监听会话ID变化
watch(() => props.sessionId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    hasMoreHistory.value = true
    historyLoadMessage.value = ''
    historyLoadContext.value = null  // 重置加载上下文
    loadMessages(false)
  }
}, { immediate: true })

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
      <!-- 顶部加载历史消息指示器 -->
      <div v-if="loadingHistory" class="message-list__loading-history">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载历史消息中...</span>
      </div>

      <!-- 历史消息加载提示 -->
      <div v-else-if="historyLoadMessage" class="message-list__history-message">
        <el-alert
          :title="historyLoadMessage"
          type="info"
          :closable="false"
          center
        />
      </div>

      <!-- 手动加载更多按钮（备用） -->
      <div v-else-if="showLoadMore && !loadingHistory" class="message-list__load-more">
        <el-button
          text
          @click="handleLoadMore"
        >
          加载更多历史消息
        </el-button>
      </div>

      <!-- 没有更多消息提示 -->
      <div v-else-if="messages.length > 0 && !hasMoreHistory && !historyLoadMessage" class="message-list__no-more">
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
  display: flex;
  flex-direction: column;

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
    padding: 16px 0 80px 0;
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
  &__no-more,
  &__loading-history,
  &__history-message {
    text-align: center;
    padding: 16px;
  }

  &__loading-history {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    color: var(--el-text-color-secondary);

    .el-icon {
      font-size: 16px;
    }
  }

  &__history-message {
    padding: 12px 16px;

    :deep(.el-alert) {
      padding: 8px 12px;
      font-size: 12px;
    }
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
    position: fixed;
    bottom: 80px;
    right: 40px;
    z-index: 1000;

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
