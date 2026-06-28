<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useAIChat } from '@/composables/useAIChat'
import { useContextFeed, FEED_TIME_RANGES } from '@/composables/useContextFeed'
import { useSessionStore } from '@/stores/session'
import { useAIPromptStore } from '@/stores/ai/prompt'
import { useVirtualizer } from '@tanstack/vue-virtual'
import AIMessageBubble from './AIMessageBubble.vue'
import AIInputBox from './AIInputBox.vue'
import ContextBar from './ContextBar.vue'
import PromptSelector from './PromptSelector.vue'
import PromptEditorDialog from './PromptEditorDialog.vue'
import RecentReplyCard from './RecentReplyCard.vue'
import type { PromptTemplate } from '@/types/ai'

const { conversation, sendMessage, stopGeneration } =
  useAIChat()
const {
  contextTags,
  feeding,
  feedSessionContext,
  removeContextTag,
  clearContextTags,
  restoreTags,
} = useContextFeed()
const sessionStore = useSessionStore()
const promptStore = useAIPromptStore()

const currentFeedRange = ref({ seconds: 3600, label: '最近1小时' })

const displayMessages = computed(() => conversation.messages)

const lastAssistantMessage = computed(() => {
  const msgs = displayMessages.value
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'assistant') return msgs[i]
  }
  return null
})

const currentSession = computed(() => {
  const id = sessionStore.currentSessionId
  if (!id) return null
  return sessionStore.sessions.find((s) => s.id === id) ?? null
})

watch(
  () => sessionStore.currentSessionId,
  (newId, oldId) => {
    if (oldId) conversation.saveToSession(oldId)
    conversation.clearConversation()
    clearContextTags()
    if (newId) {
      const tags = conversation.loadFromSession(newId)
      if (tags.length > 0) restoreTags(tags)
    }
  }
)

onMounted(() => {
  const sid = sessionStore.currentSessionId
  if (sid) {
    const tags = conversation.loadFromSession(sid)
    if (tags.length > 0) restoreTags(tags)
  }
})

// 虚拟滚动
const parentRef = ref<HTMLElement | null>(null)

const virtualizer = useVirtualizer(computed(() => ({
  count: displayMessages.value.length,
  getScrollElement: () => parentRef.value,
  estimateSize: () => 120,
  getItemKey: (i: number) => displayMessages.value[i]?.id ?? String(i),
  anchorTo: 'end' as const,
  followOnAppend: 'smooth' as const,
  scrollEndThreshold: 80,
  overscan: 6,
})))

const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// 初始滚动到底部
onMounted(() => {
  nextTick(() => {
    virtualizer.value.scrollToEnd()
  })
})

// 流式输出时平滑跟随：内容变化但 count 不变时，ResizeObserver 自动重测高度，
// anchorTo:'end' 保持视口锚定末尾，若用户在底部则 scrollToEnd 平滑跟随
watch(
  () => lastAssistantMessage.value?.content,
  () => {
    if (!conversation.streaming) return
    nextTick(() => {
      const el = parentRef.value
      if (!el) return
      const distanceFromEnd = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceFromEnd < 80) {
        virtualizer.value.scrollToEnd({ behavior: 'smooth' })
      }
    })
  }
)

function handleSend(text: string) {
  conversation.ensureMermaidPrompt()
  sendMessage(text)
}

function handleStop() {
  stopGeneration()
}

function handleClearConversation() {
  const sid = sessionStore.currentSessionId
  conversation.clearConversation()
  clearContextTags()
  if (sid) conversation.removeSession(sid)
}

function handleFeedContext(range?: { seconds?: number; type?: string; label: string }) {
  if (!currentSession.value || !range) return
  currentFeedRange.value = range as { seconds: number; label: string }
  const systemContent = feedSessionContext(
    currentSession.value,
    range as any
  )
  if (!systemContent) return

  const session = currentSession.value
  const sessionName = session.name || session.talkerName || '未知会话'
  const timeLabel = range.label
  const systemMsg = {
    role: 'system' as const,
    content: `以下是会话「${sessionName}」在 ${timeLabel} 的聊天记录作为上下文：\n\n${systemContent}`,
  }
  const existingSystem = conversation.messages.filter(
    (m) => m.role === 'system'
  )
  const nonSystem = conversation.messages.filter((m) => m.role !== 'system')
  conversation.messages = [...existingSystem, systemMsg, ...nonSystem]
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

  // 直接发送 prompt 内容作为用户消息
  sendMessage(substituted)
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
  conversation.messages = conversation.messages.filter((m) => {
    if (m.role !== 'system') return true
    return conversation.hasMermaidPrompt && m.content.includes('Mermaid')
  })
}

// PromptEditorDialog 状态
const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editingTemplate = ref<PromptTemplate | null>(null)
const editingIsBuiltin = ref(false)

function handlePromptEdit(prompt: PromptTemplate, isBuiltin: boolean) {
  editorMode.value = 'edit'
  editingTemplate.value = prompt
  editingIsBuiltin.value = isBuiltin
  editorVisible.value = true
}

function handlePromptDuplicate(builtinId: string) {
  const duplicated = promptStore.duplicateBuiltinAsCustom(builtinId)
  if (duplicated) {
    editorMode.value = 'edit'
    editingTemplate.value = duplicated
    editingIsBuiltin.value = false
    editorVisible.value = true
  }
}

function handlePromptDelete(id: string) {
  promptStore.removeCustomPrompt(id)
}

function handlePromptCreate() {
  editorMode.value = 'create'
  editingTemplate.value = null
  editingIsBuiltin.value = false
  editorVisible.value = true
}

function handleEditorSaved() {
  // 保存后状态由 store 自动更新，无需额外操作
}

function handleEditorReset(_id: string) {
  // 恢复默认后状态由 store 自动更新
}
</script>

<template>
  <div class="ai-conversation">
    <RecentReplyCard />
    <ContextBar
      :tags="contextTags"
      @remove="handleContextTagRemove"
      @clear="handleClearContext"
    />

    <div ref="parentRef" class="ai-conversation__messages">
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
                @click="handleFeedContext(currentFeedRange)"
              >
                投喂当前会话上下文
              </el-button>
              开始
            </el-text>
          </div>
        </el-empty>
      </div>

      <template v-else>
        <div
          :style="{
            height: `${totalSize}px`,
            width: '100%',
            position: 'relative',
          }"
        >
          <div
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRows[0]?.start ?? 0}px)`,
            }"
          >
            <div
              v-for="virtualRow in virtualRows"
              :key="String(virtualRow.key)"
              :ref="(el: any) => el && virtualizer.measureElement(el)"
              :data-index="virtualRow.index"
            >
              <AIMessageBubble
                :message="displayMessages[virtualRow.index]"
                :thinking-content="
                  displayMessages[virtualRow.index]?.role === 'assistant'
                    ? (displayMessages[virtualRow.index] === lastAssistantMessage && conversation.streaming
                      ? conversation.thinkingContent
                      : displayMessages[virtualRow.index]?.thinkingContent)
                    : undefined
                "
                :thinking-visible="conversation.thinkingVisible"
              />
            </div>
          </div>
        </div>
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

    </div>

    <AIInputBox
      :loading="conversation.streaming"
      @send="handleSend"
      @stop="handleStop"
    >
      <template #extra>
        <div class="ai-conversation__feed-actions">
          <el-button
            v-if="conversation.hasMessages && !conversation.streaming"
            text
            size="small"
            @click="handleClearConversation"
          >
            清空对话
          </el-button>
          <PromptSelector
            v-if="!conversation.streaming"
            @select="handlePromptSelect"
            @edit="handlePromptEdit"
            @duplicate="handlePromptDuplicate"
            @delete="handlePromptDelete"
            @create="handlePromptCreate"
          />
          <el-dropdown
            v-if="currentSession && !conversation.streaming"
            trigger="click"
            @command="(val: { seconds?: number; type?: string; label: string }) => handleFeedContext(val)"
          >
            <el-button size="small" text>
              <el-icon><FolderOpened /></el-icon>
              投喂上下文
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="opt in FEED_TIME_RANGES"
                  :key="opt.key"
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

    <PromptEditorDialog
      v-model="editorVisible"
      :mode="editorMode"
      :template="editingTemplate"
      :is-builtin="editingIsBuiltin"
      @saved="handleEditorSaved"
      @reset="handleEditorReset"
    />
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
    min-height: 0;
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
