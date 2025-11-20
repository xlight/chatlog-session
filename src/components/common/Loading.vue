<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  loading?: boolean
  text?: string
  size?: 'small' | 'default' | 'large'
  fullscreen?: boolean
  background?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: true,
  text: '', //加载中...
  size: 'default',
  fullscreen: false,
  background: 'rgba(255, 255, 255, 0.9)'
})

const sizeMap = {
  small: 24,
  default: 40,
  large: 60
}

const iconSize = computed(() => sizeMap[props.size])
</script>

<template>
  <div v-if="loading" class="loading-wrapper" :class="{ 'is-fullscreen': fullscreen }">
    <div class="loading-mask" :style="{ backgroundColor: background }">
      <div class="loading-content">
        <el-icon class="loading-icon" :size="iconSize">
          <Loading />
        </el-icon>
        <p v-if="text" class="loading-text">{{ text }}</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.loading-wrapper {
  position: relative;
  /*width: 100%;*/
  height: 100%;
  min-height: 200px;

  &.is-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    min-height: 100vh;
  }

  .loading-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.9);
    transition: background-color 0.3s;

    @at-root {
      :global(.dark) & {
        background-color: rgba(0, 0, 0, 0.8);
      }
    }
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .loading-icon {
      color: var(--el-color-primary);
      animation: rotate 2s linear infinite;
    }

    .loading-text {
      margin: 0;
      font-size: 14px;
      color: var(--el-text-color-regular);
      white-space: nowrap;
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
