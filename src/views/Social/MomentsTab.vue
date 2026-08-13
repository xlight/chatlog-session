/**
 * 朋友圈 Tab
 * 展示微信朋友圈时间线，支持按用户过滤、查看评论/点赞互动
 */

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMomentsStore } from '@/stores/moments'
import type { Moment } from '@/types/social'
import Loading from '@/components/common/Loading.vue'
import Empty from '@/components/common/Empty.vue'
import Error from '@/components/common/Error.vue'

const momentsStore = useMomentsStore()

const currentPage = ref(1)
const pageSize = ref(20)
const initialLoading = ref(true)

// 用户名过滤
const usernameFilter = ref('')

// 内容关键词过滤（后端 content 参数）
const contentFilter = ref('')

// 展开的评论列表
const expandedMoments = ref<Set<number>>(new Set())

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`

  return formatTime(timestamp)
}

// 预览内容（取前 200 字符）
function previewContent(content: string, maxLen = 200): string {
  if (content.length <= maxLen) return content
  return content.slice(0, maxLen) + '…'
}

function toggleExpand(tid: number) {
  if (expandedMoments.value.has(tid)) {
    expandedMoments.value.delete(tid)
  } else {
    expandedMoments.value.add(tid)
  }
}

function isExpanded(tid: number): boolean {
  return expandedMoments.value.has(tid)
}

/** 判断 URL 是否可被浏览器直接加载（http/https；本地路径降级） */
function isHttpUrl(url?: string): boolean {
  return !!url && /^https?:\/\//i.test(url)
}

/** 视频/未知类型占位描述 */
function getMomentFallback(moment: Moment): string {
  if (moment.contentType === 'video') return '视频动态（暂不支持播放）'
  return '该动态内容暂不支持预览'
}

async function handleSearch() {
  currentPage.value = 1
  await momentsStore.fetch({
    username: usernameFilter.value || undefined,
    content: contentFilter.value || undefined,
    limit: pageSize.value,
    offset: 0,
  })
}

async function handlePageChange(page: number) {
  currentPage.value = page
  const offset = (page - 1) * pageSize.value
  momentsStore.setPage(pageSize.value, offset)
  await momentsStore.fetch()
}

onMounted(async () => {
  initialLoading.value = true
  await momentsStore.fetch({ limit: pageSize.value, offset: 0 })
  initialLoading.value = false
})
</script>

<template>
  <div class="moments-tab">
    <!-- 页头 -->
    <div class="tab-header">
      <div class="header-left">
        <h2>朋友圈</h2>
        <span v-if="momentsStore.total > 0" class="header-count">
          共 {{ momentsStore.total }} 条动态
        </span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">用户</span>
        <el-input
          v-model="usernameFilter"
          size="small"
          placeholder="输入 wxid 筛选…"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="filter-group">
        <span class="filter-label">内容</span>
        <el-input
          v-model="contentFilter"
          size="small"
          placeholder="搜索动态内容…"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-button type="primary" size="small" :loading="momentsStore.loading" @click="handleSearch">
        <el-icon class="el-icon--left"><Search /></el-icon>
        查询
      </el-button>
    </div>

    <!-- 加载状态 -->
    <Loading v-if="initialLoading && momentsStore.loading" />

    <!-- 错误状态 -->
    <Error
      v-else-if="momentsStore.error"
      :message="momentsStore.error.message"
      @retry="handleSearch"
    />

    <!-- 空状态 -->
    <Empty v-else-if="!momentsStore.loading && momentsStore.items.length === 0" description="暂无朋友圈动态" />

    <!-- 朋友圈列表 -->
    <div v-else class="data-list">
      <TransitionGroup name="moments-fade">
        <div
          v-for="moment in momentsStore.items"
          :key="moment.tid"
          class="moment-card"
        >
          <!-- 头像和作者信息 -->
          <div class="moment-card__header">
            <div class="moment-card__avatar">
              <el-avatar :size="44">
                <el-icon size="24"><User /></el-icon>
              </el-avatar>
            </div>
            <div class="moment-card__author">
              <span class="author-name">{{ moment.nickname || moment.username }}</span>
              <el-tag v-if="moment.isTop" size="small" type="warning" effect="plain" class="top-tag">
                置顶
              </el-tag>
              <span class="author-time">{{ formatRelativeTime(moment.createTime) }}</span>
            </div>
          </div>

          <!-- 内容 -->
          <div class="moment-card__body">
            <!-- 文本 -->
            <template v-if="moment.contentType === 'text' && moment.content">
              <p
                class="moment-text"
                :class="{ expanded: isExpanded(moment.tid) }"
                @click="toggleExpand(moment.tid)"
              >
                {{ isExpanded(moment.tid) ? moment.content : previewContent(moment.content) }}
              </p>
              <span
                v-if="moment.content.length > 200"
                class="moment-expand-btn"
                @click="toggleExpand(moment.tid)"
              >
                {{ isExpanded(moment.tid) ? '收起' : '展开全文' }}
              </span>
            </template>

            <!-- 链接卡片（标题 + 分享来源） -->
            <template v-else-if="moment.contentType === 'link'">
              <a
                v-if="isHttpUrl(moment.url)"
                class="moment-link-card"
                :href="moment.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="link-title">{{ moment.title || '链接' }}</span>
                <span v-if="moment.sourceNickName" class="link-source">
                  分享自 {{ moment.sourceNickName }}
                </span>
              </a>
              <div v-else class="moment-link-card">
                <span class="link-title">{{ moment.title || '链接' }}</span>
                <span v-if="moment.sourceNickName" class="link-source">
                  分享自 {{ moment.sourceNickName }}
                </span>
              </div>
            </template>

            <!-- 图片缩略图网格（URL 不可达时降级文字） -->
            <template v-else-if="moment.contentType === 'image'">
              <div v-if="moment.mediaList && moment.mediaList.length > 0" class="moment-images">
                <template v-for="(media, idx) in moment.mediaList" :key="idx">
                  <img
                    v-if="isHttpUrl(media.thumb || media.hdThumb || media.url)"
                    class="moment-image"
                    :src="media.thumb || media.hdThumb || media.url"
                    :alt="moment.content || '朋友圈图片'"
                    loading="lazy"
                  />
                </template>
              </div>
              <div v-else class="moment-protobuf">
                <el-icon size="16"><Picture /></el-icon>
                <span>图片动态（{{ moment.mediaList?.length ?? '?' }} 张，暂无法预览）</span>
              </div>
            </template>

            <!-- 视频/未知类型占位 -->
            <template v-else>
              <div class="moment-protobuf">
                <el-icon size="16"><WarningFilled /></el-icon>
                <span>{{ getMomentFallback(moment) }}</span>
              </div>
            </template>
          </div>

          <!-- 互动区域 -->
          <div v-if="moment.likes.length > 0 || moment.comments.length > 0" class="moment-card__interactions">
            <!-- 点赞列表 -->
            <div v-if="moment.likes.length > 0" class="interaction-likes">
              <el-icon size="14" class="like-icon"><Goods /></el-icon>
              <span
                v-for="(like, idx) in moment.likes"
                :key="idx"
                class="like-name"
              >
                {{ like.fromNickname || like.fromUsername }}<template v-if="idx < moment.likes.length - 1">, </template>
              </span>
            </div>

            <!-- 评论列表 -->
            <div v-if="moment.comments.length > 0" class="interaction-comments">
              <div
                v-for="(comment, idx) in moment.comments"
                :key="idx"
                class="comment-item"
              >
                <span class="comment-author">{{ comment.fromNickname || comment.fromUsername }}</span>
                <span class="comment-colon">：</span>
                <span class="comment-content">{{ comment.content }}</span>
              </div>
            </div>
          </div>

          <!-- 时间戳 -->
          <div class="moment-card__footer">
            <span class="footer-time">{{ formatTime(moment.createTime) }}</span>
          </div>
        </div>
      </TransitionGroup>

      <!-- 分页 -->
      <div v-if="momentsStore.total > pageSize" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="momentsStore.total"
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
.moments-tab {
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

  .moment-card {
    background-color: var(--el-bg-color-overlay);
    border-radius: 10px;
    padding: 16px 18px;
    margin-bottom: 12px;
    border: 1px solid var(--el-border-color-light);
    transition: box-shadow 0.2s;

    &:hover {
      box-shadow: var(--el-box-shadow-light);
    }

    &__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    &__author {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .author-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .top-tag {
        align-self: flex-start;
        margin: 2px 0;
      }

      .author-time {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    &__body {
      margin-bottom: 10px;

      .moment-text {
        margin: 0;
        font-size: 14px;
        line-height: 1.7;
        color: var(--el-text-color-regular);
        white-space: pre-wrap;
        word-break: break-word;
        cursor: pointer;
        transition: all 0.2s;
      }

      .moment-expand-btn {
        font-size: 13px;
        color: var(--el-color-primary);
        cursor: pointer;
        display: inline-block;
        margin-top: 4px;

        &:hover {
          text-decoration: underline;
        }
      }

      .moment-protobuf {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 12px;
        background-color: var(--el-fill-color-light);
        border-radius: 6px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }

      .moment-link-card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 10px 12px;
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 6px;
        text-decoration: none;
        transition: border-color 0.2s;

        &:hover {
          border-color: var(--el-color-primary);
        }

        .link-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .link-source {
          font-size: 12px;
          color: var(--el-text-color-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .moment-images {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 6px;

        .moment-image {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          border-radius: 6px;
          background-color: var(--el-fill-color-light);
        }
      }
    }

    &__interactions {
      background-color: var(--el-fill-color-lighter);
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 8px;

      .interaction-likes {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        flex-wrap: wrap;

        .like-icon {
          color: var(--el-color-primary);
          flex-shrink: 0;
        }

        .like-name {
          font-size: 13px;
          color: var(--el-color-primary);
        }
      }

      .interaction-comments {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .comment-item {
          font-size: 13px;
          line-height: 1.5;
        }

        .comment-author {
          font-weight: 500;
          color: var(--el-color-primary);
        }

        .comment-colon {
          color: var(--el-text-color-regular);
        }

        .comment-content {
          color: var(--el-text-color-regular);
          word-break: break-word;
        }
      }
    }

    &__footer {
      display: flex;
      justify-content: flex-end;

      .footer-time {
        font-size: 11px;
        color: var(--el-text-color-placeholder);
      }
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
.moments-fade-enter-active,
.moments-fade-leave-active {
  transition: all 0.3s ease;
}

.moments-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.moments-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
