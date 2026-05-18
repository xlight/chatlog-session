<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Close,
  ZoomIn,
  ZoomOut,
  RefreshLeft,
  RefreshRight,
  Download,
  WarningFilled,
} from '@element-plus/icons-vue'
import { request } from '@/utils/request'

interface ImageItem {
  imageUrl: string
  thumbUrl?: string
}

interface Props {
  visible: boolean
  imageUrl: string
  thumbUrl?: string
  imageList?: ImageItem[]
  initialIndex?: number
  title?: string
  mediaType?: 'image' | 'video' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  title: '图片预览',
  mediaType: 'auto',
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

// ==================== 视图状态 ====================
const scale = ref(1)
const rotate = ref(0)
const loading = ref(true)
const currentImageUrl = ref('')
const currentIndex = ref(0)
const isVideoMode = ref(false)
const hdLoading = ref(false)
const hdLoadFailed = ref(false)
// 图片/视频加载结果（用于 Live Photo 兼容）
const imageOk = ref(false)
const videoOk = ref(false)

const showDialog = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

// ==================== 列表计算 ====================
const normalizedList = computed<ImageItem[]>(() => {
  const list = (props.imageList || []).filter(i => i?.imageUrl || i?.thumbUrl)
  return list.length > 0 ? list : [{ imageUrl: props.imageUrl, thumbUrl: props.thumbUrl }]
})

const currentItem = computed(() => normalizedList.value[currentIndex.value] || normalizedList.value[0])
const canGoPrev = computed(() => currentIndex.value > 0)
const canGoNext = computed(() => currentIndex.value < normalizedList.value.length - 1)

const hdUrl = computed(() => currentItem.value?.imageUrl || props.imageUrl)
const thumbUrl = computed(() => currentItem.value?.thumbUrl)

const qualityLabel = computed(() => {
  if (props.mediaType === 'video') return '视频'
  if (isVideoMode.value && props.mediaType === 'auto') return 'Live Photo'
  if (currentImageUrl.value === hdUrl.value) return '高清图'
  if (currentImageUrl.value === thumbUrl.value) return '预览小图'
  return '图片预览'
})

const transformStyle = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotate.value}deg)`,
  transition: 'transform 0.3s ease',
}))

// ==================== 操作 ====================
const handleClose = () => {
  showDialog.value = false
  emit('close')
}

const handleDownload = async () => {
  const url = hdUrl.value
  if (!url) return
  try {
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
    await request.download(url, `image_${ts}`)
  } catch (error) {
    console.error('下载图片失败:', error)
  }
}

const switchToIndex = (index: number) => {
  if (index < 0 || index >= normalizedList.value.length) return
  currentIndex.value = index
  resetAndLoad()
}

// ==================== 加载逻辑 ====================
const tryShowVideo = () => {
  if (videoOk.value && !imageOk.value) {
    isVideoMode.value = true
    loading.value = false
  }
}

const handleImageLoad = () => {
  if (isVideoMode.value) return
  imageOk.value = true
  loading.value = false
}

const handleImageError = () => {
  imageOk.value = false
  tryShowVideo()
  if (!videoOk.value) loading.value = false
}

const handleVideoLoad = () => {
  videoOk.value = true
  tryShowVideo()
}

const handleVideoError = () => {
  videoOk.value = false
  if (!imageOk.value) loading.value = false
}

const resetAndLoad = () => {
  // 重置所有状态
  scale.value = 1
  rotate.value = 0
  loading.value = true
  isVideoMode.value = false
  hdLoading.value = false
  hdLoadFailed.value = false
  imageOk.value = false
  videoOk.value = false

  // mediaType='video' 时直接进入视频模式
  if (props.mediaType === 'video') {
    isVideoMode.value = true
    currentImageUrl.value = hdUrl.value
    videoOk.value = true
    loading.value = false
    return
  }

  // 先显示缩略图
  currentImageUrl.value = thumbUrl.value || hdUrl.value

  // 后台加载高清图
  loadHdInBackground()
}

const loadHdInBackground = () => {
  const hd = hdUrl.value
  const thumb = thumbUrl.value

  if (!thumb || !hd || thumb === hd) {
    hdLoading.value = false
    return
  }

  hdLoading.value = true
  hdLoadFailed.value = false

  const stillValid = () => props.visible && currentIndex.value < normalizedList.value.length

  // 先尝试作为图片加载
  const img = new Image()
  img.onload = () => {
    if (!stillValid()) return
    currentImageUrl.value = hd
    hdLoading.value = false
  }
  img.onerror = () => {
    // mediaType='image' 时不尝试视频回退
    if (props.mediaType === 'image') {
      hdLoading.value = false
      hdLoadFailed.value = true
      return
    }
    // 可能是 Live Photo (video/mp4)，尝试视频
    const video = document.createElement('video')
    video.onloadedmetadata = () => {
      if (!stillValid()) return
      currentImageUrl.value = hd
      isVideoMode.value = true
      imageOk.value = false
      videoOk.value = true
      loading.value = false
      hdLoading.value = false
    }
    video.onerror = () => {
      hdLoading.value = false
      hdLoadFailed.value = true
    }
    video.src = hd
  }
  img.src = hd
}

// ==================== 键盘 ====================
const handleKeydown = (e: KeyboardEvent) => {
  if (!props.visible) return
  const keyMap: Record<string, () => void> = {
    Escape: handleClose,
    '+': () => { if (scale.value < 3) scale.value = Math.min(scale.value + 0.25, 3) },
    '=': () => { if (scale.value < 3) scale.value = Math.min(scale.value + 0.25, 3) },
    '-': () => { if (scale.value > 0.5) scale.value = Math.max(scale.value - 0.25, 0.5) },
    ArrowLeft: () => { if (canGoPrev.value) switchToIndex(currentIndex.value - 1) },
    ArrowRight: () => { if (canGoNext.value) switchToIndex(currentIndex.value + 1) },
  }
  keyMap[e.key]?.()
}

// ==================== 生命周期 ====================
watch(
  () => props.visible,
  visible => {
    if (visible) {
      const target = props.initialIndex ?? 0
      currentIndex.value = Math.min(Math.max(target, 0), normalizedList.value.length - 1)
      resetAndLoad()
      document.addEventListener('keydown', handleKeydown)
    } else {
      document.removeEventListener('keydown', handleKeydown)
    }
  }
)
</script>

<template>
  <el-dialog
    v-model="showDialog"
    :title="title"
    :width="'90vw'"
    :style="{ maxWidth: '1400px' }"
    align-center
    destroy-on-close
    class="image-viewer-dialog"
    @close="handleClose"
  >
    <div class="image-viewer">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-mask">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <!-- 媒体容器 -->
      <div class="image-container">
        <!-- 加载失败 -->
        <div v-if="!imageOk && !videoOk" class="error-state">
          <el-icon class="error-icon"><WarningFilled /></el-icon>
          <span>资源加载失败</span>
        </div>

        <!-- 图片 -->
        <img
          v-show="!isVideoMode && imageOk"
          :src="currentImageUrl || hdUrl"
          :style="transformStyle"
          class="viewer-image"
          loading="lazy"
          @load="handleImageLoad"
          @error="handleImageError"
        />

        <!-- 视频 (Live Photo) -->
        <video
          v-show="isVideoMode && videoOk"
          :src="hdUrl"
          :style="transformStyle"
          class="viewer-image"
          controls
          autoplay
          loop
          playsinline
          crossorigin="anonymous"
          @loadedmetadata="handleVideoLoad"
          @error="handleVideoError"
        />
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button-group>
          <el-button :disabled="!canGoPrev" @click="switchToIndex(currentIndex - 1)">上一张</el-button>
          <el-button :disabled="!canGoNext" @click="switchToIndex(currentIndex + 1)">下一张</el-button>
        </el-button-group>

        <el-button-group class="ml-2">
          <el-button :icon="ZoomOut" :disabled="scale <= 0.5" @click="scale = Math.max(scale - 0.25, 0.5)">
            缩小
          </el-button>
          <el-button @click="scale = 1; rotate = 0"> {{ Math.round(scale * 100) }}% </el-button>
          <el-button :icon="ZoomIn" :disabled="scale >= 3" @click="scale = Math.min(scale + 0.25, 3)"> 放大 </el-button>
        </el-button-group>

        <el-button-group class="ml-2">
          <el-button :icon="RefreshLeft" @click="rotate -= 90"> 左转 </el-button>
          <el-button :icon="RefreshRight" @click="rotate += 90"> 右转 </el-button>
        </el-button-group>

        <el-button :icon="Download" class="ml-2" @click="handleDownload"> 下载 </el-button>
        <el-button :icon="Close" class="ml-2" type="info" @click="handleClose"> 关闭 </el-button>
      </div>

      <!-- 状态提示 -->
      <div class="shortcuts-hint">
        <div class="preview-status">
          <el-tag size="small" effect="plain">{{ qualityLabel }}</el-tag>
          <el-tag v-if="hdLoading" size="small" type="warning">高清加载中</el-tag>
          <el-tag v-else-if="hdLoadFailed" size="small" type="danger">高清加载失败</el-tag>
        </div>
        <span>快捷键：ESC 关闭 | ←/→ 切图 | +/- 缩放</span>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.image-viewer-dialog {
  :deep(.el-dialog__header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  :deep(.el-dialog__body) {
    padding: 0;
    background-color: #f5f5f5;
    min-height: 70vh;
  }
}

.image-viewer {
  position: relative;
  width: 100%;
  min-height: 70vh;
  display: flex;
  flex-direction: column;

  .loading-mask {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.1);
    z-index: 1;
    gap: 12px;

    .el-icon {
      font-size: 32px;
      color: var(--el-color-primary);
    }

    span {
      font-size: 14px;
      color: var(--el-text-color-secondary);
    }
  }

  .image-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    overflow: hidden;
    background-color: #f5f5f5;
    min-height: 500px;

    .viewer-image {
      max-width: 100%;
      max-height: calc(70vh - 140px);
      object-fit: contain;
      cursor: move;
      user-select: none;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--el-text-color-secondary);

      .error-icon {
        font-size: 48px;
        color: var(--el-color-warning);
      }
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background-color: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-lighter);
    gap: 8px;

    .ml-2 {
      margin-left: 8px;
    }
  }

  .shortcuts-hint {
    padding: 8px 16px;
    text-align: center;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background-color: var(--el-fill-color-light);
    border-top: 1px solid var(--el-border-color-lighter);

    span {
      display: inline-block;
    }

    .preview-status {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 6px;
    }
  }
}

@media (max-width: 768px) {
  .image-viewer {
    .image-container {
      padding: 20px;
      min-height: 400px;

      .viewer-image {
        max-height: calc(70vh - 180px);
      }
    }

    .toolbar {
      flex-wrap: wrap;
      gap: 4px;

      .ml-2 {
        margin-left: 0;
      }

      .el-button {
        padding: 8px 12px;
        font-size: 12px;
      }
    }

    .shortcuts-hint {
      display: none;
    }
  }
}

.dark-mode {
  .image-viewer-dialog {
    :deep(.el-dialog__body) {
      background-color: #1a1a1a;
    }
  }

  .image-viewer {
    .image-container {
      background-color: #1a1a1a;
    }
  }
}
</style>
