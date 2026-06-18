<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useChatMessagesStore } from '@/stores/chatMessages'
import { formatMinimalDate } from '@/utils/date'
import { getHistoryAnchorBeforeTime } from '@/stores/chat/utils'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useFlatMessageList } from '@/composables/useFlatMessageList'
import { estimateItemSize } from '@/utils/virtual-size'
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
  initialTime: undefined,
})

const chatStore = useChatMessagesStore()

// 引用
const parentRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const loadingHistory = ref(false)
const hasMoreHistory = ref(true)
const error = ref<string | null>(null)
const historyLoadMessage = ref('')

// 用户是否在底部（控制 anchorTo 行为）
// 默认 true：初始加载时自动滚动到底部
const isUserAtBottom = ref(true)

// 当前消息列表
const messages = computed(() => {
  if (!props.sessionId) return []
  return chatStore.messages
})

// 按日期分组的消息
const messagesByDate = computed(() => {
  return chatStore.messagesByDate
})

// 扁平化虚拟列表
const hasMoreHistoryComputed = computed(() => hasMoreHistory.value)
const historyLoadMessageComputed = computed(() => historyLoadMessage.value)
const { flatItems } = useFlatMessageList(messagesByDate, hasMoreHistoryComputed, historyLoadMessageComputed)

// 虚拟滚动
const virtualizer = useVirtualizer(computed(() => ({
  count: flatItems.value.length,
  getScrollElement: () => parentRef.value,
  estimateSize: (i: number) => estimateItemSize(flatItems.value[i]!),
  getItemKey: (i: number) => flatItems.value[i]?.key ?? String(i),
  anchorTo: 'end' as const,
  followOnAppend: true,
  scrollEndThreshold: 80,
  overscan: 6,
})))

// 禁用滚动位置调整（TanStack Virtual bug：从实例属性读取，不是 options）
// 设置多次确保生效
function disableScrollAdjustment() {
  virtualizer.value.shouldAdjustScrollPositionOnItemSizeChange = () => false
}
disableScrollAdjustment()
nextTick(disableScrollAdjustment)
watch(() => flatItems.value.length, disableScrollAdjustment)

const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// 是否在底部（用于"回到底部"按钮）
const isAtBottom = computed(() => virtualizer.value.isAtEnd())

// 获取虚拟行对应的扁平化项
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFlatItem(index: number): any {
  return flatItems.value[index]
}

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

    if (!loadMore) {
      // 初始加载：使用分批渲染
      await chatStore.loadMessagesWithBatchRender(props.sessionId)
    } else {
      await chatStore.loadMessages(props.sessionId, page, true, props.initialTime)
    }

    const loadedCount = messages.value.length - beforeCount

    if (!loadMore) {
      // 初始加载：滚动到底部
      isUserAtBottom.value = true
      await nextTick()
      // 滚动到最后一个元素
      setTimeout(() => {
        const lastIndex = flatItems.value.length - 1
        if (lastIndex >= 0 && virtualizer.value) {
          virtualizer.value.scrollToIndex(lastIndex, { align: 'end', behavior: 'auto' })
        }
      }, 100)
      setTimeout(() => {
        checkAndLoadMore(loadedCount)
      }, 200)
    } else {
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
const handleLoadHistory = async () => {
  if (loadingHistory.value || !hasMoreHistory.value || messages.value.length === 0) {
    return
  }

  loadingHistory.value = true

  try {
    // 使用统一锚点策略（优先虚拟消息）
    const beforeTime = getHistoryAnchorBeforeTime(messages.value)

    if (!beforeTime) {
      console.warn('无法获取最早消息时间')
      return
    }

    console.log('🔍 Loading history before:', beforeTime)

    // 调用 store 的历史消息加载方法（只请求一次）
    const result = await chatStore.loadHistoryMessages(props.sessionId, beforeTime)

    // 更新历史加载提示消息
    historyLoadMessage.value = chatStore.historyLoadMessage

    // anchorTo:'end' 自动保持视口稳定，无需手动 scrollTop 补偿
    // result.messages 可能为空，但空窗口不代表无更多历史
    void result

    // 空窗口不代表无更多历史：保持继续加载入口可用
    hasMoreHistory.value = true
  } catch (err) {
    console.error('加载历史消息失败:', err)
  } finally {
    loadingHistory.value = false
  }
}

// 处理 Gap 消息点击
const handleGapClick = async (gapMessage: Message) => {
  if (loadingHistory.value) return

  loadingHistory.value = true

  try {
    console.log('🔄 Loading Gap messages:', gapMessage.gapData)

    // 加载 Gap 对应的数据
    await chatStore.loadGapMessages(gapMessage)

    // anchorTo:'end' 自动保持视口稳定，无需手动 scrollTop 补偿
  } catch (err) {
    console.error('Gap 消息加载失败:', err)
  } finally {
    loadingHistory.value = false
  }
}

// 检查并自动加载更多（如果本次加载数量等于pageSize）
const checkAndLoadMore = async (loadedCount: number) => {
  if (!chatStore.hasMore || loadingMore.value || loading.value) {
    return
  }

  const pageSize = chatStore.pageSize
  if (loadedCount === pageSize) {
    console.log('🔄 Auto loading more messages...', {
      loadedCount,
      pageSize,
      totalMessages: messages.value.length,
    })

    await handleLoadHistory()
  } else {
    console.log('✅ Loading complete', {
      loadedCount,
      pageSize,
      totalMessages: messages.value.length,
      reason: loadedCount < pageSize ? 'Reached end' : 'Manual stop',
    })
  }
}

// 滚动到底部（启用 anchorTo:'end'，虚拟器自动处理）
const scrollToBottom = (smooth = false) => {
  isUserAtBottom.value = true
  // anchorTo:'end' 会自动滚动，scrollToEnd 仅用于 smooth 动画
  if (smooth) {
    virtualizer.value.scrollToEnd({ behavior: 'smooth' })
  }
}

// 滚动到指定消息
const scrollToMessage = (messageId: string | number) => {
  const idx = flatItems.value.findIndex(
    (item) => item.type === 'message' && item.message.id === messageId
  )
  if (idx >= 0) {
    virtualizer.value.scrollToIndex(idx, { align: 'center', behavior: 'smooth' })
    // 高亮消息
    nextTick(() => {
      const el = parentRef.value?.querySelector(`[data-index="${idx}"]`)
      if (el) {
        el.classList.add('message-highlight')
        setTimeout(() => {
          el.classList.remove('message-highlight')
        }, 2000)
      }
    })
  }
}

// 滚动到指定日期
const scrollToDate = (date: string) => {
  const idx = flatItems.value.findIndex(
    (item) => item.type === 'date' && item.date === date
  )
  if (idx >= 0) {
    virtualizer.value.scrollToIndex(idx, { align: 'start', behavior: 'smooth' })
  }
}

// 处理滚动事件（防抖）
let scrollTimer: ReturnType<typeof setTimeout> | null = null
const handleScroll = () => {
  if (!parentRef.value) return

  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }

  scrollTimer = setTimeout(() => {
    if (!parentRef.value) return

    const { scrollTop, scrollHeight, clientHeight } = parentRef.value

    // 更新 isUserAtBottom（控制 anchorTo 行为）
    // 距离底部 80px 以内视为"在底部"
    isUserAtBottom.value = scrollHeight - scrollTop - clientHeight < 80

    // 接近顶部时自动加载历史消息（触发距离 300px）
    if (scrollTop < 300 && hasMoreHistory.value && !loadingHistory.value && !loading.value) {
      handleLoadHistory()
    }
  }, 100)
}

// 刷新消息列表
const handleRefresh = () => {
  if (props.sessionId) {
    chatStore.removeCache(props.sessionId)
  }
  hasMoreHistory.value = true
  loadMessages(false)
}

// 监听会话ID变化
watch(
  () => props.sessionId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      // 清理旧会话的 Gap 消息
      if (oldId) {
        chatStore.removeGapMessages(oldId)
      }
      hasMoreHistory.value = true
      historyLoadMessage.value = ''
      loadMessages(false)
    }
  },
  { immediate: true }
)

// 流式输出时重新测量 — TanStack Virtual 内置 ResizeObserver 自动处理，无需手动 measureAll

// 暴露方法给父组件
defineExpose({
  refresh: handleRefresh,
  scrollToBottom,
  scrollToMessage,
  loadMessages,
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

    <!-- 消息列表 - 虚拟滚动 -->
    <div v-else ref="parentRef" class="message-list__content" @scroll="handleScroll">
      <div
        :style="{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }"
      >
        <div
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRows[0]?.start ?? 0}px)`,
          }"
        >
          <div
            v-for="virtualRow in virtualRows"
            :key="String(virtualRow.key)"
            :data-index="virtualRow.index"
          >
            <template v-if="getFlatItem(virtualRow.index)?.type === 'load-more'">
              <!-- 加载更多 -->
              <div v-if="loadingHistory" class="message-list__loading-history">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载历史消息中...</span>
              </div>
              <div v-else class="message-list__load-more">
                <el-button text @click="handleLoadHistory"> 加载更多历史消息 </el-button>
              </div>
            </template>

            <template v-else-if="getFlatItem(virtualRow.index)?.type === 'no-more'">
              <!-- 没有更多消息提示 -->
              <div class="message-list__no-more">
                <el-divider>没有更多消息了</el-divider>
              </div>
            </template>

            <template v-else-if="getFlatItem(virtualRow.index)?.type === 'date'">
              <!-- 日期分隔符 -->
              <div class="message-date" @click="scrollToDate(getFlatItem(virtualRow.index).date)">
                <span>{{ getFlatItem(virtualRow.index).formattedDate }} ({{ getFlatItem(virtualRow.index).count }} 条)</span>
              </div>
            </template>

            <template v-else-if="getFlatItem(virtualRow.index)?.type === 'gap'">
              <!-- Gap 虚拟消息 -->
              <div
                class="message-bubble__virtual message-bubble__gap"
                @click="handleGapClick(getFlatItem(virtualRow.index).message)"
              >
                <el-button text class="gap-action">
                  <el-icon><MoreFilled /></el-icon>
                  <span class="gap-title">待补齐消息窗口</span>
                  <span class="gap-subtitle">{{ getFlatItem(virtualRow.index).message.content }}</span>
                </el-button>
              </div>
            </template>

            <template v-else-if="getFlatItem(virtualRow.index)?.type === 'empty-range'">
              <!-- EmptyRange 虚拟消息 -->
              <div class="message-bubble__virtual message-bubble__empty-range">
                <span class="virtual-text">
                  <span class="empty-title">📭 已探测空窗口</span>
                  <span class="empty-subtitle">{{ getFlatItem(virtualRow.index).message.content }}</span>
                </span>
              </div>
            </template>

            <template v-else-if="getFlatItem(virtualRow.index)?.type === 'bottom-hint'">
              <!-- 底部提示 -->
              <div class="message-list__bottom-hint">
                <el-divider>到了底部</el-divider>
              </div>
            </template>

            <template v-else-if="getFlatItem(virtualRow.index)?.type === 'message'">
              <!-- 普通消息 -->
              <MessageBubble
                :id="`message-${getFlatItem(virtualRow.index).message.id}`"
                :message="getFlatItem(virtualRow.index).message"
                :show-avatar="getFlatItem(virtualRow.index).showAvatar"
                :show-time="getFlatItem(virtualRow.index).showTime"
                :show-name="getFlatItem(virtualRow.index).showName"
                @gap-click="handleGapClick"
              />
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 滚动到底部按钮 -->
    <transition name="fade">
      <div v-show="messages.length > 0" class="message-list__scroll-bottom">
        <!-- 日期快速跳转 -->
        <div v-if="showDate" class="date-nav">
          <div
            v-for="group in messagesByDate"
            :key="group.date"
            class="date-nav__item"
            @click.stop="scrollToDate(group.date)"
          >
            <el-tooltip
              :content="`${group.formattedDate} (${group.messages.length}条)`"
              placement="left"
              :show-after="200"
            >
              <span>{{ formatMinimalDate(group.date) }}</span>
            </el-tooltip>
          </div>
        </div>

        <el-button circle size="small" @click="scrollToBottom(true)">
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
  &__bottom-hint,
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

  &__no-more,
  &__bottom-hint {
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
    bottom: 16px;
    right: 16px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .date-nav {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 4px;
      max-height: 60vh;
      overflow-y: auto;
      padding: 4px;

      &::-webkit-scrollbar {
        width: 0;
        display: none;
      }

      &__item {
        font-size: 11px;
        background-color: var(--el-bg-color);
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 12px;
        padding: 4px 8px;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
        opacity: 0.7;
        color: var(--el-text-color-secondary);
        text-align: center;

        &:hover {
          opacity: 1;
          color: var(--el-color-primary);
          border-color: var(--el-color-primary-light-5);
          transform: translateX(-2px);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        }
      }
    }

    .scroll-btn {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      width: 40px;
      height: 40px;
      font-size: 18px;
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
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.95);

    span {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }

  span {
    display: inline-block;
    padding: 4px 12px;
    background-color: var(--el-fill-color-light);
    border-radius: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    transition: all 0.3s;
  }
}

// 消息高亮动画
:deep(.message-highlight) {
  animation: highlight 0.5s ease-in-out;
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
    0%,
    100% {
      background-color: transparent;
    }
    50% {
      background-color: rgba(64, 158, 255, 0.2);
    }
  }
}
</style>
