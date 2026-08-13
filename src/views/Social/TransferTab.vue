/**
 * 转账记录 Tab
 * 展示微信转账记录，支持方向/年份筛选和金额统计
 */

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTransferStore } from '@/stores/transfer'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import Error from '@/components/common/Error.vue'
import type { Transfer } from '@/types/social'

const transferStore = useTransferStore()
const appStore = useAppStore()
const router = useRouter()

// 方向选项
const directionOptions = [
  { value: 'all', label: '全部' },
  { value: 'sent', label: '发出' },
  { value: 'received', label: '收到' },
]

// 方向选择
const selectedDirection = ref('all')

// 会话过滤（后端 talker 参数，选项来自当前列表的会话名，支持自由输入）
const selectedTalker = ref('')
const talkerOptions = computed(() => {
  const names = new Set<string>()
  transferStore.items.forEach(item => {
    if (item.sessionName) names.add(item.sessionName)
  })
  return [...names]
})
// 年份选择（使用字符串避免 el-select 类型冲突）
const selectedYear = ref('')

// 当前页码
const currentPage = ref(1)
const pageSize = ref(20)

// 是否首次加载
const initialLoading = ref(true)

// 格式化金额（元，后端 feedesc 解析）
function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

// 格式化时间
function formatTime(timestamp: number): string {
  if (!timestamp) return '—'
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 获取当前年份
const currentYear = new Date().getFullYear()
// 生成可选年份范围
const yearOptions = computed(() => {
  const years: { value: number; label: string }[] = [
    { value: 0, label: '全部年份' },
  ]
  for (let y = currentYear; y >= currentYear - 10; y--) {
    years.push({ value: y, label: `${y}年` })
  }
  return years
})

// 到账状态描述（delay_confirm_flag：0=即时到账，1=延迟到账）
function getStatusDesc(flag: number): string {
  return flag === 1 ? '延迟到账' : '即时到账'
}

// 状态标签类型
function getStatusType(flag: number): 'success' | 'warning' | 'info' | 'danger' {
  return flag === 1 ? 'warning' : 'success'
}

// 当前筛选方向（'all' 时列表为混合方向，无法区分发出/收到，显示中性标签）
const currentDirection = computed(() => transferStore.currentParams.direction)

// 对方 wxid（sent=收款方，received=付款方，all=收款方）
function counterparty(item: Transfer): string {
  return item.payReceiver || item.payPayer
}

// 查询
async function handleSearch() {
  currentPage.value = 1
  await transferStore.fetch({
    direction: selectedDirection.value as 'all' | 'sent' | 'received',
    year: selectedYear.value ? Number(selectedYear.value) : undefined,
    talker: selectedTalker.value || undefined,
    limit: pageSize.value,
    offset: 0,
  })
}

// 是否有生效的筛选条件（对齐 favorite 的清除筛选模式）
const hasActiveFilters = computed(() => {
  return (
    selectedDirection.value !== 'all' ||
    selectedYear.value !== '' ||
    selectedTalker.value !== ''
  )
})

function handleClearFilters() {
  selectedDirection.value = 'all'
  selectedYear.value = ''
  selectedTalker.value = ''
  handleSearch()
}

// 分页切换
async function handlePageChange(page: number) {
  currentPage.value = page
  const offset = (page - 1) * pageSize.value
  transferStore.setPage(pageSize.value, offset)
  await transferStore.fetch()
}

// 点击会话名跳转
function goToSession(sessionName: string) {
  if (sessionName) {
    appStore.setActiveNav('chat')
    router.push({ name: 'Chat', query: { talker: sessionName } })
  }
}
onMounted(async () => {
  initialLoading.value = true
  await transferStore.fetch({ limit: pageSize.value, offset: 0 })
  initialLoading.value = false
})
</script>

<template>
  <div class="transfer-tab">
    <!-- 页头 -->
    <div class="tab-header">
      <div class="header-left">
        <h2>转账记录</h2>
        <span v-if="transferStore.total > 0" class="header-count">
          共 {{ transferStore.total }} 笔
        </span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">方向</span>
        <el-select
          v-model="selectedDirection"
          style="width: 100px"
          size="small"
          @change="handleSearch"
        >
          <el-option
            v-for="opt in directionOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div class="filter-group">
        <span class="filter-label">年份</span>
        <el-select
          v-model="selectedYear"
          style="width: 120px"
          size="small"
          clearable
          placeholder="全部年份"
          @change="handleSearch"
        >
          <el-option
            label="全部年份"
            value=""
          />
          <el-option
            v-for="opt in yearOptions"
            :key="opt.value"
            :label="opt.label"
            :value="String(opt.value)"
          />
        </el-select>
      </div>

      <div class="filter-group">
        <span class="filter-label">会话</span>
        <el-select
          v-model="selectedTalker"
          style="width: 180px"
          size="small"
          clearable
          filterable
          allow-create
          placeholder="全部会话"
          @change="handleSearch"
        >
          <el-option
            v-for="name in talkerOptions"
            :key="name"
            :label="name"
            :value="name"
          />
        </el-select>
      </div>

      <el-button
        v-if="hasActiveFilters"
        size="small"
        @click="handleClearFilters"
      >
        清除筛选
      </el-button>

      <el-button type="primary" size="small" :loading="transferStore.loading" @click="handleSearch">
        <el-icon class="el-icon--left"><Search /></el-icon>
        查询
      </el-button>
    </div>

    <!-- 加载状态 -->
    <Loading v-if="initialLoading && transferStore.loading" />

    <!-- 错误状态 -->
    <Error
      v-else-if="transferStore.error"
      :message="transferStore.error.message"
      @retry="handleSearch"
    />

    <!-- 空状态 -->
    <Empty v-else-if="!transferStore.loading && transferStore.items.length === 0" description="暂无转账记录" />

    <!-- 数据列表 -->
    <div v-else class="data-list">
      <TransitionGroup name="list-fade">
        <el-card
          v-for="item in transferStore.items"
          :key="item.transferId || item.messageServerId"
          shadow="hover"
          class="data-card"
        >
          <div class="data-card__main">
            <div class="data-card__left">
              <el-tag
                :type="currentDirection === 'sent' ? 'danger' : 'success'"
                size="small"
                effect="plain"
              >
                {{
                  currentDirection === 'sent' ? '发出'
                    : currentDirection === 'received' ? '收到' : '转账'
                }}
              </el-tag>
              <div class="data-card__info">
                <div class="data-card__session">
                  <span class="label">对方</span>
                  <span
                    class="value clickable"
                    @click="goToSession(item.sessionName)"
                  >
                    {{ counterparty(item) }}
                  </span>
                </div>
                <div class="data-card__desc">
                  <span class="label">付款方</span>
                  <span class="value">{{ item.payPayer }}</span>
                  <span class="label">收款方</span>
                  <span class="value">{{ item.payReceiver }}</span>
                </div>
              </div>
            </div>
            <div class="data-card__right">
              <div class="data-card__amount" :class="currentDirection === 'sent' ? 'is-sent' : 'is-received'">
                {{ currentDirection === 'sent' ? '-' : '+' }}¥{{ formatAmount(item.amount) }}
              </div>
              <div class="data-card__time">
                {{ formatTime(item.beginTransferTime) }}
              </div>
              <el-tag :type="getStatusType(item.delayConfirmFlag)" size="small" effect="light">
                {{ getStatusDesc(item.delayConfirmFlag) }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </TransitionGroup>

      <!-- 分页 -->
      <div v-if="transferStore.total > pageSize" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="transferStore.total"
          layout="prev, pager, next"
          background
          small
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.transfer-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;

  .tab-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-shrink: 0;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .header-count {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    flex-shrink: 0;
    flex-wrap: wrap;

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;

      .filter-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        white-space: nowrap;
      }
    }
  }

  .data-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--el-border-color-light);
      border-radius: 2px;
    }
  }

  .data-card {
    margin-bottom: 8px;

    :deep(.el-card__body) {
      padding: 14px 16px;
    }

    &__main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    &__left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    &__info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    &__session,
    &__desc {
      display: flex;
      align-items: center;
      gap: 6px;

      .label {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        flex-shrink: 0;
      }

      .value {
        font-size: 13px;
        color: var(--el-text-color-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &.clickable {
          color: var(--el-color-primary);
          cursor: pointer;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    &__right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex-shrink: 0;
    }

    &__amount {
      font-size: 18px;
      font-weight: 700;

      &.is-sent {
        color: var(--el-color-danger);
      }

      &.is-received {
        color: var(--el-color-success);
      }
    }

    &__time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    padding: 16px 0 4px;
    flex-shrink: 0;
  }
}

// 列表动画
.list-fade-enter-active,
.list-fade-leave-active {
  transition: all 0.3s ease;
}

.list-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.list-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
