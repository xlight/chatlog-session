/**
 * 红包记录 Tab
 * 展示微信红包收发记录，支持方向筛选（后端无金额/时间字段）
 */

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRedPacketStore } from '@/stores/redpacket'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import Error from '@/components/common/Error.vue'
import type { RedPacket } from '@/types/social'

const redPacketStore = useRedPacketStore()
const appStore = useAppStore()
const router = useRouter()

const directionOptions = [
  { value: 'all', label: '全部' },
  { value: 'sent', label: '发出' },
  { value: 'received', label: '收到' },
]

const selectedDirection = ref('all')

// 会话过滤（后端 talker 参数，选项来自当前列表的会话名，支持自由输入）
const selectedTalker = ref('')
const talkerOptions = computed(() => {
  const names = new Set<string>()
  redPacketStore.items.forEach(item => {
    if (item.sessionName) names.add(item.sessionName)
  })
  return [...names]
})

const currentPage = ref(1)
const pageSize = ref(20)
const initialLoading = ref(true)

// 红包类型描述（hb_type：0=普通红包，1=拼手气红包，2=专属红包）
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

// 领取状态描述（receive_status）
function getReceiveStatusDesc(status: number): string {
  const map: Record<number, string> = {
    0: '未领取',
    1: '已领取',
    2: '已退回',
  }
  return map[status] ?? `未知(${status})`
}

function getReceiveStatusType(status: number): 'warning' | 'success' | 'info' | 'danger' {
  if (status === 0) return 'warning'
  if (status === 1) return 'success'
  if (status === 2) return 'info'
  return 'info'
}

// 当前筛选方向（'all' 时列表为混合方向，无法区分发出/收到，显示中性标签）
const currentDirection = computed(() => redPacketStore.currentParams.direction)

// 对方 wxid（sent=接收方所在会话，received=发送方）
function counterparty(item: RedPacket): string {
  return item.senderUserName || item.sessionName
}

// 点击会话名跳转
function goToSession(sessionName: string) {
  if (sessionName) {
    appStore.setActiveNav('chat')
    router.push({ name: 'Chat', query: { talker: sessionName } })
  }
}

async function handleSearch() {
  currentPage.value = 1
  await redPacketStore.fetch({
    direction: selectedDirection.value as 'all' | 'sent' | 'received',
    talker: selectedTalker.value || undefined,
    limit: pageSize.value,
    offset: 0,
  })
}

// 是否有生效的筛选条件（对齐 favorite 的清除筛选模式）
const hasActiveFilters = computed(() => {
  return selectedDirection.value !== 'all' || selectedTalker.value !== ''
})

function handleClearFilters() {
  selectedDirection.value = 'all'
  selectedTalker.value = ''
  handleSearch()
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

      <el-button type="primary" size="small" :loading="redPacketStore.loading" @click="handleSearch">
        <el-icon class="el-icon--left"><Search /></el-icon>
        查询
      </el-button>
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
          :key="item.nativeUrl || item.messageServerId"
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
                    : currentDirection === 'received' ? '收到' : '红包'
                }}
              </el-tag>
              <div class="data-card__info">
                <div class="data-card__row">
                  <el-tag :type="getHbTypeTag(item.hbType)" size="small" effect="light">
                    {{ getHbTypeDesc(item.hbType) }}
                  </el-tag>
                  <el-tag v-if="item.totalNum > 0" type="info" size="small" effect="light">
                    {{ item.totalNum }} 份
                  </el-tag>
                </div>
                <div class="data-card__session">
                  <span class="label">发送者</span>
                  <span
                    class="value clickable"
                    @click="goToSession(item.sessionName)"
                  >
                    {{ counterparty(item) }}
                  </span>
                </div>
                <div class="data-card__row">
                  <span v-if="item.blessing" class="data-card__wish">
                    💬 {{ item.blessing }}
                  </span>
                </div>
              </div>
            </div>
            <div class="data-card__right">
              <el-tag :type="getReceiveStatusType(item.receiveStatus)" size="small" effect="light">
                {{ getReceiveStatusDesc(item.receiveStatus) }}
              </el-tag>
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

    &__session {
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
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    padding: 16px 0 4px;
    flex-shrink: 0;
  }
}
</style>
