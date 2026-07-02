<script setup lang="ts">
import { ref } from 'vue'
import { PictureFilled } from '@element-plus/icons-vue'
import { getMediaPlaceholder } from '../composables/utils'
import ImageViewer from '@/components/common/ImageViewer.vue'

interface Props {
  emojiUrl: string
  showMediaResources: boolean
  cdnurl?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const imageLoaded = ref(false)
const imageError = ref(false)
const showPreview = ref(false)

const handleClick = () => {
  if (props.showMediaResources && props.emojiUrl && !imageError.value) {
    showPreview.value = true
  }
  emit('click')
}

const handleImageLoad = () => {
  imageLoaded.value = true
  imageError.value = false
}

const handleImageError = () => {
  imageLoaded.value = true
  imageError.value = true
}
</script>

<template>
  <div class="message-emoji" @click="handleClick">
    <template v-if="showMediaResources">
      <div v-if="emojiUrl" class="emoji-wrapper">
        <img
          v-if="!imageError"
          :src="emojiUrl"
          alt="emoji"
          :class="['emoji-image', { 'emoji-loaded': imageLoaded }]"
          loading="lazy"
          @load="handleImageLoad"
          @error="handleImageError"
        />
        <div v-if="!imageLoaded && !imageError" class="emoji-skeleton">
          <el-icon class="loading-icon"><PictureFilled /></el-icon>
        </div>
        <div v-if="imageError" class="emoji-error">
          <el-icon class="error-icon"><PictureFilled /></el-icon>
          <span>表情加载失败</span>
        </div>
      </div>
      <div v-else class="emoji-placeholder">
        <el-icon><PictureFilled /></el-icon>
        <span v-if="cdnurl">表情 (CDN: {{ cdnurl.substring(0, 30) }}...)</span>
        <span v-else>表情</span>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(47) }}</span>
  </div>

  <!-- 表情预览 -->
  <ImageViewer
    v-model:visible="showPreview"
    :image-url="emojiUrl"
    title="表情预览"
  />
</template>

<style lang="scss" scoped>
.message-emoji {
  background: transparent !important;
  padding: 0 !important;
  box-shadow: none !important;
  cursor: pointer;

  .emoji-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .emoji-image {
    width: 120px;
    height: 120px;
    object-fit: contain;
    display: block;
    opacity: 0;
    transition: opacity 0.3s ease;

    &.emoji-loaded {
      opacity: 1;
    }
  }

  .emoji-skeleton {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      90deg,
      var(--el-fill-color-lighter) 25%,
      var(--el-fill-color-light) 50%,
      var(--el-fill-color-lighter) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: 8px;

    .loading-icon {
      font-size: 48px;
      color: var(--el-color-warning);
      opacity: 0.3;
    }
  }

  .emoji-error {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    border-radius: 8px;
    gap: 8px;

    .error-icon {
      font-size: 48px;
      color: var(--el-color-danger);
      opacity: 0.6;
    }

    span {
      font-size: 12px;
    }
  }

  .emoji-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    background-color: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 12px;
    border-radius: 8px;

    .el-icon {
      font-size: 48px;
      margin-bottom: 8px;
      color: var(--el-color-warning);
    }

    span {
      text-align: center;
      word-break: break-all;
      padding: 0 8px;
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

  &:hover {
    opacity: 0.9;
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

html.dark {
  .message-emoji {
    .emoji-error {
      background-color: rgba(255, 255, 255, 0.05);
    }

    .emoji-skeleton {
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.03) 25%,
        rgba(255, 255, 255, 0.06) 50%,
        rgba(255, 255, 255, 0.03) 75%
      );
      background-size: 200% 100%;
    }

    .emoji-placeholder {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>
