<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  forwardedTitle: string
  forwardedDesc: string
  forwardedCount: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}

// 解析描述中的消息类型
const messageTypes = computed(() => {
  if (!props.forwardedDesc) return []
  
  const types = new Set<string>()
  if (props.forwardedDesc.includes('[文件]')) types.add('文件')
  if (props.forwardedDesc.includes('[图片]')) types.add('图片')
  if (props.forwardedDesc.includes('[视频]')) types.add('视频')
  if (props.forwardedDesc.includes('[语音]')) types.add('语音')
  if (props.forwardedDesc.includes('[位置]')) types.add('位置')
  
  return Array.from(types)
})

// 格式化描述文本（移除类型标签，提取纯文本）
const formattedDesc = computed(() => {
  if (!props.forwardedDesc) return ''
  
  // 提取第一段文本内容（跳过类型标签）
  const lines = props.forwardedDesc.split('\n')
  for (const line of lines) {
    // 移除用户名前缀
    const content = line.replace(/^[^:]+:\s*/, '')
    // 如果不是类型标签，返回这段文本
    if (!content.startsWith('[') && content.trim()) {
      return content
    }
  }
  
  return props.forwardedDesc
})
</script>

<template>
  <div class="message-forwarded" @click="handleClick">
    <div class="forwarded-card">
      <div class="forwarded-header">
        <el-icon class="forwarded-icon"><ChatDotSquare /></el-icon>
        <span class="forwarded-title">{{ forwardedTitle }}</span>
      </div>
      
      <div v-if="formattedDesc" class="forwarded-desc">
        {{ formattedDesc }}
      </div>
      
      <div v-if="messageTypes.length > 0" class="forwarded-types">
        <el-tag
          v-for="type in messageTypes"
          :key="type"
          size="small"
          effect="plain"
          type="info"
        >
          {{ type }}
        </el-tag>
      </div>
      
      <div class="forwarded-footer">
        <div class="footer-info">
          <el-icon class="footer-icon"><Message /></el-icon>
          <span v-if="forwardedCount > 0" class="forwarded-count">
            共 {{ forwardedCount }} 条消息
          </span>
          <span v-else class="forwarded-hint">聊天记录</span>
        </div>
        <el-icon class="arrow-icon"><ArrowRight /></el-icon>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-forwarded {
  cursor: pointer;
  max-width: 360px;

  .forwarded-card {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s ease;

    &:hover {
      background: var(--el-fill-color);
      border-color: var(--el-border-color-light);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .forwarded-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;

    .forwarded-icon {
      font-size: 20px;
      color: var(--el-color-primary);
      flex-shrink: 0;
    }

    .forwarded-title {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .forwarded-desc {
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.5;
    margin-bottom: 10px;
    max-height: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  .forwarded-types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;

    :deep(.el-tag) {
      font-size: 11px;
      height: 20px;
      line-height: 18px;
      padding: 0 6px;
    }
  }

  .forwarded-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px solid var(--el-border-color-lighter);

    .footer-info {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;

      .footer-icon {
        font-size: 14px;
        color: var(--el-text-color-secondary);
      }

      .forwarded-count,
      .forwarded-hint {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .arrow-icon {
      font-size: 14px;
      color: var(--el-text-color-placeholder);
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }
  }

  &:hover .arrow-icon {
    transform: translateX(2px);
    color: var(--el-color-primary);
  }
}

.dark-mode {
  .message-forwarded {
    .forwarded-card {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    }

    .forwarded-footer {
      border-top-color: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>