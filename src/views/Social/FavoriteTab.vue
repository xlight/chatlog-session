/**
 * 收藏内容 Tab
 * 展示微信收藏内容，支持按标签、类型、关键词搜索
 */

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useFavoriteStore } from '@/stores/favorite'
import { FAVORITE_TYPE_MAP } from '@/types/social'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import Error from '@/components/common/Error.vue'

const favoriteStore = useFavoriteStore()

const currentPage = ref(1)
const pageSize = ref(20)
const initialLoading = ref(true)

// 类型过滤（使用字符串避免 el-select 类型冲突）
const selectedType = ref('')
const typeOptions = computed(() => {
  const options: { value: string; label: string }[] = [
    { value: '', label: '全部类型' },
  ]
  for (const [type, label] of Object.entries(FAVORITE_TYPE_MAP)) {
    options.push({ value: type, label })
  }
  return options
})

// 标签过滤
const selectedTag = ref<string | undefined>(undefined)

// 关键词搜索
const keyword = ref('')

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function getFavTypeLabel(type: number): string {
  return FAVORITE_TYPE_MAP[type] ?? `类型${type}`
}

function getFavTypeTag(type: number): 'info' | 'success' | 'warning' | 'primary' | 'danger' {
  const tagMap: Record<number, 'info' | 'success' | 'warning' | 'primary' | 'danger'> = {
    1: 'info',
    2: 'success',
    3: 'warning',
    4: 'danger',
    5: 'primary',
    6: 'warning',
    14: 'info',
    15: 'success',
    16: 'primary',
  }
  return tagMap[type] ?? 'info'
}

async function handleSearch() {
  currentPage.value = 1
  await favoriteStore.fetch({
    type: selectedType.value ? Number(selectedType.value) : undefined,
    tag: selectedTag.value,
    keyword: keyword.value || undefined,
    limit: pageSize.value,
    offset: 0,
  })
}

async function handlePageChange(page: number) {
  currentPage.value = page
  const offset = (page - 1) * pageSize.value
  favoriteStore.setPage(pageSize.value, offset)
  await favoriteStore.fetch()
}

function handleTagClick(tag: string) {
  selectedTag.value = selectedTag.value === tag ? undefined : tag
  handleSearch()
}

function handleClearFilters() {
  selectedType.value = ''
  selectedTag.value = undefined
  keyword.value = ''
  handleSearch()
}

const hasActiveFilters = computed(() => {
  return selectedType.value !== '' || selectedTag.value !== undefined || keyword.value !== ''
})

onMounted(async () => {
  initialLoading.value = true
  // 标签列表独立端点（后端 /favorite 响应无 tags）
  favoriteStore.fetchTags()
  await favoriteStore.fetch({ limit: pageSize.value, offset: 0 })
  initialLoading.value = false
})
</script>

<template>
  <div class="favorite-tab">
    <!-- 页头 -->
    <div class="tab-header">
      <div class="header-left">
        <h2>收藏</h2>
        <span v-if="favoriteStore.total > 0" class="header-count">
          共 {{ favoriteStore.total }} 条
        </span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">类型</span>
        <el-select
          v-model="selectedType"
          style="width: 120px"
          size="small"
          clearable
          placeholder="全部类型"
          @change="handleSearch"
        >
          <el-option
            v-for="opt in typeOptions"
            :key="opt.label"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div class="filter-group filter-group--search">
        <el-input
          v-model="keyword"
          size="small"
          placeholder="搜索关键词…"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-button type="primary" size="small" :loading="favoriteStore.loading" @click="handleSearch">
        <el-icon class="el-icon--left"><Search /></el-icon>
        搜索
      </el-button>

      <el-button
        v-if="hasActiveFilters"
        size="small"
        @click="handleClearFilters"
      >
        清除筛选
      </el-button>
    </div>

    <!-- 标签列表 -->
    <div v-if="favoriteStore.tags.length > 0" class="tags-bar">
      <span class="tags-label">标签</span>
      <div class="tags-list">
        <el-tag
          v-for="tag in favoriteStore.tags"
          :key="tag.localId"
          :type="selectedTag === tag.name ? 'primary' : 'info'"
          size="small"
          effect="plain"
          :hit="selectedTag === tag.name"
          style="cursor: pointer"
          @click="handleTagClick(tag.name)"
        >
          {{ tag.name }}
          <span v-if="tag.count !== undefined">({{ tag.count }})</span>
        </el-tag>
        <span v-if="favoriteStore.tags.length === 0" class="no-tags">
          暂无标签
        </span>
      </div>
    </div>

    <!-- 加载状态 -->
    <Loading v-if="initialLoading && favoriteStore.loading" />

    <!-- 错误状态 -->
    <Error
      v-else-if="favoriteStore.error"
      :message="favoriteStore.error.message"
      @retry="handleSearch"
    />

    <!-- 空状态 -->
    <Empty v-else-if="!favoriteStore.loading && favoriteStore.items.length === 0" description="暂无收藏内容" />

    <!-- 数据列表 -->
    <div v-else class="data-list">
      <TransitionGroup name="list-fade">
        <el-card
          v-for="item in favoriteStore.items"
          :key="item.localId"
          shadow="hover"
          class="data-card"
        >
          <div class="data-card__main">
            <div class="data-card__header-row">
              <div class="data-card__type">
                <el-tag :type="getFavTypeTag(item.type)" size="small" effect="dark">
                  {{ getFavTypeLabel(item.type) }}
                </el-tag>
              </div>
              <div class="data-card__meta">
                <span class="meta-item">
                  <el-icon size="12"><User /></el-icon>
                  {{ item.fromUser || '未知' }}
                </span>
                <span class="meta-divider">|</span>
                <span class="meta-item">{{ formatTime(item.updateTime) }}</span>
              </div>
            </div>

            <!-- 内容区域 -->
            <div class="data-card__content">
              <template v-if="item.contentType === 'text' && item.content">
                <p class="content-text">{{ item.content }}</p>
              </template>
              <template v-else>
                <div class="content-protobuf">
                  <el-icon size="16"><WarningFilled /></el-icon>
                  <span>二进制内容（{{ item.contentSize || '?' }} 字节）暂不支持预览</span>
                </div>
              </template>
            </div>

            <!-- 标签 -->
            <div v-if="item.tags && item.tags.length > 0" class="data-card__tags">
              <el-tag
                v-for="tag in item.tags"
                :key="tag.localId"
                size="small"
                type="info"
                effect="light"
              >
                {{ tag.name }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </TransitionGroup>

      <!-- 分页 -->
      <div v-if="favoriteStore.total > pageSize" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="favoriteStore.total"
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
.favorite-tab {
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
    gap: 12px;
    margin-bottom: 12px;
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

  .tags-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    flex-shrink: 0;
    overflow-x: auto;
    padding-bottom: 4px;

    &::-webkit-scrollbar {
      height: 2px;
    }

    .tags-label {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      white-space: nowrap;
    }

    .tags-list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .no-tags {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
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
      flex-direction: column;
      gap: 8px;
    }

    &__header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    &__meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--el-text-color-secondary);

      .meta-item {
        display: flex;
        align-items: center;
        gap: 3px;
      }

      .meta-divider {
        color: var(--el-border-color);
      }
    }

    &__content {
      .content-text {
        margin: 0;
        font-size: 14px;
        line-height: 1.6;
        color: var(--el-text-color-regular);
        white-space: pre-wrap;
        word-break: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 6;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .content-protobuf {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 12px;
        background-color: var(--el-fill-color-light);
        border-radius: 6px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }

    &__tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
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
