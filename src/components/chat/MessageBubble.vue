<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Message } from '@/types'
import { formatMessageTime } from '@/utils'
import Avatar from '@/components/common/Avatar.vue'
import { useAppStore } from '@/stores/app'
import { mediaAPI } from '@/api/media'
import { useMessageContent } from './composables/useMessageContent'
import { useMessageUrl } from './composables/useMessageUrl'
import { MoreFilled } from '@element-plus/icons-vue'

// 消息类型组件
import TextMessage from './message-types/TextMessage.vue'
import ImageMessage from './message-types/ImageMessage.vue'
import VideoMessage from './message-types/VideoMessage.vue'
import VoiceMessage from './message-types/VoiceMessage.vue'
import EmojiMessage from './message-types/EmojiMessage.vue'
import FileMessage from './message-types/FileMessage.vue'
import LinkMessage from './message-types/LinkMessage.vue'
import MiniProgramMessage from './message-types/MiniProgramMessage.vue'
import ShoppingMiniProgramMessage from './message-types/ShoppingMiniProgramMessage.vue'
import ShortVideoMessage from './message-types/ShortVideoMessage.vue'
import PatMessage from './message-types/PatMessage.vue'
import LiveMessage from './message-types/LiveMessage.vue'
import JielongMessage from './message-types/JielongMessage.vue'
import ForwardedMessage from './message-types/ForwardedMessage.vue'
import ForwardedDialog from './message-types/ForwardedDialog.vue'
import RedPacketMessage from './message-types/RedPacketMessage.vue'
import LocationMessage from './message-types/LocationMessage.vue'
import ContactCardMessage from './message-types/ContactCardMessage.vue'
import TransferMessage from './message-types/TransferMessage.vue'
import QQMailMessage from './message-types/QQMailMessage.vue'
import QQMusicMessage from './message-types/QQMusicMessage.vue'
import CardPackageMessage from './message-types/CardPackageMessage.vue'
import VoiceCallMessage from './message-types/VoiceCallMessage.vue'

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

// 定义 emits
const emit = defineEmits<{
  'gap-click': [message: Message]
}>()

// 获取 app store
const appStore = useAppStore()

// 是否显示媒体资源
const showMediaResources = computed(() => appStore.settings.showMediaResources)

// 使用消息内容判断逻辑
const {
  isTextMessage,
  isImageMessage,
  isVoiceMessage,
  isContactCardMessage,
  isVideoMessage,
  isEmojiMessage,
  isLocationMessage,
  isSystemMessage,
  isRevokeMessage,
  isGapMessage,
  isEmptyRangeMessage,
  isQQMusicMessage,
  isVideoLinkMessage,
  isCardPackageMessage,
  isReferMessage,
  isLinkMessage,
  isForwardedMessage,
  isFileMessage,
  isMiniProgramMessage,
  isShoppingMiniProgramMessage,
  isShortVideoMessage,
  isPatMessage,
  isLiveMessage,
  isJielongMessage,
  isTransferMessage,
  isRedPacketMessage,
  isOtherRichMessage,
  referMessage,
  referMessageType,
  isSelf,
  isQQMailMessage,
  isVoiceCallMessage
} = useMessageContent(props.message)

// 使用 URL 处理逻辑
const {
  imageThumbUrl,
  imageUrl,
  videoUrl,
  voiceUrl,
  emojiUrl,
  fileUrl,
  fileName,
  linkTitle,
  linkUrl,
  forwardedTitle,
  forwardedDesc,
  forwardedCount,
  miniProgramTitle,
  miniProgramUrl,
  shoppingMiniProgramTitle,
  shoppingMiniProgramUrl,
  shoppingMiniProgramDesc,
  shoppingMiniProgramThumb,
  shortVideoTitle,
  shortVideoUrl,
  liveTitle,
  locationLabel,
  locationX,
  locationY,
  locationCityname
} = useMessageUrl(props.message)

// 格式化消息时间
const messageTime = computed(() => {
  if (props.message.createTime) {
    return formatMessageTime(props.message.createTime)
  }
  return formatMessageTime(new Date(props.message.time).getTime() / 1000)
})

// 获取头像 URL
const avatarUrl = computed(() => {
  // 优先使用消息中自带的头像
  if (props.message.talkerAvatar) {
    return props.message.talkerAvatar
  }

  // 确定要获取头像的用户 ID
  let username = ''
  if (isSelf.value) {
    // 如果是自己，尝试使用 sender
    username = props.message.sender
  } else {
    // 如果是对方
    if (props.message.isChatRoom) {
      // 群聊显示发送者头像
      username = props.message.sender
    } else {
      // 私聊显示聊天对象头像
      username = props.message.talker
    }
  }

  if (!username) return ''

  // 构造 API URL
  return mediaAPI.getAvatarUrl(`avatar/${username}`)
})

// 消息气泡类名
const bubbleClass = computed(() => {
  return {
    'message-bubble--self': isSelf.value,
    'message-bubble--other': !isSelf.value,
    'message-bubble--system': isSystemMessage.value || isRevokeMessage.value,
    'message-bubble--virtual': isGapMessage.value || isEmptyRangeMessage.value
  }
})

// 处理图片点击
const handleImageClick = () => {
  console.log('预览图片:', imageUrl.value)
}

// 处理视频点击
const handleVideoClick = () => {
  console.log('播放视频:', props.message.content)
}

// 处理文件点击
const handleFileClick = () => {
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

const handleVideoLinkClick = () => {
  if (linkUrl.value) {
    window.open(linkUrl.value, '_blank')
  }
}

const handleMiniProgramClick = () => {
  if (miniProgramUrl.value) {
    window.open(miniProgramUrl.value, '_blank')
  }
  console.log('打开小程序:', miniProgramTitle.value)
}

// 处理购物小程序点击
const handleShoppingMiniProgramClick = () => {
  if (shoppingMiniProgramUrl.value) {
    window.open(shoppingMiniProgramUrl.value, '_blank')
  }
  console.log('打开购物小程序:', shoppingMiniProgramTitle.value)
}

// 处理小视频点击
const handleShortVideoClick = () => {
  if (shortVideoUrl.value) {
    window.open(shortVideoUrl.value, '_blank')
  }
  console.log('播放小视频:', shortVideoTitle.value)
}

// 处理位置消息点击
const handleLocationClick = () => {
  if (locationX.value && locationY.value) {
    const mapUrl = `https://apis.map.qq.com/uri/v1/marker?marker=coord:${locationX.value},${locationY.value};title:${encodeURIComponent(locationLabel.value)}&referer=chatlog-session`
    window.open(mapUrl, '_blank')
  }
  console.log('查看位置:', locationLabel.value)
}

// 处理个人名片点击
const handleContactCardClick = () => {
  console.log('查看个人名片')
}

// 处理转账点击
const handleTransferClick = () => {
  console.log('查看转账:', props.message.content)
}

// 处理 QQ 音乐点击
const handleQQMusicClick = () => {
  console.log('查看 QQ 音乐')
}

// 处理微信卡包点击
const handleCardPackageClick = () => {
  console.log('查看微信卡包')
}

// 处理语音通话点击
const handleVoiceCallClick = () => {
  console.log('查看语音通话详情')
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


</script>

<template>
  <div class="message-bubble" :class="bubbleClass">
    <!-- 系统消息 -->
    <div v-if="isSystemMessage" class="message-bubble__system">
      <span class="system-text">{{ message.content }}</span>
    </div>

    <!-- 撤回消息 -->
    <div v-else-if="isRevokeMessage" class="message-bubble__system">
      <span class="system-text">{{ message.content }}</span>
    </div>

    <!-- Gap 虚拟消息 -->
    <div v-else-if="isGapMessage" class="message-bubble__virtual message-bubble__gap" @click="emit('gap-click', message)">
      <el-button text>
        <el-icon><MoreFilled /></el-icon>
        <span>{{ message.content }}</span>
      </el-button>
    </div>

    <!-- EmptyRange 虚拟消息 -->
    <div v-else-if="isEmptyRangeMessage" class="message-bubble__virtual message-bubble__empty-range">
      <span class="virtual-text">📭 {{ appStore.isDebug ? 'EmptyRange: ' : '' }}{{ message.content }}</span>
    </div>

    <!-- 拍一拍消息 (type=49, subType=62) -->
    <PatMessage
      v-else-if="isPatMessage"
      :content="message.content"
      :show-media-resources="showMediaResources"
    />

    <!-- 普通消息 -->
    <template v-else>
      <!-- 头像 (对方消息显示在左边) -->
      <div v-if="!isSelf" class="message-bubble__avatar">
        <Avatar
          v-if="showAvatar"
          :src="avatarUrl"
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
          <TextMessage v-if="isTextMessage" :content="message.content" />

          <!-- 图片消息 -->
          <ImageMessage
            v-else-if="isImageMessage"
            :thumb-url="imageThumbUrl"
            :image-url="imageUrl"
            :show-media-resources="showMediaResources"
            :md5="message.contents?.md5"
            @click="handleImageClick"
          />

          <!-- 语音消息 -->
          <VoiceMessage
            v-else-if="isVoiceMessage"
            :voice-url="voiceUrl"
            :duration="message.duration"
            :is-self="isSelf"
            :show-media-resources="showMediaResources"
          />

          <!-- 视频消息 -->
          <VideoMessage
            v-else-if="isVideoMessage"
            :video-url="videoUrl"
            :show-media-resources="showMediaResources"
            :content="message.content"
            :md5="message.contents?.md5"
            @click="handleVideoClick"
          />

          <!-- 表情消息 -->
          <EmojiMessage
            v-else-if="isEmojiMessage"
            :emoji-url="emojiUrl"
            :show-media-resources="showMediaResources"
            :cdnurl="message.contents?.cdnurl"
          />

          <!-- 个人名片消息 (type=42) -->
          <ContactCardMessage
            v-else-if="isContactCardMessage"
            :show-media-resources="showMediaResources"
            @click="handleContactCardClick"
          />

          <!-- 位置消息 (type=48) -->
          <LocationMessage
            v-else-if="isLocationMessage"
            :label="locationLabel"
            :x="locationX"
            :y="locationY"
            :cityname="locationCityname"
            :show-media-resources="showMediaResources"
            @click="handleLocationClick"
          />

          <!-- QQ邮箱消息 (type=35) -->
          <QQMailMessage
            v-else-if="isQQMailMessage"
            :show-media-resources="showMediaResources"
          />

          <!-- 语音通话消息 (type=50) -->
          <VoiceCallMessage
            v-else-if="isVoiceCallMessage"
            :content="message.content"
            :is-self="isSelf"
            :show-media-resources="showMediaResources"
            @click="handleVoiceCallClick"
          />

          <!-- QQ音乐消息 (type=49, subType=3) -->
          <QQMusicMessage
            v-else-if="isQQMusicMessage"
            :show-media-resources="showMediaResources"
            @click="handleQQMusicClick"
          />

          <!-- 微信卡包消息 (type=49, subType=16) -->
          <CardPackageMessage
            v-else-if="isCardPackageMessage"
            :show-media-resources="showMediaResources"
            @click="handleCardPackageClick"
          />

          <!-- 引用消息 (type=49, subType=57) -->
          <div v-else-if="isReferMessage" class="message-refer">
            <div v-if="referMessage" class="refer-content">
              <div class="refer-header">
                <el-icon class="refer-icon"><ChatLineSquare /></el-icon>
                <span class="refer-sender">{{
                  referMessage.senderName || referMessage.sender
                }}</span>
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

          <!-- 链接消息 (type=49, subType=5) -->
          <LinkMessage
            v-else-if="isLinkMessage"
            :link-title="linkTitle"
            :link-url="linkUrl"
            :show-media-resources="showMediaResources"
            @click="handleLinkClick"
          />

          <!-- 视频链接消息 (type=49, subType=4) -->
          <LinkMessage
            v-else-if="isVideoLinkMessage"
            :link-title="linkTitle"
            :link-url="linkUrl"
            :show-media-resources="showMediaResources"
            @click="handleVideoLinkClick"
          />

          <!-- 小程序消息 (type=49, subType=33) -->
          <MiniProgramMessage
            v-else-if="isMiniProgramMessage"
            :title="miniProgramTitle"
            :url="miniProgramUrl"
            :show-media-resources="showMediaResources"
            @click="handleMiniProgramClick"
          />

          <!-- 购物小程序消息 (type=49, subType=36) -->
          <ShoppingMiniProgramMessage
            v-else-if="isShoppingMiniProgramMessage"
            :title="shoppingMiniProgramTitle"
            :url="shoppingMiniProgramUrl"
            :desc="shoppingMiniProgramDesc"
            :thumb-url="shoppingMiniProgramThumb"
            :show-media-resources="showMediaResources"
            @click="handleShoppingMiniProgramClick"
          />

          <!-- 小视频消息 (type=49, subType=51) -->
          <ShortVideoMessage
            v-else-if="isShortVideoMessage"
            :title="shortVideoTitle"
            :video-url="shortVideoUrl"
            :show-media-resources="showMediaResources"
            @click="handleShortVideoClick"
          />

          <!-- 直播消息 (type=49, subType=63) -->
          <LiveMessage
            v-else-if="isLiveMessage"
            :title="liveTitle"
          />

          <!-- 接龙消息 (type=49, subType=53) -->
          <JielongMessage
            v-else-if="isJielongMessage"
            :content="message.content"
            :contents="message.contents"
            :show-media-resources="showMediaResources"
          />

          <!-- 转账消息 (type=49, subType=2000) -->
          <TransferMessage
            v-else-if="isTransferMessage"
            :content="message.content"
            :show-media-resources="showMediaResources"
            @click="handleTransferClick"
          />

          <!-- 红包消息 (type=49, subType=2001) -->
          <RedPacketMessage
            v-else-if="isRedPacketMessage"
            :show-media-resources="showMediaResources"
          />

          <!-- 转发消息包 (type=49, subType=19) -->
          <ForwardedMessage
            v-else-if="isForwardedMessage"
            :forwarded-title="forwardedTitle"
            :forwarded-desc="forwardedDesc"
            :forwarded-count="forwardedCount"
            @click="handleForwardedClick"
          />

          <!-- 文件消息 (type=49, subType=6) -->
          <FileMessage
            v-else-if="isFileMessage"
            :file-url="fileUrl"
            :file-name="fileName"
            :file-size="message.fileSize"
            :show-media-resources="showMediaResources"
            :md5="message.contents?.md5"
            @click="handleFileClick"
          />

          <!-- 其他富文本消息 (type=49, 其他subType) -->
          <div v-else-if="isOtherRichMessage" class="message-rich">
            <el-icon><Postcard /></el-icon>
            <div class="rich-info">
              <div class="rich-title">{{ fileName }}</div>
              <div class="rich-type">子类型: {{ message.subType }}</div>
            </div>
          </div>

          <!-- 未知类型 -->
          <div v-else class="message-unknown">
            <el-icon><QuestionFilled /></el-icon>
            <span
              >暂不支持的消息类型 (type={{ message.type }}, subType={{
                message.subType
              }})</span
            >
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
        <Avatar v-if="showAvatar" :src="avatarUrl" :name="'我'" :size="36" />
        <div v-else class="avatar-placeholder"></div>
      </div>
    </template>

    <!-- 转发消息详情对话框 -->
    <ForwardedDialog
      v-model:visible="forwardedDialogVisible"
      :title="forwardedTitle"
      :messages="forwardedMessages"
    />
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

  &--system,
  &--virtual {
    justify-content: center;
    padding: 12px 16px;
  }

  &__virtual {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  &__gap {
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    .el-button {
      font-size: 13px;
      color: var(--el-color-primary);
      display: flex;
      align-items: center;
      gap: 6px;

      .el-icon {
        font-size: 16px;
      }
    }
  }

  &__empty-range {
    .virtual-text {
      padding: 4px 12px;
      background-color: var(--el-fill-color-light);
      border-radius: 4px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      border-left: 3px solid var(--el-color-warning);
    }
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

// 语音消息样式
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



// 引用消息样式
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
    line-height: 1.6;
    white-space: pre-wrap;
  }
}

// 其他富文本消息样式
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

// 未知类型样式
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

// 媒体占位符
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



  .message-refer .refer-content {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>
