# Chatlog Session v1.0 开发快速开始指南

## 📋 目录

- [环境准备](#环境准备)
- [安装依赖](#安装依赖)
- [启动开发](#启动开发)
- [项目结构](#项目结构)
- [开发流程](#开发流程)
- [常见问题](#常见问题)

---

## 环境准备

### 1. 安装 Node.js

确保已安装 Node.js >= 16.x

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v
```

### 2. 启动 Chatlog 后端服务

在开始前端开发前，需要先启动 Chatlog API 服务：

```bash
# 启动 Chatlog HTTP 服务（默认端口 5030）
chatlog server
```

确保服务运行在 `http://127.0.0.1:5030`

---

## 安装依赖

```bash
# 进入项目目录
cd chatlog-session

# 安装依赖
npm install

# 或使用 yarn
yarn install
```

---

## 启动开发

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 其他命令

```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 代码格式化
npm run format

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

---

## 项目结构

```
chatlog-session/
├── src/
│   ├── api/              # API 接口
│   ├── assets/           # 静态资源
│   ├── components/       # 组件
│   ├── composables/      # 组合式函数
│   ├── router/           # 路由
│   ├── stores/           # 状态管理
│   ├── types/            # 类型定义
│   ├── utils/            # 工具函数
│   ├── views/            # 页面
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── docs/                 # 文档
├── index.html            # HTML 模板
├── package.json          # 项目配置
├── vite.config.ts        # Vite 配置
└── tsconfig.json         # TypeScript 配置
```

---

## 开发流程

### v1.0 MVP 开发任务清单

#### 阶段 1：基础架构 ✅

- [x] 项目初始化
- [x] 配置文件设置
- [x] 类型定义
- [x] 工具函数封装

#### 阶段 2：核心功能（进行中）

- [ ] API 接口封装
  - [ ] 聊天记录 API
  - [ ] 会话列表 API
  - [ ] 联系人 API
  - [ ] 搜索 API

- [ ] 状态管理
  - [ ] Chat Store
  - [ ] Session Store
  - [ ] Contact Store
  - [ ] App Store

- [ ] 路由配置
  - [ ] 主页面路由
  - [ ] 聊天页面路由
  - [ ] 联系人页面路由
  - [ ] 设置页面路由

#### 阶段 3：页面开发

- [ ] 主布局组件
  - [ ] 侧边栏
  - [ ] 会话列表
  - [ ] 消息显示区

- [ ] 会话列表
  - [ ] 会话项组件
  - [ ] 搜索功能
  - [ ] 加载更多

- [ ] 消息浏览
  - [ ] 消息气泡组件
  - [ ] 文本消息
  - [ ] 时间显示
  - [ ] 虚拟滚动（优化）

- [ ] 联系人管理
  - [ ] 联系人列表
  - [ ] 联系人详情
  - [ ] 搜索功能

- [ ] 基础搜索
  - [ ] 搜索输入框
  - [ ] 搜索结果显示
  - [ ] 结果高亮

#### 阶段 4：测试优化

- [ ] 单元测试
- [ ] E2E 测试
- [ ] 性能优化
- [ ] Bug 修复

#### 阶段 5：文档完善

- [ ] 用户文档
- [ ] 开发文档
- [ ] API 文档
- [ ] 部署文档

---

## 开发规范

### 1. 代码风格

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 组件使用 `<script setup>` 语法

### 2. 命名规范

- 组件：PascalCase（如 `MessageBubble.vue`）
- 文件：kebab-case（如 `use-chat.ts`）
- 常量：UPPER_SNAKE_CASE（如 `API_BASE_URL`）
- 变量/函数：camelCase（如 `getMessage`）

### 3. Git 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型（type）：
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- perf: 性能优化
- test: 测试相关
- chore: 构建/工具链相关

示例：
```bash
git commit -m "feat(chat): 添加消息列表组件"
git commit -m "fix(api): 修复聊天记录加载问题"
```

---

## 常见问题

### Q1: 无法连接到 Chatlog API

**解决方案**：
1. 确保 Chatlog 服务正在运行：`chatlog server`
2. 检查 `.env.development` 中的 API 地址配置
3. 查看浏览器控制台的错误信息

### Q2: 依赖安装失败

**解决方案**：
1. 清除缓存：`npm cache clean --force`
2. 删除 `node_modules` 和 `package-lock.json`
3. 重新安装：`npm install`

### Q3: 类型错误

**解决方案**：
1. 运行类型检查：`npm run type-check`
2. 确保所有类型定义正确
3. 重启 VSCode TypeScript 服务

### Q4: ESLint 错误

**解决方案**：
1. 运行自动修复：`npm run lint`
2. 查看 `.eslintrc.cjs` 配置
3. 根据规则调整代码

### Q5: 热更新不工作

**解决方案**：
1. 重启开发服务器
2. 清除浏览器缓存
3. 检查 Vite 配置

---

## 开发工具推荐

### VSCode 扩展

- Vue Language Features (Volar)
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- i18n Ally

### 浏览器扩展

- Vue.js devtools
- React Developer Tools（用于调试）

---

## 下一步

1. 完成 API 接口封装
2. 实现状态管理
3. 开发主布局组件
4. 实现会话列表
5. 开发消息浏览功能

详细的开发任务和时间安排请参考 [产品设计文档](./docs/PRODUCT_DESIGN.md)。

---

## 获取帮助

- 📖 [用户使用手册](./docs/USER_GUIDE.md)
- 💻 [开发者指南](./docs/DEVELOPER_GUIDE.md)
- 🎨 [产品设计文档](./docs/PRODUCT_DESIGN.md)
- 🔌 [API 参考文档](./docs/API_REFERENCE.md)
- 🐛 [提交 Issue](https://github.com/xlight/chatlog-session/issues)
- 💬 [讨论区](https://github.com/xlight/chatlog-session/discussions)

---

**开始愉快的开发之旅吧！** 🚀
