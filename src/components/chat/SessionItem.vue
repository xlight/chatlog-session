<script setup lang="ts">
import { computed } from 'vue'
import type { Session } from '@/types'
import { formatSessionTime } from '@/utils'
import { useDisplayName } from './composables'
import Avatar from '@/components/common/Avatar.vue'

interface Props {
  session: Session
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false
})

// 定义 click 事件的 emit，当 SessionItem 被点击时：
// 1. 模板中的 @click="handleClick" 触发 handleClick 方法
// 2. handleClick 方法调用 emit('click', props.session)
// 3. 将 click 事件和 session 数据传递给父组件
// 4. 父组件通过 @click 监听器接收事件并执行相应的处理方法
const emit = defineEmits<{
  click: [session: Session]
  action: [command: string, session: Session]
}>()

// 使用 displayName composable
const { displayName } = useDisplayName({
  id: computed(() => props.session.id),
  defaultName: computed(() => props.session.name)
})

// 格式化最后消息时间
const lastMessageTime = computed(() => {
  if (!props.session.lastMessage) return ''
  return formatSessionTime(props.session.lastMessage.createTime)
})

// 最后一条消息预览
const lastMessagePreview = computed(() => {
  const msg = props.session.lastMessage
  if (!msg) return '[未知的消息类型]'

  const content = msg.content || '[非文本消息]'

  return msg.nickName ? `${msg.nickName}: ${content}` : content
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

// 处理菜单命令
const handleCommand = (command: string) => {
  emit('action', command, props.session)
}
</script>

<template>
  <el-dropdown
    trigger="contextmenu"
    placement="bottom-start"
    class="session-item-dropdown"
    @command="handleCommand"
  >
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
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item :command="session.isPinned ? 'unpin' : 'pin'">
          <el-icon><Paperclip /></el-icon>
          {{ session.isPinned ? '取消置顶' : '置顶会话' }}
        </el-dropdown-item>
        <el-dropdown-item :command="session.unreadCount && session.unreadCount > 0 ? 'read' : 'unread'">
          <el-icon><ChatDotRound /></el-icon>
          {{ session.unreadCount && session.unreadCount > 0 ? '标记已读' : '标记未读' }}
        </el-dropdown-item>
        <el-dropdown-item divided command="delete">
          <el-icon style="color: var(--el-color-danger)"><Delete /></el-icon>
          <span style="color: var(--el-color-danger)">删除会话</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style lang="scss" scoped>
.session-item-dropdown {
  display: block;
  width: 100%;
}

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
