<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useSessionStore } from '@/stores/session'
import { useContactStore } from '@/stores/contact'

const appStore = useAppStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()

// 标签项类型定义
interface TabItem {
  key: string
  label: string
  icon: string
  badge: (() => number | string | null) | null
}

// 标签项配置
const tabs: TabItem[] = [
  {
    key: 'chat',
    label: '聊天',
    icon: 'ChatLineSquare',
    badge: () => sessionStore.totalUnreadCount
  },
  {
    key: 'contact',
    label: '联系人',
    icon: 'User',
    badge: () => contactStore.isBackgroundLoading ? '...' : null
  },
  {
    key: 'search',
    label: '搜索',
    icon: 'Search',
    badge: null
  },
  {
    key: 'social',
    label: '社交',
    icon: 'Collection',
    badge: null
  },
  {
    key: 'settings',
    label: '设置',
    icon: 'Setting',
    badge: null
  }
]

// 处理标签点击
const handleTabClick = (key: string) => {
  appStore.switchMobileView(key)
}

// 判断是否激活
const isActive = (key: string) => {
  return appStore.activeNav === key
}
</script>

<template>
  <div class="mobile-tabbar">
    <div
      v-for="tab in tabs"
      :key="tab.key"
      class="tabbar-item"
      :class="{ active: isActive(tab.key) }"
      @click="handleTabClick(tab.key)"
    >
      <div class="tabbar-item__icon">
        <el-icon :size="24">
          <component :is="tab.icon" />
        </el-icon>
        <!-- 角标 -->
        <transition name="badge-scale">
          <el-badge
            v-if="tab.badge && typeof tab.badge() === 'number' && (tab.badge() as number) > 0"
            :value="(tab.badge() as number) > 99 ? '99+' : (tab.badge() as number)"
            :max="99"
            class="tabbar-badge"
          />
          <div v-else-if="tab.badge && tab.badge() === '...'" class="tabbar-loading">
            <el-icon class="is-loading" :size="8">
              <Loading />
            </el-icon>
          </div>
        </transition>
      </div>
      <div class="tabbar-item__label">{{ tab.label }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mobile-tabbar {
  display: none;

  @media (max-width: 768px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50px;
    background: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-light);
    z-index: 1000;
    padding-bottom: env(safe-area-inset-bottom);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  }
}

.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  color: var(--el-text-color-regular);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  padding: 4px 0;

  &__icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-bottom: 2px;
  }

  &__label {
    font-size: 11px;
    line-height: 1;
    font-weight: 500;
  }

  // 激活状态
  &.active {
    color: var(--el-color-primary);

    .tabbar-item__label {
      font-weight: 600;
    }
  }

  // 点击效果
  &:active {
    transform: scale(0.95);
    opacity: 0.8;
  }

  // 角标样式
  .tabbar-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    transform: scale(0.8);

    :deep(.el-badge__content) {
      font-size: 10px;
      padding: 0 4px;
      height: 16px;
      line-height: 16px;
    }
  }

  // 加载指示器
  .tabbar-loading {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    background-color: var(--el-color-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    .el-icon {
      color: white;
      animation: rotate 1s linear infinite;
    }
  }
}

// 角标缩放动画
.badge-scale-enter-active,
.badge-scale-leave-active {
  transition: all 0.3s;
}

.badge-scale-enter-from,
.badge-scale-leave-to {
  transform: scale(0);
  opacity: 0;
}

// 暗色模式
.dark {
  .mobile-tabbar {
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
  }
}
</style>