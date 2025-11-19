<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Session } from '@/types'
import { formatSessionTime } from '@/utils'
import { useContactStore } from '@/stores/contact'
import Avatar from '@/components/common/Avatar.vue'

interface Props {
  session: Session
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false
})

const emit = defineEmits<{
  click: [session: Session]
}>()

const contactStore = useContactStore()

// 显示名称（从缓存获取）
const displayName = ref(props.session.name)

// 异步加载显示名称
watch(() => props.session.id, async (newId) => {
  if (newId) {
    try {
      const name = await contactStore.getContactDisplayName(newId)
      if (name && name !== newId) {
        displayName.value = name
      }
    } catch (err) {
      console.warn('获取联系人显示名称失败:', newId, err)
    }
  }
}, { immediate: true })

// 格式化最后消息时间
const lastMessageTime = computed(() => {
  if (!props.session.lastMessage) return ''
  return formatSessionTime(props.session.lastMessage.createTime)
})

// 最后一条消息预览
const lastMessagePreview = computed(() => {
  const msg = props.session.lastMessage
  if (!msg) return '暂无消息'

  // 根据消息类型显示不同的预览
  switch (msg.type) {
    case 1: // 文本
      return !msg.nickName ? msg.content : msg.nickName +': ' + msg.content || ''
    case 3: // 图片
      return '[图片]'
    case 34: // 语音
      return '[语音]'
    case 43: // 视频
      return '[视频]'
    case 47: // 表情
      return '[表情]'
    case 49: // 文件/链接等
      return '[文件]'
    case 10000: // 系统消息
      return msg.content || '[系统消息]'
    default:
      return '[未知消息]'
  }
})

// 会话类型图标
const sessionTypeIcon = computed(() => {
  return props.session.type === 'group' ? 'User' : undefined
})

// 未读消息显示
const unreadDisplay = computed(() => {
  const count = props.session.unreadCount || 0
  if (count === 0) return ''
  if (count > 99) return '99+'
  return count.toString()
})

// 是否显示未读红点
const showUnreadBadge = computed(() => {
  return props.session.unreadCount && props.session.unreadCount > 0
})

// 处理点击
const handleClick = () => {
  emit('click', props.session)
}
</script>

<template>
  <div
    class="session-item"
    :class="{ 'session-item--active': active, 'session-item--pinned': session.isPinned }"
    @click="handleClick"
  >
    <!-- 头像 -->
    <div class="session-item__avatar">
      <Avatar
        :src="session.avatar"
        :name="session.name"
        :size="48"
        :icon="sessionTypeIcon"
      />
      <el-badge
        v-if="showUnreadBadge"
        :value="unreadDisplay"
        :max="99"
        class="session-item__badge"
      />
    </div>

    <!-- 会话信息 -->
    <div class="session-item__content">
      <div class="session-item__header">
        <div class="session-item__name">
          <el-icon v-if="session.isPinned" size="14" class="pin-icon">
            <Paperclip />
          </el-icon>
          <span class="name-text ellipsis">{{ displayName }}</span>
        </div>
        <span class="session-item__time">{{ lastMessageTime }}</span>
      </div>

      <div class="session-item__footer">
        <div class="session-item__message ellipsis">
          {{ lastMessagePreview }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.session-item {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &--active {
    background-color: var(--el-fill-color);

    &:hover {
      background-color: var(--el-fill-color);
    }
  }

  &--pinned {
    background-color: var(--el-fill-color-lighter);
  }

  &__avatar {
    position: relative;
    margin-right: 12px;
    flex-shrink: 0;
  }

  &__badge {
    position: absolute;
    top: -4px;
    right: -4px;
  }

  &__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  &__name {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;

    .pin-icon {
      color: var(--el-color-warning);
      margin-right: 4px;
      flex-shrink: 0;
    }

    .name-text {
      font-size: 15px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  &__time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-left: 8px;
    flex-shrink: 0;
  }

  &__footer {
    display: flex;
    align-items: center;
  }

  &__message {
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.4;
  }
}

// 暗色模式适配
.dark-mode {
  .session-item {
    &--active {
      background-color: rgba(255, 255, 255, 0.08);

      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
      }
    }

    &--pinned {
      background-color: rgba(255, 255, 255, 0.04);
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
}
</style>
