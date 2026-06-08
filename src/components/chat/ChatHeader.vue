<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Session, SessionDetail } from '@/types'
import { useDisplayName } from './composables'
import { useChatroomStore } from '@/stores/chatroom'
import { useAIAgentStore } from '@/stores/ai/agent'
import SessionAgentConfigDialog from './SessionAgentConfigDialog.vue'

interface Props {
  session?: Session | SessionDetail | null
  showBack?: boolean
}

interface Emits {
  (e: 'back'): void
  (e: 'search'): void
  (e: 'export'): void
  (e: 'info'): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  session: null,
  showBack: false
})

const emit = defineEmits<Emits>()

const chatroomStore = useChatroomStore()
const agentStore = useAIAgentStore()

// 群聊成员数量
const memberCount = ref<number | null>(null)

// 会话级 Agent 配置弹窗
const showAgentDialog = ref(false)

// Agent 权限颜色
const agentPermissionColor = computed(() => {
  if (!props.session?.id) return '#c0c4cc'
  const config = agentStore.getEffectiveConfig(props.session.id)
  switch (config.sendPermission) {
    case 'forbidden': return '#c0c4cc'
    case 'draft_confirm': return '#e6a23c'
    case 'send_cancellable': return '#409eff'
    case 'full_auto': return '#67c23a'
    default: return '#c0c4cc'
  }
})

// Agent 状态摘要文本
const agentStatusLabel = computed(() => {
  if (!props.session?.id) return ''
  const config = agentStore.getEffectiveConfig(props.session.id)
  const parts: string[] = []
  switch (config.sendPermission) {
    case 'forbidden': parts.push('禁用'); break
    case 'draft_confirm': parts.push('草稿'); break
    case 'send_cancellable': parts.push('自动†'); break
    case 'full_auto': parts.push('全自动'); break
  }
  if (config.observer.enabled) parts.push('旁观')
  if (config.keywordMonitor.enabled) parts.push('关键词')
  return parts.join(' | ')
})

// 使用 displayName composable
const { displayName } = useDisplayName({
  id: computed(() => props.session?.id),
  defaultName: computed(() => props.session?.name)
})

// 会话类型显示文本
const sessionTypeText = computed(() => {
  if (!props.session) return ''

  switch (props.session.type) {
    case 'private':
      return '私聊'
    case 'group':
      return '群聊'
    case 'official':
      return '公众号'
    case 'unknown':
      return '未知'
    default:
      return ''
  }
})

// 会话副标题
const sessionSubtitle = computed(() => {
  if (!props.session) return ''

  const parts: string[] = [sessionTypeText.value]

  // 群聊显示成员数（从 API 获取）
  if (props.session.type === 'group') {
    if (memberCount.value !== null) {
      parts.push(`${memberCount.value}人`)
    }
  }

  return parts.join(' · ')
})

// 监听 session 变化，加载群聊人数
watch(
  () => props.session,
  async (newSession) => {
    if (newSession?.type === 'group' && newSession.id) {
      try {
        memberCount.value = await chatroomStore.getChatroomMemberCount(newSession.id)
      } catch (err) {
        console.error('获取群聊成员数量失败:', err)
        memberCount.value = null
      }
    } else {
      memberCount.value = null
    }
  },
  { immediate: true }
)

// 事件处理
const handleBack = () => {
  emit('back')
}

const handleRefresh = () => {
  emit('refresh')
}

function handleDropdownCommand(cmd: string) {
  if (cmd === 'agent-settings') {
    showAgentDialog.value = true
  } else {
    ;(emit as any)(cmd)
  }
}
</script>

<template>
  <div class="chat-header">
    <div class="chat-header__left">
      <!-- 返回按钮（移动端） -->
      <el-button
        v-if="showBack"
        text
        class="back-button"
        @click="handleBack"
      >
        <el-icon><ArrowLeft /></el-icon>
      </el-button>

      <!-- 会话信息 -->
      <div v-if="session" class="header-info">
        <h3 class="header-title">{{ displayName }}</h3>
        <p v-if="sessionSubtitle" class="header-subtitle">{{ sessionSubtitle }}</p>
      </div>
    </div>

    <div class="chat-header__right">
      <!-- 刷新按钮 -->
      <el-tooltip content="刷新" placement="bottom">
        <el-button text @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </el-tooltip>

      <!-- Agent 状态指示器 -->
      <el-popover
        v-if="session?.id"
        placement="bottom"
        trigger="click"
        :width="220"
      >
        <template #reference>
          <el-tooltip :content="agentStatusLabel" placement="bottom">
            <el-button text class="agent-indicator">
              <el-icon :style="{ color: agentPermissionColor }">
                <Cpu />
              </el-icon>
            </el-button>
          </el-tooltip>
        </template>
        <div class="agent-quick-toggle">
          <div class="toggle-row">
            <span>旁观模式</span>
            <el-switch
              size="small"
              :model-value="agentStore.getEffectiveConfig(session?.id ?? '').observer.enabled"
              @update:model-value="agentStore.setSessionConfig(session!.id, { observer: { ...agentStore.getEffectiveConfig(session!.id).observer, enabled: $event } })"
            />
          </div>
          <div class="toggle-row">
            <span>关键词监测</span>
            <el-switch
              size="small"
              :model-value="agentStore.getEffectiveConfig(session?.id ?? '').keywordMonitor.enabled"
              @update:model-value="agentStore.setSessionConfig(session!.id, { keywordMonitor: { ...agentStore.getEffectiveConfig(session!.id).keywordMonitor, enabled: $event } })"
            />
          </div>
          <div class="toggle-row">
            <span>发送权限</span>
            <el-select
              size="small"
              :model-value="agentStore.getEffectiveConfig(session?.id ?? '').sendPermission"
              @update:model-value="agentStore.setSessionConfig(session!.id, { sendPermission: $event })"
              style="width: 120px"
            >
              <el-option label="禁止" value="forbidden" />
              <el-option label="草稿确认" value="draft_confirm" />
              <el-option label="可取消发送" value="send_cancellable" />
              <el-option label="全自动" value="full_auto" />
            </el-select>
          </div>
          <el-divider style="margin: 8px 0" />
          <el-button text size="small" @click="showAgentDialog = true">
            打开完整设置
          </el-button>
        </div>
      </el-popover>

      <!-- 更多操作 -->
      <el-dropdown trigger="click" @command="handleDropdownCommand">
        <el-button text>
          <el-icon><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="search">
              <el-icon><Search /></el-icon>
              <span>搜索消息</span>
            </el-dropdown-item>
            <el-dropdown-item command="export">
              <el-icon><Download /></el-icon>
              <span>导出聊天记录</span>
            </el-dropdown-item>
            <el-dropdown-item command="info" divided>
              <el-icon><InfoFilled /></el-icon>
              <span>会话详情</span>
            </el-dropdown-item>
            <el-dropdown-item command="agent-settings" divided>
              <el-icon><Cpu /></el-icon>
              <span>Agent 设置</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 额外操作 -->
      <slot name="actions"></slot>
    </div>

    <!-- Agent 设置对话框 -->
    <SessionAgentConfigDialog
      v-if="session?.id"
      v-model="showAgentDialog"
      :session-id="session.id"
      :session-name="displayName"
    />
  </div>
</template>

<style lang="scss" scoped>
.chat-header {
  height: 60px;
  padding: 0 24px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--el-bg-color);
  flex-shrink: 0;

  &__left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;

    .back-button {
      display: none;
      flex-shrink: 0;
    }

    .header-info {
      min-width: 0;
      flex: 1;

      .header-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.4;
      }

      .header-subtitle {
        margin: 2px 0 0 0;
        font-size: 12px;
        color: var(--el-text-color-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.4;
      }
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
}

.agent-indicator {
  :deep(.el-icon) {
    font-size: 18px;
  }
}

.agent-quick-toggle {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
  }
}
}

// 响应式设计
@media (max-width: 768px) {
  .chat-header {
    padding: 0 16px;

    &__left {
      .back-button {
        display: flex;
      }
    }

    &__right {
      gap: 4px;
    }
  }
}
</style>
