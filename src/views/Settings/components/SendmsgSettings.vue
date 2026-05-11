<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { sendmsgAPI } from '@/api/sendmsg'
import type { SendmsgSettingsData, SendShortcut } from '@/stores/settings'

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
const modKeyLabel = isMac ? '⌘' : 'Ctrl'

const sendShortcutOptions: { value: SendShortcut; label: string }[] = [
  { value: 'enter', label: 'Enter' },
  { value: 'ctrl-enter', label: `${modKeyLabel}+Enter` },
]

const props = defineProps<{
  modelValue: SendmsgSettingsData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SendmsgSettingsData]
}>()

const testingConnection = ref(false)
const wechatStatus = ref<'unknown' | 'online' | 'offline'>('unknown')
const wechatStatusMessage = ref('')

const updateValue = <K extends keyof SendmsgSettingsData>(key: K, value: SendmsgSettingsData[K]) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

const testConnection = async () => {
  testingConnection.value = true
  wechatStatus.value = 'unknown'
  wechatStatusMessage.value = ''

  try {
    const result = await sendmsgAPI.testConnection()

    if (result.success) {
      ElMessage({ type: 'success', message: '连接成功！sendmsg 服务可访问' })

      // 连接成功后查询微信状态
      try {
        const status = await sendmsgAPI.status()
        if (status.wechat_status?.wechat_available) {
          wechatStatus.value = 'online'
          const version = status.wechat_status.wechat_version
          const platform = status.wechat_status.platform
          wechatStatusMessage.value = version
            ? `微信可用 (v${version}${platform ? `, ${platform}` : ''})`
            : '微信可用'
        } else {
          wechatStatus.value = 'offline'
          wechatStatusMessage.value = '微信不可用，请确认微信已登录'
        }
      } catch {
        wechatStatus.value = 'unknown'
        wechatStatusMessage.value = '无法获取微信状态'
      }
    } else {
      ElMessage({ type: 'error', message: `连接失败: ${result.error}` })
    }
  } finally {
    testingConnection.value = false
  }
}
</script>

<template>
  <div class="setting-section">
    <div class="section-header">
      <h3>发送设置</h3>
      <p>配置微信消息发送功能（wechat-sendmsg）</p>
    </div>

    <el-form label-position="left" label-width="120px">
      <el-form-item label="启用发送">
        <el-switch
          :model-value="modelValue.enabled"
          @update:model-value="(val: string | number | boolean) => updateValue('enabled', val as boolean)"
        />
        <el-text type="info" size="small" style="margin-left: 12px">
          启用后在聊天界面底部显示消息输入框
        </el-text>
      </el-form-item>

      <el-form-item label="发送快捷键">
        <el-radio-group
          :model-value="modelValue.sendShortcut"
          @update:model-value="(val: string | number | boolean | undefined) => updateValue('sendShortcut', val as SendShortcut)"
        >
          <el-radio
            v-for="opt in sendShortcutOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio>
        </el-radio-group>
        <el-text type="info" size="small" style="margin-left: 12px">
          {{ modelValue.sendShortcut === 'enter' ? 'Enter 发送，Shift+Enter 换行' : `${modKeyLabel}+Enter 发送，Enter 换行` }}
        </el-text>
      </el-form-item>

      <el-divider />

      <el-form-item label="API 地址">
        <el-input
          :model-value="modelValue.apiUrl"
          placeholder="http://127.0.0.1:8765"
          style="width: 400px"
          @update:model-value="(val: string) => updateValue('apiUrl', val)"
        >
          <template #prepend>
            <el-icon><Link /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="连接测试">
        <el-button type="primary" :loading="testingConnection" @click="testConnection">
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <el-text type="info" size="small" style="margin-left: 12px">
          点击测试 sendmsg 服务是否可访问
        </el-text>
      </el-form-item>

      <el-form-item v-if="wechatStatus !== 'unknown'" label="微信状态">
        <el-tag :type="wechatStatus === 'online' ? 'success' : 'danger'" effect="plain">
          {{ wechatStatusMessage }}
        </el-tag>
        <el-button v-if="wechatStatus === 'offline'" link type="primary" size="small" style="margin-left: 8px" @click="testConnection">重新检测</el-button>
      </el-form-item>
    </el-form>

    <el-alert title="提示" type="info" :closable="false" style="margin-top: 20px">
      <template #default>
        <div style="line-height: 1.8">
          <p>• 需要先部署 <code>wechat-sendmsg</code> 服务</p>
          <p>• 默认地址: <code>http://127.0.0.1:8765</code></p>
          <p>• 发送消息需要微信客户端在线且已登录</p>
          <p>• 发送功能通过 GUI 自动化操作微信客户端实现</p>
        </div>
      </template>
    </el-alert>
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

  code {
    padding: 2px 6px;
    background-color: var(--el-fill-color-light);
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
  }
}
</style>
