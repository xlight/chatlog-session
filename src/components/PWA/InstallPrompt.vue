<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePWAStore } from '@/stores/pwa'
import { Download, Close, Share, Iphone } from '@element-plus/icons-vue'

const pwaStore = usePWAStore()
const showIOSGuide = ref(false)
const dismissed = ref(false)

const guide = pwaStore.getInstallGuide()
const isIOS = guide.platform === 'iOS'

const show = computed(() => {
  if (dismissed.value) return false
  if (pwaStore.isInstalled) return false
  if (pwaStore.canInstall) return true
  if (isIOS) return true
  return false
})

const install = async () => {
  if (pwaStore.canInstall) {
    await pwaStore.promptInstall()
  } else if (isIOS) {
    showIOSGuide.value = true
  }
}

const dismiss = () => {
  dismissed.value = true
  if (pwaStore.canInstall) {
    pwaStore.isInstallable = false
  }
}
</script>

<template>
  <transition name="slide-up">
    <div v-if="show" class="pwa-install-prompt">
      <div class="content">
        <div class="icon">
          <img src="/logo.svg" alt="App Logo" />
        </div>
        <div class="info">
          <h3>安装 Chatlog Session</h3>
          <p v-if="isIOS">添加到主屏幕，获得最佳体验</p>
          <p v-else>像原生应用一样使用，支持离线访问</p>
        </div>
      </div>
      <div class="actions">
        <el-button circle text :icon="Close" @click="dismiss" />
        <el-button type="primary" round :icon="isIOS ? Share : Download" @click="install">
          {{ isIOS ? '安装' : '安装' }}
        </el-button>
      </div>
    </div>
  </transition>

  <el-dialog
    v-model="showIOSGuide"
    title="安装说明"
    width="320px"
    align-center
    class="pwa-guide-dialog"
    append-to-body
  >
    <div class="guide-steps">
      <div class="step">
        <el-icon class="step-icon"><Share /></el-icon>
        <span>1. 点击浏览器底部的分享按钮</span>
      </div>
      <div class="step">
        <el-icon class="step-icon"><Iphone /></el-icon>
        <span>2. 向下滑动找到"添加到主屏幕"</span>
      </div>
      <div class="step">
        <el-icon class="step-icon"><Download /></el-icon>
        <span>3. 点击右上角的"添加"按钮</span>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" style="width: 100%" @click="showIOSGuide = false">
        知道了
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.pwa-install-prompt {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  box-shadow: var(--el-box-shadow-light);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 2000;
  backdrop-filter: blur(10px);

  .content {
    display: flex;
    align-items: center;
    gap: 12px;

    .icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .info {
      h3 {
        font-size: 15px;
        font-weight: 600;
        margin: 0;
        color: var(--el-text-color-primary);
      }
      p {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin: 2px 0 0;
      }
    }
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 0;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  
  .step-icon {
    font-size: 20px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    padding: 8px;
    border-radius: 8px;
    box-sizing: content-box;
  }
}
</style>