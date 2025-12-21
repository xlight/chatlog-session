<script setup lang="ts">
import { computed } from 'vue'
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  content: string
  showMediaResources: boolean
  isSelf?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelf: false
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}

// 解析通话信息
// 如果 content 包含通话时长等信息，可以在这里解析
// 目前文档显示 content 为空字符串
const callInfo = computed(() => {
  // 可以从 content 中解析通话时长、状态等信息
  // 例如: "[语音通话|已接听|00:15]" 或 "[语音通话|未接听]"
  if (props.content) {
    const match = props.content.match(/\[语音通话\|(.+?)\]/)
    if (match) {
      const info = match[1].split('|')
      return {
        status: info[0] || '通话',
        duration: info[1] || ''
      }
    }
  }
  
  return {
    status: '语音通话',
    duration: ''
  }
})

// 图标背景渐变色
const iconGradient = computed(() => {
  return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
})

// 格式化通话时长显示
const formattedDuration = computed(() => {
  if (callInfo.value.duration) {
    return callInfo.value.duration
  }
  return ''
})
</script>

<template>
  <div class="message-voice-call" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="call-icon" :style="{ background: iconGradient }">
        <el-icon :size="24"><Phone /></el-icon>
      </div>
      <div class="call-content">
        <div class="call-title">{{ callInfo.status }}</div>
        <div v-if="formattedDuration" class="call-duration">{{ formattedDuration }}</div>
      </div>
      <el-icon class="call-arrow"><Right /></el-icon>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(50, 0) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-voice-call {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-width: 200px;
  max-width: 280px;

  .call-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    color: white;
    flex-shrink: 0;
    transition: background 0.3s ease;
  }

  .call-content {
    flex: 1;
    min-width: 0;

    .call-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .call-duration {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      margin-top: 2px;
    }
  }

  .call-arrow {
    font-size: 18px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
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

  &:hover {
    opacity: 0.8;
  }
}

.dark-mode {
  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>