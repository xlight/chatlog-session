# Chatlog Session 开发者指南

## 📋 目录

- [1. 开发环境搭建](#1-开发环境搭建)
- [2. 项目结构](#2-项目结构)
- [3. 核心技术](#3-核心技术)
- [4. 开发规范](#4-开发规范)
- [5. 组件开发](#5-组件开发)
- [6. API 集成](#6-api-集成)
- [7. 状态管理](#7-状态管理)
- [8. 测试指南](#8-测试指南)
- [9. 构建部署](#9-构建部署)
- [10. 调试技巧](#10-调试技巧)
- [11. 性能优化](#11-性能优化)
- [12. 贡献指南](#12-贡献指南)

---

## 1. 开发环境搭建

### 1.1 系统要求

- **操作系统**: macOS, Windows, Linux
- **Node.js**: >= 16.x
- **包管理器**: npm >= 8.x 或 yarn >= 1.22.x
- **IDE**: VSCode (推荐) / WebStorm
- **浏览器**: Chrome >= 90 / Firefox >= 88 / Safari >= 14

### 1.2 安装依赖

```bash
# 克隆项目
git clone https://github.com/xlight/chatlog-session.git
cd chatlog-session

# 安装依赖
npm install

# 或使用 yarn
yarn install
```

### 1.3 VSCode 配置

#### 推荐扩展

```json
{
  "recommendations": [
    "vue.volar",
    "vue.vscode-typescript-vue-plugin",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "lokalise.i18n-ally",
    "wayou.vscode-todo-highlight"
  ]
}
```

#### 工作区设置

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### 1.4 环境变量配置

创建 `.env.development` 文件：

```env
# API 配置
VITE_API_BASE_URL=http://127.0.0.1:5030
VITE_API_TIMEOUT=30000

# 应用配置
VITE_APP_TITLE=Chatlog Session
VITE_APP_VERSION=1.0.0

# 功能开关
VITE_ENABLE_DEBUG=true
VITE_ENABLE_MOCK=false
```

创建 `.env.production` 文件：

```env
# API 配置
VITE_API_BASE_URL=http://127.0.0.1:5030
VITE_API_TIMEOUT=30000

# 应用配置
VITE_APP_TITLE=Chatlog Session
VITE_APP_VERSION=1.0.0

# 功能开关
VITE_ENABLE_DEBUG=false
VITE_ENABLE_MOCK=false
```

### 1.5 启动项目

```bash
# 开发模式
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 代码格式化
npm run format
```

---

## 2. 项目结构

### 2.1 目录说明

```
chatlog-session/
├── .vscode/              # VSCode 配置
│   ├── extensions.json   # 推荐扩展
│   └── settings.json     # 工作区设置
├── public/               # 静态资源
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── api/             # API 接口定义
│   │   ├── index.ts     # API 入口
│   │   ├── chatlog.ts   # 聊天记录 API
│   │   ├── contact.ts   # 联系人 API
│   │   └── session.ts   # 会话 API
│   ├── assets/          # 资源文件
│   │   ├── images/      # 图片资源
│   │   ├── icons/       # 图标
│   │   └── styles/      # 全局样式
│   │       ├── index.css
│   │       ├── variables.css
│   │       └── themes.css
│   ├── components/      # 通用组件
│   │   ├── common/      # 基础组件
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   └── Modal/
│   │   ├── chat/        # 聊天相关组件
│   │   │   ├── MessageBubble/
│   │   │   ├── MessageList/
│   │   │   └── ChatInput/
│   │   └── media/       # 多媒体组件
│   │       ├── ImageViewer/
│   │       ├── VideoPlayer/
│   │       └── AudioPlayer/
│   ├── composables/     # 组合式函数
│   │   ├── useChat.ts
│   │   ├── useMedia.ts
│   │   ├── useSearch.ts
│   │   └── useInfiniteScroll.ts
│   ├── directives/      # 自定义指令
│   │   ├── lazy.ts
│   │   └── longpress.ts
│   ├── hooks/           # 自定义 Hooks
│   │   └── useDebounce.ts
│   ├── layouts/         # 布局组件
│   │   ├── DefaultLayout.vue
│   │   ├── MobileLayout.vue
│   │   └── EmptyLayout.vue
│   ├── router/          # 路由配置
│   │   ├── index.ts
│   │   ├── routes.ts
│   │   └── guards.ts
│   ├── stores/          # 状态管理
│   │   ├── index.ts
│   │   ├── chat.ts
│   │   ├── contact.ts
│   │   ├── user.ts
│   │   └── app.ts
│   ├── types/           # 类型定义
│   │   ├── api.ts
│   │   ├── chat.ts
│   │   ├── message.ts
│   │   ├── user.ts
│   │   └── global.d.ts
│   ├── utils/           # 工具函数
│   │   ├── request.ts   # HTTP 请求
│   │   ├── format.ts    # 格式化工具
│   │   ├── storage.ts   # 本地存储
│   │   ├── date.ts      # 日期处理
│   │   └── validator.ts # 验证工具
│   ├── views/           # 页面组件
│   │   ├── Chat/
│   │   │   ├── index.vue
│   │   │   └── components/
│   │   ├── Contact/
│   │   │   ├── index.vue
│   │   │   └── components/
│   │   ├── Search/
│   │   │   └── index.vue
│   │   └── Settings/
│   │       └── index.vue
│   ├── App.vue          # 根组件
│   ├── main.ts          # 入口文件
│   └── vite-env.d.ts    # Vite 类型声明
├── tests/               # 测试文件
│   ├── unit/           # 单元测试
│   ├── e2e/            # 端到端测试
│   └── setup.ts        # 测试配置
├── .env.development     # 开发环境变量
├── .env.production      # 生产环境变量
├── .eslintrc.js         # ESLint 配置
├── .gitignore
├── .prettierrc.js       # Prettier 配置
├── index.html           # HTML 模板
├── package.json
├── tsconfig.json        # TypeScript 配置
├── tsconfig.node.json   # Node TypeScript 配置
├── vite.config.ts       # Vite 配置
└── README.md
```

### 2.2 命名规范

#### 文件命名

- **组件文件**: PascalCase，如 `MessageBubble.vue`
- **工具文件**: camelCase，如 `formatDate.ts`
- **类型文件**: camelCase，如 `message.ts`
- **样式文件**: kebab-case，如 `message-bubble.css`

#### 目录命名

- 使用 kebab-case 或 camelCase
- 组件目录使用 PascalCase

---

## 3. 核心技术

### 3.1 Vue 3 组合式 API

#### 基础示例

```typescript
// src/views/Chat/index.vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import type { Message } from '@/types/message';

// Props 定义
interface Props {
  talkerId: string;
}
const props = defineProps<Props>();

// Emits 定义
interface Emits {
  (e: 'update', value: Message[]): void;
}
const emit = defineEmits<Emits>();

// 响应式数据
const messages = ref<Message[]>([]);
const loading = ref(false);

// Store
const chatStore = useChatStore();

// 计算属性
const sortedMessages = computed(() => {
  return messages.value.sort((a, b) => a.seq - b.seq);
});

// 方法
async function loadMessages() {
  loading.value = true;
  try {
    messages.value = await chatStore.loadMessages(props.talkerId);
    emit('update', messages.value);
  } finally {
    loading.value = false;
  }
}

// 生命周期
onMounted(() => {
  loadMessages();
});
</script>
```

### 3.3 Pinia 状态管理

#### Store 定义

```typescript
// src/stores/chat.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getChatlog, getSessions } from '@/api/chatlog';
import type { Message, Session } from '@/types';

export const useChatStore = defineStore('chat', () => {
  // State
  const currentSession = ref<Session | null>(null);
  const messages = ref<Message[]>([]);
  const sessions = ref<Session[]>([]);
  const loading = ref(false);

  // Getters
  const currentMessages = computed(() => {
    if (!currentSession.value) return [];
    return messages.value.filter(
      m => m.talker === currentSession.value!.talker
    );
  });

  const hasMore = computed(() => {
    // 判断是否还有更多消息
    return messages.value.length > 0;
  });

  // Actions
  async function loadMessages(talker: string, time?: string) {
    loading.value = true;
    try {
      const data = await getChatlog({ talker, time });
      messages.value = data;
      return data;
    } catch (error) {
      console.error('Failed to load messages:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function loadMoreMessages(talker: string, offset: number) {
    const data = await getChatlog({ talker, offset, limit: 50 });
    messages.value = [...messages.value, ...data];
    return data;
  }

  async function loadSessions() {
    sessions.value = await getSessions();
  }

  function setCurrentSession(session: Session) {
    currentSession.value = session;
  }

  function clearMessages() {
    messages.value = [];
  }

  // Reset
  function $reset() {
    currentSession.value = null;
    messages.value = [];
    sessions.value = [];
    loading.value = false;
  }

  return {
    // State
    currentSession,
    messages,
    sessions,
    loading,
    // Getters
    currentMessages,
    hasMore,
    // Actions
    loadMessages,
    loadMoreMessages,
    loadSessions,
    setCurrentSession,
    clearMessages,
    $reset,
  };
});
```

---

## 4. 开发规范

### 4.1 代码风格

#### ESLint 配置

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/typescript/recommended',
    '@vue/prettier',
  ],
  parserOptions: {
    ecmaVersion: 2021,
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
  },
};
```

#### Prettier 配置

```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
};
```

### 4.2 Git 提交规范

#### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

- **feat**: 新功能
- **fix**: 修复 bug
- **docs**: 文档更新
- **style**: 代码格式调整（不影响功能）
- **refactor**: 重构
- **perf**: 性能优化
- **test**: 测试相关
- **chore**: 构建/工具链相关

#### 示例

```bash
feat(chat): 添加消息搜索功能

- 实现全局搜索
- 添加高级筛选
- 支持搜索结果高亮

Closes #123
```

### 4.3 注释规范

#### 文件注释

```typescript
/**
 * 消息列表组件
 * @description 显示聊天消息列表，支持虚拟滚动和多媒体展示
 * @author Your Name
 * @date 2024-01-01
 */
```

#### 函数注释

```typescript
/**
 * 格式化消息时间
 * @param time - ISO 8601 格式的时间字符串
 * @param format - 格式化模板，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的时间字符串
 * @example
 * formatMessageTime('2024-01-01T10:30:00+08:00')
 * // => '2024-01-01 10:30:00'
 */
export function formatMessageTime(
  time: string,
  format = 'YYYY-MM-DD HH:mm:ss'
): string {
  return dayjs(time).format(format);
}
```

---

## 5. 组件开发

### 5.1 组件模板

```vue
<!-- src/components/chat/MessageBubble/index.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { Message } from '@/types/message';

interface Props {
  message: Message;
  showAvatar?: boolean;
  showTime?: boolean;
}

interface Emits {
  (e: 'click', message: Message): void;
  (e: 'longpress', message: Message): void;
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true,
  showTime: true,
});

const emit = defineEmits<Emits>();

const bubbleClass = computed(() => ({
  'message-bubble': true,
  'message-bubble--self': props.message.isSelf,
  'message-bubble--other': !props.message.isSelf,
}));

function handleClick() {
  emit('click', props.message);
}

function handleLongpress() {
  emit('longpress', props.message);
}
</script>

<template>
  <div :class="bubbleClass" @click="handleClick" @longpress="handleLongpress">
    <img
      v-if="showAvatar"
      :src="message.avatar"
      class="message-bubble__avatar"
      alt="avatar"
    />
    <div class="message-bubble__content">
      <div class="message-bubble__text">{{ message.content }}</div>
      <div v-if="showTime" class="message-bubble__time">
        {{ formatTime(message.time) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-bubble {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
}

.message-bubble--self {
  flex-direction: row-reverse;
}

.message-bubble__avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
}

.message-bubble__content {
  max-width: 60%;
}

.message-bubble__text {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--message-bg);
  word-break: break-word;
}

.message-bubble--self .message-bubble__text {
  background-color: var(--message-self-bg);
}

.message-bubble__time {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
```

### 5.2 组合式函数

```typescript
// src/composables/useChat.ts
import { ref, computed } from 'vue';
import { useChatStore } from '@/stores/chat';
import type { Message } from '@/types/message';

export function useChat(talkerId: string) {
  const chatStore = useChatStore();
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const messages = computed(() => chatStore.currentMessages);

  async function loadMessages(time?: string) {
    loading.value = true;
    error.value = null;
    try {
      await chatStore.loadMessages(talkerId, time);
    } catch (e) {
      error.value = e as Error;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore(offset: number) {
    try {
      await chatStore.loadMoreMessages(talkerId, offset);
    } catch (e) {
      error.value = e as Error;
      throw e;
    }
  }

  function refresh() {
    return loadMessages();
  }

  return {
    messages,
    loading,
    error,
    loadMessages,
    loadMore,
    refresh,
  };
}
```

### 5.3 自定义指令

```typescript
// src/directives/lazy.ts
import type { Directive } from 'vue';

interface LazyElement extends HTMLElement {
  _lazyLoadHandler?: () => void;
}

export const lazy: Directive<LazyElement, string> = {
  mounted(el, binding) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = binding.value;
          observer.unobserve(img);
        }
      });
    });

    observer.observe(el);

    el._lazyLoadHandler = () => {
      observer.disconnect();
    };
  },
  unmounted(el) {
    if (el._lazyLoadHandler) {
      el._lazyLoadHandler();
    }
  },
};
```

---

## 6. API 集成

### 6.1 请求封装

```typescript
// src/utils/request.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types/api';

class Request {
  private instance: AxiosInstance;

  constructor(config: AxiosRequestConfig) {
    this.instance = axios.create(config);
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      config => {
        // 添加 token
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { data } = response;
        if (data.code === 0) {
          return data.data;
        }
        return Promise.reject(new Error(data.message || 'Request failed'));
      },
      error => {
        // 错误处理
        if (error.response) {
          switch (error.response.status) {
            case 401:
              // 未授权，跳转登录
              break;
            case 404:
              console.error('Resource not found');
              break;
            case 500:
              console.error('Server error');
              break;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config);
  }

  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.instance.post(url, data, config);
  }

  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.instance.put(url, data, config);
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }
}

export const request = new Request({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: import.meta.env.VITE_API_TIMEOUT || 30000,
});
```

### 6.2 API 定义

```typescript
// src/api/chatlog.ts
import { request } from '@/utils/request';
import type { Message, Session, ChatlogParams } from '@/types';

/**
 * 获取聊天记录
 */
export function getChatlog(params: ChatlogParams): Promise<Message[]> {
  return request.get('/api/v1/chatlog', { params });
}

/**
 * 获取会话列表
 */
export function getSessions(): Promise<Session[]> {
  return request.get('/api/v1/session');
}

/**
 * 搜索消息
 */
export function searchMessages(
  keyword: string,
  params?: Partial<ChatlogParams>
): Promise<Message[]> {
  return request.get('/api/v1/chatlog/search', {
    params: { keyword, ...params },
  });
}
```

---

## 7. 状态管理

### 7.1 Store 组织

```
stores/
├── index.ts      # Store 入口
├── chat.ts       # 聊天相关
├── contact.ts    # 联系人相关
├── user.ts       # 用户相关
└── app.ts        # 应用配置
```

### 7.2 持久化

```typescript
// src/stores/user.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore(
  'user',
  () => {
    const userInfo = ref<UserInfo | null>(null);
    const token = ref('');

    function setUser(info: UserInfo) {
      userInfo.value = info;
    }

    function setToken(t: string) {
      token.value = t;
    }

    function logout() {
      userInfo.value = null;
      token.value = '';
    }

    return {
      userInfo,
      token,
      setUser,
      setToken,
      logout,
    };
  },
  {
    // 持久化配置
    persist: {
      enabled: true,
      strategies: [
        {
          key: 'user',
          storage: localStorage,
        },
      ],
    },
  }
);
```

---

## 8. 测试指南

### 8.1 单元测试

```typescript
// tests/unit/components/MessageBubble.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageBubble from '@/components/chat/MessageBubble/index.vue';
import type { Message } from '@/types/message';

describe('MessageBubble', () => {
  const mockMessage: Message = {
    seq: 1,
    time: '2024-01-01T10:30:00+08:00',
    talker: 'wxid_123',
    talkerName: '张三',
    sender: 'wxid_123',
    senderName: '张三',
    isSelf: false,
    type: 1,
    subType: 0,
    content: '你好',
  };

  it('renders message content', () => {
    const wrapper = mount(MessageBubble, {
      props: { message: mockMessage },
    });
    expect(wrapper.text()).toContain('你好');
  });

  it('emits click event', async () => {
    const wrapper = mount(MessageBubble, {
      props: { message: mockMessage },
    });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('applies correct class for self message', () => {
    const selfMessage = { ...mockMessage, isSelf: true };
    const wrapper = mount(MessageBubble, {
      props: { message: selfMessage },
    });
    expect(wrapper.classes()).toContain('message-bubble--self');
  });
});
```

### 8.2 E2E 测试

```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Page', () => {
  test('loads and displays chat messages', async ({ page }) => {
    await page.goto('/chat');
    
    // 等待会话列表加载
    await page.waitForSelector('.session-list');
    
    // 点击第一个会话
    await page.click('.session-item:first-child');
    
    // 验证消息列表显示
    await page.waitForSelector('.message-list');
    const messages = await page.locator('.message-bubble').count();
    expect(messages).toBeGreaterThan(0);
  });

  test('search functionality', async ({ page }) => {
    await page.goto('/chat');
    
    // 打开搜索
    await page.click('[data-testid="search-button"]');
    
    // 输入搜索关键词
    await page.fill('[data-testid="search-input"]', '测试');
    
    // 等待搜索结果
    await page.waitForSelector('.search-results');
    
    // 验证结果不为空
    const results = await page.locator('.search-result-item').count();
    expect(results).toBeGreaterThan(0);
  });
});
```

---

## 9. 构建部署

### 9.1 构建配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]',
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          ui: ['element-plus'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5030',
        changeOrigin: true,
      },
    },
  },
});
```

### 9.2 Docker 部署

```dockerfile
# Dockerfile
FROM node:16-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://chatlog-api:5030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 10. 调试技巧

### 10.1 Vue DevTools

- 安装 Vue DevTools 浏览器扩展
- 查看组件树和状态
- 时间旅行调试
- 性能分析

### 10.2 日志输出

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private enabled = import.meta.env.VITE_ENABLE_DEBUG === 'true';

  log(level: LogLevel, message: string, ...args: any[]) {
    if (!this.enabled && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    console[level](prefix, message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger();
```

---

## 11. 性能优化

### 11.1 虚拟滚动

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useVirtualList } from '@vueuse/core';
import type { Message } from '@/types/message';

const props = defineProps<{
  messages: Message[];
}>();

const { list, containerProps, wrapperProps } = useVirtualList(
  computed(() => props.messages),
  {
    itemHeight: 80,
    overscan: 10,
  }
);
</script>

<template>
  <div v-bind="containerProps" class="message-list">
    <div v-bind="wrapperProps">
      <MessageBubble
        v-for="{ data, index } in list"
        :key="data.seq"
        :message="data"
      />
    </div>
  </div>
</template>
```

### 11.2 懒加载

```typescript
// 路由懒加载
const routes = [
  {
    path: '/chat',
    component: () => import('@/views/Chat/index.vue'),
  },
  {
    path: '/contact',
    component: () => import('@/views/Contact/index.vue'),
  },
];

// 组件懒加载
const MediaViewer = defineAsyncComponent(() =>
  import('@/components/media/MediaViewer.vue')
);
```

---

## 12. 贡献指南

### 12.1 贡献流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 12.2 代码审查

- 确保所有测试通过
- 代码符合 ESLint 规范
- 添加必要的注释
- 更新相关文档

### 12.3 发布流程

```bash
# 更新版本号
npm version patch|minor|major

# 生成 changelog
npm run changelog

# 推送标签
git push --tags

# 发布
npm publish
```

---

## 附录

### A. 常用工具

- **Vite**: 构建工具
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Vitest**: 单元测试
- **Playwright**: E2E 测试
- **Vue DevTools**: 调试工具

### B. 学习资源

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vite 文档](https://vitejs.dev/)
- [Pinia 文档](https://pinia.vuejs.org/)

### C. 相关链接

- [项目仓库](https://github.com/xlight/chatlog-session)
- [Issue 追踪](https://github.com/xlight/chatlog-session/issues)
- [讨论区](https://github.com/xlight/chatlog-session/discussions)

---

**祝您开发愉快！** 🚀
