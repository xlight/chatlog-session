<script setup lang="ts">
import Avatar from '@/components/common/Avatar.vue'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import type { Message } from '@/types'

interface Props {
  messages: Message[]
  loading?: boolean
  hasMore?: boolean
}

interface Emits {
  (e: 'message-click', message: Message): void
  (e: 'load-more'): void
}

withDefaults(defineProps<Props>(), {
  loading: false,
  hasMore: false
})

const emit = defineEmits<Emits>()

const handleMessageClick = (message: Message) => {
  emit('message-click', message)
}

const handleLoadMore = () => {
  emit('load-more')
}
</script>

<template>
  <div class="message-search-results">
    <div v-if="messages.length === 0" class="empty-state">
      <el-empty description="暂无搜索结果" />
    </div>

    <div v-else class="message-list">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-item"
        @click="handleMessageClick(message)"
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
      <div v-if="hasMore" class="load-more">
        <el-button
          :loading="loading"
          @click="handleLoadMore"
        >
          加载更多
        </el-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-search-results {
  .empty-state {
    padding: 40px 0;
  }

  .message-list {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .message-item {
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
    }
  }
}

// 响应式
@media (max-width: 768px) {
  .message-search-results {
    .message-list {
      .message-item {
        padding: 10px;
      }
    }
  }
}
</style>