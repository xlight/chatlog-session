import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { PromptTemplate, PromptVariable } from '@/types/ai'

// ==================== localStorage keys ====================

const STORAGE_KEY_OVERRIDES = 'chatlog_prompt_overrides'
const STORAGE_KEY_CUSTOM = 'chatlog_custom_prompts'

// ==================== 内置分析模板 ID ====================

/** Observer 分析调用默认使用的内置分析角色模板 ID */
export const OBSERVER_ANALYZE_TEMPLATE_ID = 'observer-analyze'

// ==================== 内置 Prompt 模板（只读） ====================

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
      '根据群里的聊天记录，编一个以 战锤世界观为背景的 800 字科幻故事，要有起承转合的故事性，要像一个战锤世界，要有战锤式的开头语和结尾语，要体现出群里的名字和聊天内容',
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
      + '   - **强制分层**：请先建立宏观分类（如"科技"、"投资"、"生活"），再将具体话题归类到这些宏观分类下。\n'
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
  {
    id: OBSERVER_ANALYZE_TEMPLATE_ID,
    name: '旁观分析角色',
    description: 'Observer 旁观分析的默认角色模板（system 角色，仅支持 {sessionName} 变量）',
    category: 'builtin',
    content:
      '你是一个聊天分析助手，帮助用户理解群聊或私聊内容，提取关键信息并提供回复建议。输出使用中文。',
    variables: [
      { name: 'sessionName', description: '会话名称', source: 'auto', defaultValue: '当前会话' },
    ],
    tags: ['分析', 'Observer'],
  },
]

// ==================== 已知变量映射 ====================

const KNOWN_VARIABLES: Record<string, Partial<PromptVariable>> = {
  content: { description: '聊天内容', source: 'auto' },
  sessionName: { description: '会话名称', source: 'auto', defaultValue: '当前会话' },
}

// ==================== Override 类型 ====================

type PromptOverrides = Record<string, Partial<PromptTemplate>>

// ==================== Store ====================

export const useAIPromptStore = defineStore('aiPrompt', () => {
  // ==================== State ====================

  const _overrides = ref<PromptOverrides>({})
  const _customPrompts = ref<PromptTemplate[]>([])

  // ==================== Getters ====================

  const builtinList = computed(() =>
    builtinPrompts.map((p) => ({
      ...p,
      ...(_overrides.value[p.id] || {}),
      _overridden: !!_overrides.value[p.id],
    }))
  )

  const customList = computed(() => _customPrompts.value)

  const prompts = computed(() => [...builtinList.value, ...customList.value])

  function isOverridden(id: string): boolean {
    return !!_overrides.value[id]
  }

  // ==================== Actions ====================

  function getPromptById(id: string): PromptTemplate | undefined {
    return prompts.value.find((p) => p.id === id)
  }

  // --- Builtin override actions ---

  function updateBuiltinOverride(id: string, override: Partial<PromptTemplate>) {
    _overrides.value[id] = { ..._overrides.value[id], ...override }
    persistOverrides()
  }

  function removeBuiltinOverride(id: string) {
    delete _overrides.value[id]
    _overrides.value = { ..._overrides.value }
    persistOverrides()
  }

  // --- Custom prompt actions ---

  function addPrompt(prompt: PromptTemplate) {
    _customPrompts.value.push(prompt)
    persistCustomPrompts()
  }

  function addCustomPrompt(prompt: PromptTemplate) {
    _customPrompts.value.push(prompt)
    persistCustomPrompts()
  }

  function updateCustomPrompt(id: string, updates: Partial<PromptTemplate>) {
    const idx = _customPrompts.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      _customPrompts.value[idx] = { ..._customPrompts.value[idx], ...updates }
      persistCustomPrompts()
    }
  }

  function removePrompt(id: string) {
    _customPrompts.value = _customPrompts.value.filter((p) => p.id !== id)
    persistCustomPrompts()
  }

  function removeCustomPrompt(id: string) {
    _customPrompts.value = _customPrompts.value.filter((p) => p.id !== id)
    persistCustomPrompts()
  }

  // --- Duplicate ---

  function duplicateBuiltinAsCustom(builtinId: string): PromptTemplate | null {
    const source = builtinPrompts.find((p) => p.id === builtinId)
    if (!source) return null
    const newPrompt: PromptTemplate = {
      ...source,
      id: 'custom-' + nanoid(8),
      category: 'custom',
    }
    addCustomPrompt(newPrompt)
    return newPrompt
  }

  // --- Variable extraction ---

  function extractVariables(content: string): PromptVariable[] {
    const regex = /\{(\w+)\}/g
    const found = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
      found.add(match[1])
    }

    return Array.from(found).map((name) => ({
      name,
      description: KNOWN_VARIABLES[name]?.description ?? '',
      defaultValue: KNOWN_VARIABLES[name]?.defaultValue,
      source: KNOWN_VARIABLES[name]?.source ?? ('manual' as const),
    }))
  }

  // --- Variable substitution ---

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

  // ==================== Persistence ====================

  function persistOverrides() {
    try {
      localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(_overrides.value))
    } catch (e) {
      console.error('Failed to persist prompt overrides:', e)
    }
  }

  function persistCustomPrompts() {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(_customPrompts.value))
    } catch (e) {
      console.error('Failed to persist custom prompts:', e)
    }
  }

  function loadFromStorage() {
    try {
      const overridesRaw = localStorage.getItem(STORAGE_KEY_OVERRIDES)
      if (overridesRaw) _overrides.value = JSON.parse(overridesRaw)

      const customRaw = localStorage.getItem(STORAGE_KEY_CUSTOM)
      if (customRaw) _customPrompts.value = JSON.parse(customRaw)
    } catch (e) {
      console.error('Failed to load prompt data from localStorage:', e)
    }
  }

  function $reset() {
    _overrides.value = {}
    _customPrompts.value = []
    localStorage.removeItem(STORAGE_KEY_OVERRIDES)
    localStorage.removeItem(STORAGE_KEY_CUSTOM)
  }

  // ==================== Init ====================

  loadFromStorage()

  return {
    // State
    prompts,
    // Getters
    builtinList,
    customList,
    isOverridden,
    // Actions
    getPromptById,
    addPrompt,
    removePrompt,
    updateBuiltinOverride,
    removeBuiltinOverride,
    addCustomPrompt,
    updateCustomPrompt,
    removeCustomPrompt,
    duplicateBuiltinAsCustom,
    extractVariables,
    substituteVariables,
    $reset,
  }
})
