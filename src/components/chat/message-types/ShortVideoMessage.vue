<script setup lang="ts">
interface Props {
  title: string
  videoUrl: string
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
  <div class="message-short-video" @click="handleClick">
    <template v-if="showMediaResources">
      <div class="short-video-card">
        <div class="video-preview">
          <div class="play-overlay">
            <el-icon class="play-icon"><VideoPlay /></el-icon>
          </div>
          <div class="video-badge">
            <el-icon class="badge-icon"><VideoCameraFilled /></el-icon>
            <span>小视频</span>
          </div>
        </div>
        <div class="video-info">
          <div class="video-title">{{ title || '小视频' }}</div>
          <div class="video-hint">
            <el-icon><Right /></el-icon>
            <span>点击播放</span>
          </div>
        </div>
      </div>
    </template>
    <span v-else class="media-placeholder">[小视频] {{ title || '小视频' }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-short-video {
  cursor: pointer;
  user-select: none;

  .short-video-card {
    min-width: 280px;
    max-width: 320px;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    border: 1px solid var(--el-border-color-light);
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);

      .play-overlay {
        background: rgba(0, 0, 0, 0.5);

        .play-icon {
          transform: scale(1.1);
        }
      }
    }
  }

  .video-preview {
    position: relative;
    width: 100%;
    height: 180px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;

    .play-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;

      .play-icon {
        font-size: 64px;
        color: #fff;
        opacity: 0.9;
        transition: all 0.3s ease;
      }
    }

    .video-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      border-radius: 12px;
      color: #fff;
      font-size: 12px;
      font-weight: 500;

      .badge-icon {
        font-size: 14px;
      }
    }
  }

  .video-info {
    padding: 12px;
    background: #fff;

    .video-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      line-height: 1.5;
      margin-bottom: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .video-hint {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--el-color-primary);

      .el-icon {
        font-size: 12px;
      }
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
  .message-short-video {
    .short-video-card {
      background: #2b2b2b;
      border-color: var(--el-border-color-darker);
    }

    .video-info {
      background: #2b2b2b;
    }

    .media-placeholder {
      background: var(--el-fill-color-dark);
      border-color: var(--el-border-color-darker);
    }
  }
}
</style>