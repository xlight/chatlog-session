<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSearchStore } from '@/stores/search'
import { useSessionStore } from '@/stores/session'
import { useContactStore } from '@/stores/contact'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import Avatar from '@/components/common/Avatar.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import SessionOption from '@/components/search/SessionOption.vue'
import type { SearchType } from '@/stores/search'
import type { Message, Contact, Session } from '@/types'

const searchStore = useSearchStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()
const router = useRouter()
const route = useRoute()

// 状态
const searchText = ref('')
const searchType = ref<SearchType>('chatroom')
const selectedSessionId = ref<string>('')

// 会话显示名称缓存
const sessionDisplayNames = ref<Map<string, string>>(new Map())

// 初始化默认时间范围（最近一年）
const getDefaultDateRange = (): [Date, Date] => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - 1)
  return [startDate, endDate]
}

const dateRange = ref<[Date, Date] | null>(getDefaultDateRange())

// 计算属性
const results = computed(() => searchStore.filteredResults)
const stats = computed(() => searchStore.stats)
const isLoading = computed(() => searchStore.isLoading)
const hasResults = computed(() => searchStore.hasResults)

// 可用的会话列表（用于会话内搜索）
const availableSessions = computed(() => sessionStore.sessions)

// 获取会话的显示名称
const getSessionDisplayName = async (session: Session): Promise<string> => {
  // 先从缓存中获取
  if (sessionDisplayNames.value.has(session.id)) {
    return sessionDisplayNames.value.get(session.id)!
  }

  // 尝试从 contact store 获取
  try {
    const displayName = await contactStore.getContactDisplayName(session.id)
    if (displayName && displayName !== session.id) {
      sessionDisplayNames.value.set(session.id, displayName)
      return displayName
    }
  } catch (err) {
    console.warn('获取会话显示名称失败:', session.id, err)
  }

  // 使用默认名称
  const defaultName = session.name || session.talkerName || session.id
  sessionDisplayNames.value.set(session.id, defaultName)
  return defaultName
}

// 会话筛选的查询文本
const sessionFilterQuery = ref('')

// 筛选后的会话列表
const filteredSessions = computed(() => {
  if (!sessionFilterQuery.value) {
    return availableSessions.value
  }

  const lowerQuery = sessionFilterQuery.value.toLowerCase().trim()

  return availableSessions.value.filter((session: Session) => {
    // 从缓存中获取显示名称
    const displayName = sessionDisplayNames.value.get(session.id) || session.name || session.talkerName || ''

    // 匹配 displayName
    return displayName.toLowerCase().includes(lowerQuery)
  })
})

// 处理远程搜索
const handleSessionFilter = (query: string) => {
  sessionFilterQuery.value = query
}

// 预加载会话显示名称
const preloadSessionNames = async () => {
  const sessions = availableSessions.value
  if (sessions.length === 0) return

  // 批量加载显示名称（限制并发数）
  const batchSize = 10
  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize)
    await Promise.allSettled(
      batch.map(session => getSessionDisplayName(session))
    )
  }
}

// 执行搜索
const performSearch = async () => {
  if (!searchText.value.trim() && !dateRange.value) {
    searchStore.clearResults()
    return
  }

  // 如果是聊天记录搜索，必须选择会话
  if (searchType.value === 'message' && !selectedSessionId.value) {
    ElMessage.warning('请先选择要搜索的会话')
    return
  }

  try {
    await searchStore.performSearch({
      keyword: searchText.value,
      type: searchType.value,
      scope: 'session',
      talker: selectedSessionId.value,
      timeRange: dateRange.value,
    })
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请重试')
  }
}

// 处理搜索
const handleSearch = (value: string) => {
  searchText.value = value
  performSearch()
}

// 清空搜索
const clearSearch = () => {
  searchText.value = ''
  dateRange.value = null
  searchStore.clearResults()
}

// 查看消息
const viewMessage = (message: Message) => {
  router.push({
    path: '/chat',
    query: {
      talker: message.talker,
      messageId: message.id
    }
  })
}

// 查看群聊
const viewChatroom = (chatroom: Contact) => {
  router.push({
    path: '/chat',
    query: { talker: chatroom.wxid }
  })
}

// 查看联系人
const viewContact = (contact: Contact) => {
  router.push({
    path: '/chat',
    query: { talker: contact.wxid }
  })
}

// 加载更多消息
const loadMore = async () => {
  if (!searchStore.hasMore || isLoading.value) {
    return
  }

  try {
    await searchStore.loadMoreMessages()
  } catch (error) {
    console.error('加载更多失败:', error)
    ElMessage.error('加载更多失败')
  }
}

// 监听搜索类型变化
watch(searchType, (newType) => {
  searchStore.setSearchType(newType)
  // 切换到聊天记录搜索时，如果没有选择会话，清空结果
  if (newType === 'message' && !selectedSessionId.value) {
    searchStore.clearResults()
    return
  }
  if (searchText.value || dateRange.value) {
    performSearch()
  }
})

// 监听选中会话变化
watch(selectedSessionId, (newTalker) => {
  searchStore.setSelectedTalker(newTalker)
  if (searchText.value) {
    performSearch()
  }
})

// 监听时间范围变化
watch(dateRange, (newRange) => {
  searchStore.setTimeRange(newRange)
  // 如果清空了时间范围，恢复默认值（最近一年）
  if (!newRange && searchType.value === 'message') {
    dateRange.value = getDefaultDateRange()
    return
  }
  if (searchText.value || newRange) {
    performSearch()
  }
})

// 组件挂载时处理 URL 参数和预加载
onMounted(async () => {
  // 预加载会话显示名称
  await preloadSessionNames()

  // 从 URL 参数中获取搜索条件
  const queryType = route.query.type as SearchType | undefined
  const queryTalker = route.query.talker as string | undefined
  const querySessionName = route.query.sessionName as string | undefined

  // 如果有 URL 参数，设置搜索条件
  if (queryType) {
    searchType.value = queryType
    searchStore.setSearchType(queryType)
  }

  if (queryTalker) {
    selectedSessionId.value = queryTalker
    searchStore.setSelectedTalker(queryTalker)

    // 显示提示消息
    if (querySessionName) {
      ElMessage.success(`已选择会话：${querySessionName}`)
    }
  }

  // 如果没有参数，重置状态
  if (!queryType && !queryTalker) {
    searchStore.reset()
  }
})
</script>

<template>
  <div class="search-page">
    <div class="search-container">
      <!-- 搜索头部 -->
      <div class="search-header">
        <div class="header-top">
          <!-- <el-button
            text
            size="large"
            @click="$router.back()"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button> -->
          <h2>搜索</h2>
        </div>

        <!-- 搜索框 -->
        <SearchBar
          v-model="searchText"
          placeholder="搜索群聊、联系人或消息"
          size="large"
          autofocus
          class="main-search"
          @search="handleSearch"
        />

        <!-- 搜索选项 -->
        <div class="search-options">
          <div class="option-row">
            <label>搜索类型:</label>
            <el-radio-group v-model="searchType" size="small">
              <el-radio-button value="chatroom">群聊</el-radio-button>
              <el-radio-button value="contact">联系人</el-radio-button>
              <el-radio-button value="message">聊天记录</el-radio-button>
            </el-radio-group>
          </div>

          <div v-if="searchType === 'message'" class="option-row">
            <label>选择会话:</label>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              <el-select
                v-model="selectedSessionId"
                placeholder="请选择会话（必填）"
                size="small"
                filterable
                clearable
                remote
                :remote-method="handleSessionFilter"
                style="width: 100%;"
              >
              <el-option
                v-for="session in filteredSessions"
                :key="session.id"
                :label="sessionDisplayNames.get(session.id) || session.name || session.talkerName"
                :value="session.talker"
              >
                <SessionOption :session="session" />
              </el-option>
              </el-select>
              <span v-if="searchType === 'message'" style="font-size: 12px; color: var(--el-color-warning);">
                * 聊天记录搜索必须选择会话
              </span>
            </div>
          </div>

          <!-- 日期范围 -->
          <div v-if="searchType === 'message'" class="option-row">
            <label>日期范围:</label>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                size="small"
                clearable
                style="width: 100%;"
              />
              <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                * 时间范围默认为最近一年
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div class="search-content">
        <!-- 加载状态 -->
        <Loading v-if="isLoading && !hasResults" text="搜索中..." />

        <!-- 空状态 -->
        <Empty
          v-else-if="!searchText && !dateRange"
          icon="Search"
          description="输入关键词或选择日期范围开始搜索"
        />

        <!-- 无结果 -->
        <Empty
          v-else-if="!isLoading && !hasResults"
          icon="DocumentDelete"
          description="未找到相关结果"
        >
          <el-button type="primary" @click="clearSearch">
            清空搜索
          </el-button>
        </Empty>

        <!-- 搜索结果 -->
        <div v-else class="search-results">
          <!-- 统计信息 -->
          <div class="result-stats">
            <el-tag type="info" size="large">
              共找到 {{ stats.total }} 条结果
            </el-tag>
            <el-tag v-if="stats.chatrooms > 0" type="warning" size="small">
              {{ stats.chatrooms }} 个群聊
            </el-tag>
            <el-tag v-if="stats.contacts > 0" type="success" size="small">
              {{ stats.contacts }} 个联系人
            </el-tag>
            <el-tag v-if="stats.messages > 0" type="primary" size="small">
              {{ stats.messages }} 条消息
            </el-tag>
          </div>

          <el-scrollbar class="results-scrollbar">
            <!-- 群聊结果 -->
            <div v-if="results.chatrooms.length > 0" class="result-section">
              <div class="section-header">
                <h3>群聊</h3>
                <el-tag size="small">{{ results.chatrooms.length }}</el-tag>
              </div>

              <div class="chatroom-results">
                <div
                  v-for="chatroom in results.chatrooms"
                  :key="chatroom.wxid"
                  class="result-item chatroom-item"
                  @click="viewChatroom(chatroom)"
                >
                  <Avatar
                    :src="chatroom.avatar"
                    :name="chatroom.nickname || chatroom.remark || chatroom.wxid"
                    :size="48"
                  />
                  <div class="item-info">
                    <div class="item-name">
                      {{ chatroom.nickname || chatroom.remark || chatroom.wxid }}
                    </div>
                    <div class="item-desc">
                      <el-tag size="small" type="warning" effect="plain">群聊</el-tag>
                      <span v-if="chatroom.remark" class="remark">备注: {{ chatroom.remark }}</span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <el-icon><ArrowRight /></el-icon>
                  </div>
                </div>
              </div>
            </div>

            <!-- 联系人结果 -->
            <div v-if="results.contacts.length > 0" class="result-section">
              <div class="section-header">
                <h3>联系人</h3>
                <el-tag size="small">{{ results.contacts.length }}</el-tag>
              </div>

              <div class="contact-results">
                <div
                  v-for="contact in results.contacts"
                  :key="contact.wxid"
                  class="result-item contact-item"
                  @click="viewContact(contact)"
                >
                  <Avatar
                    :src="contact.avatar"
                    :name="contact.nickname || contact.remark || contact.wxid"
                    :size="48"
                  />
                  <div class="item-info">
                    <div class="item-name">
                      {{ contact.nickname || contact.remark || contact.wxid }}
                    </div>
                    <div class="item-desc">
                      <el-tag
                        size="small"
                        :type="contact.type === 'friend' ? 'success' : 'info'"
                        effect="plain"
                      >
                        {{ contact.type === 'friend' ? '好友' : '其他' }}
                      </el-tag>
                      <span v-if="contact.remark" class="remark">备注: {{ contact.remark }}</span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <el-icon><ArrowRight /></el-icon>
                  </div>
                </div>
              </div>
            </div>

            <!-- 消息结果 -->
            <div v-if="results.messages.length > 0" class="result-section">
              <div class="section-header">
                <h3>聊天记录</h3>
                <el-tag size="small">{{ results.messages.length }}</el-tag>
              </div>

              <div class="message-results">
                <div
                  v-for="message in results.messages"
                  :key="message.id"
                  class="result-item message-item"
                  @click="viewMessage(message)"
                >
                  <div class="message-header">
                    <Avatar
                      :src="message.talkerAvatar"
                      :name="message.talkerName"
                      :size="32"
                    />
                    <div class="message-meta">
                      <span class="sender-name">{{ message.senderName || message.talkerName }}</span>
                      <span class="message-time">
                        {{ new Date(message.createTime).toLocaleString('zh-CN') }}
                      </span>
                    </div>
                  </div>

                  <div class="message-content">
                    <MessageBubble
                      :message="message"
                      :is-send="message.isSend"
                      :show-avatar="false"
                      class="search-bubble"
                    />
                  </div>
                </div>

                <!-- 加载更多 -->
                <div v-if="searchStore.hasMore && searchType === 'message'" class="load-more">
                  <el-button
                    :loading="searchStore.messageLoading"
                    @click="loadMore"
                  >
                    加载更多
                  </el-button>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-page {
  width: 100%;
  height: 100%;
  background-color: var(--el-bg-color);
  overflow: hidden;
}

.search-container {
  max-width: 900px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
  background-color: var(--el-bg-color);

  .header-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
  }

  .main-search {
    margin-bottom: 16px;
  }

  .search-options {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .option-row {
      display: flex;
      align-items: center;
      gap: 12px;

      label {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-regular);
        white-space: nowrap;
        min-width: 80px;
      }

      .el-radio-group {
        flex: 1;
      }
    }
  }
}

.search-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-results {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .result-stats {
    padding: 16px 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .results-scrollbar {
    flex: 1;
  }

  .result-section {
    padding: 16px 24px;

    & + .result-section {
      border-top: 1px solid var(--el-border-color-lighter);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }
    }

    .result-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid var(--el-border-color-lighter);
      background-color: var(--el-bg-color);

      &:hover {
        background-color: var(--el-fill-color-light);
        border-color: var(--el-color-primary);
        transform: translateX(2px);
      }

      & + .result-item {
        margin-top: 8px;
      }
    }

    .chatroom-item,
    .contact-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .item-info {
        flex: 1;
        min-width: 0;

        .item-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-desc {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;

          .remark {
            color: var(--el-text-color-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .item-actions {
        color: var(--el-text-color-placeholder);
        transition: color 0.2s;
      }

      &:hover .item-actions {
        color: var(--el-color-primary);
      }
    }

    .message-item {
      .message-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        .message-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          .sender-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--el-text-color-primary);
          }

          .message-time {
            font-size: 12px;
            color: var(--el-text-color-secondary);
          }
        }
      }

      .message-content {
        .search-bubble {
          :deep(.message-bubble) {
            max-width: 100%;
          }
        }
      }
    }

    .load-more {
      display: flex;
      justify-content: center;
      padding: 16px;
      margin-top: 8px;
    }
  }
}

// 响应式
@media (max-width: 768px) {
  .search-header {
    padding: 12px 16px;

    .search-options {
      .option-row {
        flex-direction: column;
        align-items: stretch;

        label {
          min-width: unset;
        }
      }
    }
  }

  .search-results {
    .result-stats {
      padding: 12px 16px;
    }

    .result-section {
      padding: 12px 16px;

      .result-item {
        padding: 10px;
      }
    }
  }
}
</style>
