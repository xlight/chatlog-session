<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Delete, Star, Download, Cpu } from '@element-plus/icons-vue'
import type { Message } from '@/types'
import { useAppStore } from '@/stores/app'
import { useAIConversationStore } from '@/stores/ai/conversation'

const visible = ref(false)

interface Props {
  message: Message
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end'
    | 'left-start'
    | 'left-end'
    | 'right-start'
    | 'right-end'
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom-end',
})

const emit = defineEmits<{
  delete: [message: Message]
  favorite: [message: Message]
}>()

const appStore = useAppStore()
const conversation = useAIConversationStore()

/**
 * 复制消息内容
 */
const handleCopy = async () => {
  try {
    const content = props.message.content || ''
    if (!content) {
      ElMessage.warning('无内容可复制')
      return
    }

    // 使用浏览器 Clipboard API
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
  visible.value = false
}

/**
 * 收藏消息
 */
const handleFavorite = () => {
  emit('favorite', props.message)
  ElMessage.success('已收藏')
  visible.value = false
}

/**
 * 删除消息
 */
const handleDelete = () => {
  emit('delete', props.message)
  visible.value = false
}

/**
 * 下载媒体
 */
const handleDownload = () => {
  ElMessage.info('下载功能开发中...')
  visible.value = false
}

/**
 * 发送到 AI
 */
const handleSendToAI = () => {
  const text = props.message.content || ''
  if (!text) {
    ElMessage.warning('无可发送的文本内容')
    return
  }
  appStore.aiPanelOpen = true
  conversation.addMessage({ role: 'user', content: text })
  ElMessage.success('已发送到 AI 面板')
  visible.value = false
}

/**
 * 处理命令
 */
const handleCommand = (command: string) => {
  switch (command) {
    case 'copy':
      handleCopy()
      break
    case 'favorite':
      handleFavorite()
      break
    case 'delete':
      handleDelete()
      break
    case 'download':
      handleDownload()
      break
    case 'send-to-ai':
      handleSendToAI()
      break
  }
}

// 是否有内容可复制
const hasTextContent = () => {
  return !!props.message.content
}

// 是否有媒体可下载
const hasMedia = () => {
  const type = props.message.type
  return type === 3 || type === 34 || type === 43 || type === 47 // 图片、语音、视频、动画表情
}
</script>

<template>
  <el-dropdown
    v-model:visible="visible"
    :placement="placement"
    trigger="click"
    @command="handleCommand"
  >
    <el-button text circle size="small" class="message-quick-actions__trigger">
      <el-icon :size="16">
        <MoreFilled />
      </el-icon>
    </el-button>

    <template #dropdown>
      <el-dropdown-menu>
        <!-- 复制 -->
        <el-dropdown-item v-if="hasTextContent()" command="copy" :icon="CopyDocument">
          复制内容
        </el-dropdown-item>

        <!-- 收藏 -->
        <el-dropdown-item command="favorite" :icon="Star"> 收藏消息 </el-dropdown-item>

        <!-- 发送到 AI -->
        <el-dropdown-item
          v-if="hasTextContent()"
          command="send-to-ai"
          :icon="Cpu"
        >
          <span style="color: var(--el-color-primary)">发送到 AI</span>
        </el-dropdown-item>

        <!-- 下载 -->
        <el-dropdown-item v-if="hasMedia()" command="download" :icon="Download" divided>
          下载媒体
        </el-dropdown-item>

        <!-- 删除 -->
        <el-dropdown-item command="delete" :icon="Delete" :divided="!hasMedia()">
          <span style="color: var(--el-color-danger)">删除消息</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped lang="scss">
.message-quick-actions__trigger {
  opacity: 0;
  transition: opacity 0.2s;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  // 父容器 hover 时显示
  .message-bubble:hover &,
  .message-item:hover & {
    opacity: 1;
  }

  // 移动端始终显示
  @media (max-width: 768px) {
    opacity: 1;
  }
}

:deep(.el-dropdown-menu__item) {
  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
