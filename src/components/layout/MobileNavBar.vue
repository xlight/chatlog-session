<script setup lang="ts">
import { useAppStore } from '@/stores/app'

interface Props {
  title?: string
  subtitle?: string
  showBack?: boolean
  showRefresh?: boolean
  showSearch?: boolean
  showMore?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  showBack: true,
  showRefresh: false,
  showSearch: false,
  showMore: false
})

const emit = defineEmits<{
  back: []
  refresh: []
  search: []
  more: []
}>()

const appStore = useAppStore()

// 处理返回
const handleBack = () => {
  emit('back')
  appStore.navigateBack()
}

// 处理刷新
const handleRefresh = () => {
  emit('refresh')
}

// 处理搜索
const handleSearch = () => {
  emit('search')
}

// 处理更多
const handleMore = () => {
  emit('more')
}
</script>

<template>
  <div class="mobile-navbar">
    <div class="mobile-navbar__left">
      <el-button
        v-if="showBack"
        class="back-button"
        text
        circle
        @click="handleBack"
      >
        <el-icon :size="20">
          <ArrowLeft />
        </el-icon>
      </el-button>
    </div>

    <div class="mobile-navbar__title">
      <div class="title-content">
        <h3 class="title-text">{{ title }}</h3>
        <p v-if="subtitle" class="subtitle-text">{{ subtitle }}</p>
      </div>
    </div>

    <div class="mobile-navbar__right">
      <el-button
        v-if="showRefresh"
        class="action-button"
        text
        circle
        @click="handleRefresh"
      >
        <el-icon :size="18">
          <Refresh />
        </el-icon>
      </el-button>
      
      <el-button
        v-if="showSearch"
        class="action-button"
        text
        circle
        @click="handleSearch"
      >
        <el-icon :size="18">
          <Search />
        </el-icon>
      </el-button>
      
      <el-button
        v-if="showMore"
        class="action-button"
        text
        circle
        @click="handleMore"
      >
        <el-icon :size="18">
          <More />
        </el-icon>
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mobile-navbar {
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 8px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
    position: relative;
    z-index: 100;

    // 适配刘海屏
    padding-top: env(safe-area-inset-top);
  }

  &__left {
    display: flex;
    align-items: center;
    min-width: 56px;

    .back-button {
      width: 44px;
      height: 44px;
      color: var(--el-text-color-primary);
      
      &:hover {
        background-color: var(--el-fill-color-light);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }

  &__title {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    overflow: hidden;

    .title-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 0;
      max-width: 100%;
    }

    .title-text {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      line-height: 1.4;
    }

    .subtitle-text {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: var(--el-text-color-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      line-height: 1.2;
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 56px;
    justify-content: flex-end;

    .action-button {
      width: 40px;
      height: 40px;
      color: var(--el-text-color-regular);

      &:hover {
        background-color: var(--el-fill-color-light);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }
}
</style>