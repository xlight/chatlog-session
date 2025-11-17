<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const loading = ref(true)

onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 500)
})
</script>

<template>
  <div class="chat-page">
    <div class="chat-container">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <el-icon size="24" color="#07c160">
            <ChatLineSquare />
          </el-icon>
        </div>
        <div class="sidebar-nav">
          <el-tooltip content="聊天" placement="right">
            <div class="nav-item active">
              <el-icon size="24">
                <ChatLineSquare />
              </el-icon>
            </div>
          </el-tooltip>
          <el-tooltip content="联系人" placement="right">
            <div class="nav-item">
              <el-icon size="24">
                <User />
              </el-icon>
            </div>
          </el-tooltip>
          <el-tooltip content="搜索" placement="right">
            <div class="nav-item">
              <el-icon size="24">
                <Search />
              </el-icon>
            </div>
          </el-tooltip>
        </div>
        <div class="sidebar-footer">
          <el-tooltip content="设置" placement="right">
            <div class="nav-item">
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

      <!-- 会话列表 -->
      <div class="session-list">
        <div class="session-header">
          <h2>聊天</h2>
          <el-input
            v-model="searchText"
            placeholder="搜索"
            prefix-icon="Search"
            clearable
            size="small"
          />
        </div>
        <div v-if="loading" class="session-loading">
          <el-skeleton :rows="5" animated />
        </div>
        <div v-else class="session-content">
          <el-empty description="暂无会话" />
          <div class="session-tip">
            <p>请确保 Chatlog API 服务正在运行</p>
            <p class="text-secondary">默认地址: http://127.0.0.1:5030</p>
          </div>
        </div>
      </div>

      <!-- 消息区域 -->
      <div class="message-area">
        <div class="message-header">
          <div class="header-info">
            <h3>Chatlog Session</h3>
            <span class="text-secondary">欢迎使用</span>
          </div>
        </div>
        <div class="message-content flex-center">
          <el-result icon="success" title="开发中" sub-title="Chatlog Session v1.0 正在开发中">
            <template #extra>
              <el-space direction="vertical" alignment="center">
                <el-tag type="success">✅ 项目初始化完成</el-tag>
                <el-tag type="warning">🚧 核心功能开发中</el-tag>
                <el-tag type="info">📅 预计发布: 2026-01-15</el-tag>
              </el-space>
            </template>
          </el-result>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref } from 'vue'
const searchText = ref('')
</script>

<style lang="scss" scoped>
.chat-page {
  width: 100%;
  height: 100%;
  background-color: var(--el-bg-color);
}

.chat-container {
  display: flex;
  width: 100%;
  height: 100%;
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

  .sidebar-header {
    width: 100%;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .sidebar-nav {
    flex: 1;
    width: 100%;
    padding: 16px 0;
    overflow-y: auto;
  }

  .sidebar-footer {
    width: 100%;
    padding: 16px 0;
    border-top: 1px solid var(--el-border-color-lighter);
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

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &.active {
      color: var(--el-color-primary);

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
  }
}

// 会话列表
.session-list {
  width: 280px;
  height: 100%;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;

  .session-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
    }
  }

  .session-loading,
  .session-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .session-tip {
    margin-top: 20px;
    text-align: center;

    p {
      margin: 8px 0;
      font-size: 13px;
    }
  }
}

// 消息区域
.message-area {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);

  .message-header {
    height: 60px;
    padding: 0 24px;
    border-bottom: 1px solid var(--el-border-color-light);
    display: flex;
    align-items: center;
    justify-content: space-between;

    .header-info {
      h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      span {
        font-size: 12px;
      }
    }
  }

  .message-content {
    flex: 1;
    overflow-y: auto;
  }
}

// 响应式
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .session-list {
    width: 100%;
    border-right: none;
  }

  .message-area {
    display: none;
  }
}
</style>