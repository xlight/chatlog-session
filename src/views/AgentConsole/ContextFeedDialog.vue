<script setup lang="ts">
// 上下文投喂对话框 — 把聊天会话按时间范围整理为文本，喂给 AI Console 会话
// 移动端使用 el-drawer，桌面端使用 el-dialog

import { computed, ref, watch } from 'vue'
import {
  useContextFeed,
  FEED_TIME_RANGES,
} from '@/composables/useContextFeed'
import { useSessionStore } from '@/stores/session'
import { useAIConsoleStore } from '@/stores/ai/console'
import { useAIActivityLogStore } from '@/stores/ai/activityLog'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import type { Session } from '@/types/session'

interface Props {
  modelValue: boolean
  sessionId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const appStore = useAppStore()
const sessionStore = useSessionStore()
const consoleStore = useAIConsoleStore()
const activityLog = useAIActivityLogStore()
const { feedSessionContext, contextTags } = useContextFeed()

// 移动端走 Drawer，桌面端走 Dialog
const isMobile = computed(() => appStore.isMobile)

// 弹窗显示状态（v-model 桥接）
const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

// 搜索关键词
const searchKeyword = ref('')
// 选中的源会话 ID
const selectedSessionId = ref<string | null>(null)
// 选中的时间范围 key
const selectedRangeKey = ref<string>('12h')

// 过滤后的会话列表
const filteredSessions = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  const all = sessionStore.sessions ?? []
  if (!kw) return all
  return all.filter((s: Session) => {
    const name = s.name || s.talkerName || s.remark || ''
    return name.toLowerCase().includes(kw)
  })
})

// 弹窗打开时重置选择（保留上次选择也可，但默认选中置顶项更友好）
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      searchKeyword.value = ''
      selectedSessionId.value =
        sessionStore.currentSessionId || sessionStore.sessions[0]?.id || null
      selectedRangeKey.value = '1h'
    }
  }
)

// 选中目标会话对象
const selectedSession = computed<Session | undefined>(() =>
  sessionStore.sessions.find((s) => s.id === selectedSessionId.value)
)

// 确认投喂
function handleConfirm() {
  if (!selectedSession.value) {
    ElMessage.warning('请先选择一个会话')
    return
  }
  if (!props.sessionId) {
    ElMessage.warning('目标 Console 会话不存在')
    return
  }

  const range =
    FEED_TIME_RANGES.find((r) => r.key === selectedRangeKey.value)?.value ??
    FEED_TIME_RANGES[0].value

  // 调用 composable 拿格式化文本（contextTags 内部会推入新条目）
  const formattedText = feedSessionContext(selectedSession.value, range)
  if (!formattedText) {
    ElMessage.warning('所选范围无消息')
    return
  }

  // 取出刚推入的 ContextTag 作为元数据源
  const tag = contextTags.value[contextTags.value.length - 1]

  // 写入 console store（前置到消息列表头部）
  consoleStore.feedContext(props.sessionId, formattedText, {
    sessionId: tag.sessionId,
    sessionName: tag.sessionName,
    messageCount: tag.messageCount,
    timeRange: tag.timeRange,
    fedAt: tag.fedAt,
  })

  // 记录活动日志
  activityLog.addEntry(
    'context_feed',
    `投喂 ${tag.sessionName} (${tag.messageCount}条)`,
    props.sessionId
  )

  ElMessage.success(`已投喂 ${tag.messageCount} 条消息`)
  visible.value = false
}

// 关闭弹窗
function handleClose() {
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-if="!isMobile"
    v-model="visible"
    title="投喂上下文"
    width="560px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="context-feed-dialog">
      <!-- 顶部搜索 -->
      <div class="context-feed-dialog__search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索会话名"
          clearable
          :prefix-icon="Search"
        />
      </div>

      <!-- 会话列表 -->
      <div class="context-feed-dialog__list-wrap">
        <el-scrollbar class="context-feed-dialog__scroll" height="280px">
          <ul v-if="filteredSessions.length > 0" class="session-list">
            <li
              v-for="s in filteredSessions"
              :key="s.id"
              class="session-list__item"
              :class="{ 'session-list__item--active': s.id === selectedSessionId }"
              @click="selectedSessionId = s.id"
            >
              <span class="session-list__name">
                {{ s.name || s.talkerName || s.remark || s.talker }}
              </span>
              <span v-if="s.isPinned || s.isLocalPinned" class="session-list__pin">📌</span>
            </li>
          </ul>
          <div v-else class="context-feed-dialog__empty">无匹配会话</div>
        </el-scrollbar>
      </div>

      <!-- 时间范围 -->
      <div class="context-feed-dialog__range">
        <div class="range-label">时间范围</div>
        <el-radio-group v-model="selectedRangeKey" size="default">
          <el-radio-button
            v-for="r in FEED_TIME_RANGES"
            :key="r.key"
            :value="r.key"
          >
            {{ r.label }}
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!selectedSession" @click="handleConfirm">
        确认投喂
      </el-button>
    </template>
  </el-dialog>

  <el-drawer
    v-else
    v-model="visible"
    title="投喂上下文"
    direction="rtl"
    size="90%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="context-feed-dialog">
      <div class="context-feed-dialog__search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索会话名"
          clearable
          :prefix-icon="Search"
        />
      </div>

      <div class="context-feed-dialog__list-wrap">
        <el-scrollbar class="context-feed-dialog__scroll" height="50vh">
          <ul v-if="filteredSessions.length > 0" class="session-list">
            <li
              v-for="s in filteredSessions"
              :key="s.id"
              class="session-list__item"
              :class="{ 'session-list__item--active': s.id === selectedSessionId }"
              @click="selectedSessionId = s.id"
            >
              <span class="session-list__name">
                {{ s.name || s.talkerName || s.remark || s.talker }}
              </span>
              <span v-if="s.isPinned || s.isLocalPinned" class="session-list__pin">📌</span>
            </li>
          </ul>
          <div v-else class="context-feed-dialog__empty">无匹配会话</div>
        </el-scrollbar>
      </div>

      <div class="context-feed-dialog__range">
        <div class="range-label">时间范围</div>
        <el-radio-group v-model="selectedRangeKey" size="default">
          <el-radio-button
            v-for="r in FEED_TIME_RANGES"
            :key="r.key"
            :value="r.key"
          >
            {{ r.label }}
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!selectedSession" @click="handleConfirm">
        确认投喂
      </el-button>
    </template>
  </el-drawer>
</template>

<style lang="scss" scoped>
.context-feed-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__search {
    :deep(.el-input__wrapper) {
      box-shadow: 0 0 0 1px var(--el-border-color) inset;
    }
  }

  &__list-wrap {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    overflow: hidden;
  }

  &__scroll {
    width: 100%;
  }

  &__empty {
    padding: 32px;
    text-align: center;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  &__range {
    .range-label {
      font-size: 13px;
      color: var(--el-text-color-regular);
      margin-bottom: 8px;
    }

    :deep(.el-radio-button__inner) {
      padding: 8px 12px;
    }
  }
}

.session-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    cursor: pointer;
    transition: background-color 0.15s;
    border-bottom: 1px solid var(--el-border-color-extra-light);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &--active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);

      &:hover {
        background-color: var(--el-color-primary-light-8);
      }
    }
  }

  &__name {
    flex: 1;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__pin {
    margin-left: 8px;
    font-size: 12px;
  }
}
</style>
