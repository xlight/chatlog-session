<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Message } from '@/types'
import { formatMessageTime } from '@/utils'
import Avatar from '@/components/common/Avatar.vue'
import { useAppStore } from '@/stores/app'

// 获取 API Base URL
const getApiBaseUrl = (): string => {
  const directUrl = localStorage.getItem('apiBaseUrl')
  if (directUrl) {
    return directUrl
  }
  const settings = localStorage.getItem('chatlog-settings')
  if (settings) {
    try {
      const parsed = JSON.parse(settings)
      if (parsed.apiBaseUrl) {
        return parsed.apiBaseUrl
      }
    } catch (err) {
      console.error('解析设置失败:', err)
    }
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5030'
}

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

// 获取 app store
const appStore = useAppStore()

// 是否显示媒体资源
const showMediaResources = computed(() => appStore.settings.showMediaResources)

// 获取媒体消息的文本描述
const getMediaPlaceholder = (type: number, subType?: number, fileName?: string) => {
  if (type === 3) return '[图片]'
  if (type === 34) return '[语音]'
  if (type === 43) return '[视频]'
  if (type === 47) return '[表情]'
  if (type === 49) {
    if (subType === 5) {
      const title = props.message.contents?.title
      return title ? `[链接] ${title}` : '[链接]'
    }
    if (subType === 6) return fileName ? `[文件] ${fileName}` : '[文件]'
    if (subType === 19) return '[聊天记录]'
  }
  return '[媒体]'
}

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
const isSystemMessage = computed(() => props.message.type === 10000)

// type=49 的各种子类型
const isReferMessage = computed(() => props.message.type === 49 && props.message.subType === 57)
const isLinkMessage = computed(() => props.message.type === 49 && props.message.subType === 5)
const isForwardedMessage = computed(() => props.message.type === 49 && props.message.subType === 19)
const isFileMessage = computed(() => props.message.type === 49 && props.message.subType === 6)
const isOtherRichMessage = computed(() => props.message.type === 49 && !isReferMessage.value && !isLinkMessage.value && !isForwardedMessage.value && !isFileMessage.value)

// 图片相关
const imageUrl = computed(() => {
  // 优先使用 content 字段，如果没有则使用 MD5（需要配合图片服务）
  if (props.message.content) {
    return props.message.content
  }
  if (props.message.contents?.md5) {
    const apiBaseUrl = getApiBaseUrl()
    return `${apiBaseUrl}/image/${props.message.contents.md5}`
  }
  return ''
})

// 视频相关
const videoUrl = computed(() => {
  if (props.message.content) {
    return props.message.content
  }
  if (props.message.contents?.md5) {
    const apiBaseUrl = getApiBaseUrl()
    return `${apiBaseUrl}/video/${props.message.contents.md5}`
  }
  return ''
})

// 表情相关
const emojiUrl = computed(() => {
  if (props.message.content) {
    return props.message.content
  }
  if (props.message.contents?.md5) {
    const apiBaseUrl = getApiBaseUrl()
    return `${apiBaseUrl}/image/${props.message.contents.md5}`
  }
  return ''
})

// 文件相关
const fileUrl = computed(() => {
  if (props.message.content) {
    return props.message.content
  }
  if (props.message.contents?.md5) {
    const apiBaseUrl = getApiBaseUrl()
    return `${apiBaseUrl}/file/${props.message.contents.md5}`
  }
  return ''
})

// 文件名（从 contents 获取）
const fileName = computed(() => {
  return props.message.contents?.title || props.message.fileName || '未知文件'
})

// 链接相关
const linkTitle = computed(() => props.message.contents?.title || '链接')
const linkUrl = computed(() => props.message.contents?.url || props.message.fileUrl || '')

// 转发消息包相关
const forwardedTitle = computed(() => props.message.contents?.title || '聊天记录')
const forwardedDesc = computed(() => props.message.contents?.desc || '')
const forwardedCount = computed(() => {
  const count = props.message.contents?.recordInfo?.DataList?.Count
  return count ? parseInt(count) : 0
})

// 引用消息内容
const referMessage = computed(() => {
  return props.message.contents?.refer
})

// 判断引用消息的类型
const referMessageType = computed(() => {
  if (!referMessage.value) return null
  const refer = referMessage.value
  if (refer.type === 3) return 'image'
  if (refer.type === 49 && refer.subType === 5) return 'link'
  return 'text'
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
  console.log('预览图片:', imageUrl.value)
}

// 处理视频点击
const handleVideoClick = () => {
  // 播放视频逻辑
  console.log('播放视频:', props.message.content)
}

// 处理文件点击
const handleFileClick = () => {
  // 下载文件逻辑
  if (fileUrl.value) {
    window.open(fileUrl.value, '_blank')
  }
  console.log('下载文件:', fileName.value, fileUrl.value)
}

// 处理链接点击
const handleLinkClick = () => {
  if (linkUrl.value) {
    window.open(linkUrl.value, '_blank')
  }
}

// 转发消息 Dialog
const forwardedDialogVisible = ref(false)

// 处理转发消息点击
const handleForwardedClick = () => {
  console.log('查看转发消息:', props.message.contents)
  forwardedDialogVisible.value = true
}

// 获取转发消息列表
const forwardedMessages = computed(() => {
  const dataItems = props.message.contents?.recordInfo?.DataList?.DataItems
  if (!dataItems || !Array.isArray(dataItems)) return []
  return dataItems
})

// 格式化转发消息的类型
const getForwardedMessageType = (dataType: string) => {
  const typeMap: Record<string, string> = {
    '1': '文本',
    '2': '图片',
    '3': '图片',
    '8': '文件',
    '34': '语音',
    '43': '视频'
  }
  return typeMap[dataType] || '未知'
}

// 格式化转发消息的图标
const getForwardedMessageIcon = (dataType: string) => {
  const iconMap: Record<string, string> = {
    '1': 'ChatLineSquare',
    '2': 'Picture',
    '3': 'Picture',
    '8': 'Document',
    '34': 'Microphone',
    '43': 'VideoPlay'
  }
  return iconMap[dataType] || 'QuestionFilled'
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
      <div v-if="!isSelf" class="message-bubble__avatar">
        <Avatar
          v-if="showAvatar"
          :src="message.talkerAvatar"
          :name="message.senderName"
          :size="36"
        />
        <div v-else class="avatar-placeholder"></div>
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
            <template v-if="showMediaResources">
              <el-image
                v-if="imageUrl"
                :src="imageUrl"
                fit="cover"
                lazy
                :preview-src-list="[imageUrl]"
                class="image-content"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>图片加载失败</span>
                  </div>
                </template>
              </el-image>
              <div v-else class="image-placeholder">
                <el-icon><Picture /></el-icon>
                <span>图片 (MD5: {{ message.contents?.md5?.substring(0, 8) }}...)</span>
              </div>
            </template>
            <span v-else class="media-placeholder">{{ getMediaPlaceholder(3) }}</span>
          </div>

          <!-- 语音消息 -->
          <div v-else-if="isVoiceMessage" class="message-voice">
            <template v-if="showMediaResources">
              <el-icon class="voice-icon"><Microphone /></el-icon>
              <span>{{ message.content || '语音消息' }}</span>
            </template>
            <span v-else class="media-placeholder">{{ getMediaPlaceholder(34) }}</span>
          </div>

          <!-- 视频消息 -->
          <div v-else-if="isVideoMessage" class="message-video" @click="handleVideoClick">
            <template v-if="showMediaResources">
              <div v-if="videoUrl" class="video-cover">
                <el-icon class="play-icon"><VideoPlay /></el-icon>
                <span class="video-duration">{{ message.content }}</span>
              </div>
              <div v-else class="video-placeholder">
                <el-icon><VideoCamera /></el-icon>
                <span>视频 (MD5: {{ message.contents?.md5?.substring(0, 8) }}...)</span>
              </div>
            </template>
            <span v-else class="media-placeholder">{{ getMediaPlaceholder(43) }}</span>
          </div>

          <!-- 表情消息 -->
          <div v-else-if="isEmojiMessage" class="message-emoji">
            <template v-if="showMediaResources">
              <img v-if="emojiUrl" :src="emojiUrl" alt="emoji" class="emoji-image" />
              <div v-else class="emoji-placeholder">
                <el-icon><HappyFilled /></el-icon>
                <span>表情 (MD5: {{ message.contents?.md5?.substring(0, 8) }}...)</span>
              </div>
            </template>
            <span v-else class="media-placeholder">{{ getMediaPlaceholder(47) }}</span>
          </div>

          <!-- 引用消息 (type=49, subType=57) -->
          <div v-else-if="isReferMessage" class="message-refer">
            <div v-if="referMessage" class="refer-content">
              <div class="refer-header">
                <el-icon class="refer-icon"><ChatLineSquare /></el-icon>
                <span class="refer-sender">{{ referMessage.senderName || referMessage.sender }}</span>
              </div>

              <!-- 被引用的文本消息 -->
              <div v-if="referMessageType === 'text'" class="refer-text">
                {{ referMessage.content }}
              </div>

              <!-- 被引用的图片消息 -->
              <div v-else-if="referMessageType === 'image'" class="refer-media">
                <template v-if="showMediaResources">
                  <el-icon><Picture /></el-icon>
                </template>
                <span>[图片]</span>
              </div>

              <!-- 被引用的链接消息 -->
              <div v-else-if="referMessageType === 'link'" class="refer-media">
                <template v-if="showMediaResources">
                  <el-icon><Link /></el-icon>
                </template>
                <span>{{ referMessage.contents?.title || '[链接]' }}</span>
              </div>
            </div>
            <div class="message-text">{{ message.content }}</div>
          </div>

          <!-- 链接分享 (type=49, subType=5) -->
          <div v-else-if="isLinkMessage" class="message-link" @click="handleLinkClick">
            <template v-if="showMediaResources">
              <div class="link-content">
                <div class="link-title">{{ linkTitle }}</div>
                <div v-if="linkUrl" class="link-url">{{ linkUrl }}</div>
              </div>
              <el-icon class="link-arrow"><Right /></el-icon>
            </template>
            <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 5) }}</span>
          </div>

          <!-- 转发消息包 (type=49, subType=19) -->
          <div v-else-if="isForwardedMessage" class="message-forwarded" @click="handleForwardedClick">
              <div class="forwarded-header">
                <el-icon class="forwarded-icon"><ChatDotSquare /></el-icon>
                <span class="forwarded-title">{{ forwardedTitle }}</span>
              </div>
              <div v-if="forwardedDesc" class="forwarded-desc">{{ forwardedDesc }}</div>
              <div class="forwarded-footer">
                <span v-if="forwardedCount > 0" class="forwarded-count">共{{ forwardedCount }}条消息</span>
                <span v-else class="forwarded-hint">点击查看聊天记录</span>
              </div>
          </div>

          <!-- 文件消息 (type=49, subType=6) -->
          <div v-else-if="isFileMessage" class="message-file" @click="handleFileClick">
            <template v-if="showMediaResources">
              <el-icon class="file-icon"><Document /></el-icon>
              <div class="file-info">
                <div class="file-name ellipsis">{{ fileName }}</div>
                <div v-if="message.fileSize" class="file-size">{{ formatFileSize(message.fileSize) }}</div>
                <div v-else-if="message.contents?.md5" class="file-size">
                  MD5: {{ message.contents.md5.substring(0, 8) }}...
                </div>
                <div v-else class="file-size">未知大小</div>
              </div>
            </template>
            <span v-else class="media-placeholder">{{ getMediaPlaceholder(49, 6, fileName) }}</span>
          </div>

          <!-- 其他富文本消息 (type=49, 其他subType) -->
          <div v-else-if="isOtherRichMessage" class="message-rich">
            <el-icon><Postcard /></el-icon>
            <div class="rich-info">
              <div class="rich-title">{{ fileName }}</div>
              <div class="rich-type">类型: {{ message.subType }}</div>
            </div>
          </div>

          <!-- 未知类型 -->
          <div v-else class="message-unknown">
            <el-icon><QuestionFilled /></el-icon>
            <span>暂不支持的消息类型 (type={{ message.type }}, subType={{ message.subType }})</span>
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
      <div v-if="isSelf" class="message-bubble__avatar">
        <Avatar
          v-if="showAvatar"
          :src="message.talkerAvatar"
          :name="'我'"
          :size="36"
        />
        <div v-else class="avatar-placeholder"></div>
      </div>
    </template>

    <!-- 转发消息详情对话框 -->
    <el-dialog
      v-model="forwardedDialogVisible"
      :title="forwardedTitle"
      width="600px"
      :close-on-click-modal="true"
    >
      <div class="forwarded-dialog">
        <div v-if="forwardedMessages.length > 0" class="forwarded-list">
          <div
            v-for="(item, index) in forwardedMessages"
            :key="index"
            class="forwarded-item"
          >
            <div class="forwarded-item-header">
              <Avatar
                :name="item.SourceName"
                :size="32"
              />
              <div class="forwarded-item-info">
                <div class="forwarded-item-sender">{{ item.SourceName }}</div>
                <div class="forwarded-item-time">{{ item.SourceTime }}</div>
              </div>
            </div>

            <div class="forwarded-item-content">
              <!-- 文本消息 -->
              <div v-if="item.DataType === '1'" class="forwarded-text">
                {{ item.DataDesc }}
              </div>

              <!-- 图片消息 -->
              <div v-else-if="item.DataType === '2' || item.DataType === '3'" class="forwarded-media">
                <el-icon><Picture /></el-icon>
                <span>[图片]</span>
                <span v-if="item.DataSize" class="media-size">{{ formatFileSize(parseInt(item.DataSize)) }}</span>
              </div>

              <!-- 文件消息 -->
              <div v-else-if="item.DataType === '8'" class="forwarded-file">
                <el-icon><Document /></el-icon>
                <div class="file-details">
                  <div class="file-name">{{ item.DataTitle }}</div>
                  <div v-if="item.DataSize" class="file-size">{{ formatFileSize(parseInt(item.DataSize)) }}</div>
                </div>
              </div>

              <!-- 其他类型 -->
              <div v-else class="forwarded-other">
                <el-icon><component :is="getForwardedMessageIcon(item.DataType)" /></el-icon>
                <span>[{{ getForwardedMessageType(item.DataType) }}]</span>
              </div>
            </div>
          </div>
        </div>

        <el-empty v-else description="暂无消息内容" />
      </div>

      <template #footer>
        <el-button @click="forwardedDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
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

    .avatar-placeholder {
      width: 36px;
      height: 36px;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    max-width: 60%;
    min-width: 0;
    overflow: hidden;
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

.message-refer {
  .refer-content {
    background-color: rgba(0, 0, 0, 0.05);
    border-left: 3px solid var(--el-color-primary);
    padding: 8px 12px;
    margin-bottom: 8px;
    border-radius: 4px;

    .refer-header {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;

      .refer-icon {
        font-size: 14px;
        color: var(--el-color-primary);
      }

      .refer-sender {
        font-size: 12px;
        color: var(--el-color-primary);
        font-weight: 500;
      }
    }

    .refer-text {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      line-height: 1.4;
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
      gap: 4px;
      font-size: 13px;
      color: var(--el-text-color-secondary);

      .el-icon {
        font-size: 16px;
      }
    }
  }

  .message-text {
    font-size: 14px;
  }
}

.message-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  min-width: 240px;

  .link-content {
    flex: 1;
    min-width: 0;

    .link-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .link-url {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .link-arrow {
    font-size: 18px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }

  &:hover {
    opacity: 0.8;
  }
}

.message-forwarded {
  cursor: pointer;


  .forwarded-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .forwarded-icon {
      font-size: 20px;
      color: var(--el-color-primary);
    }

    .forwarded-title {
      font-size: 14px;
      font-weight: 500;
    }
  }

  .forwarded-desc {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    line-height: 1.5;
    margin-bottom: 8px;
    max-height: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .forwarded-footer {
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);

    .forwarded-count,
    .forwarded-hint {
      font-size: 12px;
      color: var(--el-color-primary);
    }
  }

  &:hover {
    opacity: 0.9;
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

.message-rich {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;

  .el-icon {
    font-size: 32px;
    color: var(--el-color-info);
    flex-shrink: 0;
  }

  .rich-info {
    flex: 1;
    min-width: 0;

    .rich-title {
      font-size: 14px;
      margin-bottom: 4px;
    }

    .rich-type {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  border-radius: 4px;

  .el-icon {
    font-size: 32px;
    margin-bottom: 8px;
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

.media-placeholder {
  display: inline-block;
  padding: 8px 12px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  font-style: italic;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  border: 1px dashed var(--el-border-color);

  &:hover {
    background: var(--el-fill-color);
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

  .message-image .image-error,
  .image-placeholder {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .message-refer .refer-content {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }

  .message-forwarded .forwarded-footer {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}

// 工具类
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 转发消息对话框
.forwarded-dialog {
  max-height: 500px;
  overflow-y: auto;

  .forwarded-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .forwarded-item {
    padding: 12px;
    background-color: var(--el-fill-color-lighter);
    border-radius: 8px;

    &-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    &-info {
      flex: 1;
      min-width: 0;
    }

    &-sender {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      margin-bottom: 2px;
    }

    &-time {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    &-content {
      padding-left: 44px;
    }
  }

  .forwarded-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--el-text-color-primary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .forwarded-media,
  .forwarded-other {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--el-text-color-secondary);

    .el-icon {
      font-size: 20px;
    }

    .media-size {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
    }
  }

  .forwarded-file {
    display: flex;
    align-items: center;
    gap: 12px;

    .el-icon {
      font-size: 32px;
      color: var(--el-color-primary);
    }

    .file-details {
      flex: 1;
      min-width: 0;

      .file-name {
        font-size: 14px;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .file-size {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }
  }
}

.dark-mode {
  .forwarded-dialog {
    .forwarded-item {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
}
</style>
