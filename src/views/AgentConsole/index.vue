<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAIConsoleStore } from '@/stores/ai/console'
import {
  ChatLineRound,
  DataLine,
  List,
  Monitor,
  Setting,
} from '@element-plus/icons-vue'
import ConsoleChat from './ConsoleChat.vue'
import ConsoleOverview from './ConsoleOverview.vue'
import ConsoleActivityLog from './ConsoleActivityLog.vue'
import ConsoleSessions from './ConsoleSessions.vue'
import ConsoleConfig from './ConsoleConfig.vue'

const appStore = useAppStore()
const consoleStore = useAIConsoleStore()

interface TabDef {
  key: 'chat' | 'overview' | 'log' | 'sessions' | 'config'
  label: string
  icon: typeof ChatLineRound
}

const tabs: TabDef[] = [
  { key: 'chat', label: '对话', icon: ChatLineRound },
  { key: 'overview', label: '总览', icon: DataLine },
  { key: 'log', label: '活动日志', icon: List },
  { key: 'sessions', label: '监听会话', icon: Monitor },
  { key: 'config', label: '配置', icon: Setting },
]

const activeTab = computed(() => consoleStore.activeTab)
const isMobile = computed(() => appStore.isMobile)

function setTab(key: TabDef['key']) {
  consoleStore.switchTab(key)
}

const ActiveComponent = computed(() => {
  switch (activeTab.value) {
    case 'chat':
      return ConsoleChat
    case 'overview':
      return ConsoleOverview
    case 'log':
      return ConsoleActivityLog
    case 'sessions':
      return ConsoleSessions
    case 'config':
      return ConsoleConfig
    default:
      return ConsoleChat
  }
})

onUnmounted(() => {
  consoleStore.abortAllStreams()
})
</script>

<template>
  <div class="agent-console" :class="{ 'is-mobile': isMobile }">
    <aside v-if="!isMobile" class="agent-console__tabs">
      <el-tooltip
        v-for="tab in tabs"
        :key="tab.key"
        :content="tab.label"
        placement="right"
      >
        <div
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="setTab(tab.key)"
        >
          <el-icon size="20">
            <component :is="tab.icon" />
          </el-icon>
        </div>
      </el-tooltip>
    </aside>

    <main class="agent-console__content">
      <Transition name="tab-fade" mode="out-in">
        <component :is="ActiveComponent" :key="activeTab" />
      </Transition>
    </main>

    <nav v-if="isMobile" class="agent-console__bottom-tabs">
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

<style scoped lang="scss">
.agent-console {
  display: flex;
  width: 100%;
  height: 100%;
  background-color: var(--el-bg-color);

  &.is-mobile {
    flex-direction: column;

    .agent-console__content {
      padding-bottom: 56px;
    }
  }

  &__tabs {
    width: 48px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    border-right: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-bg-color-page);
    gap: 4px;
  }

  .tab-item {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    cursor: pointer;
    color: var(--el-text-color-regular);
    transition: all 0.2s;

    &:hover {
      background-color: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }

    &.active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    position: relative;
  }

  &__bottom-tabs {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 56px;
    display: flex;
    background-color: var(--el-bg-color-page);
    border-top: 1px solid var(--el-border-color-lighter);
    z-index: 10;
  }

  .bottom-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 11px;
    color: var(--el-text-color-regular);
    cursor: pointer;

    &.active {
      color: var(--el-color-primary);
    }
  }
}

.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.tab-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.tab-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
