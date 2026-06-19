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
    id: 'build-story',
    name: '构建故事',
    description: '根据聊天内容构建故事',
    category: 'builtin',
    content:
      '根据群里的聊天记录，编一个以 战锤世界观为背景的 800 字科幻故事，符合一般故事的起承转合，要体现出群里的名字和聊天内容',
    variables: [
      { name: 'sessionName', description: '会话名称', source: 'auto' },
      { name: 'content', description: '聊天内容', source: 'auto' },
    ],
    tags: ['故事', '科幻'],
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
  {
    id: 'graph',
    name: '关系图',
    description: '根据聊天内容构建关系图',
    category: 'builtin',
    content:
      '# Role\n你是一位专业的数据可视化专家，擅长将非结构化文本转化为清晰的 Mermaid 知识图谱。\n'
      + '# Task\n请分析提供的【聊天记录】，提取关键人物、核心话题以及人物对观点的见解，生成一个 Mermaid 关系图谱代码。\n'
      + '# Constraints & Layout Rules (关键约束)\n'
      + '1. **布局方向**：必须使用 graph TD (从上到下)，严禁使用 `LR` 或 `RL`。\n'
      + '2. **控制宽度（核心要求）**：\n'
      + '   - **禁止扁平化**：不要将所有节点放在同一层级。\n'
      + '   - **强制分层**：请先建立宏观分类（如“科技”、“投资”、“生活”），再将具体话题归类到这些宏观分类下。\n'
      + '   - **利用子图**：请务必使用 `subgraph` 将相关的话题包裹起来，通过嵌套子图来增加深度，从而减少单行节点的数量。\n'
      + '3. **节点样式**：\n'
      + '   - **人物**：必须使用圆形，并在末尾添加样式类 `:::person`。\n'
      + '   - **话题**：必须使用矩形（方形），并在末尾添加样式类 `:::topic`。\n'
      + '4. **连线与标签**：\n'
      + '   - 连线方向：人物 --> 话题。\n'
      + '   - 标签内容：简要概括该人物对该话题的核心观点（尽量精简文字）。\n'

      + '# Class Definitions\n'
      + '请在代码顶部定义以下样式：\n'
      + '- person: shape: circle, fill: #e1f5fe, stroke: #01579b\n'
      + '- topic: shape: rect, fill: #fff3e0, stroke: #ff6f00',
    variables: [
      { name: 'sessionName', description: '会话名称', source: 'auto' },
      { name: 'content', description: '聊天内容', source: 'auto' },
    ],
    tags: ['人物', '画像'],
  },
  {
    id: 'builtin-reply',
    name: '帮我回复',
    description: '针对单条消息生成回复草稿',
    category: 'builtin',
    content:
      '请帮我针对以下消息生成一条自然的回复（语气：{tone}）。\n\n原消息：\n{content}\n\n请只输出回复内容本身，不要任何解释或前言。',
    variables: [
      { name: 'content', description: '原消息内容', source: 'auto' },
      { name: 'tone', description: '回复语气', defaultValue: '友好', source: 'manual' },
    ],
    tags: ['回复', '右键'],
  },
  {
    id: 'builtin-analyze',
    name: '分析消息',
    description: '对单条消息做深度分析（意图、情感、潜在含义）',
    category: 'builtin',
    content:
      '请对以下消息做深入分析，包括：1）发送者可能的意图；2）情感倾向；3）潜在含义或潜台词；4）建议的应对方式。\n\n消息：\n{content}',
    variables: [{ name: 'content', description: '消息内容', source: 'auto' }],
    tags: ['分析', '右键'],
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
