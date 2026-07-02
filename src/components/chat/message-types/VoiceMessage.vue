<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

interface Props {
  voiceUrl: string
  duration?: number
  isSelf?: boolean
  showMediaResources?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 0,
  isSelf: false,
  showMediaResources: true
})

// 音频元素引用
const audioRef = ref<HTMLAudioElement>()
const isPlaying = ref(false)
const currentTime = ref(0)
const audioDuration = ref(props.duration || 0)
const isLoading = ref(false)
const error = ref<string | null>(null)

// 格式化时间显示（秒转换为 mm:ss）
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 显示的时长文本
const durationText = computed(() => {
  if (isPlaying.value && audioDuration.value > 0) {
    return formatTime(currentTime.value)
  }
  if (audioDuration.value > 0) {
    return formatTime(audioDuration.value)
  }
  return ''
})

// 播放进度百分比
const progressPercent = computed(() => {
  if (audioDuration.value <= 0) return 0
  return (currentTime.value / audioDuration.value) * 100
})

// 播放/暂停切换
const togglePlay = async () => {
  if (!audioRef.value) {
    initAudio()
    return
  }

  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    try {
      isLoading.value = true
      error.value = null
      await audioRef.value.play()
    } catch (err) {
      console.error('播放语音失败:', err)
      error.value = '播放失败'
      isPlaying.value = false
    } finally {
      isLoading.value = false
    }
  }
}

// 初始化音频
const initAudio = () => {
  if (!props.voiceUrl) {
    error.value = '语音资源不可用'
    return
  }

  const audio = new Audio(props.voiceUrl)
  audioRef.value = audio

  // 监听播放事件
  audio.addEventListener('play', () => {
    isPlaying.value = true
    isLoading.value = false
  })

  // 监听暂停事件
  audio.addEventListener('pause', () => {
    isPlaying.value = false
  })

  // 监听结束事件
  audio.addEventListener('ended', () => {
    isPlaying.value = false
    currentTime.value = 0
  })

  // 监听时间更新
  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
  })

  // 监听时长加载
  audio.addEventListener('loadedmetadata', () => {
    audioDuration.value = audio.duration
  })

  // 监听加载中
  audio.addEventListener('loadstart', () => {
    isLoading.value = true
    error.value = null
  })

  // 监听加载完成
  audio.addEventListener('loadeddata', () => {
    isLoading.value = false
  })

  // 监听错误
  audio.addEventListener('error', (e) => {
    console.error('语音加载失败:', e)
    error.value = '加载失败'
    isLoading.value = false
    isPlaying.value = false
  })

  // 自动播放
  togglePlay()
}

// 监听 URL 变化
watch(() => props.voiceUrl, () => {
  // 停止当前播放
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value = undefined
  }
  isPlaying.value = false
  currentTime.value = 0
  error.value = null
})

// 组件卸载时清理
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value = undefined
  }
})

// 动画样式类
const waveClass = computed(() => ({
  'voice-wave--playing': isPlaying.value,
  'voice-wave--self': props.isSelf,
  'voice-wave--other': !props.isSelf
}))
</script>

<template>
  <div class="voice-message">
    <!-- 不显示媒体资源时的占位符 -->
    <span v-if="!showMediaResources" class="media-placeholder">[语音]</span>

    <!-- 完整的语音播放器 -->
    <div 
      v-else
      class="voice-player"
      :class="{ 'voice-player--self': isSelf, 'voice-player--error': error }"
      @click="togglePlay"
    >
    <!-- 播放按钮 -->
    <div class="voice-icon">
      <el-icon v-if="isLoading" class="is-loading">
        <Loading />
      </el-icon>
      <el-icon v-else-if="error">
        <Warning />
      </el-icon>
      <el-icon v-else-if="isPlaying">
        <VideoPause />
      </el-icon>
      <el-icon v-else>
        <VideoPlay />
      </el-icon>
    </div>

    <!-- 波形动画 -->
    <div class="voice-wave" :class="waveClass">
      <span class="wave-bar"></span>
      <span class="wave-bar"></span>
      <span class="wave-bar"></span>
    </div>

    <!-- 时长显示 -->
    <div class="voice-duration">
      {{ durationText || '语音' }}
    </div>

    <!-- 进度条（可选，隐藏的） -->
    <div v-if="isPlaying && audioDuration > 0" class="voice-progress">
      <div class="voice-progress-bar" :style="{ width: `${progressPercent}%` }"></div>
    </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.voice-message {
  .media-placeholder {
    color: var(--el-text-color-secondary);
    font-size: 14px;
    font-style: italic;
  }
}

.voice-player {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  min-width: 80px;
  max-width: 200px;
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
  }

  &:active {
    transform: scale(0.98);
  }

  &--error {
    opacity: 0.6;
    cursor: not-allowed;

    &:active {
      transform: none;
    }
  }

  .voice-icon {
    flex-shrink: 0;
    font-size: 20px;
    color: var(--el-text-color-regular);
    display: flex;
    align-items: center;
    justify-content: center;

    .is-loading {
      animation: rotating 1s linear infinite;
    }
  }

  .voice-wave {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 3px;
    height: 20px;

    .wave-bar {
      width: 3px;
      height: 8px;
      background-color: var(--el-text-color-regular);
      border-radius: 2px;
      transition: height 0.2s ease;

      &:nth-child(1) {
        animation-delay: 0s;
      }

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }

    &--playing .wave-bar {
      animation: wave-animation 0.6s ease-in-out infinite alternate;
    }
  }

  .voice-duration {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  .voice-progress {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 2px;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 0 0 4px 4px;
    overflow: hidden;

    .voice-progress-bar {
      height: 100%;
      background-color: var(--el-color-primary);
      transition: width 0.1s linear;
    }
  }
}

// 自己发送的语音消息样式
.voice-player--self {
  .voice-icon,
  .voice-wave .wave-bar {
    color: rgba(255, 255, 255, 0.9);
    background-color: rgba(255, 255, 255, 0.9);
  }

  .voice-duration {
    color: rgba(255, 255, 255, 0.8);
  }

  .voice-progress {
    background-color: rgba(255, 255, 255, 0.2);

    .voice-progress-bar {
      background-color: rgba(255, 255, 255, 0.9);
    }
  }
}

// 波形动画
@keyframes wave-animation {
  0% {
    height: 8px;
  }
  100% {
    height: 16px;
  }
}

// 旋转动画
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 暗色模式适配
html.dark {
  .voice-player {
    .voice-icon,
    .voice-wave .wave-bar {
      color: var(--el-text-color-regular);
      background-color: var(--el-text-color-regular);
    }

    .voice-progress {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .voice-player--self {
    .voice-icon,
    .voice-wave .wave-bar {
      color: rgba(255, 255, 255, 0.9);
      background-color: rgba(255, 255, 255, 0.9);
    }
  }
}
</style>