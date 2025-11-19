<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import ChatView from './Chat/index.vue'
import ContactView from './Contact/index.vue'
import SearchView from './Search/index.vue'
import SettingsView from './Settings/index.vue'

const appStore = useAppStore()

// 当前激活的视图
type ViewType = 'chat' | 'contact' | 'search' | 'settings'
const currentView = ref<ViewType>('chat')

// 切换视图
const switchView = (view: ViewType) => {
  currentView.value = view
}

// 判断是否激活
const isActive = (view: ViewType) => {
  return currentView.value === view
}

// 当前视图组件
const CurrentViewComponent = computed(() => {
  switch (currentView.value) {
    case 'chat':
      return ChatView
    case 'contact':
      return ContactView
    case 'search':
      return SearchView
    case 'settings':
      return SettingsView
    default:
      return ChatView
  }
})
</script>

<template>
  <div class="main-layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <el-icon size="24" color="#07c160">
          <ChatLineSquare />
        </el-icon>
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

        <el-tooltip :content="appStore.isDark ? '切换到亮色' : '切换到暗色'" placement="right">
          <div class="nav-item" @click="appStore.toggleTheme">
            <el-icon size="24">
              <component :is="appStore.isDark ? 'Sunny' : 'Moon'" />
            </el-icon>
          </div>
        </el-tooltip>
      </div>
    </aside>

    <!-- 右侧内容区域 -->
    <main class="content-area">
      <component :is="CurrentViewComponent" />
    </main>
  </div>
</template>

<style lang="scss" scoped>
.main-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: var(--el-bg-color);
  overflow: hidden;
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
  }
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
    width: 50px;

    .nav-item {
      height: 45px;
    }

    .sidebar-header,
    .sidebar-footer {
      height: 50px;
    }
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