import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PromptTemplate } from '@/types/ai'

/** 内置 Prompt 模板 */
const builtinPrompts: PromptTemplate[] = [
  {
    id: 'summary',
    name: '群聊总结',
    description: '总结聊天记录的关键话题和要点',
    category: 'builtin',
    content: '请总结以下聊天记录中的关键话题、重要信息和行动要点，用简洁的列表形式呈现。',
    variables: [
      {
        name: 'sessionName',
        description: '会话名称',
        defaultValue: '当前会话',
        source: 'auto',
      },
      {
        name: 'content',
        description: '聊天内容',
        source: 'auto',
      },
    ],
    tags: ['总结', '群聊'],
  },
  {
    id: 'todo',
    name: '待办提取',
    description: '从聊天中提取待办事项和任务',
    category: 'builtin',
    content: '请从以下聊天记录中提取待办事项和任务，包括负责人、截止时间和优先级。',
    variables: [
      { name: 'sessionName', description: '会话名称', source: 'auto' },
      { name: 'content', description: '聊天内容', source: 'auto' },
    ],
    tags: ['待办', '任务'],
  },
  {
    id: 'topic-analysis',
    name: '话题分析',
    description: '分析聊天中的讨论话题分布',
    category: 'builtin',
    content:
      '请分析以下聊天记录中的话题分布，列出主要讨论的话题及其占比（百分比）。',
    variables: [
      { name: 'sessionName', description: '会话名称', source: 'auto' },
      { name: 'content', description: '聊天内容', source: 'auto' },
    ],
    tags: ['分析', '话题'],
  },
  {
    id: 'sentiment',
    name: '情绪分析',
    description: '分析聊天记录中的情绪走向',
    category: 'builtin',
    content:
      '请分析以下聊天记录中参与者的情绪变化，标记正面/负面/中性倾向，并按时间线呈现。',
    variables: [
      { name: 'sessionName', description: '会话名称', source: 'auto' },
      { name: 'content', description: '聊天内容', source: 'auto' },
    ],
    tags: ['情绪', '分析'],
  },
  {
    id: 'persona',
    name: '人物画像',
    description: '根据聊天内容构建人物画像',
    category: 'builtin',
    content:
      '请根据以下聊天记录，为参与对话的人物构建画像，包括性格特点、常用表达、行为模式等。',
    variables: [
      { name: 'sessionName', description: '会话名称', source: 'auto' },
      { name: 'content', description: '聊天内容', source: 'auto' },
    ],
    tags: ['人物', '画像'],
  },
]

export const useAIPromptStore = defineStore('aiPrompt', () => {
  // ==================== State ====================

  const prompts = ref<PromptTemplate[]>(builtinPrompts)

  // ==================== Getters ====================

  const builtinList = computed(() =>
    prompts.value.filter((p) => p.category === 'builtin')
  )

  const customList = computed(() =>
    prompts.value.filter((p) => p.category === 'custom')
  )

  // ==================== Actions ====================

  function getPromptById(id: string): PromptTemplate | undefined {
    return prompts.value.find((p) => p.id === id)
  }

  function addPrompt(prompt: PromptTemplate) {
    prompts.value.push(prompt)
  }

  function removePrompt(id: string) {
    prompts.value = prompts.value.filter((p) => p.id !== id)
  }

  function substituteVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
    return result
  }

  function $reset() {
    prompts.value = [...builtinPrompts]
  }

  return {
    // State
    prompts,
    // Getters
    builtinList,
    customList,
    // Actions
    getPromptById,
    addPrompt,
    removePrompt,
    substituteVariables,
    $reset,
  }
})
