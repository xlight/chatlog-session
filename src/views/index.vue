<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import { useContactStore } from '@/stores/contact'
import ChatView from './Chat/index.vue'
import ContactView from './Contact/index.vue'
import SearchView from './Search/index.vue'
import SettingsView from './Settings/index.vue'
import AgentConsoleView from './AgentConsole/index.vue'
import MobileTabBar from '@/components/layout/MobileTabBar.vue'
import logoUrl from '/logo.svg?url'

const DashboardView = defineAsyncComponent(() => import('./Dashboard/index.vue'))


const appStore = useAppStore()
const settingsStore = useSettingsStore()
const contactStore = useContactStore()

// 联系人后台加载状态
const isContactLoading = computed(() => contactStore.isBackgroundLoading)

// Agent 控制台是否在侧边栏显示
const showConsoleInSidebar = computed(() => settingsStore.ai.showConsoleInSidebar)

// 当前激活的视图
type ViewType = 'chat' | 'contact' | 'search' | 'dashboard' | 'settings' | 'agent'
const currentView = ref<ViewType>('chat')

// 同步 activeNav 和 currentView
watch(() => appStore.activeNav, (newNav) => {
  currentView.value = newNav as ViewType
})

watch(currentView, (newView) => {
  if (appStore.activeNav !== newView) {
    appStore.setActiveNav(newView)
  }
})

// 切换视图
const switchView = (view: ViewType) => {
  if (appStore.isMobile) {
    appStore.switchMobileView(view)
  } else {
    currentView.value = view
    appStore.setActiveNav(view)
  }
}

// 判断是否激活
const isActive = (view: ViewType) => {
  return currentView.value === view
}

// 主题切换提示文本
const themeTooltipText = computed(() => {
  const currentTheme = settingsStore.appearance.theme
  if (currentTheme === 'light') {
    return '切换到暗色'
  } else if (currentTheme === 'dark') {
    return '切换到随系统'
  } else {
    return '切换到亮色'
  }
})

// 主题图标
const themeIcon = computed(() => {
  const currentTheme = settingsStore.appearance.theme
  if (currentTheme === 'auto') {
    return 'Monitor'
  }
  return appStore.isDark ? 'Moon' : 'Sunny'
})

// 当前视图组件
const CurrentViewComponent = computed(() => {
  switch (currentView.value) {
    case 'chat':
      return ChatView
    case 'contact':
      return ContactView
    case 'search':
      return SearchView
    case 'dashboard':
      return DashboardView
    case 'settings':
      return SettingsView
    case 'agent':
      return AgentConsoleView
    default:
      return ChatView
  }
})
</script>

<template>
  <div class="main-layout" :class="{ 'mobile-layout': appStore.isMobile }">
    <!-- 左侧导航栏（PC端） -->
    <aside v-if="!appStore.isMobile" class="sidebar">
      <div class="sidebar-header">
        <img :src="logoUrl" alt="logo" class="sidebar-logo" />
      </div>

      <div class="sidebar-nav">
        <el-tooltip content="聊天" placement="right">
          <div
            class="nav-item"
            :class="{ active: isActive('chat') }"
            @click="switchView('chat')"
          >
            <el-icon size="24">
              <ChatLineSquare />
            </el-icon>
          </div>
        </el-tooltip>

        <el-tooltip content="联系人" placement="right">
          <div
            class="nav-item"
            :class="{ active: isActive('contact') }"
            @click="switchView('contact')"
          >
            <el-icon size="24">
              <User />
            </el-icon>
            <!-- 后台加载指示器 -->
            <transition name="fade">
              <div v-if="isContactLoading" class="loading-indicator">
                <el-icon class="loading-icon">
                  <Loading text="" />
                </el-icon>
              </div>
            </transition>
          </div>
        </el-tooltip>

        <el-tooltip content="搜索" placement="right">
          <div
            class="nav-item"
            :class="{ active: isActive('search') }"
            @click="switchView('search')"
          >
            <el-icon size="24">
              <Search />
            </el-icon>
          </div>
        </el-tooltip>

        <el-tooltip content="数据总览" placement="right">
          <div
            class="nav-item"
            :class="{ active: isActive('dashboard') }"
            @click="switchView('dashboard')"
          >
            <el-icon size="24">
              <DataLine />
            </el-icon>
          </div>
        </el-tooltip>

        <el-tooltip
          v-if="showConsoleInSidebar"
          content="Agent 控制台"
          placement="right"
        >
          <div
            class="nav-item"
            :class="{ active: isActive('agent') }"
            @click="switchView('agent')"
          >
            <el-icon size="24">
              <Cpu />
            </el-icon>
          </div>
        </el-tooltip>
      </div>

      <div class="sidebar-footer">
        <el-tooltip content="设置" placement="right">
          <div
            class="nav-item"
            :class="{ active: isActive('settings') }"
            @click="switchView('settings')"
          >
            <el-icon size="24">
              <Setting />
            </el-icon>
          </div>
        </el-tooltip>

        <el-tooltip :content="themeTooltipText" placement="right">
          <div class="nav-item" @click="appStore.toggleTheme">
            <el-icon size="24">
              <component :is="themeIcon" />
            </el-icon>
          </div>
        </el-tooltip>
      </div>
    </aside>

    <!-- 右侧内容区域 -->
    <main class="content-area">
      <!-- 使用 keep-alive 缓存组件，避免切换时重新渲染，提升性能 -->
      <keep-alive>
        <component :is="CurrentViewComponent" />
      </keep-alive>
    </main>

    <!-- 移动端底部标签栏 -->
    <MobileTabBar v-if="appStore.isMobile" />
  </div>
</template>

<style lang="scss" scoped>
.main-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: var(--el-bg-color);
  overflow: hidden;

  // 移动端布局
  &.mobile-layout {
    flex-direction: column;

    .content-area {
      padding-bottom: calc(50px + env(safe-area-inset-bottom));
    }
  }
}

// 侧边栏
.sidebar {
  width: 60px;
  height: 100%;
  background-color: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  z-index: 100;

  .sidebar-header {
    width: 100%;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;

    .sidebar-logo {
      width: 36px;
      height: 36px;
    }
  }

  .sidebar-nav {
    flex: 1;
    width: 100%;
    padding: 16px 0;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 2px;
    }
  }

  .sidebar-footer {
    width: 100%;
    padding: 16px 0;
    border-top: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
  }

  .nav-item {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
    color: var(--el-text-color-regular);

    &:hover {
      background-color: var(--el-fill-color-light);
      color: var(--el-text-color-primary);
    }

    &.active {
      color: var(--el-color-primary);
      background-color: var(--el-fill-color-lighter);

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 20px;
        background-color: var(--el-color-primary);
        border-radius: 0 2px 2px 0;
      }
    }

    &:active {
      transform: scale(0.95);
    }

    // 加载指示器
    .loading-indicator {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      background-color: var(--el-color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      .loading-icon {
        font-size: 8px;
        color: white;
        animation: rotate 1s linear infinite;
      }
    }
  }
}

// 淡入淡出动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 内容区域
.content-area {
  flex: 1;
  height: 100%;
  overflow: hidden;
  min-width: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .content-area {
    width: 100%;
    height: 100%;
  }
}

// 暗色模式
.dark-mode {
  .sidebar {
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>
