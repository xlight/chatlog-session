<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types'
import { formatMessageTime } from '@/utils'
import Avatar from '@/components/common/Avatar.vue'

interface Props {
  message: Message
  showAvatar?: boolean
  showTime?: boolean
  showName?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true,
  showTime: false,
  showName: false
})

// 是否是自己发送的消息
const isSelf = computed(() => props.message.isSelf)

// 格式化消息时间
const messageTime = computed(() => {
  // 支持 createTime（Unix 时间戳秒）或 time（ISO 字符串）
  if (props.message.createTime) {
    return formatMessageTime(props.message.createTime)
  }
  return formatMessageTime(new Date(props.message.time).getTime() / 1000)
})

// 消息内容类型判断
const isTextMessage = computed(() => props.message.type === 1)
const isImageMessage = computed(() => props.message.type === 3)
const isVoiceMessage = computed(() => props.message.type === 34)
const isVideoMessage = computed(() => props.message.type === 43)
const isEmojiMessage = computed(() => props.message.type === 47)
const isFileMessage = computed(() => props.message.type === 49)
const isSystemMessage = computed(() => props.message.type === 10000)
const isReferMessage = computed(() => props.message.type === 49 && props.message.subType === 57)

// 文件名（从 contents 获取）
const fileName = computed(() => {
  return props.message.contents?.title || props.message.fileName || '未知文件'
})

// 文件 URL
const fileUrl = computed(() => {
  return props.message.contents?.url || props.message.fileUrl
})

// 引用消息内容
const referMessage = computed(() => {
  return props.message.contents?.refer
})

// 消息气泡类名
const bubbleClass = computed(() => {
  return {
    'message-bubble--self': isSelf.value,
    'message-bubble--other': !isSelf.value,
    'message-bubble--system': isSystemMessage.value
  }
})

// 处理图片点击
const handleImageClick = () => {
  // 预览图片逻辑
  console.log('预览图片:', props.message.content)
}

// 处理视频点击
const handleVideoClick = () => {
  // 播放视频逻辑
  console.log('播放视频:', props.message.content)
}

// 处理文件点击
const handleFileClick = () => {
  // 下载文件逻辑
  console.log('下载文件:', fileName.value, fileUrl.value)
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>

<template>
  <div class="message-bubble" :class="bubbleClass">
    <!-- 系统消息 -->
    <div v-if="isSystemMessage" class="message-bubble__system">
      <span class="system-text">{{ message.content }}</span>
    </div>

    <!-- 普通消息 -->
    <template v-else>
      <!-- 头像 (对方消息显示在左边) -->
      <div v-if="showAvatar && !isSelf" class="message-bubble__avatar">
        <Avatar
          :src="message.talkerAvatar"
          :name="message.senderName"
          :size="36"
        />
      </div>

      <div class="message-bubble__content">
        <!-- 发送者名称 (群聊中显示) -->
        <div v-if="showName && !isSelf" class="message-bubble__name">
          {{ message.senderName || message.sender }}
        </div>

        <!-- 消息时间 -->
        <div v-if="showTime" class="message-bubble__time">
          {{ messageTime }}
        </div>

        <!-- 消息主体 -->
        <div class="message-bubble__body">
          <!-- 文本消息 -->
          <div v-if="isTextMessage" class="message-text">
            {{ message.content }}
          </div>

          <!-- 图片消息 -->
          <div v-else-if="isImageMessage" class="message-image" @click="handleImageClick">
            <el-image
              :src="message.content"
              fit="cover"
              lazy
              :preview-src-list="[message.content]"
              class="image-content"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                  <span>图片加载失败</span>
                </div>
              </template>
            </el-image>
          </div>

          <!-- 语音消息 -->
          <div v-else-if="isVoiceMessage" class="message-voice">
            <el-icon class="voice-icon"><Microphone /></el-icon>
            <span>{{ message.content || '语音消息' }}</span>
          </div>

          <!-- 视频消息 -->
          <div v-else-if="isVideoMessage" class="message-video" @click="handleVideoClick">
            <div class="video-cover">
              <el-icon class="play-icon"><VideoPlay /></el-icon>
              <span class="video-duration">{{ message.content }}</span>
            </div>
          </div>

          <!-- 表情消息 -->
          <div v-else-if="isEmojiMessage" class="message-emoji">
            <img :src="message.content" alt="emoji" class="emoji-image" />
          </div>

          <!-- 引用消息 (type=49, subType=57) -->
          <div v-else-if="isReferMessage" class="message-refer">
            <div v-if="referMessage" class="refer-content">
              <div class="refer-sender">{{ referMessage.senderName || referMessage.sender }}</div>
              <div class="refer-text">{{ referMessage.content }}</div>
            </div>
            <div class="message-text">{{ message.content }}</div>
          </div>

          <!-- 文件消息 -->
          <div v-else-if="isFileMessage" class="message-file" @click="handleFileClick">
            <el-icon class="file-icon"><Document /></el-icon>
            <div class="file-info">
              <div class="file-name ellipsis">{{ fileName }}</div>
              <div v-if="message.fileSize" class="file-size">{{ formatFileSize(message.fileSize) }}</div>
              <div v-else class="file-size">未知大小</div>
            </div>
          </div>

          <!-- 未知类型 -->
          <div v-else class="message-unknown">
            <el-icon><QuestionFilled /></el-icon>
            <span>暂不支持的消息类型</span>
          </div>
        </div>

        <!-- 消息状态 (仅自己的消息) -->
        <div v-if="isSelf" class="message-bubble__status">
          <el-icon v-if="message.id" class="status-icon status-icon--sent">
            <Check />
          </el-icon>
          <el-icon v-else class="status-icon status-icon--sending">
            <Loading />
          </el-icon>
        </div>
      </div>

      <!-- 头像 (自己的消息显示在右边) -->
      <div v-if="showAvatar && isSelf" class="message-bubble__avatar">
        <Avatar
          :src="message.talkerAvatar"
          :name="message.talker"
          :size="36"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.message-bubble {
  display: flex;
  padding: 8px 16px;
  align-items: flex-start;
  
  &--self {
    flex-direction: row-reverse;
    
    .message-bubble__content {
      align-items: flex-end;
    }
    
    .message-bubble__body {
      background-color: var(--message-bg-self);
      color: #000;
    }
  }
  
  &--other {
    .message-bubble__body {
      background-color: var(--message-bg-other);
      color: var(--el-text-color-primary);
    }
  }
  
  &--system {
    justify-content: center;
    padding: 12px 16px;
  }
  
  &__system {
    padding: 4px 12px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
  
  &__avatar {
    flex-shrink: 0;
    margin: 0 12px;
  }
  
  &__content {
    display: flex;
    flex-direction: column;
    max-width: 60%;
    min-width: 0;
  }
  
  &__name {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 4px;
    padding: 0 8px;
  }
  
  &__time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
    margin-bottom: 8px;
  }
  
  &__body {
    padding: 10px 14px;
    border-radius: 8px;
    word-wrap: break-word;
    word-break: break-word;
    position: relative;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  &__status {
    display: flex;
    align-items: center;
    margin-top: 4px;
    padding: 0 8px;
    
    .status-icon {
      font-size: 14px;
      
      &--sent {
        color: var(--el-color-success);
      }
      
      &--sending {
        color: var(--el-text-color-secondary);
        animation: rotate 1s linear infinite;
      }
    }
  }
}

// 消息内容样式
.message-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-image {
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  max-width: 300px;
  
  .image-content {
    display: block;
    width: 100%;
    max-height: 300px;
    object-fit: cover;
  }
  
  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 12px;
    
    .el-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
  }
}

.message-voice {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-width: 100px;
  
  .voice-icon {
    font-size: 18px;
  }
  
  &:hover {
    opacity: 0.8;
  }
}

.message-video {
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  max-width: 300px;
  
  .video-cover {
    width: 100%;
    height: 200px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    .play-icon {
      font-size: 48px;
      color: #fff;
      opacity: 0.9;
    }
    
    .video-duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background-color: rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
  }
  
  &:hover .play-icon {
    opacity: 1;
  }
}

.message-emoji {
  background: transparent !important;
  padding: 0 !important;
  box-shadow: none !important;
  
  .emoji-image {
    width: 80px;
    height: 80px;
    object-fit: contain;
  }
}

.message-file {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 200px;
  
  .file-icon {
    font-size: 32px;
    color: var(--el-color-primary);
    flex-shrink: 0;
  }
  
  .file-info {
    flex: 1;
    min-width: 0;
    
    .file-name {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .file-size {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
  
  &:hover {
    opacity: 0.8;
  }
}

.message-unknown {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  
  .el-icon {
    font-size: 18px;
  }
}

// 动画
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 暗色模式适配
.dark-mode {
  .message-bubble {
    &--self {
      .message-bubble__body {
        background-color: #2d6a4f;
        color: #fff;
      }
    }
    
    &--other {
      .message-bubble__body {
        background-color: #2b2b2b;
      }
    }
  }
  
  .message-image .image-error {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

// 工具类
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>