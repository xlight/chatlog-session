<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/stores/settings'
import { useNotificationStore } from '@/stores/notification'
import { useSessionStore } from '@/stores/session'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { getVersion, getVersionInfo } from '@/utils/version'
import { downloadJSON, downloadText, downloadMarkdown } from '@/utils/download'
import { formatBackupAsText, formatBackupAsMarkdown } from '@/utils/message-format'
import { chatlogAPI } from '@/api/chatlog'
import {
  ApiSettings,
  AppearanceSettings,
  NotificationSettings,
  ChatSettings,
  PrivacySettings,
  AdvancedSettings,
  AboutSettings,
  SendmsgSettings,
  AISettings,
} from './components'

const appStore = useAppStore()
const settingsStore = useSettingsStore()
const notificationStore = useNotificationStore()
const router = useRouter()

// 当前活动菜单
const activeMenu = ref('api')

// 菜单项
const menuItems = [
  { key: 'api', label: 'API 设定', icon: 'Link' },
  { key: 'appearance', label: '外观设置', icon: 'Brush' },
  { key: 'notifications', label: '通知设置', icon: 'Bell' },
  { key: 'chat', label: '聊天设置', icon: 'ChatDotRound' },
  { key: 'sendmsg', label: '发送设置', icon: 'Promotion' },
  { key: 'ai', label: 'AI 助手', icon: 'ChatLineSquare' },
  { key: 'privacy', label: '隐私设置', icon: 'Lock' },
  { key: 'advanced', label: '高级设置', icon: 'Setting' },
  { key: 'about', label: '关于', icon: 'InfoFilled' },
]

// 版本信息
const versionInfo = computed(() => {
  const info = getVersionInfo()
  return {
    version: info.version || getVersion(),
    buildDate: info.buildDate || __BUILD_DATE__,
    gitHash: info.gitHash,
    gitBranch: info.gitBranch,
    buildTime: info.buildTime,
    isDev: info.isDev,
  }
})

// 通知统计
const notificationStats = computed(() => notificationStore.getStats())

// 同步通知设置到 Store
const syncNotificationSettings = () => {
  notificationStore.updateConfig({
    enabled: settingsStore.notification.enableNotifications,
    enableMention: settingsStore.notification.enableMention,
    enableQuote: settingsStore.notification.enableQuote,
    enableMessage: settingsStore.notification.enableMessage,
    enableSound: settingsStore.notification.enableSound,
    enableVibrate: settingsStore.notification.enableVibrate,
    onlyShowLatest: settingsStore.notification.onlyShowLatest,
    autoClose: settingsStore.notification.autoCloseTime,
    myWxid: settingsStore.notification.myWxid,
    showMessageContent: settingsStore.notification.showMessageContent,
  })
}

// 组件挂载时初始化
onMounted(async () => {
  // 尝试从旧格式迁移（仅首次）
  settingsStore.migrateFromLegacyStorage()

  // 从 notificationStore 加载设置（init 已在 App.vue 中调用）
  settingsStore.notification.myWxid = notificationStore.config.myWxid || ''
  settingsStore.notification.showMessageContent = notificationStore.config.showMessageContent
  // 同步通知设置
  syncNotificationSettings()
})

// 处理主题变化
const handleThemeChange = (theme: string) => {
  settingsStore.appearance.theme = theme as 'light' | 'dark' | 'auto'
  appStore.setupThemeListener()
  appStore.applyTheme()
  ElMessage.success('主题已切换')
}

// 处理 API 设置更新
const handleApiSettingsUpdate = (newSettings: typeof settingsStore.api) => {
  Object.assign(settingsStore.api, newSettings)
  settingsStore.syncEnableDebug(newSettings.enableDebug)
  appStore.config.enableDebug = newSettings.enableDebug
}

// 处理高级设置更新
const handleAdvancedSettingsUpdate = (newSettings: typeof settingsStore.advanced) => {
  Object.assign(settingsStore.advanced, newSettings)
  settingsStore.syncEnableDebug(newSettings.enableDebug)
  appStore.config.enableDebug = newSettings.enableDebug
}

// 清空通知历史
const handleClearNotificationHistory = () => {
  notificationStore.clearHistory()
  ElMessage.success('通知历史已清空')
}

// 导出数据
const handleExportData = async () => {
  try {
    const result = await ElMessageBox.prompt('选择导出格式', '导出数据', {
      confirmButtonText: '导出',
      cancelButtonText: '取消',
      inputPattern: /^(json|csv|txt|markdown)$/,
      inputErrorMessage: '请选择有效的格式: json, csv, txt, markdown',
      inputPlaceholder: 'json',
      inputValue: 'json',
    }).catch(() => null)

    if (!result) return
    const format = (result as { value: string }).value

    const loading = ElLoading.service({
      lock: true,
      text: '正在导出数据...',
      background: 'rgba(0, 0, 0, 0.7)',
    })

    try {
      const sessionStore = useSessionStore()
      const sessions = sessionStore.sessions

      if (sessions.length === 0) {
        ElMessage.warning('没有可导出的会话数据')
        return
      }

      const exportData = {
        exportTime: new Date().toISOString(),
        sessions: [] as Array<{ sessionId: string; sessionName: string; messageCount: number; messages: any[] }>,
      }

      for (const session of sessions.slice(0, 10)) {
        try {
          const messages = await chatlogAPI.getChatlog({
            talker: session.id,
            time: '',
            limit: 1000,
          })

          exportData.sessions.push({
            sessionId: session.id,
            sessionName: session.name || session.talkerName,
            messageCount: messages.length,
            messages: messages,
          })
        } catch (err) {
          console.error(`导出会话 ${session.id} 失败:`, err)
        }
      }

      const timestamp = new Date().toISOString().split('T')[0]
      switch (format) {
        case 'json':
          downloadJSON(exportData, `chatlog_backup_${timestamp}`)
          break
        case 'txt':
          const textContent = formatBackupAsText(exportData)
          downloadText(textContent, `chatlog_backup_${timestamp}`)
          break
        case 'markdown':
          const markdownContent = formatBackupAsMarkdown(exportData)
          downloadMarkdown(markdownContent, `chatlog_backup_${timestamp}`)
          break
        case 'csv':
          if (exportData.sessions.length > 0) {
            await chatlogAPI.exportCSV(
              { talker: exportData.sessions[0].sessionId, time: '', limit: 1000 },
              `chatlog_backup_${timestamp}.csv`
            )
          }
          break
      }

      ElMessage.success(`成功导出 ${exportData.sessions.length} 个会话的数据`)
    } finally {
      loading.close()
    }
  } catch (error) {
    console.error('导出数据失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 清除缓存
const handleClearCache = async () => {
  localStorage.clear()
  sessionStorage.clear()
  ElMessage.success('缓存已清除')
}

// 检查更新
const handleCheckUpdate = () => {
  ElMessage.info('当前已是最新版本')
}

// 重新运行引导
const handleRestartOnboarding = async () => {
  localStorage.removeItem('onboardingCompleted')
  localStorage.removeItem('onboardingSkippedAt')

  ElMessage.success('即将打开引导页面')

  setTimeout(() => {
    router.push('/onboarding')
  }, 500)
}

// 保存设置（持久化由 pinia-plugin-persistedstate 自动处理，此方法仅做同步）
const saveSettings = () => {
  // 去除 apiBaseUrl 末尾的斜杠
  if (settingsStore.api.apiBaseUrl.endsWith('/')) {
    settingsStore.api.apiBaseUrl = settingsStore.api.apiBaseUrl.slice(0, -1)
  }

  // 保存 apiBaseUrl 到独立的 key（兼容 request.ts 等读取）
  localStorage.setItem('apiBaseUrl', settingsStore.api.apiBaseUrl)

  // 同步通知设置到 notificationStore
  syncNotificationSettings()

  // 触发自定义事件（兼容 useAutoRefreshManager 等监听方）
  window.dispatchEvent(
    new CustomEvent('chatlog-settings-updated', {
      detail: settingsStore.allSettings,
    })
  )

  ElMessage.success('设置已保存')
}

// 重置设置
const resetSettings = async () => {
  try {
    await ElMessageBox.confirm('确定要重置所有设置吗？此操作不可恢复。', '重置设置', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    settingsStore.resetSettings()
    appStore.config.enableDebug = false

    ElMessage.success('设置已重置')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-container">
      <!-- 侧边栏菜单 -->
      <div class="settings-sidebar">
        <div class="sidebar-header">
          <h2>设置</h2>
        </div>

        <el-menu
          :default-active="activeMenu"
          class="settings-menu"
          @select="(key: string) => (activeMenu = key)"
        >
          <el-menu-item v-for="item in menuItems" :key="item.key" :index="item.key">
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 设置内容 -->
      <div class="settings-content">
        <el-scrollbar>
          <div class="settings-content-inner">
            <!-- API 设定 -->
            <ApiSettings
              v-show="activeMenu === 'api'"
              v-model="settingsStore.api"
              @update:model-value="handleApiSettingsUpdate"
            />

            <!-- 外观设置 -->
            <AppearanceSettings
              v-show="activeMenu === 'appearance'"
              v-model="settingsStore.appearance"
              @theme-change="handleThemeChange"
            />

            <!-- 通知设置 -->
            <NotificationSettings
              v-show="activeMenu === 'notifications'"
              v-model="settingsStore.notification"
              :notification-stats="notificationStats"
              @clear-history="handleClearNotificationHistory"
            />

            <!-- 聊天设置 -->
            <ChatSettings v-show="activeMenu === 'chat'" v-model="settingsStore.chat" />

            <!-- 发送设置 -->
            <SendmsgSettings v-show="activeMenu === 'sendmsg'" v-model="settingsStore.sendmsg" />

            <!-- AI 设置 -->
            <AISettings v-show="activeMenu === 'ai'" v-model="settingsStore.ai" />

            <!-- 隐私设置 -->
            <PrivacySettings
              v-show="activeMenu === 'privacy'"
              v-model="settingsStore.privacy"
              @export-data="handleExportData"
              @clear-cache="handleClearCache"
            />

            <!-- 高级设置 -->
            <AdvancedSettings
              v-show="activeMenu === 'advanced'"
              v-model="settingsStore.advanced"
              @update:model-value="handleAdvancedSettingsUpdate"
            />

            <!-- 关于 -->
            <AboutSettings
              v-show="activeMenu === 'about'"
              :version-info="versionInfo"
              @check-update="handleCheckUpdate"
              @restart-onboarding="handleRestartOnboarding"
            />
          </div>
        </el-scrollbar>

        <!-- 底部操作栏 -->
        <div class="settings-footer">
          <el-button @click="resetSettings">重置设置</el-button>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-page {
  width: 100%;
  height: 100%;
  background-color: var(--el-bg-color);
  overflow: hidden;
}

.settings-container {
  display: flex;
  width: 100%;
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

// 侧边栏
.settings-sidebar {
  width: 240px;
  height: 100%;
  background-color: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .sidebar-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    gap: 8px;

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .settings-menu {
    flex: 1;
    border-right: none;
    overflow-y: auto;
  }
}

// 内容区域
.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;

  .settings-content-inner {
    padding: 24px 32px;
    min-height: 100%;
  }
}

// 底部操作栏
.settings-footer {
  padding: 16px 32px;
  border-top: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color-page);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .settings-container {
    flex-direction: column;
  }

  .settings-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-light);

    .settings-menu {
      display: flex;
      overflow-x: auto;
      overflow-y: hidden;

      :deep(.el-menu-item) {
        flex-shrink: 0;
      }
    }
  }

  .settings-content {
    .settings-content-inner {
      padding: 16px;
    }
  }

  .settings-footer {
    padding: 12px 16px;
  }
}
</style>
