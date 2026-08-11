/**
 * 红包记录 Tab
 * 展示微信红包收发记录，支持方向筛选和统计
 */

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRedPacketStore } from '@/stores/redpacket'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import Error from '@/components/common/Error.vue'

const redPacketStore = useRedPacketStore()

const directionOptions = [
  { value: 'all', label: '全部' },
  { value: 'out', label: '发出' },
  { value: 'in', label: '收到' },
]

const selectedDirection = ref('all')
const currentPage = ref(1)
const pageSize = ref(20)
const initialLoading = ref(true)

function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2)
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 红包类型描述
function getHbTypeDesc(type: number): string {
  const map: Record<number, string> = {
    0: '普通红包',
    1: '拼手气红包',
    2: '专属红包',
  }
  return map[type] ?? `类型${type}`
}

// 红包类型标签
function getHbTypeTag(type: number): 'info' | 'warning' | 'danger' | 'success' {
  if (type === 0) return 'info'
  if (type === 1) return 'warning'
  if (type === 2) return 'danger'
  return 'info'
}

// 状态描述
function getStatusDesc(status: number): string {
  const map: Record<number, string> = {
    0: '待领取',
    1: '已领取',
    2: '已过期',
    3: '已退款',
  }
  return map[status] ?? `未知(${status})`
}

function getStatusType(status: number): 'warning' | 'success' | 'info' | 'danger' {
  if (status === 0) return 'warning'
  if (status === 1) return 'success'
  if (status === 2) return 'info'
  if (status === 3) return 'danger'
  return 'info'
}

function getReceiveStatusDesc(status: number): string {
  const map: Record<number, string> = {
    0: '未领取',
    1: '已领取',
    2: '已退回',
  }
  return map[status] ?? `未知(${status})`
}

async function handleSearch() {
  currentPage.value = 1
  await redPacketStore.fetch({
    direction: selectedDirection.value as 'all' | 'out' | 'in',
    limit: pageSize.value,
    offset: 0,
  })
}

async function handlePageChange(page: number) {
  currentPage.value = page
  const offset = (page - 1) * pageSize.value
  redPacketStore.setPage(pageSize.value, offset)
  await redPacketStore.fetch()
}

onMounted(async () => {
  initialLoading.value = true
  await redPacketStore.fetch({ limit: pageSize.value, offset: 0 })
  initialLoading.value = false
})
</script>

<template>
  <div class="redpacket-tab">
    <!-- 页头 -->
    <div class="tab-header">
      <div class="header-left">
        <h2>红包记录</h2>
        <span v-if="redPacketStore.total > 0" class="header-count">
          共 {{ redPacketStore.total }} 个
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

      <el-button type="primary" size="small" :loading="redPacketStore.loading" @click="handleSearch">
        <el-icon class="el-icon--left"><Search /></el-icon>
        查询
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div v-if="redPacketStore.stats.sentCount > 0 || redPacketStore.stats.receivedCount > 0" class="stats-cards">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-card__header">
          <el-icon class="stat-icon sent"><Top /></el-icon>
          <span>发出</span>
        </div>
        <div class="stat-card__value">{{ redPacketStore.stats.sentCount }} 个</div>
        <div v-if="redPacketStore.sentAmountTotal > 0" class="stat-card__sub">
          合计 ¥{{ redPacketStore.sentAmountTotal.toFixed(2) }}
        </div>
      </el-card>

      <el-card shadow="hover" class="stat-card">
        <div class="stat-card__header">
          <el-icon class="stat-icon received"><Bottom /></el-icon>
          <span>收到</span>
        </div>
        <div class="stat-card__value">{{ redPacketStore.stats.receivedCount }} 个</div>
        <div v-if="redPacketStore.receivedAmountTotal > 0" class="stat-card__sub">
          合计 ¥{{ redPacketStore.receivedAmountTotal.toFixed(2) }}
        </div>
      </el-card>
    </div>

    <!-- 加载状态 -->
    <Loading v-if="initialLoading && redPacketStore.loading" />

    <!-- 错误状态 -->
    <Error
      v-else-if="redPacketStore.error"
      :message="redPacketStore.error.message"
      @retry="handleSearch"
    />

    <!-- 空状态 -->
    <Empty v-else-if="!redPacketStore.loading && redPacketStore.items.length === 0" description="暂无红包记录" />

    <!-- 数据列表 -->
    <div v-else class="data-list">
      <TransitionGroup name="list-fade">
        <el-card
          v-for="item in redPacketStore.items"
          :key="item.nativeUrl"
          shadow="hover"
          class="data-card"
        >
          <div class="data-card__main">
            <div class="data-card__left">
              <el-tag
                :type="item.isSender ? 'danger' : 'success'"
                size="small"
                effect="plain"
              >
                {{ item.isSender ? '发出' : '收到' }}
              </el-tag>
              <div class="data-card__info">
                <div class="data-card__row">
                  <el-tag :type="getHbTypeTag(item.type)" size="small" effect="light">
                    {{ getHbTypeDesc(item.type) }}
                  </el-tag>
                </div>
                <div class="data-card__row">
                  <span v-if="item.wish" class="data-card__wish">
                    💬 {{ item.wish }}
                  </span>
                </div>
              </div>
            </div>
            <div class="data-card__right">
              <div class="data-card__amount">
                ¥{{ formatAmount(item.amount) }}
              </div>
              <div class="data-card__time">
                {{ formatTime(item.time) }}
              </div>
              <div class="data-card__status">
                <el-tag :type="getStatusType(item.status)" size="small" effect="light">
                  {{ getStatusDesc(item.status) }}
                </el-tag>
                <el-tag v-if="item.receiveId" type="info" size="small" effect="light">
                  {{ getReceiveStatusDesc(item.status) }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </TransitionGroup>

      <!-- 分页 -->
      <div v-if="redPacketStore.total > pageSize" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="redPacketStore.total"
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
.redpacket-tab {
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

  .stats-cards {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    flex-shrink: 0;

    .stat-card {
      flex: 1;
      min-width: 180px;

      :deep(.el-card__body) {
        padding: 16px;
      }

      &__header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
        margin-bottom: 8px;

        .stat-icon {
          font-size: 18px;

          &.sent {
            color: var(--el-color-danger);
          }

          &.received {
            color: var(--el-color-success);
          }
        }
      }

      &__value {
        font-size: 22px;
        font-weight: 700;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      &__sub {
        font-size: 13px;
        color: var(--el-color-primary);
        font-weight: 500;
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
    }

    &__row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    &__wish {
      font-size: 13px;
      color: var(--el-text-color-regular);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      color: var(--el-color-danger);
    }

    &__time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    &__status {
      display: flex;
      gap: 4px;
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    padding: 16px 0 4px;
    flex-shrink: 0;
  }
}
</style>
