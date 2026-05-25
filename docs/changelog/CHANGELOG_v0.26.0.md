# Changelog

## [0.26.0] - 2026-05-08

### Added

#### 发送消息功能集成

- 集成 `wechat-sendmsg` 发送消息能力，新增 `SendBox` 组件与 `sendmsg` API 模块。
- 新增发送消息设置面板 `SendmsgSettings`，支持在设置页配置发送相关参数。
- 左侧导航栏图标替换为 Logo 图片，提升品牌识别度。

### Changed

#### 发送消息 API 适配

- 更新 `sendmsg` API 类型定义，适配后端新响应格式。
- `SendBox` 组件适配新 API 响应结构。

#### 布局优化

- Chat 视图中为消息列表添加包裹容器，改善消息区域布局控制。

### Fixed

- 发送成功后正确重置发送状态，避免残留状态影响后续操作。
- 清理未使用的导入和变量，修复类型定义问题。

### Technical Details

- **新增文件**:
  - `src/api/sendmsg.ts` - 发送消息 API 模块
  - `src/components/chat/SendBox.vue` - 发送消息组件
  - `src/views/Settings/components/SendmsgSettings.vue` - 发送消息设置面板
- **修改文件**:
  - `src/api/index.ts` - 导出 sendmsg API
  - `src/stores/session.ts` / `src/stores/settings.ts` - 接入发送消息状态
  - `src/views/Chat/index.vue` - 集成 SendBox 组件
  - `src/views/index.vue` - 导航栏 Logo 替换
  - `tsconfig.json` - 注释未使用 baseUrl
  - `.gitignore` - 忽略 Sisyphus 外部文档目录

### User Experience

- 用户可以在聊天界面直接发送文本消息。
- 发送消息相关参数可在设置页面配置。
- 左侧导航栏显示项目 Logo，视觉更统一。

### Notes

- 本版本基于 `v0.25.0` 之后的提交整理，核心变更为发送消息功能集成与构建工具链升级。
- TypeScript 升级至 6.0，ESLint 和 Vite 升级到主版本，element-plus 升级至 2.13.7。
