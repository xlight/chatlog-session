<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAIConsoleStore } from '@/stores/ai/console'
import { useAIActivityLogStore } from '@/stores/ai/activityLog'
import { useAIStream, type AIStreamStore } from '@/composables/useAIStream'
import { useSettingsStore } from '@/stores/settings'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { AIError, ChatMessage } from '@/types/ai'
import ConsoleSessionList from './ConsoleSessionList.vue'
import AIMessageBubble from '@/components/ai/AIMessageBubble.vue'
import AIInputBox from '@/components/ai/AIInputBox.vue'
import ContextBar from '@/components/ai/ContextBar.vue'
import ContextFeedDialog from './ContextFeedDialog.vue'

const consoleStore = useAIConsoleStore()
const activityLog = useAIActivityLogStore()
const settingsStore = useSettingsStore()
const appStore = useAppStore()

const isAiReady = computed(() => settingsStore.ai.enabled)
const currentSession = computed(() => consoleStore.currentSession)
const currentSessionId = computed(() => consoleStore.currentSessionId)
const isStreaming = computed(() => consoleStore.isStreamingCurrent)
const feedOpen = ref(false)

const consoleAdapter: AIStreamStore = {
  get messages(): { value: ChatMessage[] } {
    return { value: currentSession.value?.messages ?? [] }
  },
  addMessage(msg) {
    if (currentSessionId.value) consoleStore.addMessage(currentSessionId.value, msg)
  },
  updateLastAssistantContent(content) {
    if (currentSessionId.value) consoleStore.updateLastContent(currentSessionId.value, content)
  },
  appendThinkingContent() {},
  get streaming(): { value: boolean } {
    return { value: isStreaming.value }
  },
  setStreaming(val) {
    if (currentSessionId.value) consoleStore.setStreaming(currentSessionId.value, val)
  },
  setAbortController(ctrl) {
    if (currentSessionId.value) consoleStore.setAbortController(currentSessionId.value, ctrl)
  },
  get abortController(): { value: AbortController | null } {
    const id = currentSessionId.value
    return { value: id ? consoleStore.abortControllers[id] ?? null : null }
  },
  get error(): { value: AIError | null } {
    const id = currentSessionId.value
    return { value: id ? consoleStore.errorsBySession[id] ?? null : null }
  },
  setError(err) {
    if (currentSessionId.value) consoleStore.setError(currentSessionId.value, err)
  },
  get thinkingContent(): { value: string } {
    return { value: '' }
  },
  get thinkingVisible(): { value: boolean } {
    return { value: false }
  },
  setThinkingContent() {},
  setThinkingVisible() {},
  setUsage() {},
  setCurrentModel() {},
  removeLastAssistant() {
    if (currentSessionId.value) {
      const s = consoleStore.sessions.find((x) => x.id === currentSessionId.value)
      if (!s) return
      for (let i = s.messages.length - 1; i >= 0; i--) {
        if (s.messages[i].role === 'assistant' && !s.messages[i].content) {
          s.messages.splice(i, 1)
          return
        }
      }
    }
  },
}

const stream = useAIStream(consoleAdapter, {
  getMessages: () => currentSession.value?.messages ?? [],
  getModel: () => settingsStore.ai.llmDefaultModel,
  onComplete: () => {
    activityLog.addEntry('console_chat', 'ConsoleChat 消息生成完成')
  },
})

async function handleSend(input: string) {
  if (!currentSessionId.value) {
    try {
      const id = consoleStore.createSession()
      consoleStore.switchSession(id)
    } catch (e) {
      ElMessage.warning((e as Error).message)
      return
    }
  }
  await stream.sendMessage(input)
}

function handleStop() {
  if (currentSessionId.value) consoleStore.abortStream(currentSessionId.value)
}

function handleNewSession() {
  try {
    const id = consoleStore.createSession()
    consoleStore.switchSession(id)
    ElMessage.success('已创建新对话')
  } catch (e) {
    ElMessage.warning((e as Error).message)
  }
}

function handleOpenFeed() {
  feedOpen.value = true
}

function handleClear() {
  if (currentSessionId.value) consoleStore.clearSessionMessages(currentSessionId.value)
  ElMessage.success('对话已清空')
}

onMounted(() => {
  if (!consoleStore.currentSessionId && consoleStore.sessions.length === 0) {
    consoleStore.createSession()
  }
})

const sessionTags = computed(() => {
  const s = currentSession.value
  if (!s?.contextFeed) return []
  return s.contextFeed.map((c) => ({
    id: `${c.sessionId}-${c.fedAt}`,
    sessionId: c.sessionId,
    sessionName: c.sessionName,
    messageCount: c.messageCount,
    timeRange: c.timeRange,
    fedAt: c.fedAt,
  }))
})
</script>

<template>
  <div class="console-chat">
    <ConsoleSessionList
      v-if="!appStore.isMobile"
      @new-session="handleNewSession"
    />

    <div class="console-chat__main">
      <div v-if="!isAiReady" class="console-chat__empty">
        <el-empty description="AI 服务未配置">
          <el-button type="primary" @click="appStore.setActiveNav('settings')">
            前往设置
          </el-button>
        </el-empty>
      </div>

      <template v-else-if="currentSession">
        <div class="console-chat__header">
          <span class="title">{{ currentSession.title }}</span>
          <span class="model">{{ settingsStore.ai.llmDefaultModel }}</span>
          <div class="actions">
            <el-button text @click="handleOpenFeed">投喂上下文</el-button>
            <el-button text @click="handleClear">清空对话</el-button>
          </div>
        </div>

        <div class="console-chat__messages">
          <ContextBar :tags="sessionTags" />
          <AIMessageBubble
            v-for="msg in currentSession.messages"
            :key="msg.id ?? msg.content"
            :message="msg"
          />
        </div>

        <div class="console-chat__input">
          <AIInputBox
            :loading="isStreaming"
            :placeholder="`向 Console Chat 发送消息（${settingsStore.ai.llmDefaultModel}）`"
            @send="handleSend"
            @stop="handleStop"
          />
        </div>
      </template>

      <el-button
        v-if="appStore.isMobile"
        class="console-chat__new-btn"
        type="primary"
        :icon="Plus"
        circle
        @click="handleNewSession"
      />
    </div>

    <ContextFeedDialog
      v-if="feedOpen"
      v-model:visible="feedOpen"
      :session-id="currentSessionId ?? ''"
    />
  </div>
</template>

<style scoped lang="scss">
.console-chat {
  display: flex;
  height: 100%;
  width: 100%;

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
  }

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .title {
      font-weight: 600;
    }
    .model {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
    .actions {
      margin-left: auto;
      display: flex;
      gap: 4px;
    }
  }

  &__messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__input {
    border-top: 1px solid var(--el-border-color-lighter);
  }

  &__new-btn {
    position: fixed;
    right: 16px;
    bottom: 72px;
  }
}
</style>
