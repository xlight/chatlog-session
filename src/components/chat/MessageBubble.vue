<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Message } from '@/types'
import { formatMessageTime } from '@/utils'
import Avatar from '@/components/common/Avatar.vue'
import { useAppStore } from '@/stores/app'
import { mediaAPI } from '@/api/media'
import { useMessageUrl } from './composables/useMessageUrl'
import { useMessageType } from './composables/useMessageType'
import { MoreFilled } from '@element-plus/icons-vue'
import { MESSAGE_COMPONENT_REGISTRY } from './message-types/registry'
import ForwardedDialog from './message-types/ForwardedDialog.vue'

interface Props {
  message: Message
  showAvatar?: boolean
  showTime?: boolean
  showName?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true,
  showTime: false,
  showName: false,
})

// 定义 emits
const emit = defineEmits<{
  'gap-click': [message: Message]
}>()

// 获取 app store
const appStore = useAppStore()

// 是否显示媒体资源
const showMediaResources = computed(() => appStore.settings.showMediaResources)

// 使用消息类型判断
const messageTypeInfo = useMessageType(props.message)
const {
  componentName,
  isSelf,
  isSystemMessage,
  isRevokeMessage,
  isGapMessage,
  isEmptyRangeMessage,
  isPatMessage,
  isForwardedMessage,
  isFileMessage,
  referMessage,
  referMessageType,
  messageConfig,
} = messageTypeInfo

// 使用 URL 处理逻辑
const messageUrls = useMessageUrl(props.message)

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
    'message-bubble--virtual': isGapMessage.value || isEmptyRangeMessage.value,
  }
})

// 动态组件
const dynamicComponent = computed(() => {
  if (!componentName.value) return null
  const component = MESSAGE_COMPONENT_REGISTRY[componentName.value]

  if (!component) {
    console.error(`[MessageBubble] 组件 "${componentName.value}" 未在注册表中找到`)
    return null
  }

  return component
})

// 组件 Props（通过配置映射）
const componentProps = computed(() => {
  const config = messageConfig.value
  if (!config || !config.propsMapper) {
    console.warn('[MessageBubble] 配置或 propsMapper 不存在', {
      type: props.message.type,
      subType: props.message.subType,
      config,
    })
    return {}
  }

  try {
    // 创建上下文对象
    const context = {
      showMediaResources: showMediaResources.value,
      referMessage: referMessage.value,
      referMessageType: referMessageType.value,
      // 手动解构所有 ComputedRef 的值
      imageThumbUrl: messageUrls.imageThumbUrl.value,
      imageUrl: messageUrls.imageUrl.value,
      videoUrl: messageUrls.videoUrl.value,
      voiceUrl: messageUrls.voiceUrl.value,
      emojiUrl: messageUrls.emojiUrl.value,
      fileUrl: messageUrls.fileUrl.value,
      fileName: messageUrls.fileName.value,
      linkTitle: messageUrls.linkTitle.value,
      linkUrl: messageUrls.linkUrl.value,
      forwardedTitle: messageUrls.forwardedTitle.value,
      forwardedDesc: messageUrls.forwardedDesc.value,
      forwardedCount: messageUrls.forwardedCount.value,
      miniProgramTitle: messageUrls.miniProgramTitle.value,
      miniProgramUrl: messageUrls.miniProgramUrl.value,
      shoppingMiniProgramTitle: messageUrls.shoppingMiniProgramTitle.value,
      shoppingMiniProgramUrl: messageUrls.shoppingMiniProgramUrl.value,
      shoppingMiniProgramDesc: messageUrls.shoppingMiniProgramDesc.value,
      shoppingMiniProgramThumb: messageUrls.shoppingMiniProgramThumb.value,
      shortVideoTitle: messageUrls.shortVideoTitle.value,
      shortVideoUrl: messageUrls.shortVideoUrl.value,
      liveTitle: messageUrls.liveTitle.value,
      locationLabel: messageUrls.locationLabel.value,
      locationX: messageUrls.locationX.value,
      locationY: messageUrls.locationY.value,
      locationCityname: messageUrls.locationCityname.value,
    }

    const mappedProps = config.propsMapper(props.message, context)

    return mappedProps
  } catch (error) {
    console.error('[MessageBubble] propsMapper 执行错误', {
      error,
      message: props.message,
      config,
    })
    return {}
  }
})

// 转发消息对话框
const forwardedDialogVisible = ref(false)
const forwardedMessages = computed(() => {
  const dataItems = props.message.contents?.recordInfo?.DataList?.DataItems || []
  return dataItems
})

// ==================== 事件处理 ====================
const handleForwardedClick = () => {
  forwardedDialogVisible.value = true
}

const handleFileClick = () => {
  const fileUrl = messageUrls.fileUrl.value
  if (fileUrl) {
    window.open(fileUrl, '_blank')
  }
}

const handleComponentClick = () => {
  if (isForwardedMessage.value) {
    handleForwardedClick()
  } else if (isFileMessage.value) {
    handleFileClick()
  }
}

const forwardedTitle = computed(() => messageUrls.forwardedTitle.value || '聊天记录')
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
    <div
      v-else-if="isGapMessage"
      class="message-bubble__virtual message-bubble__gap"
      @click="emit('gap-click', message)"
    >
      <el-button text>
        <el-icon><MoreFilled /></el-icon>
        <span>{{ message.content }}</span>
      </el-button>
    </div>

    <!-- EmptyRange 虚拟消息 -->
    <div
      v-else-if="isEmptyRangeMessage"
      class="message-bubble__virtual message-bubble__empty-range"
    >
      <span class="virtual-text"
        >📭 {{ appStore.isDebug ? 'EmptyRange: ' : '' }}{{ message.content }}</span
      >
    </div>

    <!-- 拍一拍消息 (特殊渲染) -->
    <component :is="dynamicComponent" v-else-if="isPatMessage" v-bind="componentProps" />

    <!-- 普通消息 -->
    <template v-else>
      <!-- 头像 (对方消息显示在左边) -->
      <div v-if="!isSelf" class="message-bubble__avatar">
        <Avatar v-if="showAvatar" :src="avatarUrl" :name="message.senderName" :size="36" />
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

        <!-- 消息主体 - 使用动态组件 -->
        <div class="message-bubble__body">
          <!-- 动态组件渲染 -->
          <template v-if="dynamicComponent">
            <component
              :is="dynamicComponent"
              v-bind="componentProps"
              @click="handleComponentClick"
            />
          </template>

          <!-- 未知消息类型 -->
          <div v-else class="message-unknown">
            <el-icon><Warning /></el-icon>
            <div class="unknown-info">
              <div>未知消息类型</div>
              <div class="unknown-detail">
                type={{ message.type }}, subType={{ message.subType }}
              </div>
              <div v-if="componentName" class="unknown-detail">组件: {{ componentName }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 头像 (自己的消息显示在右边) -->
      <div v-if="isSelf" class="message-bubble__avatar">
        <Avatar v-if="showAvatar" :src="avatarUrl" :name="message.senderName" :size="36" />
        <div v-else class="avatar-placeholder"></div>
      </div>
    </template>

    <!-- 转发消息对话框 -->
    <ForwardedDialog
      v-if="isForwardedMessage"
      v-model:visible="forwardedDialogVisible"
      :title="forwardedTitle"
      :messages="forwardedMessages"
    />
  </div>
</template>

<style lang="scss" scoped>
.message-bubble {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  position: relative;

  &--self {
    flex-direction: row-reverse;

    .message-bubble__content {
      align-items: flex-end;
    }

    .message-bubble__body {
      background: var(--el-color-primary-light-9);
      border-radius: 12px 12px 4px 12px;
    }
  }

  &--other {
    flex-direction: row;

    .message-bubble__content {
      align-items: flex-start;
    }

    .message-bubble__body {
      background: var(--el-fill-color-blank);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 12px 12px 12px 4px;
    }
  }

  &--system,
  &--virtual {
    justify-content: center;
    padding: 4px 0;
  }

  &__system {
    text-align: center;
    width: 100%;

    .system-text {
      display: inline-block;
      padding: 4px 12px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      background: var(--el-fill-color-light);
      border-radius: 4px;
      max-width: 80%;
      word-break: break-word;
    }
  }

  &__virtual {
    text-align: center;
    width: 100%;

    .virtual-text {
      display: inline-block;
      padding: 6px 16px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
      background: var(--el-fill-color);
      border-radius: 6px;
      border: 1px dashed var(--el-border-color);
    }
  }

  &__gap {
    .el-button {
      color: var(--el-color-primary);
      font-size: 13px;

      .el-icon {
        margin-right: 4px;
      }

      &:hover {
        background: var(--el-fill-color-light);
      }
    }
  }

  &__avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;

    .avatar-placeholder {
      width: 100%;
      height: 100%;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: calc(100% - 60px);
    flex: 1;
  }

  &__name {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    padding: 0 4px;
  }

  &__time {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    padding: 0 4px;
  }

  &__body {
    padding: 10px 14px;
    word-break: break-word;
    max-width: 100%;
    display: inline-block;
    align-self: flex-start;
  }
}

.message-unknown {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  border-radius: 4px;
  font-size: 13px;

  .el-icon {
    font-size: 16px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .unknown-info {
    flex: 1;

    .unknown-detail {
      font-size: 11px;
      opacity: 0.8;
      margin-top: 4px;
    }
  }
}

.dark-mode {
  .message-bubble--other .message-bubble__body {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }

  .message-bubble__system .system-text {
    background: var(--el-fill-color-dark);
  }

  .message-bubble__virtual .virtual-text {
    background: var(--el-fill-color-darker);
  }
}
</style>
