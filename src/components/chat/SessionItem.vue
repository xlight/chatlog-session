<script setup lang="ts">
import { computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { Session } from '@/types'
import { formatSessionTime } from '@/utils'
import { useSessionStore } from '@/stores/session'
import { useContextMenu } from './composables'
import { useDisplayName } from '@/composables/useDisplayName'
import Avatar from '@/components/common/Avatar.vue'

interface Props {
  session: Session
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
})

const emit = defineEmits<{
  click: [session: Session]
  action: [command: string, session: Session]
}>()

const sessionStore = useSessionStore()
const {
  visible: contextMenuVisible,
  x: contextMenuX,
  y: contextMenuY,
  open: openContextMenu,
} = useContextMenu()

const searchMetadata = computed(() => sessionStore.getSessionSearchMetadata(props.session))

const { getSessionDisplayNameSync } = useDisplayName()
const displayName = computed(() => getSessionDisplayNameSync(props.session, searchMetadata.value))

const isSearchMode = computed(() => sessionStore.isSearchMode)

const lastMessageTime = computed(() => {
  if (!props.session.lastMessage) return ''
  return formatSessionTime(props.session.lastMessage.createTime)
})

const lastMessagePreview = computed(() => {
  const msg = props.session.lastMessage
  if (!msg) return '[未知的消息类型]'

  const content = msg.content || '[非文本消息]'

  return msg.nickName ? `${msg.nickName}: ${content}` : content
})

const sessionTypeIcon = computed(() => {
  return props.session.type === 'group' ? 'User' : undefined
})

const unreadDisplay = computed(() => {
  const count = props.session.unreadCount || 0
  if (count === 0) return ''
  if (count > 99) return '99+'
  return count.toString()
})

const showUnreadBadge = computed(() => {
  return props.session.unreadCount && props.session.unreadCount > 0
})

const matchReasonLabel = computed(() => {
  if (!isSearchMode.value || !searchMetadata.value?.matchedBy) {
    return ''
  }

  switch (searchMetadata.value.matchedBy) {
    case 'displayName':
      return '显示名'
    case 'remark':
      return '备注名'
    case 'nickname':
      return '昵称'
    case 'alias':
      return '别名'
    case 'talker':
      return '微信号'
    case 'message':
      return '最近消息'
    case 'pinyin':
      return '拼音'
    default:
      return ''
  }
})

const matchedSecondaryText = computed(() => {
  if (!isSearchMode.value || !searchMetadata.value?.matchedBy) {
    return ''
  }

  switch (searchMetadata.value.matchedBy) {
    case 'remark':
      return searchMetadata.value.remark
    case 'nickname':
      return searchMetadata.value.nickname
    case 'alias':
      return searchMetadata.value.alias
    case 'talker':
      return searchMetadata.value.talker
    case 'message':
      return searchMetadata.value.lastMessagePreview
    default:
      return ''
  }
})

function buildHighlightedParts(text: string, keyword: string) {
  if (!text || !keyword) {
    return [{ text, matched: false }]
  }

  const normalizedText = text.toLowerCase()
  const normalizedKeyword = keyword.trim().toLowerCase()
  const start = normalizedText.indexOf(normalizedKeyword)

  if (start === -1) {
    return [{ text, matched: false }]
  }

  const end = start + normalizedKeyword.length
  const parts = []

  if (start > 0) {
    parts.push({ text: text.slice(0, start), matched: false })
  }

  parts.push({ text: text.slice(start, end), matched: true })

  if (end < text.length) {
    parts.push({ text: text.slice(end), matched: false })
  }

  return parts
}

const displayNameParts = computed(() => {
  const keyword = searchMetadata.value?.matchedBy === 'pinyin' ? '' : sessionStore.searchKeyword
  return buildHighlightedParts(displayName.value, keyword)
})

const secondaryParts = computed(() => {
  const keyword = searchMetadata.value?.matchedBy === 'pinyin' ? '' : sessionStore.searchKeyword
  return buildHighlightedParts(matchedSecondaryText.value, keyword)
})

const handleClick = () => {
  emit('click', props.session)
}

const handleCommand = async (command: string) => {
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm('确定要从列表中移除该会话吗？', '移除会话', {
        confirmButtonText: '移除',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return
    }
  }

  emit('action', command, props.session)
}
</script>

<template>
  <div class="session-item-dropdown" @contextmenu="openContextMenu">
    <div
      class="session-item"
      :class="{
        'session-item--active': active,
        'session-item--pinned': session.isPinned || session.isLocalPinned,
        'session-item--minimized': session.isMinimized,
      }"
      @click="handleClick"
    >
      <div class="session-item__avatar">
        <Avatar :src="session.avatar" :name="displayName" :size="48" :icon="sessionTypeIcon" />
        <el-badge
          v-if="showUnreadBadge"
          :value="unreadDisplay"
          :max="99"
          class="session-item__badge"
        />
      </div>

      <div class="session-item__content">
        <div class="session-item__header">
          <div class="session-item__name">
            <el-icon v-if="session.isPinned" size="14" class="pin-icon">
              <Paperclip />
            </el-icon>
            <el-icon v-if="session.isMinimized" size="14" class="minimized-icon">
              <Minus />
            </el-icon>
            <span class="name-text ellipsis">
              <template
                v-for="(part, index) in displayNameParts"
                :key="`${session.id}-name-${index}`"
              >
                <mark v-if="part.matched" class="match-highlight">{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </span>
          </div>
          <span class="session-item__time">{{ lastMessageTime }}</span>
        </div>

        <div class="session-item__footer">
          <div v-if="matchReasonLabel" class="session-item__match">
            <el-tag size="small" type="primary" effect="plain">命中{{ matchReasonLabel }}</el-tag>
            <span v-if="matchedSecondaryText" class="match-text ellipsis">
              <template
                v-for="(part, index) in secondaryParts"
                :key="`${session.id}-match-${index}`"
              >
                <mark v-if="part.matched" class="match-highlight">{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </span>
          </div>
          <div class="session-item__message ellipsis">
            {{ lastMessagePreview }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="contextMenuVisible"
      class="session-item-context-menu"
      :style="{
        left: `${contextMenuX}px`,
        top: `${contextMenuY}px`,
      }"
    >
      <button
        class="context-menu-item"
        type="button"
        @click="handleCommand(session.isLocalPinned ? 'unpin' : 'pin')"
      >
        <el-icon><Paperclip /></el-icon>
        <span>{{ session.isLocalPinned ? '取消置顶' : '置顶会话' }}</span>
      </button>
      <button
        class="context-menu-item"
        type="button"
        @click="handleCommand(session.unreadCount && session.unreadCount > 0 ? 'read' : 'unread')"
      >
        <el-icon><ChatDotRound /></el-icon>
        <span>{{ session.unreadCount && session.unreadCount > 0 ? '标记已读' : '标记未读' }}</span>
      </button>
      <div class="context-menu-divider" />
      <button
        class="context-menu-item context-menu-item--danger"
        type="button"
        @click="handleCommand('delete')"
      >
        <el-icon><Delete /></el-icon>
        <span>删除会话</span>
      </button>
    </div>
  </Teleport>
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

  &--minimized {
    opacity: 0.75;
    background-color: var(--el-fill-color-extra-light);
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

    .minimized-icon {
      color: var(--el-text-color-secondary);
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
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  &__message {
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.4;
  }

  &__match {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    .match-text {
      min-width: 0;
      font-size: 12px;
      color: var(--el-color-primary);
    }
  }
}

.match-highlight {
  padding: 0;
  color: inherit;
  background-color: rgba(64, 158, 255, 0.16);
  border-radius: 2px;
}

:global(.session-item-context-menu) {
  position: fixed;
  z-index: 3000;
  min-width: 160px;
  padding: 6px;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  box-shadow: var(--el-box-shadow-light);
}

:global(.context-menu-item) {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

:global(.context-menu-item:hover) {
  background-color: var(--el-fill-color-light);
}

:global(.context-menu-item--danger) {
  color: var(--el-color-danger);
}

:global(.context-menu-divider) {
  height: 1px;
  margin: 6px 4px;
  background-color: var(--el-border-color-lighter);
}

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
