<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  content?: string
  contents?: {
    title?: string
    desc?: string
    memberCount?: number
    [key: string]: any
  }
  showMediaResources?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  showMediaResources: true
})

const emit = defineEmits<{
  click: []
}>()

// 解析接龙标题
const jielongTitle = computed(() => {
  if (props.contents?.title) {
    return props.contents.title
  }
  // 尝试从 content 中提取标题
  if (props.content) {
    const lines = props.content.split('\n')
    return lines[0] || '接龙'
  }
  return '接龙'
})

// 解析参与人数
const memberCount = computed(() => {
  if (props.contents?.memberCount) {
    return props.contents.memberCount
  }
  // 尝试从 content 中计算
  if (props.content) {
    const lines = props.content.split('\n').filter(line => line.trim())
    // 减去标题行
    return Math.max(0, lines.length - 1)
  }
  return 0
})

// 显示的描述文本
const description = computed(() => {
  if (props.contents?.desc) {
    return props.contents.desc
  }
  if (memberCount.value > 0) {
    return `${memberCount.value}人参与`
  }
  return '点击查看详情'
})

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <div class="message-jielong" @click="handleClick">
    <!-- 不显示媒体资源时的占位符 -->
    <span v-if="!showMediaResources" class="media-placeholder">[接龙]</span>

    <!-- 完整的接龙消息卡片 -->
    <div v-else class="jielong-card">
      <!-- 图标 -->
      <div class="jielong-icon">
        <el-icon :size="24">
          <List />
        </el-icon>
      </div>

      <!-- 内容 -->
      <div class="jielong-content">
        <div class="jielong-title">
          <el-icon class="title-icon" :size="16">
            <DocumentCopy />
          </el-icon>
          <span>{{ jielongTitle }}</span>
        </div>
        <div class="jielong-desc">
          {{ description }}
        </div>
      </div>

      <!-- 箭头 -->
      <div class="jielong-arrow">
        <el-icon>
          <ArrowRight />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-jielong {
  .media-placeholder {
    color: var(--el-text-color-secondary);
    font-size: 14px;
    font-style: italic;
  }
}

.jielong-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  min-width: 240px;
  max-width: 320px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  cursor: pointer;
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

  .jielong-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    color: #fff;
  }

  .jielong-content {
    flex: 1;
    min-width: 0;

    .jielong-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      margin-bottom: 6px;
      line-height: 1.4;

      // 多行文本截断
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-all;

      .title-icon {
        flex-shrink: 0;
        color: var(--el-color-primary);
      }

      span {
        flex: 1;
        min-width: 0;
      }
    }

    .jielong-desc {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      line-height: 1.4;

      // 单行文本截断
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .jielong-arrow {
    flex-shrink: 0;
    color: var(--el-text-color-placeholder);
    transition: transform 0.2s ease;
  }

  &:hover .jielong-arrow {
    transform: translateX(2px);
  }
}

// 暗色模式适配
html.dark {
  .jielong-card {
    background: var(--el-fill-color-darker);
    border-color: var(--el-border-color);

    &:hover {
      background: var(--el-fill-color-dark);
      border-color: var(--el-border-color-light);
    }
  }
}

// 在消息气泡中的特殊样式
:deep(.message-bubble--self) {
  .jielong-card {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);

    &:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .jielong-title {
      color: rgba(255, 255, 255, 0.95);

      .title-icon {
        color: rgba(255, 255, 255, 0.9);
      }
    }

    .jielong-desc {
      color: rgba(255, 255, 255, 0.75);
    }

    .jielong-arrow {
      color: rgba(255, 255, 255, 0.6);
    }
  }
}
</style>