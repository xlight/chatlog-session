<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface NotificationSettingsData {
  enableNotifications: boolean
  enableMention: boolean
  enableQuote: boolean
  enableMessage: boolean
  enableSound: boolean
  enableVibrate: boolean
  onlyShowLatest: boolean
  autoCloseTime: number
  myWxid: string
  showMessageContent: boolean
}

interface NotificationStats {
  unreadCount: number
  totalNotifications: number
  muteCount: number
}

const props = defineProps<{
  modelValue: NotificationSettingsData
  notificationStats: NotificationStats
}>()

const emit = defineEmits<{
  'update:modelValue': [value: NotificationSettingsData]
  clearHistory: []
}>()

const notificationPermission = ref<NotificationPermission>('default')

// 检查通知权限
const checkNotificationPermission = () => {
  if ('Notification' in window) {
    notificationPermission.value = Notification.permission
  }
}

checkNotificationPermission()

const updateValue = <K extends keyof NotificationSettingsData>(
  key: K,
  value: NotificationSettingsData[K]
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const requestNotificationPermission = async () => {
  try {
    const result = await Notification.requestPermission()
    notificationPermission.value = result
    if (result === 'granted') {
      ElMessage.success('通知权限已授予')
    }
  } catch (_error) {
    ElMessage.error('请求通知权限失败')
  }
}

const testNotification = () => {
  if (notificationPermission.value !== 'granted') {
    ElMessage.warning('请先授予通知权限')
    return
  }

  try {
    const notification = new Notification('测试通知', {
      body: '这是一条测试通知消息',
      icon: '/icons/favicon-196.png',
      badge: '/icons/favicon-196.png',
      tag: 'test-notification',
      requireInteraction: false,
    })

    notification.onerror = () => {
      console.error('通知显示失败')
      ElMessage.warning('通知显示失败，请检查系统通知设置')
    }

    notification.onshow = () => {
      console.log('通知已显示')
    }

    if (props.modelValue.enableSound) {
      // 播放通知声音
      const audio = new Audio('/notification.mp3')
      audio.play().catch(() => {
        // 忽略播放失败
      })
    }

    ElMessage({
      message: '测试通知已发送',
      duration: 3000,
    })

    // 自动关闭测试通知
    setTimeout(() => {
      notification.close()
    }, 3000)
  } catch (_error) {
    ElMessage({
      message: '发送通知失败',
      duration: 3000,
    })
  }
}

const clearNotificationHistory = async () => {
  try {
    await ElMessageBox.confirm('确定要清空通知历史吗？此操作不可恢复。', '确认清空', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    emit('clearHistory')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="setting-section">
    <div class="section-header">
      <h3>通知设置</h3>
      <p>管理消息通知</p>
    </div>

    <el-form label-position="left" label-width="120px">
      <!-- 通知权限状态 -->
      <el-alert
        v-if="notificationPermission === 'denied'"
        type="error"
        :closable="false"
        style="margin-bottom: 16px"
      >
        <template #title>
          <span style="font-size: 13px">通知权限已被拒绝</span>
        </template>
        <div style="font-size: 12px; margin-top: 4px">
          请在浏览器设置中允许通知权限，然后刷新页面
        </div>
      </el-alert>

      <el-alert
        v-else-if="notificationPermission === 'default'"
        type="warning"
        :closable="false"
        style="margin-bottom: 16px"
      >
        <template #title>
          <span style="font-size: 13px">需要通知权限</span>
        </template>
        <div style="font-size: 12px; margin-top: 4px">
          <el-button size="small" type="primary" @click="requestNotificationPermission">
            请求通知权限
          </el-button>
        </div>
      </el-alert>

      <el-alert v-else type="success" :closable="false" style="margin-bottom: 16px">
        <template #title>
          <span style="font-size: 13px">通知权限已授予</span>
        </template>
      </el-alert>

      <el-divider />

      <!-- 全局开关 -->
      <el-form-item label="启用通知">
        <el-switch
          :model-value="modelValue.enableNotifications"
          @update:model-value="(val: string | number | boolean) => updateValue('enableNotifications', val as boolean)"
        />
        <span class="form-tip">关闭后将不会收到任何通知</span>
      </el-form-item>

      <el-divider />

      <!-- 基础设置 -->
      <div style="margin-bottom: 16px">
        <el-text tag="b">基础设置</el-text>
      </div>

      <el-form-item label="我的微信 ID">
        <el-input
          :model-value="modelValue.myWxid"
          placeholder="请输入你的微信ID"
          :disabled="!modelValue.enableNotifications"
          style="width: 300px"
          @update:model-value="(val: string) => updateValue('myWxid', val)"
        />
        <span class="form-tip">用于识别哪些消息与你有关（如 @我）</span>
      </el-form-item>

      <el-form-item label="显示消息内容">
        <el-switch
          :model-value="modelValue.showMessageContent"
          :disabled="!modelValue.enableNotifications"
          @update:model-value="(val: string | number | boolean) => updateValue('showMessageContent', val as boolean)"
        />
        <span class="form-tip">关闭后通知只显示"有新消息"，不显示具体内容（隐私保护）</span>
      </el-form-item>

      <el-divider />

      <!-- 通知类型 -->
      <div style="margin-bottom: 16px">
        <el-text tag="b">通知类型</el-text>
      </div>

      <el-form-item label="@我的消息">
        <el-switch
          :model-value="modelValue.enableMention"
          :disabled="!modelValue.enableNotifications"
          @update:model-value="(val: string | number | boolean) => updateValue('enableMention', val as boolean)"
        />
        <span class="form-tip">有人在群聊中 @你</span>
      </el-form-item>

      <el-form-item label="引用我的消息">
        <el-switch
          :model-value="modelValue.enableQuote"
          :disabled="!modelValue.enableNotifications"
          @update:model-value="(val: string | number | boolean) => updateValue('enableQuote', val as boolean)"
        />
        <span class="form-tip">有人引用了你的消息</span>
      </el-form-item>

      <el-form-item label="普通消息">
        <el-switch
          :model-value="modelValue.enableMessage"
          :disabled="!modelValue.enableNotifications"
          @update:model-value="(val: string | number | boolean) => updateValue('enableMessage', val as boolean)"
        />
        <span class="form-tip">所有新消息（可能会很多）</span>
      </el-form-item>

      <el-divider />

      <!-- 通知行为 -->
      <div style="margin-bottom: 16px">
        <el-text tag="b">通知行为</el-text>
      </div>

      <el-form-item label="通知声音">
        <el-switch
          :model-value="modelValue.enableSound"
          :disabled="!modelValue.enableNotifications"
          @update:model-value="(val: string | number | boolean) => updateValue('enableSound', val as boolean)"
        />
      </el-form-item>

      <el-form-item label="震动提示">
        <el-switch
          :model-value="modelValue.enableVibrate"
          :disabled="!modelValue.enableNotifications"
          @update:model-value="(val: string | number | boolean) => updateValue('enableVibrate', val as boolean)"
        />
        <span class="form-tip">仅移动设备支持</span>
      </el-form-item>

      <el-form-item label="只显示最新">
        <el-switch
          :model-value="modelValue.onlyShowLatest"
          :disabled="!modelValue.enableNotifications"
          @update:model-value="(val: string | number | boolean) => updateValue('onlyShowLatest', val as boolean)"
        />
        <span class="form-tip">新通知会替换旧通知</span>
      </el-form-item>

      <el-form-item label="自动关闭">
        <el-input-number
          :model-value="modelValue.autoCloseTime"
          :min="0"
          :max="60"
          :step="1"
          :disabled="!modelValue.enableNotifications"
          style="width: 150px"
          @update:model-value="
            (val: number | undefined) => val !== undefined && updateValue('autoCloseTime', val)
          "
        />
        <el-text type="info" size="small" style="margin-left: 12px">
          秒（0 表示不自动关闭）
        </el-text>
      </el-form-item>

      <el-divider />

      <!-- 通知测试 -->
      <el-form-item label="测试通知">
        <el-button :disabled="notificationPermission !== 'granted'" @click="testNotification">
          <el-icon><Bell /></el-icon>
          发送测试通知
        </el-button>
      </el-form-item>

      <!-- 通知统计 -->
      <el-form-item label="通知统计">
        <el-space direction="vertical" size="small">
          <el-text size="small">未读通知: {{ notificationStats.unreadCount }}</el-text>
          <el-text size="small">历史通知: {{ notificationStats.totalNotifications }}</el-text>
          <el-text size="small">静音会话: {{ notificationStats.muteCount }}</el-text>
        </el-space>
      </el-form-item>

      <el-form-item label="清空历史">
        <el-button @click="clearNotificationHistory">
          <el-icon><Delete /></el-icon>
          清空通知历史
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style lang="scss" scoped>
.setting-section {
  .section-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }
  }

  .form-tip {
    margin-left: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
