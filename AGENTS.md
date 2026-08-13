# AGENTS.md - Development Guide for Chatlog Session

## 使用中文

- 本项目的注释和文档均使用中文编写
- LLM Think和输出保持中文
- 用户提示和错误信息使用中文
- 不要在文档中写大段的代码

## Project Overview

Vue 3 + TypeScript + Vite 前端应用，用于通过 Chatlog API 查看微信聊天记录。使用 Pinia 状态管理、Element Plus UI 组件库、IndexedDB 本地存储。

## Build Commands

```bash
nvm use 22        # 使用 nvm 的 node
pnpm dev          # 开发服务器 (端口 5173，代理后端 127.0.0.1:5030)
pnpm build        # 生产构建 (vue-tsc 类型检查 + vite build)
pnpm preview      # 预览生产构建
pnpm type-check   # 仅类型检查 (vue-tsc --noEmit)
pnpm lint         # ESLint 检查并自动修复
pnpm format       # Prettier 格式化 src/
```

## Package Manager & Node Version

- **包管理器**: 项目统一使用 `pnpm@10.33.0`（见 `package.json` 的 `packageManager` 字段）
- **Node.js**: 需要 **Node.js 20+**（Vite 7 要求）
- 初次进入仓库建议先执行 `corepack enable`
- **禁止**提交 `package-lock.json`，CI 有 guard 检查会失败

## Code Style (Prettier)

- **No semicolons** (`"semi": false`)
- **Single quotes** (`'string'`)
- **Trailing commas** ES5 style
- **2 spaces** indentation, no tabs
- **100 char** print width
- **Arrow parens**: avoid for single params (`x => x`)
- **LF** line endings
- **Bracket spacing**: `{ key: value }`

## Imports

```typescript
// Vue/Router/Pinia API 自动导入，不要手动 import:
// ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted,
// useRoute, useRouter, defineStore, storeToRefs, nextTick, etc.

// 需要手动导入:
import type { Contact } from '@/types/contact'  // 类型用 import type
import { useAppStore } from '@/stores/app'      // Store
import { request } from '@/utils/request'       // 工具函数
import { ElMessage } from 'element-plus'        // Element Plus 消息 (非组件)

// 路径别名: @/ → src/
// Element Plus 组件和图标已通过 unplugin 自动导入，无需手动 import
```

## Vue Components

- 模板: `<script setup lang="ts">` exclusively
- Props: `interface Props { ... }` + `withDefaults(defineProps<Props>(), {})`
- 样式: `<style lang="scss" scoped>` (全局样式除外)
- 文件名: PascalCase (`EmptyState.vue`, `SearchBar.vue`)
- SCSS 全局变量通过 `@use "@/assets/styles/variables.scss" as *` 自动注入

## ESLint Rules

- `vue/multi-word-component-names`: off
- `vue/require-default-prop`: off
- `@typescript-eslint/no-explicit-any`: warn (尽量避免，用 `unknown` 替代)
- `@typescript-eslint/no-unused-vars`: error, `_` 前缀变量除外
- `prefer-const`: error
- `no-var`: error
- `no-console`: production 环境 warn
- `no-debugger`: production 环境 error

## Naming Conventions

| 类别 | 规则 | 示例 |
| --- | --- | --- |
| Components | PascalCase 文件名 | `EmptyState.vue` |
| Composables | `useXxx.ts` | `useKeyboardShortcuts.ts` |
| Stores | 描述性名称 | `stores/app.ts`, `stores/contact.ts` |
| Types | PascalCase interface | `Contact`, `SessionInfo`, `AppConfig` |
| Utils | camelCase 文件，命名导出 | `utils/format.ts`, `utils/date.ts` |
| API files | 领域名称 | `api/contact.ts`, `api/session.ts` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_PATH`, `ContactType` |

## State Management (Pinia)

两种模式共存，新代码使用 Composition API:

```typescript
// Composition API (推荐，大多数 store 使用此模式)
export const useXxxStore = defineStore('xxx', () => {
  // ==================== State ====================
  const data = ref<Type[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // ==================== Getters ====================
  const filtered = computed(() => data.value.filter(...))

  // ==================== Actions ====================
  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      data.value = await someAPI.getData()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
    } finally {
      loading.value = false
    }
  }

  function $reset() { /* 重置所有 state */ }

  // ==================== Return ====================
  return { data, loading, error, filtered, fetchData, $reset }
})
```

- 所有 store 必须提供 `$reset()` 方法
- 使用 `// ==================== Section ====================` 分隔代码块
- 调试日志使用 emoji 前缀: `📱📦🔍💬✅❌🔄🗑️`, 通过 `appStore.isDebug` 门控

## API Layer Pattern

API 使用 class 单例模式，每个文件包含 `transform` 函数转换后端数据:

```typescript
// 后端数据结构 (定义在 API 文件中)
interface BackendXxx { ... }

// 转换函数
function transformXxx(backend: BackendXxx): FrontendType { ... }

// API 类
class XxxAPI {
  async getItems(params?: Params): Promise<Item[]> {
    const response = await request.get<BackendResponse>('/api/v1/xxx', params)
    return response.items.map(transformXxx)
  }
}

export const xxxAPI = new XxxAPI()
export default xxxAPI
```

- HTTP 客户端: `request` from `@/utils/request` (axios wrapper)
- API 路径前缀: `/api/v1/`
- 所有请求自动添加 `format=json` 参数
- 错误由 axios 拦截器统一处理 (ElMessage + 自动重试)

## Error Handling

- async 操作使用 try-catch，error 存入对应 store 的 `ref<Error | null>`
- 用户提示使用 `ElMessage.error('中文错误描述')`
- HTTP 错误由 `utils/request.ts` 拦截器统一处理 (含自动重试)
- 调试日志门控: `if (appStore.isDebug) { console.log(...) }`

## Project Structure

```
src/
├── api/              # API 层 - class 单例 + transform 函数 → [api/AGENTS.md]
├── assets/styles/    # SCSS 全局变量、mixins、基础样式
├── components/       # 按功能分组: chat/, common/, layout/, search/, PWA/
├── composables/      # 可复用组合函数 (useXxx.ts)
├── router/           # Vue Router - createWebHistory, 懒加载路由
├── stores/           # Pinia stores (Composition API 为主)
│   └── chat/         # 消息核心逻辑 → [stores/chat/AGENTS.md]
├── types/            # TypeScript 类型定义，按领域拆分
├── utils/            # 工具函数: request, db, format, date, storage 等
└── views/            # 页面组件: Chat/, Contact/, Search/, Settings/, Dashboard/
```

## OpenSpec Workflow

项目使用 OpenSpec 管理变更提案和规格：

- `openspec/changes/<change-id>/` - 活跃变更目录
- `openspec/changes/archive/` - 已归档变更
- `openspec/specs/` - 主规格目录

每个变更包含：
- `proposal.md` - 变更提案
- `design.md` - 设计说明
- `tasks.md` - 任务清单
- `specs/<capability>/spec.md` - 规格 delta

## Environment Variables (.env)

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `VITE_APP_TITLE` | 应用标题 | Chatlog Session |
| `VITE_API_BASE_URL` | 后端 API 地址 | http://127.0.0.1:5030 |
| `VITE_PAGE_SIZE` | 默认分页大小 | 500 |
| `VITE_ENABLE_DEBUG` | 启用调试模式 | false |
| `VITE_BASE_PATH` | 部署基础路径 | ./ |

## Caching Architecture

- **SessionStorage**: 消息缓存 (LRU + TTL, `stores/messageCache.ts`)、AI Console 会话、AI 活动日志 (上限 200 条避免配额超限)
- **IndexedDB**: 联系人和群聊信息持久化 (`utils/db.ts`)
- **localStorage**: 用户设置、置顶会话、API 配置
- 缓存事件: `window.dispatchEvent(new CustomEvent('chatlog-cache-updated', ...))`

## AI Module (Phase B1+)

Agent Console 与消息右键 AI 操作相关模块：

- **`composables/useAIStream.ts`** — 共享流式对话组合函数，鸭子类型 `AIStreamStore` 接口，同时支持 AI Panel (`useAIConversationStore`) 与 Agent Console (`useAIConsoleStore` per-session delegation)
- **`composables/injectDraftKey.ts`** — `INJECT_DRAFT_KEY: InjectionKey<InjectDraftFn>` 类型化 provide/inject，作用域限定在 `Chat/index.vue` 页面
- **`composables/useAIChat.ts`** — 已重构为 useAIStream 的薄包装，公共 API 保持不变
- **`stores/ai/console.ts`** — Agent Console 会话管理，per-session `streamingMap` 支持并行会话，`deleteSession` 自动 abort
- **`stores/ai/activityLog.ts`** — AI 活动日志（调用次数、操作历史），sessionStorage 持久化
- **`stores/ai/conversation.ts`** — 扩展 `lastReply` / `setLastReply` / `markLastReplyInjected` 支持「填入输入框」功能
- **`stores/ai/prompt.ts`** — 新增 `builtin-reply`（{content}/{tone}）与 `builtin-analyze`（{content}）模板
- **`types/ai/console.ts`** — Agent Console 类型定义：`ConsoleChatSession`、`ContextSource`、`ActivityLogEntry` 等
- **`types/ai/index.ts`** — 新增 `LastReply`、`ChatMessage.id` 字段
- **`components/ai/RecentReplyCard.vue`** — AI 对话顶部浮动卡片，显示最近一次 AI 生成的回复/分析，点击预览滚动到原消息
- **`views/AgentConsole/`** — Agent Console 5 Tab 页面：
  - `index.vue` — Tab 壳层 + 生命周期 abortAllStreams
  - `ConsoleChat.vue` — 双栏聊天主界面 + per-session streaming
  - `ConsoleSessionList.vue` — 会话列表（最多 50）
  - `ContextFeedDialog.vue` — 上下文喂入对话框（最近 1h/6h/今天/3 天/7 天/全部）
  - `ConsoleOverview.vue` — 概览页（统计 + 最近活动）
  - `ConsoleActivityLog.vue` — 活动日志列表
  - `ConsoleSessions.vue` — 会话管理页（重命名/删除）
  - `ConsoleConfig.vue` — Console 配置（启用、模型、侧边栏显示）

### 路由与快捷键

- `/agent/console` 路由（懒加载）
- `Cmd/Ctrl+Shift+K` 切换 Agent Console（`useKeyboardShortcuts.register()` with `allowedInInput: true`）

### 设置项

- `settings.ai.showConsoleInSidebar: boolean` (默认 true) — 侧边栏是否显示 Agent Console 入口

## Auto-generated Files (勿手动编辑)

- `src/auto-imports.d.ts` - unplugin-auto-import 生成
- `src/components.d.ts` - unplugin-vue-components 生成
- `.eslintrc-auto-import.json` - auto-import ESLint globals
- `src/env.d.ts` + `src/vite-env.d.ts` - 两个文件共存，`env.d.ts` 声明 `__APP_VERSION__` 等 Vite define 常量，`vite-env.d.ts` 声明 Vite 客户端类型

## Custom Build Plugins

- `vite-plugin-version.ts` — 自定义 Vite 插件，注入版本号和构建日期到全局常量（`__APP_VERSION__`, `__BUILD_DATE__`, `__BUILD_TIME__`, `__GIT_HASH__`, `__GIT_BRANCH__`），从 `package.json` 读取版本号，从 `git` 读取 commit hash 和分支名

## Testing

### 测试命令

```bash
pnpm test           # 运行所有测试（单次执行）
pnpm test:watch     # 监听模式，文件变更自动重跑
pnpm test:coverage  # 生成覆盖率报告（输出到 coverage/ 目录）
```

### 测试框架

- **Vitest** v4.x + **jsdom** 环境
- `@vue/test-utils` v2.x 用于组件测试
- `@pinia/testing` 的 `createTestingPinia` 用于 Store 测试
- `@vitest/coverage-v8` 用于覆盖率

### 测试文件位置

测试文件统一放在 `src/` 下对应模块的 `__tests__/` 目录中

### 当前测试状态

- **20 个测试文件**，**511 个测试用例**，全部通过
- 覆盖范围：utils/（10 文件）、stores/chat/utils.ts（22 函数）、stores/（4 文件）、api/base.ts（1 文件）、AI Module（3 文件：useAIStream、console、activityLog）
- CI 已集成：`.github/workflows/deploy.yml` 在 build 前执行 `pnpm test`

## Common Gotchas

1. **不要手动导入 Vue API** — `ref`, `computed`, `watch` 等已自动导入（测试文件中除外）
2. **Node 版本不对会导致构建失败** — 确保 Node.js 20+
3. **不要提交 package-lock.json** — 项目使用 pnpm，CI 会拒绝 npm 锁文件
4. **全局 SCSS 变量已自动注入** — 不需要手动 `@use` variables.scss
5. **Element Plus 组件已自动导入** — 不需要手动 import（测试文件中需要 stub）
6. **测试文件中必须显式 import** — unplugin-auto-import 在测试中不生效

## Anti-Patterns (本项目禁止)

1. **`as any`** — 尽量避免，用 `unknown` 替代（ESLint warn）
2. **`@ts-ignore` / `@ts-expect-error`** — 禁止，必须修复类型错误
3. **空 catch 块** — `catch(e) {}` 禁止，必须处理或记录错误
4. **未门控的 console.log** — 必须通过 `appStore.isDebug` 门控
5. **未提交失败测试** — 禁止删除测试来让测试通过
6. **提交 package-lock.json** — CI guard 会拒绝
