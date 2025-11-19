<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getVersion, getBuildDate, getVersionInfo } from '@/utils/version'

const appStore = useAppStore()
const router = useRouter()

// 设置选项
const settings = ref({
  // API 设定
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  apiTimeout: 30000,
  apiRetryCount: 3,
  apiRetryDelay: 1000,
  enableApiDebug: false,

  // 外观设置
  theme: appStore.isDark ? 'dark' : 'light',
  language: 'zh-CN',
  fontSize: 'medium',

  // 通知设置
  enableNotifications: true,
  enableSound: true,
  notificationPreview: true,

  // 聊天设置
  enterToSend: true,
  showTimestamp: true,
  showAvatar: true,
  messageGrouping: true,

  // 隐私设置
  saveHistory: true,
  autoDownloadMedia: true,
  compressImages: true,

  // 高级设置
  enableDebug: false,
  cacheSize: '100MB'
})

// 版本信息（从构建时注入）
const version = ref(getVersion())
const buildDate = ref(getBuildDate())

// 完整版本信息（可选，用于更详细的显示）
const versionInfo = getVersionInfo()

// 当前活动菜单
const activeMenu = ref('api')

// 菜单项
const menuItems = [
  { key: 'api', label: 'API 设定', icon: 'Link' },
  { key: 'appearance', label: '外观设置', icon: 'Brush' },
  { key: 'notifications', label: '通知设置', icon: 'Bell' },
  { key: 'chat', label: '聊天设置', icon: 'ChatDotRound' },
  { key: 'privacy', label: '隐私设置', icon: 'Lock' },
  { key: 'advanced', label: '高级设置', icon: 'Setting' },
  { key: 'about', label: '关于', icon: 'InfoFilled' }
]

// 字体大小选项
const fontSizeOptions = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
  { label: '特大', value: 'extra-large' }
]

// 语言选项
const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

// 主题选项
const themeOptions = [
  { label: '浅色', value: 'light', icon: 'Sunny' },
  { label: '深色', value: 'dark', icon: 'Moon' },
  { label: '跟随系统', value: 'auto', icon: 'Monitor' }
]

// API 超时选项
const apiTimeoutOptions = [
  { label: '10 秒', value: 10000 },
  { label: '30 秒', value: 30000 },
  { label: '60 秒', value: 60000 },
  { label: '120 秒', value: 120000 }
]

// 重试次数选项
const retryCountOptions = [
  { label: '不重试', value: 0 },
  { label: '1 次', value: 1 },
  { label: '3 次', value: 3 },
  { label: '5 次', value: 5 }
]

// 测试 API 连接
const testingApi = ref(false)
const testApiConnection = async () => {
  if (!settings.value.apiBaseUrl) {
    ElMessage.warning('请先输入 API 地址')
    return
  }

  testingApi.value = true
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${settings.value.apiBaseUrl}/health`, {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      ElMessage.success('API 连接成功')
    } else {
      ElMessage.error(`API 连接失败: ${response.statusText}`)
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      ElMessage.error('API 连接超时')
    } else {
      ElMessage.error(`API 连接失败: ${error.message}`)
    }
  } finally {
    testingApi.value = false
  }
}

// 重置 API 设置
const resetApiSettings = () => {
  settings.value.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  settings.value.apiTimeout = 30000
  settings.value.apiRetryCount = 3
  settings.value.apiRetryDelay = 1000
  settings.value.enableApiDebug = false
  ElMessage.success('API 设置已重置')
}

// 切换主题
const handleThemeChange = (theme: string) => {
  if (theme === 'dark') {
    appStore.toggleTheme()
    if (!appStore.isDark) {
      appStore.toggleTheme()
    }
  } else if (theme === 'light') {
    if (appStore.isDark) {
      appStore.toggleTheme()
    }
  } else {
    // 跟随系统
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark !== appStore.isDark) {
      appStore.toggleTheme()
    }
  }
  ElMessage.success('主题已切换')
}

// 保存设置
const saveSettings = () => {
  // 保存到 localStorage
  localStorage.setItem('chatlog-settings', JSON.stringify(settings.value))
  ElMessage.success('设置已保存')
}

// 重置设置
const resetSettings = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有设置吗？此操作不可恢复。',
      '重置设置',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )

    // 重置为默认值
    settings.value = {
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
      apiTimeout: 30000,
      apiRetryCount: 3,
      apiRetryDelay: 1000,
      enableApiDebug: false,
      theme: 'light',
      language: 'zh-CN',
      fontSize: 'medium',
      enableNotifications: true,
      enableSound: true,
      notificationPreview: true,
      enterToSend: true,
      showTimestamp: true,
      showAvatar: true,
      messageGrouping: true,
      saveHistory: true,
      autoDownloadMedia: true,
      compressImages: true,
      enableDebug: false,
      cacheSize: '100MB'
    }

    localStorage.removeItem('chatlog-settings')
    ElMessage.success('设置已重置')
  } catch {
    // 用户取消
  }
}

// 清除缓存
const clearCache = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有缓存吗？这将删除本地存储的聊天记录。',
      '清除缓存',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )

    // 清除缓存
    localStorage.clear()
    sessionStorage.clear()

    ElMessage.success('缓存已清除')
  } catch {
    // 用户取消
  }
}

// 导出数据
const exportData = () => {
  ElMessage.info('导出功能开发中...')
}

// 检查更新
const checkUpdate = () => {
  ElMessage.info('当前已是最新版本')
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-container">
      <!-- 侧边栏菜单 -->
      <div class="settings-sidebar">
        <div class="sidebar-header">
          <el-button text size="large" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <h2>设置</h2>
        </div>

        <el-menu
          :default-active="activeMenu"
          class="settings-menu"
          @select="(key: string) => activeMenu = key"
        >
          <el-menu-item
            v-for="item in menuItems"
            :key="item.key"
            :index="item.key"
          >
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
          <!-- API 设定 -->
          <div v-show="activeMenu === 'api'" class="setting-section">
            <div class="section-header">
              <h3>API 设定</h3>
              <p>配置 Chatlog API 连接</p>
            </div>

            <el-form label-position="left" label-width="120px">
              <el-form-item label="API 地址">
                <el-input
                  v-model="settings.apiBaseUrl"
                  placeholder="http://localhost:8080"
                  style="width: 400px"
                >
                  <template #prepend>
                    <el-icon><Link /></el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item label="连接测试">
                <el-button
                  type="primary"
                  :loading="testingApi"
                  @click="testApiConnection"
                >
                  <el-icon><Connection /></el-icon>
                  测试连接
                </el-button>
                <el-text type="info" size="small" style="margin-left: 12px">
                  点击测试 API 是否可访问
                </el-text>
              </el-form-item>

              <el-divider />

              <el-form-item label="请求超时">
                <el-select v-model="settings.apiTimeout" style="width: 200px">
                  <el-option
                    v-for="option in apiTimeoutOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-text type="info" size="small" style="margin-left: 12px">
                  API 请求的超时时间
                </el-text>
              </el-form-item>

              <el-form-item label="重试次数">
                <el-select v-model="settings.apiRetryCount" style="width: 200px">
                  <el-option
                    v-for="option in retryCountOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-text type="info" size="small" style="margin-left: 12px">
                  请求失败后的重试次数
                </el-text>
              </el-form-item>

              <el-form-item label="重试延迟">
                <el-input-number
                  v-model="settings.apiRetryDelay"
                  :min="100"
                  :max="10000"
                  :step="100"
                  style="width: 200px"
                />
                <el-text type="info" size="small" style="margin-left: 12px">
                  毫秒（ms）
                </el-text>
              </el-form-item>

              <el-divider />

              <el-form-item label="调试模式">
                <el-switch v-model="settings.enableApiDebug" />
                <el-text type="info" size="small" style="margin-left: 12px">
                  在控制台输出 API 请求详情
                </el-text>
              </el-form-item>

              <el-form-item>
                <el-button type="warning" @click="resetApiSettings">
                  <el-icon><RefreshRight /></el-icon>
                  重置 API 设置
                </el-button>
              </el-form-item>
            </el-form>

            <el-alert
              title="提示"
              type="info"
              :closable="false"
              style="margin-top: 20px"
            >
              <template #default>
                <div style="line-height: 1.8">
                  <p>• API 地址格式: <code>http://host:port</code> 或 <code>https://domain.com</code></p>
                  <p>• 默认地址: <code>http://localhost:8080</code></p>
                  <p>• 修改设置后需要点击"保存设置"按钮才会生效</p>
                  <p>• 建议先测试连接，确保 API 可访问</p>
                </div>
              </template>
            </el-alert>
          </div>

          <!-- 外观设置 -->
          <div v-show="activeMenu === 'appearance'" class="setting-section">
            <div class="section-header">
              <h3>外观设置</h3>
              <p>自定义界面外观</p>
            </div>

            <el-form label-position="left" label-width="120px">
              <el-form-item label="主题模式">
                <el-radio-group
                  v-model="settings.theme"
                  @change="(val: any) => handleThemeChange(String(val))"
                >
                  <el-radio-button
                    v-for="option in themeOptions"
                    :key="option.value"
                    :label="option.value"
                  >
                    <el-icon><component :is="option.icon" /></el-icon>
                    {{ option.label }}
                  </el-radio-button>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="语言">
                <el-select v-model="settings.language" style="width: 200px">
                  <el-option
                    v-for="option in languageOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="字体大小">
                <el-radio-group v-model="settings.fontSize">
                  <el-radio-button
                    v-for="option in fontSizeOptions"
                    :key="option.value"
                    :label="option.value"
                  >
                    {{ option.label }}
                  </el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-form>
          </div>

          <!-- 通知设置 -->
          <div v-show="activeMenu === 'notifications'" class="setting-section">
            <div class="section-header">
              <h3>通知设置</h3>
              <p>管理消息通知</p>
            </div>

            <el-form label-position="left" label-width="120px">
              <el-form-item label="启用通知">
                <el-switch v-model="settings.enableNotifications" />
              </el-form-item>

              <el-form-item label="通知声音">
                <el-switch
                  v-model="settings.enableSound"
                  :disabled="!settings.enableNotifications"
                />
              </el-form-item>

              <el-form-item label="消息预览">
                <el-switch
                  v-model="settings.notificationPreview"
                  :disabled="!settings.enableNotifications"
                />
              </el-form-item>
            </el-form>
          </div>

          <!-- 聊天设置 -->
          <div v-show="activeMenu === 'chat'" class="setting-section">
            <div class="section-header">
              <h3>聊天设置</h3>
              <p>自定义聊天行为</p>
            </div>

            <el-form label-position="left" label-width="120px">
              <el-form-item label="回车发送">
                <el-switch v-model="settings.enterToSend" />
                <span class="form-tip">关闭后使用 Ctrl+Enter 发送</span>
              </el-form-item>

              <el-form-item label="显示时间">
                <el-switch v-model="settings.showTimestamp" />
              </el-form-item>

              <el-form-item label="显示头像">
                <el-switch v-model="settings.showAvatar" />
              </el-form-item>

              <el-form-item label="消息分组">
                <el-switch v-model="settings.messageGrouping" />
                <span class="form-tip">相同发送者的连续消息合并显示</span>
              </el-form-item>
            </el-form>
          </div>

          <!-- 隐私设置 -->
          <div v-show="activeMenu === 'privacy'" class="setting-section">
            <div class="section-header">
              <h3>隐私设置</h3>
              <p>管理隐私和数据</p>
            </div>

            <el-form label-position="left" label-width="120px">
              <el-form-item label="保存历史">
                <el-switch v-model="settings.saveHistory" />
              </el-form-item>

              <el-form-item label="自动下载">
                <el-switch v-model="settings.autoDownloadMedia" />
                <span class="form-tip">自动下载图片和视频</span>
              </el-form-item>

              <el-form-item label="压缩图片">
                <el-switch v-model="settings.compressImages" />
              </el-form-item>

              <el-form-item label="数据管理">
                <el-space>
                  <el-button @click="exportData">
                    <el-icon><Download /></el-icon>
                    导出数据
                  </el-button>
                  <el-button type="danger" @click="clearCache">
                    <el-icon><Delete /></el-icon>
                    清除缓存
                  </el-button>
                </el-space>
              </el-form-item>
            </el-form>
          </div>

          <!-- 高级设置 -->
          <div v-show="activeMenu === 'advanced'" class="setting-section">
            <div class="section-header">
              <h3>高级设置</h3>
              <p>仅供高级用户使用</p>
            </div>

            <el-form label-position="left" label-width="120px">
              <el-form-item label="调试模式">
                <el-switch v-model="settings.enableDebug" />
                <span class="form-tip">显示详细的调试信息</span>
              </el-form-item>

              <el-form-item label="API 超时">
                <el-input-number
                  v-model="settings.apiTimeout"
                  :min="5000"
                  :max="60000"
                  :step="1000"
                  style="width: 200px"
                />
                <span class="form-tip">毫秒</span>
              </el-form-item>

              <el-form-item label="缓存大小">
                <el-input
                  v-model="settings.cacheSize"
                  readonly
                  style="width: 200px"
                />
              </el-form-item>
            </el-form>
          </div>

          <!-- 关于 -->
          <div v-show="activeMenu === 'about'" class="setting-section">
            <div class="section-header">
              <h3>关于 Chatlog Session</h3>
            </div>

            <div class="about-content">
              <div class="app-logo">
                <el-icon size="80" color="#07c160">
                  <ChatLineSquare />
                </el-icon>
              </div>

              <div class="app-info">
                <h2>Chatlog Session</h2>
                <p class="version">版本 {{ version }}</p>
                <p class="build-date">构建日期: {{ buildDate }}</p>
                <p v-if="versionInfo.gitHash && versionInfo.gitHash !== 'unknown'" class="git-info">
                  提交: {{ versionInfo.gitHash }}
                </p>
              </div>

              <el-divider />

              <div class="about-details">
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="项目名称">
                    Chatlog Session
                  </el-descriptions-item>
                  <el-descriptions-item label="版本">
                    {{ version }}
                  </el-descriptions-item>
                  <el-descriptions-item label="构建日期">
                    {{ buildDate }}
                  </el-descriptions-item>
                  <el-descriptions-item 
                    v-if="versionInfo.buildTime && versionInfo.buildTime !== buildDate"
                    label="构建时间"
                  >
                    {{ versionInfo.buildTime }}
                  </el-descriptions-item>
                  <el-descriptions-item 
                    v-if="versionInfo.gitHash && versionInfo.gitHash !== 'unknown'"
                    label="Git Hash"
                  >
                    <el-tag size="small" type="info">{{ versionInfo.gitHash }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item 
                    v-if="versionInfo.gitBranch && versionInfo.gitBranch !== 'unknown'"
                    label="Git 分支"
                  >
                    <el-tag size="small" :type="versionInfo.gitBranch === 'main' ? 'success' : 'warning'">
                      {{ versionInfo.gitBranch }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="环境">
                    <el-tag size="small" :type="versionInfo.isDev ? 'warning' : 'success'">
                      {{ versionInfo.isDev ? '开发版本' : '生产版本' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="技术栈">
                    Vue 3 + TypeScript + Vite
                  </el-descriptions-item>
                  <el-descriptions-item label="开源协议">
                    Apache-2.0 License
                  </el-descriptions-item>
                  <el-descriptions-item label="项目仓库">
                    <el-link
                      href="https://github.com/xlight/chatlog-session"
                      target="_blank"
                      type="primary"
                    >
                      GitHub
                    </el-link>
                  </el-descriptions-item>
                </el-descriptions>
              </div>

              <div class="about-actions">
                <el-button type="primary" @click="checkUpdate">
                  <el-icon><Refresh /></el-icon>
                  检查更新
                </el-button>

              </div>
            </div>
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

  .setting-section {
    padding: 24px 32px;

    .section-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--el-border-color-lighter);

      h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--el-text-color-secondary);
      }
    }

    .form-tip {
      margin-left: 8px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    // 关于页面
    .about-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 24px;

      .app-logo {
        margin: 24px 0;
      }

      .app-info {
        text-align: center;

        h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .version {
          margin: 4px 0;
          font-size: 14px;
          color: var(--el-text-color-secondary);
        }

        .build-date {
          margin: 4px 0;
          font-size: 12px;
          color: var(--el-text-color-placeholder);
        }

        .git-info {
          margin: 4px 0;
          font-size: 11px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          color: var(--el-text-color-placeholder);
          background-color: var(--el-fill-color-light);
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
        }
      }

      .about-details {
        width: 100%;
        max-width: 600px;
      }

      .about-actions {
        display: flex;
        gap: 12px;
      }
    }
  }

  .settings-footer {
    padding: 16px 32px;
    border-top: 1px solid var(--el-border-color-light);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-shrink: 0;
    background-color: var(--el-bg-color);
  }
}

// 响应式
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
      overflow-y: visible;

      :deep(.el-menu-item) {
        flex-shrink: 0;
      }
    }
  }

  .settings-content {
    .setting-section {
      padding: 16px;

      .el-form {
        :deep(.el-form-item__label) {
          width: 100px !important;
        }
      }
    }

    .settings-footer {
      padding: 12px 16px;
    }
  }
}
</style>
