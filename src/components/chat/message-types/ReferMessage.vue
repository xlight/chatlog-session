<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types'

interface Props {
  message: Message
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  referMessage?: any
  referMessageType?: string | null
  showMediaResources: boolean
}

const props = defineProps<Props>()

const hasReferMessage = computed(() => !!props.referMessage)

const isTextRefer = computed(() => props.referMessageType === 'text')
const isImageRefer = computed(() => props.referMessageType === 'image')
const isLinkRefer = computed(() => props.referMessageType === 'link')
</script>

<template>
  <div class="message-refer">
    <div v-if="hasReferMessage" class="refer-content">
      <div class="refer-header">
        <el-icon class="refer-icon"><ChatLineSquare /></el-icon>
        <span class="refer-sender">{{
          referMessage.senderName || referMessage.sender
        }}</span>
      </div>

      <!-- 被引用的文本消息 -->
      <div v-if="isTextRefer" class="refer-text">
        {{ referMessage.content }}
      </div>

      <!-- 被引用的图片消息 -->
      <div v-else-if="isImageRefer" class="refer-media">
        <template v-if="showMediaResources">
          <el-icon><Picture /></el-icon>
        </template>
        <span>[图片]</span>
      </div>

      <!-- 被引用的链接消息 -->
      <div v-else-if="isLinkRefer" class="refer-media">
        <template v-if="showMediaResources">
          <el-icon><Link /></el-icon>
        </template>
        <span>{{ referMessage.contents?.title || '[链接]' }}</span>
      </div>
    </div>
    <div class="message-text">{{ message.content }}</div>
  </div>
</template>

<style lang="scss" scoped>
.message-refer {
  max-width: 100%;

  .refer-content {
    background: var(--el-fill-color-light);
    border-left: 3px solid var(--el-color-primary);
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 8px;

    .refer-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;

      .refer-icon {
        font-size: 14px;
        color: var(--el-color-primary);
      }

      .refer-sender {
        font-size: 12px;
        font-weight: 500;
        color: var(--el-color-primary);
      }
    }

    .refer-text {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      line-height: 1.5;
      word-break: break-word;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    .refer-media {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--el-text-color-secondary);

      .el-icon {
        font-size: 16px;
      }
    }
  }

  .message-text {
    font-size: 14px;
    line-height: 1.6;
    word-break: break-word;
    white-space: pre-wrap;
  }
}

html.dark {
  .refer-content {
    background: var(--el-fill-color-darker);
  }
}
</style>