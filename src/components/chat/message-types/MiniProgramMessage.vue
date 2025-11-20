<script setup lang="ts">
interface Props {
  title: string
  url: string
  showMediaResources: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <div class="message-miniprogram" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="miniprogram-card">
        <div class="miniprogram-header">
          <el-icon class="miniprogram-icon"><Grid /></el-icon>
          <span class="miniprogram-label">小程序</span>
        </div>
        <div class="miniprogram-content">
          <div class="miniprogram-title">{{ title }}</div>
          <div v-if="url" class="miniprogram-url">{{ url }}</div>
        </div>
        <div class="miniprogram-footer">
          <span class="miniprogram-hint">点击查看</span>
          <el-icon class="arrow-icon"><Right /></el-icon>
        </div>
      </div>
    </template>
    <span v-else class="media-placeholder">[小程序] {{ title }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-miniprogram {
  cursor: pointer;
  user-select: none;

  .miniprogram-card {
    min-width: 280px;
    max-width: 320px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary);
      box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
      transform: translateY(-2px);
    }
  }

  .miniprogram-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    color: #fff;

    .miniprogram-icon {
      font-size: 16px;
    }

    .miniprogram-label {
      font-size: 12px;
      font-weight: 500;
    }
  }

  .miniprogram-content {
    padding: 12px;
    background: #fff;

    .miniprogram-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      line-height: 1.5;
      margin-bottom: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .miniprogram-url {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.8;
    }
  }

  .miniprogram-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--el-fill-color-lighter);
    border-top: 1px solid var(--el-border-color-lighter);

    .miniprogram-hint {
      font-size: 12px;
      color: var(--el-color-primary);
      font-weight: 500;
    }

    .arrow-icon {
      font-size: 14px;
      color: var(--el-color-primary);
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
}

.dark-mode {
  .message-miniprogram {
    .miniprogram-card {
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      border-color: var(--el-border-color-darker);
    }

    .miniprogram-content {
      background: #2b2b2b;
    }

    .miniprogram-footer {
      background: rgba(255, 255, 255, 0.05);
      border-top-color: var(--el-border-color-darker);
    }

    .media-placeholder {
      background: var(--el-fill-color-dark);
      border-color: var(--el-border-color-darker);
    }
  }
}
</style>