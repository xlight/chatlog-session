# Changelog

## [0.27.0] - 2026-05-11

### Added

#### 发送文件和图片

- 新增发送文件和图片功能，支持粘贴和拖拽上传。
- `SendBox` 组件扩展文件选择、粘贴监听与拖拽区域逻辑。
- `sendmsg` API 新增文件/图片上传接口。

#### 重新检测快捷按钮

- 为状态警告区域添加重新检测快捷按钮，方便用户快速重试。

### Fixed

- 修复消息气泡内容区域 `flex` 属性，防止内容溢出容器。
- 修复 `timeRange` 计算使用过期 `lastTime` 的问题，改为使用当前时间，确保时间范围计算准确。

### Technical Details

- **修改文件**:
  - `src/api/sendmsg.ts` - 新增文件/图片上传 API
  - `src/components/chat/SendBox.vue` - 粘贴/拖拽上传 + 重新检测按钮
  - `src/components/chat/MessageBubble.vue` - flex 溢出修复
  - `src/stores/chatMessages.ts` - timeRange 计算修复
  - `src/views/Settings/components/SendmsgSettings.vue` - 重新检测按钮接入

### User Experience

- 用户可以通过粘贴或拖拽直接发送图片和文件，操作更便捷。
- 消息气泡不再出现内容溢出问题。
- 聊天时间范围计算更准确，不再因缓存时间导致范围偏移。
- 发送失败时可通过快捷按钮快速重新检测。

### Notes

- 本版本基于 `v0.26.0` 之后的提交整理，核心变更为文件/图片发送与 UI 修复。
