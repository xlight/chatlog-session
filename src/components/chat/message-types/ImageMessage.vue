<script setup lang="ts">
import { ref } from 'vue'
import { getMediaPlaceholder } from '../composables/utils'
import ImageViewer from '@/components/common/ImageViewer.vue'

interface Props {
  thumbUrl?: string
  imageUrl: string
  imageList?: Array<{
    imageUrl: string
    thumbUrl?: string
  }>
  initialIndex?: number
  showMediaResources: boolean
  md5?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: []
}>()

const imageLoaded = ref(false)
const imageError = ref(false)
const showPreview = ref(false)

const handleClick = () => {
  if (props.showMediaResources && props.imageUrl && !imageError.value) {
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
  <div class="message-image" @click="handleClick">
    <template v-if="showMediaResources">
      <div v-if="imageUrl" class="image-wrapper">
        <img
          v-if="!imageError"
          :src="thumbUrl"
          :class="['image-content', { 'image-loaded': imageLoaded }]"
          loading="lazy"
          @load="handleImageLoad"
          @error="handleImageError"
        />
        <div v-if="!imageLoaded && !imageError" class="image-skeleton">
          <el-icon class="loading-icon"><Picture /></el-icon>
        </div>
        <div v-if="imageError" class="image-error">
          <el-icon class="error-icon"><PictureFilled /></el-icon>
          <span>图片加载失败</span>
        </div>
      </div>
      <div v-else class="image-placeholder">
        <el-icon><Picture /></el-icon>
        <span>图片 (MD5: {{ md5?.substring(0, 8) }}...)</span>
      </div>
    </template>
    <span v-else class="media-placeholder">{{ getMediaPlaceholder(3) }}</span>
  </div>

  <!-- 图片预览 -->
  <ImageViewer
    v-model:visible="showPreview"
    :thumb-url="thumbUrl"
    :image-url="imageUrl"
    :image-list="imageList"
    :initial-index="initialIndex"
    title="图片预览"
  />
</template>

<style lang="scss" scoped>
@use './_shared.scss' as *;

.message-image {
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  max-width: 300px;

  .image-wrapper {
    position: relative;
    width: 200px;
    height: 200px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
    overflow: hidden;
  }

  .image-content {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.3s ease;

    &.image-loaded {
      opacity: 1;
    }
  }

  .image-skeleton {
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

    .loading-icon {
      font-size: 32px;
      color: var(--el-text-color-placeholder);
      opacity: 0.5;
    }
  }

  .image-error {
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
    gap: 8px;

    .error-icon {
      font-size: 32px;
      color: var(--el-color-danger);
      opacity: 0.6;
    }

    span {
      font-size: 12px;
    }
  }

  .image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 200px;
    height: 200px;
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


    @include media-placeholder;


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
  .message-image {
    .image-wrapper,
    .image-placeholder,
    .image-error {
      background-color: rgba(255, 255, 255, 0.05);
    }

    .image-skeleton {
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.03) 25%,
        rgba(255, 255, 255, 0.06) 50%,
        rgba(255, 255, 255, 0.03) 75%
      );
      background-size: 200% 100%;
    }
  }

  .media-placeholder {
    background: var(--el-fill-color-dark);
    border-color: var(--el-border-color-darker);
  }
}
</style>
