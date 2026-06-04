<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useAIChat } from '@/composables/useAIChat'
import { useContextFeed } from '@/composables/useContextFeed'
import { useSessionStore } from '@/stores/session'
import { useAIPromptStore } from '@/stores/ai/prompt'
import AIMessageBubble from './AIMessageBubble.vue'
import AIInputBox from './AIInputBox.vue'
import ContextBar from './ContextBar.vue'
import PromptSelector from './PromptSelector.vue'

const { conversation, sendMessage, stopGeneration } =
  useAIChat()
const {
  contextTags,
  feeding,
  feedSessionContext,
  removeContextTag,
  clearContextTags,
} = useContextFeed()
const sessionStore = useSessionStore()
const promptStore = useAIPromptStore()

const messagesEndRef = ref<HTMLDivElement | null>(null)
const feedCount = ref(20)

const displayMessages = computed(() => conversation.messages)

const currentSession = computed(() => {
  const id = sessionStore.currentSessionId
  if (!id) return null
  return sessionStore.sessions.find((s) => s.id === id) ?? null
})

const feedOptions = [
  { value: 20, label: '20条' },
  { value: 50, label: '50条' },
  { value: 100, label: '100条' },
  { value: 200, label: '200条' },
]

async function scrollToBottom() {
  await nextTick()
  messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
}

watch(
  () => conversation.messages.length,
  () => scrollToBottom()
)

watch(
  () => conversation.displayedContent,
  () => scrollToBottom()
)

function handleSend(text: string) {
  sendMessage(text)
}

function handleStop() {
  stopGeneration()
}

async function handleFeedContext(count?: number) {
  if (!currentSession.value) return
  const n = count ?? feedCount.value
  const systemContent = await feedSessionContext(
    currentSession.value,
    n
  )
  if (!systemContent) return

  const session = currentSession.value
  const sessionName = session.name || session.talkerName || '未知会话'
  const systemMsg = {
    role: 'system' as const,
    content: `以下是会话「${sessionName}」的最近 ${n} 条聊天记录作为上下文：\n\n${systemContent}`,
  }
  const existingSystem = conversation.messages.filter(
    (m) => m.role === 'system'
  )
  const nonSystem = conversation.messages.filter((m) => m.role !== 'system')
  conversation.messages = [...existingSystem, systemMsg, ...nonSystem]
  feedCount.value = n
}

function handlePromptSelect(promptId: string) {
  const prompt = promptStore.getPromptById(promptId)
  if (!prompt) return

  const vars: Record<string, string> = {}
  if (currentSession.value) {
    vars.sessionName =
      currentSession.value.name || currentSession.value.talkerName || '当前会话'
  }
  const substituted = promptStore.substituteVariables(
    prompt.content,
    vars
  )

  conversation.addMessage({
    role: 'system',
    content: substituted,
  })
}

function handleContextTagRemove(id: string) {
  const tag = contextTags.value.find((t) => t.id === id)
  if (tag) {
    conversation.messages = conversation.messages.filter(
      (m) => !(m.role === 'system' && m.content.includes(tag.sessionName))
    )
  }
  removeContextTag(id)
}

function handleClearContext() {
  clearContextTags()
  conversation.messages = conversation.messages.filter(
    (m) => m.role !== 'system'
  )
}
</script>

<template>
  <div class="ai-conversation">
    <ContextBar
      :tags="contextTags"
      @remove="handleContextTagRemove"
      @clear="handleClearContext"
    />

    <div class="ai-conversation__messages">
      <div
        v-if="!conversation.hasMessages && !conversation.streaming"
        class="ai-conversation__empty"
      >
        <el-empty description="开始对话" :image-size="60">
          <div class="ai-conversation__empty-actions">
            <el-text type="info" size="small">
              输入消息或
              <el-button
                v-if="currentSession"
                text
                size="small"
                :loading="feeding"
                @click="handleFeedContext()"
              >
                投喂当前会话上下文
              </el-button>
              开始
            </el-text>
          </div>
        </el-empty>
      </div>

      <template v-for="(msg, index) in displayMessages" :key="index">
        <AIMessageBubble
          :message="msg"
          :thinking-content="
            msg.role === 'assistant'
              ? conversation.thinkingContent
              : undefined
          "
          :thinking-visible="conversation.thinkingVisible"
        />
      </template>

      <div v-if="conversation.error" class="ai-conversation__error">
        <el-alert
          :title="conversation.error.message"
          type="error"
          :closable="false"
          show-icon
        />
      </div>

      <div
        v-if="conversation.usage && !conversation.streaming"
        class="ai-conversation__usage"
      >
        <el-text type="info" size="small">
          Token: {{ conversation.usage.totalTokens }}（输入
          {{ conversation.usage.promptTokens }} / 输出
          {{ conversation.usage.completionTokens }}）
        </el-text>
      </div>

      <div ref="messagesEndRef" />
    </div>

    <AIInputBox
      :loading="conversation.streaming"
      @send="handleSend"
      @stop="handleStop"
    >
      <template #extra>
        <div class="ai-conversation__feed-actions">
          <PromptSelector
            v-if="!conversation.streaming"
            @select="handlePromptSelect"
          />
          <el-dropdown
            v-if="currentSession && !conversation.streaming"
            trigger="click"
            @command="(val: number) => handleFeedContext(val)"
          >
            <el-button size="small" text>
              <el-icon><FolderOpened /></el-icon>
              投喂上下文
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="opt in feedOptions"
                  :key="opt.value"
                  :command="opt.value"
                >
                  {{ opt.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>
    </AIInputBox>
  </div>
</template>

<style lang="scss" scoped>
.ai-conversation {
  height: 100%;
  display: flex;
  flex-direction: column;

  &__messages {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  &__empty-actions {
    text-align: center;
    line-height: 2;
  }

  &__error {
    padding: 8px 16px;
  }

  &__usage {
    padding: 4px 16px 8px;
    text-align: right;
  }

  &__feed-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
</style>
