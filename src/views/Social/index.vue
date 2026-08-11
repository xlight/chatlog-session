/**
 * 社交 & 财务数据总览页
 * 包含转账、红包、收藏、朋友圈四个子页面
 */

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { Wallet, Coin, Star, Picture } from '@element-plus/icons-vue'
import TransferTab from './TransferTab.vue'
import RedPacketTab from './RedPacketTab.vue'
import FavoriteTab from './FavoriteTab.vue'
import MomentsTab from './MomentsTab.vue'

const appStore = useAppStore()

type ActiveTabKey = 'transfer' | 'redpacket' | 'favorite' | 'moments'

interface TabDef {
  key: ActiveTabKey
  label: string
  icon: typeof Wallet
  description: string
}

const tabs: TabDef[] = [
  { key: 'transfer', label: '转账', icon: Wallet, description: '查看微信转账记录，支持按年份和方向筛选' },
  { key: 'redpacket', label: '红包', icon: Coin, description: '查看微信红包记录，支持按收发方向筛选' },
  { key: 'favorite', label: '收藏', icon: Star, description: '查看微信收藏内容，支持按标签、类型和关键词搜索' },
  { key: 'moments', label: '朋友圈', icon: Picture, description: '浏览微信朋友圈时间线，查看动态与互动' },
]

const activeTab = ref<ActiveTabKey>('transfer')
const isMobile = computed(() => appStore.isMobile)

function setTab(key: ActiveTabKey) {
  activeTab.value = key
}

const ActiveComponent = computed(() => {
  switch (activeTab.value) {
    case 'transfer':
      return TransferTab
    case 'redpacket':
      return RedPacketTab
    case 'favorite':
      return FavoriteTab
    case 'moments':
      return MomentsTab
    default:
      return TransferTab
  }
})
</script>

<template>
  <div class="social-view" :class="{ 'is-mobile': isMobile }">
    <!-- 左侧导航标签 -->
    <aside v-if="!isMobile" class="social-view__tabs">
      <el-tooltip
        v-for="tab in tabs"
        :key="tab.key"
        :content="tab.description"
        placement="right"
        :show-after="500"
      >
        <div
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="setTab(tab.key)"
        >
          <el-icon size="22">
            <component :is="tab.icon" />
          </el-icon>
          <span class="tab-item__label">{{ tab.label }}</span>
        </div>
      </el-tooltip>

      <!-- 分隔线 -->
      <div class="tabs-divider" />
      <div class="tabs-info">
        <el-icon size="16">
          <InfoFilled />
        </el-icon>
        <span class="tabs-info__text">社交与财务数据</span>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="social-view__content">
      <Transition name="tab-fade" mode="out-in">
        <component :is="ActiveComponent" :key="activeTab" />
      </Transition>
    </main>

    <!-- 移动端底部标签 -->
    <nav v-if="isMobile" class="social-view__bottom-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="bottom-tab"
        :class="{ active: activeTab === tab.key }"
        @click="setTab(tab.key)"
      >
        <el-icon size="20">
          <component :is="tab.icon" />
        </el-icon>
        <span class="bottom-tab__label">{{ tab.label }}</span>
      </div>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
.social-view {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: var(--el-bg-color);

  &.is-mobile {
    flex-direction: column;

    .social-view__content {
      padding-bottom: 56px;
    }
  }

  // 左侧标签导航
  &__tabs {
    width: 72px;
    height: 100%;
    background-color: var(--el-bg-color-page);
    border-right: 1px solid var(--el-border-color-light);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 0;
    flex-shrink: 0;
    overflow-y: auto;

    .tab-item {
      width: 56px;
      padding: 10px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
      color: var(--el-text-color-regular);
      margin-bottom: 4px;

      &:hover {
        background-color: var(--el-fill-color-light);
        color: var(--el-text-color-primary);
      }

      &.active {
        background-color: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }

      &__label {
        font-size: 11px;
        line-height: 1;
      }
    }

    .tabs-divider {
      width: 32px;
      height: 1px;
      background-color: var(--el-border-color-lighter);
      margin: 8px 0;
    }

    .tabs-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: var(--el-text-color-placeholder);
      padding: 8px 0;

      &__text {
        font-size: 10px;
        text-align: center;
        line-height: 1.2;
        writing-mode: vertical-rl;
        letter-spacing: 2px;
      }
    }
  }

  // 主内容
  &__content {
    flex: 1;
    height: 100%;
    overflow: hidden;
    min-width: 0;
  }
}

// 移动端底部导航
.social-view__bottom-tabs {
  display: flex;
  height: 56px;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-light);
  flex-shrink: 0;

  .bottom-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    cursor: pointer;
    color: var(--el-text-color-secondary);
    transition: color 0.2s;
    padding: 4px 0;

    &.active {
      color: var(--el-color-primary);
    }

    &__label {
      font-size: 10px;
    }
  }
}

// 淡入淡出动画
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.2s ease;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}
</style>
