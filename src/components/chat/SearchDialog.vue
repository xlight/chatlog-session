<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSearchStore } from '@/stores/search'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import SearchBar from '@/components/common/SearchBar.vue'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import MessageSearchResults from '@/components/search/MessageSearchResults.vue'
import type { Message } from '@/types'

interface Props {
  modelValue: boolean
  sessionId?: string
  sessionName?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'message-click', message: Message): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  sessionId: '',
  sessionName: ''
})

const emit = defineEmits<Emits>()

const searchStore = useSearchStore()
const appStore = useAppStore()

// 移动端判断复用 appStore.isMobile（已在 app store 中维护 resize 监听）
const isMobile = computed(() => appStore.isMobile)

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 搜索状态
const searchText = ref('')

// 初始化默认时间范围（最近一个月）
const getDefaultDateRange = (): [Date, Date] => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(endDate.getMonth() - 1)
  return [startDate, endDate]
}

// 缓存默认日期范围，避免重复调用产生不同 Date 对象
const defaultDateRange = getDefaultDateRange()
const dateRange = ref<[Date, Date] | null>(defaultDateRange)

// 移动端日期选择器：computed get/set 绑定 dateRange[0]/dateRange[1]
const mobileStartDate = computed<Date | null>({
  get: () => dateRange.value?.[0] ?? null,
  set: (val) => {
    if (!dateRange.value) dateRange.value = [val ?? new Date(), new Date()]
    else dateRange.value = [val ?? dateRange.value[0], dateRange.value[1]]
  },
})

const mobileEndDate = computed<Date | null>({
  get: () => dateRange.value?.[1] ?? null,
  set: (val) => {
    if (!dateRange.value) dateRange.value = [new Date(), val ?? new Date()]
    else dateRange.value = [dateRange.value[0], val ?? dateRange.value[1]]
  },
})

// clearSearch flag，避免 clearSearch 期间 watch(dateRange) 触发搜索
let isClearing = false

// 计算属性
const messages = computed(() => searchStore.messageResults)
const isLoading = computed(() => searchStore.messageLoading)
const hasMore = computed(() => searchStore.hasMore)
const hasResults = computed(() => messages.value.length > 0)

// 执行搜索
const performSearch = async () => {
  if (!searchText.value.trim()) {
    searchStore.clearResults()
    return
  }

  if (!props.sessionId) {
    ElMessage.warning('会话信息缺失')
    return
  }

  try {
    await searchStore.performSearch({
      keyword: searchText.value,
      type: 'message',
      scope: 'session',
      talker: props.sessionId,
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
  isClearing = true
  searchText.value = ''
  dateRange.value = defaultDateRange
  searchStore.clearResults()
  nextTick(() => {
    isClearing = false
  })
}

// 查看消息
const handleMessageClick = (message: Message) => {
  emit('message-click', message)
  // 不自动关闭对话框，允许用户选择文字或继续查看其他结果
}

// 加载更多消息
const handleLoadMore = async () => {
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

// 监听时间范围变化
watch(dateRange, (newRange) => {
  if (isClearing) return
  if (!newRange) return
  if (searchText.value) {
    performSearch()
  }
})

// 对话框打开时的处理
watch(dialogVisible, (visible) => {
  if (visible) {
    // 打开时不设置 searchStore 全局状态，不搜索
  } else {
    // 关闭时清空搜索
    clearSearch()
  }
})

// 监听会话变化
watch(() => props.sessionId, (newId) => {
  if (newId && dialogVisible.value && searchText.value) {
    performSearch()
  }
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`搜索聊天记录${sessionName ? ' - ' + sessionName : ''}`"
    :fullscreen="isMobile"
    :draggable="!isMobile"
    :style="{ '--el-dialog-width': isMobile ? '100%' : '70%' }"
    class="search-dialog"
    :class="{ 'mobile-dialog': isMobile }"
    destroy-on-close
  >
    <div class="search-dialog-content">
      <!-- 搜索头部 -->
      <div class="search-header">
        <!-- 搜索框 -->
        <SearchBar
          v-model="searchText"
          placeholder="搜索消息内容"
          size="large"
          autofocus
          class="main-search"
          @search="handleSearch"
        />

        <!-- 日期范围 -->
        <!-- PC 端：范围选择器 -->
        <div v-if="!isMobile" class="date-range">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="default"
            clearable
            style="flex: 1;"
          />
        </div>

        <!-- 移动端：单独的日期选择器 -->
        <div v-else class="date-range mobile-date-range">
          <div class="date-inputs">
            <el-date-picker
              v-model="mobileStartDate"
              type="date"
              placeholder="开始日期"
              size="default"
              clearable
              :teleported="true"
              format="YYYY-MM-DD"
            />
            <span class="separator">至</span>
            <el-date-picker
              v-model="mobileEndDate"
              type="date"
              placeholder="结束日期"
              size="default"
              clearable
              :teleported="true"
              format="YYYY-MM-DD"
            />
          </div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div class="search-content">
        <!-- 加载状态 -->
        <Loading v-if="isLoading && !hasResults" text="搜索中..." />

        <!-- 空状态 -->
        <Empty
          v-else-if="!searchText"
          icon="DocumentSearch"
          description="输入关键词开始搜索"
        />

        <!-- 无结果 -->
        <Empty
          v-else-if="!isLoading && !hasResults"
          icon="DocumentDelete"
          description="未找到相关结果"
        />

        <!-- 搜索结果 -->
        <div v-else class="search-results">
          <!-- 统计信息 -->
          <div class="result-stats">
            找到 {{ messages.length }} 条结果
          </div>

          <!-- 消息列表 -->
          <el-scrollbar>
            <MessageSearchResults
              :messages="messages"
              :loading="isLoading"
              :has-more="hasMore"
              @message-click="handleMessageClick"
              @load-more="handleLoadMore"
            />
          </el-scrollbar>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="hasResults" type="primary" @click="clearSearch">
          清空搜索
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.search-dialog {
  :deep(.el-dialog) {
    max-width: 1200px;
    min-width: 600px;
    max-height: 80vh;
  }

  :deep(.el-dialog__header) {
    cursor: move;
  }

  :deep(.el-dialog__body) {
    padding: 0;
    overflow: hidden;
  }

  :deep(.el-dialog__footer) {
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.search-dialog-content {
  display: flex;
  flex-direction: column;
  min-height: 500px;
}

.search-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
  background-color: var(--el-bg-color);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .main-search {
    flex: 1;
    min-width: 200px;
  }

  .date-range {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;

    .hint {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      white-space: nowrap;
    }
  }
}

.search-content {
  flex: 1;
  padding: 20px 24px;
  overflow: hidden;
}

.search-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .result-stats {
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-scrollbar) {
    flex: 1;
    height: auto;
    max-height: calc(80vh - 200px);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 响应式
@media (max-width: 768px) {
  .search-dialog {
    &.mobile-dialog {
      :deep(.el-dialog) {
        width: 100% !important;
        max-width: 100% !important;
        min-width: auto !important;
        margin: 0 !important;
        height: 100vh !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
        display: flex;
        flex-direction: column;
      }

      :deep(.el-dialog__header) {
        padding: 16px;
        margin: 0;
        border-bottom: 1px solid var(--el-border-color-light);
        cursor: default;
      }

      :deep(.el-dialog__title) {
        font-size: 16px;
        line-height: 1.4;
      }

      :deep(.el-dialog__body) {
        flex: 1;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      :deep(.el-dialog__footer) {
        padding: 12px 16px;
        margin: 0;
        flex-shrink: 0;
      }
    }

    .search-dialog-content {
      min-height: auto;
      max-height: none;
      height: 100%;
      flex: 1;
      overflow: hidden;
    }
  }

  .search-header {
    padding: 12px 16px;
    flex-shrink: 0;

    .main-search {
      margin-bottom: 12px;
    }

    .date-range {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;

      label {
        margin-bottom: 0;
        font-size: 13px;
      }

      .hint {
        font-size: 11px;
        margin-top: 4px;
        color: var(--el-text-color-secondary);
      }

      &.mobile-date-range {
        .date-inputs {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          width: 100%;

          .separator {
            font-size: 12px;
            color: var(--el-text-color-secondary);
            flex-shrink: 0;
          }

          :deep(.el-date-editor) {
            flex: 1;
            min-width: 0;
          }
        }
      }
    }
  }

  .search-content {
    padding: 12px 16px;
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  .search-results {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .result-stats {
      padding-bottom: 12px;
      margin-bottom: 12px;
      flex-shrink: 0;
    }

    :deep(.el-scrollbar) {
      flex: 1 !important;
      height: auto !important;

      .el-scrollbar__wrap {
        max-height: 100%;
      }
    }
  }

  .dialog-footer {
    flex-direction: row;

    .el-button {
      flex: 1;
    }
  }
}
</style>
