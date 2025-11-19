# Onboarding 组件

初次使用引导组件，用于帮助新用户快速配置和了解应用。

## 目录结构

```
src/views/Onboarding/
├── index.vue                  # 主容器组件
├── components/
│   ├── ProgressIndicator.vue # 进度指示器
│   ├── WelcomeStep.vue       # Step 1: 欢迎页面
│   ├── ApiConfigStep.vue     # Step 2: API 配置
│   ├── FeatureTourStep.vue   # Step 3: 功能介绍
│   └── CompletionStep.vue    # Step 4: 完成页面
├── composables/
│   └── useOnboarding.ts      # 引导逻辑 composable
└── README.md                  # 本文档
```

## 功能特性

### 1. 四步引导流程

- **Step 1: 欢迎页面** - 介绍应用核心功能
- **Step 2: API 配置** - 配置 API 服务器连接
- **Step 3: 功能介绍** - 快速了解主要功能
- **Step 4: 完成页面** - 引导完成，开始使用

### 2. 核心功能

- ✅ 步骤进度指示
- ✅ API 连接测试
- ✅ URL 格式验证
- ✅ 错误处理和提示
- ✅ 跳过引导选项
- ✅ 配置持久化
- ✅ 响应式设计

## 使用方式

### 触发条件

引导会在以下情况自动触发：

1. 首次安装启动应用
2. 未配置 API 地址
3. 未完成引导标记

检测逻辑：
```typescript
const onboardingCompleted = localStorage.getItem('onboardingCompleted')
const apiBaseUrl = localStorage.getItem('apiBaseUrl')

if (!onboardingCompleted && !apiBaseUrl) {
  // 显示引导
}
```

### 路由配置

引导页面路由：`/onboarding`

路由守卫会自动处理：
- 未完成引导时，自动重定向到 `/onboarding`
- 已完成引导时，访问 `/onboarding` 会重定向到 `/`

### 手动触发

在设置页面提供"重新运行新手引导"按钮：

```typescript
const restartOnboarding = () => {
  localStorage.removeItem('onboardingCompleted')
  router.push('/onboarding')
}
```

## 组件说明

### ProgressIndicator.vue

进度指示器组件，显示当前步骤和整体进度。

**Props:**
- `currentStep: number` - 当前步骤 (1-4)
- `totalSteps: number` - 总步骤数 (默认 4)

**特性:**
- 步骤圆圈显示
- 已完成步骤显示 ✓
- 进度线动画
- 响应式布局

### WelcomeStep.vue

欢迎页面组件。

**Events:**
- `next` - 进入下一步

**特性:**
- 应用 Logo 和介绍
- 核心功能卡片展示
- 悬停动画效果

### ApiConfigStep.vue

API 配置组件。

**Props:**
- `modelValue: string` - API URL (双向绑定)
- `testStatus: ApiTestStatus` - 测试状态
- `testError: string | null` - 测试错误信息

**Events:**
- `update:modelValue` - 更新 API URL
- `prev` - 返回上一步
- `next` - 进入下一步
- `test` - 测试连接

**特性:**
- URL 格式验证
- 实时连接测试
- 详细错误提示
- 配置示例快捷填充
- 帮助文档折叠面板

### FeatureTourStep.vue

功能介绍组件（简化版）。

**Events:**
- `prev` - 返回上一步
- `next` - 进入下一步
- `skip` - 跳过介绍

**特性:**
- 4 个功能卡片轮播
- 导航指示器
- 平滑切换动画

### CompletionStep.vue

完成页面组件。

**Events:**
- `prev` - 返回上一步
- `complete` - 完成引导

**特性:**
- 庆祝动画
- 使用提示
- 快速开始指南

## Store 管理

### useOnboardingStore

引导流程状态管理。

**State:**
```typescript
{
  currentStep: number          // 当前步骤
  apiBaseUrl: string           // API 地址
  apiTestStatus: ApiTestStatus // 测试状态
  apiTestError: string | null  // 测试错误
  completed: boolean           // 是否完成
}
```

**Actions:**
- `nextStep()` - 下一步
- `prevStep()` - 上一步
- `goToStep(step)` - 跳转到指定步骤
- `setApiBaseUrl(url)` - 设置 API URL
- `testApiConnection()` - 测试 API 连接
- `resetApiTest()` - 重置测试状态
- `completeOnboarding()` - 完成引导
- `skipOnboarding()` - 跳过引导
- `resetOnboarding()` - 重置引导
- `loadExistingConfig()` - 加载已有配置
- `shouldShowOnboarding()` - 检查是否需要显示引导

## Composable

### useOnboarding

封装引导逻辑的 composable。

**返回值:**
```typescript
{
  store,              // Store 实例
  currentStepInfo,    // 当前步骤信息
  progress,           // 进度百分比
  isFirstStep,        // 是否第一步
  isLastStep,         // 是否最后一步
  handleNext,         // 下一步处理
  handlePrev,         // 上一步处理
  handleSkip,         // 跳过处理
  handleComplete,     // 完成处理
  handleTestConnection, // 测试连接
  validateUrl,        // URL 验证
  normalizeUrl        // URL 规范化
}
```

## API 连接测试

### 测试流程

1. 规范化 URL（去除尾部斜杠）
2. 构建测试请求：`${baseUrl}/api/v1/session?format=json`
3. 发起 GET 请求（10 秒超时）
4. 验证 HTTP 200 状态码
5. 验证 JSON 格式

### 错误处理

- **超时错误**: "连接超时，请检查服务器是否运行"
- **网络错误**: "网络错误，请检查 URL 是否正确"
- **HTTP 错误**: "HTTP {status}: {statusText}"
- **JSON 错误**: "响应格式错误：无法解析 JSON"

## 持久化数据

### LocalStorage Keys

- `onboardingCompleted` - 引导完成标记 (`'true'` | `undefined`)
- `apiBaseUrl` - API 服务器地址
- `onboardingSkippedAt` - 跳过时间戳

## 样式设计

### 主题

- 背景：渐变紫色 (#667eea → #764ba2)
- 卡片：白色，圆角 24px
- 主色调：#409eff (Element Plus primary)
- 成功色：#67c23a
- 错误色：#f56c6c

### 动画

- 步骤切换：淡入淡出 + 位移
- 进度线：宽度过渡 0.3s
- 按钮悬停：颜色过渡
- 庆祝图标：旋转缩放动画

### 响应式

- 桌面：最大宽度 900px
- 移动端：全宽，自适应布局
- 断点：768px

## 开发指南

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问引导页面
# http://localhost:5173/onboarding
```

### 测试引导流程

1. 清除本地存储：
```javascript
localStorage.removeItem('onboardingCompleted')
localStorage.removeItem('apiBaseUrl')
```

2. 刷新页面，自动进入引导

### 调试技巧

```javascript
// 查看当前状态
const store = useOnboardingStore()
console.log(store.$state)

// 强制触发引导
localStorage.clear()
location.reload()

// 跳到指定步骤
store.goToStep(3)
```

## 常见问题

### Q: 如何跳过引导？

A: 点击右上角"跳过引导"链接，或在任意步骤按 Esc 键（待实现）。

### Q: API 测试总是失败？

A: 检查：
1. API 服务器是否运行
2. URL 格式是否正确（http:// 或 https://）
3. 端点 `/api/v1/session` 是否可访问
4. 网络连接是否正常
5. CORS 配置是否正确

### Q: 如何自定义引导步骤？

A: 修改 `useOnboardingStore` 中的 `totalSteps`，并在 `index.vue` 中添加对应的 Step 组件。

### Q: 如何修改主题颜色？

A: 修改各组件的 CSS 变量或直接修改 SCSS 样式。

## 未来改进

### Phase 2 功能

- [ ] 使用 driver.js 实现真实界面高亮
- [ ] 添加键盘导航支持（方向键切换步骤）
- [ ] 添加引导进度保存（中途离开可恢复）
- [ ] 添加多语言支持
- [ ] 添加引导视频教程

### Phase 3 优化

- [ ] 添加埋点统计
- [ ] 优化动画性能
- [ ] 添加无障碍访问改进
- [ ] 添加单元测试
- [ ] 添加 E2E 测试

## 相关文档

- [产品设计文档](../../../docs/features/onboarding-guide.md)
- [API 设置文档](../../../docs/features/api-settings.md)
- [路由配置](../../router/index.ts)
- [Store 文档](../../stores/onboarding.ts)

## 维护者

- 产品团队
- 前端团队

## 更新日志

### v1.0.0 (2024-01-XX)

- ✅ 实现基础引导流程
- ✅ 实现 API 配置和测试
- ✅ 实现功能介绍
- ✅ 实现路由守卫
- ✅ 添加响应式支持

---

**最后更新**: 2024-01-XX
**状态**: ✅ 已完成