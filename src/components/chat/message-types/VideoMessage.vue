<script setup lang="ts">
import { getMediaPlaceholder } from '../composables/utils'

interface Props {
  videoUrl: string
  showMediaResources: boolean
  content?: string
  md5?: string
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
  <div class="message-video" @click="handleClick">
    <template v-if="showMediaResources">
      <div v-if="videoUrl" class="video-cover">
        <el-icon class="play-icon"><VideoPlay /></el-icon>
        <span v-if="content" class="video-duration">{{ content }}</span>
      </div>
      <div v-else class="video-placeholder">
        <el-icon><VideoCamera /></el-icon>
        <span>视频 (MD5: {{ md5?.substring(0, 8) }}...)</span>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(43) }}</span>
  </div>
</template>

<style lang="scss" scoped>
.message-video {
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  max-width: 300px;

  .video-cover {
    width: 100%;
    height: 200px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    .play-icon {
      font-size: 48px;
      color: #fff;
      opacity: 0.9;
    }

    .video-duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background-color: rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
  }

  .video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 12px;
    border-radius: 4px;

    .el-icon {
      font-size: 32px;
      margin-bottom: 8px;
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

  &:hover .play-icon {
    opacity: 1;
  }
}

.dark-mode {
  .message-video .video-placeholder {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>