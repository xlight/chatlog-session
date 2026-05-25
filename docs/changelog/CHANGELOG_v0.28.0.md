# Changelog

## [0.28.0] - 2026-05-21

### Added

#### 自定义发送快捷键

- 支持自定义发送快捷键，用户可在设置中选择 Enter 或 Ctrl+Enter 发送消息。

#### 视频预览增强

- `ImageViewer` 新增视频预览模式，支持在图片预览器中直接播放视频消息。
- `VideoMessage` 组件接入视频预览列表，消息气泡中的视频可加入预览队列逐个播放。
- 消息类型配置新增视频预览入口。

#### 聊天导出剪贴板复制

- 聊天导出功能新增剪贴板复制支持，用户可直接复制导出文本到剪贴板。
- `message-format.ts` 新增纯文本格式化逻辑，适配剪贴板复制场景。

### Changed

#### 发送消息组件重构

- 重构 `SendBox` 组件，支持多消息发送状态追踪。
- 新增表情选择器，发送消息时可插入表情。
- 组件逻辑拆分更清晰，状态管理更合理。

### Technical Details

- **修改文件**:
  - `src/components/chat/SendBox.vue` - 重构：多消息状态 + 表情选择器 + 自定义快捷键
  - `src/components/chat/MessageBubble.vue` - 视频预览列表接入
  - `src/components/chat/composables/useMessageUrl.ts` - 视频预览 URL 支持
  - `src/components/chat/message-types/VideoMessage.vue` - 视频预览交互重构
  - `src/components/chat/message-types/config.ts` - 视频预览配置
  - `src/components/common/ImageViewer.vue` - 视频预览模式
  - `src/components/chat/ChatExportDialog.vue` - 剪贴板复制 UI
  - `src/stores/chatExport.ts` - 剪贴板复制逻辑
  - `src/utils/message-format.ts` - 纯文本格式化
  - `src/stores/settings.ts` - 自定义快捷键设置
  - `src/views/Settings/components/SendmsgSettings.vue` - 快捷键配置 UI
  - `docs/README.md` - 重写为生态概览文档

### User Experience

- 用户可自定义发送快捷键，适配不同输入习惯。
- 视频消息可在预览器中直接播放，无需下载。
- 聊天导出支持一键复制到剪贴板，分享更便捷。
- 发送消息时可使用表情选择器插入表情。

### Notes

- 本版本基于 `v0.27.0` 之后的提交整理，核心变更为视频预览、剪贴板导出、自定义快捷键与发送组件重构。
- 依赖升级：vue 3.5.34、prettier 3.8.3、sass 1.99.0、dompurify、@vueuse/core 14.3.0。
- 新增 CodeQL 安全扫描工作流。
