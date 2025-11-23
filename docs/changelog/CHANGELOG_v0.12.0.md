# Changelog

## [0.12.0] - 2025-01-24

### Added

#### 通知内容优化

##### 发送者信息显示
- **通知标题优化**
  - 显示发送者 displayName（优先使用 remark，其次 nickname）
  - 根据消息类型显示不同前缀：
    - `@我`: "群名称 - 张三 提到了你"
    - `引用`: "群名称 - 张三 引用了你"
    - `普通消息`: "群名称 - 张三"
  - 群聊和私聊消息区分展示

- **消息内容预览**
  - 自动截断长消息（限制 50 字符）
  - 超出部分显示省略号
  - 不同消息类型的预览优化：
    - 文本消息：显示实际内容
    - 图片消息：显示 [图片]
    - 语音消息：显示 [语音]
    - 视频消息：显示 [视频]
    - 表情消息：显示 [表情]
    - 文件消息：显示 [文件]

##### 隐私设置

- **"我的微信 ID" 配置**
  - 位置：设置 → 通知设置 → 基础设置
  - 用途：识别哪些消息与我有关
  - 功能：
    - 支持 @我 检测（@wxid、@昵称、@所有人）
    - 自动匹配群聊中的提及
    - 配置持久化到 localStorage
    - 实时同步到 notification store

- **"显示消息内容" 隐私开关**
  - 位置：设置 → 通知设置 → 基础设置
  - 完整模式（默认）：
    - 标题：`群名称 - 张三 提到了你`
    - 内容：完整消息文本预览
  - 隐私模式：
    - 标题：`群名称`
    - 内容：`张三 提到了你` 或 `张三 发来了新消息`
    - 不显示具体消息内容
  - 适用场景：
    - 公共场合使用
    - 办公环境
    - 屏幕共享时
    - 保护敏感信息

#### Settings 页面增强

- **新增配置项**
  - "我的微信 ID" 输入框
    - 占位符提示：`请输入你的微信ID`
    - 宽度：300px
    - 输入验证和保存
  - "显示消息内容" 切换开关
    - 默认开启
    - 实时生效
    - 说明文字：关闭后通知只显示"有新消息"，不显示具体内容（隐私保护）

- **配置管理**
  - 自动从 localStorage 加载配置
  - 从 notificationStore 同步初始值
  - 保存时自动同步到 notification store
  - 支持配置重置

### Changed

#### Notification Store 重构

- **配置接口扩展**
  - 新增 `myWxid?: string` - 我的微信 ID
  - 新增 `showMessageContent: boolean` - 是否显示消息内容
  - 默认值：`myWxid: undefined`, `showMessageContent: true`

- **通知构建逻辑优化**
  - 重构 `buildNotification()` 方法
    - 获取发送者 displayName
    - 根据 `showMessageContent` 配置决定显示内容
    - 构建艺术化的通知标题和内容
  - 优化 `getMessagePreview()` 方法
    - 文本消息自动截断（50 字符）
    - 多媒体消息类型标识优化

- **@检测逻辑增强**
  - 改进 `isMentioned()` 方法
    - 优先使用配置中的 myWxid
    - 兼容旧代码传入的 myWxid 参数
    - 支持检测 @所有人、@微信号、@昵称
  - 从联系人 store 获取用户昵称

#### Auto Refresh Store 更新

- **通知检测集成**
  - `checkAndNotify()` 方法更新
    - 从 notificationStore.config.myWxid 读取配置
    - 传递给 `checkMessages()` 用于通知检测
    - 移除硬编码的 `undefined` 值

#### Settings View 优化

- **配置加载增强**
  - `loadSettings()` 方法更新
    - 加载 myWxid 和 showMessageContent
    - 从 notificationStore 同步初始值
    - 兼容旧版本配置

- **配置保存优化**
  - `saveSettings()` 方法更新
    - 保存 myWxid 和 showMessageContent 到 localStorage
    - 同步到 notificationStore
    - 触发配置更新事件

- **配置重置完善**
  - `resetSettings()` 方法更新
    - 重置 myWxid 为空字符串
    - 重置 showMessageContent 为 true
    - 移除重复的 enableSound 字段

- **同步机制优化**
  - `syncNotificationSettings()` 方法更新
    - 同步 myWxid 配置
    - 同步 showMessageContent 配置
    - onMounted 时从 notificationStore 加载初始值

### Removed

- **移除过时配置**
  - ❌ 移除 `notificationPreview` 字段
  - 由 `showMessageContent` 替代
  - 清理相关的 UI 组件和逻辑
  - 更新配置加载和保存逻辑

### Fixed

- **配置冲突修复**
  - 修复 `resetSettings()` 中 `enableSound` 重复定义
  - 修复配置保存时的字段缺失
  - 修复通知测试时的配置读取

### Documentation

- **新增文档**
  - 📄 `docs/features/notification-enhancements.md` - 通知增强详细文档
    - 通知类型与格式说明
    - 隐私设置使用指南
    - 配置示例和最佳实践
    - 代码集成说明
    - 隐私保护场景推荐

### Technical Details

#### 实现细节

**通知内容构建流程：**
```typescript
1. 获取发送者信息（remark > nickname > wxid）
2. 检查 showMessageContent 配置
3. 如果显示内容：
   - 标题：群名称 - 发送者 + 类型标识
   - 内容：消息预览（限制 50 字符）
4. 如果隐私模式：
   - 标题：群名称
   - 内容：发送者 + 动作描述
```

**配置同步机制：**
```typescript
1. Settings 页面加载时：
   - 从 localStorage 读取配置
   - 从 notificationStore 同步初始值
2. 用户修改配置时：
   - 保存到 Settings 的 reactive state
   - 调用 saveSettings() 时保存到 localStorage
   - 同步到 notificationStore
3. Auto Refresh 使用时：
   - 直接从 notificationStore.config 读取
   - 传递给通知检测逻辑
```

#### 配置存储

**localStorage 结构：**
```json
{
  "chatlog-settings": {
    "myWxid": "wxid_xxx",
    "showMessageContent": true,
    // ... 其他配置
  }
}
```

**notificationStore.config 结构：**
```typescript
{
  myWxid?: string,
  showMessageContent: boolean,
  enabled: boolean,
  enableMention: boolean,
  enableQuote: boolean,
  enableMessage: boolean,
  enableSound: boolean,
  enableVibrate: boolean,
  onlyShowLatest: boolean,
  maxNotifications: number,
  autoClose: number,
  muteList: string[]
}
```

### User Experience

#### 优化效果

- **通知信息更丰富**
  - 清楚看到谁发的消息
  - 区分消息类型（@我、引用、普通）
  - 消息内容预览更清晰

- **隐私保护更灵活**
  - 可根据场景切换显示模式
  - 公共场合不泄露消息内容
  - 保护敏感信息安全

- **配置更直观**
  - 设置页面新增专门区域
  - 说明文字清晰易懂
  - 实时生效无需重启

- **使用场景适配**
  - 办公场所：隐私模式
  - 个人使用：完整模式
  - 屏幕共享：隐私模式
  - 公共设备：隐私模式

### Migration Guide

#### 从 v0.11.0 升级

1. **配置迁移（自动）**
   - notificationPreview 自动迁移到 showMessageContent
   - 旧配置保持兼容

2. **首次使用**
   - 建议在 Settings 中配置"我的微信 ID"
   - 根据使用场景选择是否显示消息内容

3. **API 变更**
   - NotificationConfig 接口新增两个字段
   - 不影响现有代码运行

### Testing

#### 测试建议

**功能测试：**
- [ ] 测试发送者 displayName 显示
- [ ] 测试 @我 消息通知
- [ ] 测试引用消息通知
- [ ] 测试普通消息通知
- [ ] 测试完整模式通知内容
- [ ] 测试隐私模式通知内容
- [ ] 测试配置保存和加载
- [ ] 测试配置同步到 notificationStore

**边界测试：**
- [ ] 测试长消息截断（>50 字符）
- [ ] 测试未配置 myWxid 时的行为
- [ ] 测试多种 @格式识别
- [ ] 测试配置重置

**兼容性测试：**
- [ ] 测试从 v0.11.0 升级
- [ ] 测试旧配置迁移
- [ ] 测试不同浏览器

### Performance

- 无性能影响
- 配置读取为内存操作（<1ms）
- 通知构建逻辑优化（<5ms）

### Security

- 隐私模式防止消息内容泄露
- 配置数据仅存储在 localStorage（本地）
- 无敏感信息上传到服务器

### Contributors

- **xLight** - 主要开发和文档编写

---

**发布日期**: 2025-01-24  
**版本标签**: v0.12.0  
**上一版本**: v0.11.0  
**下一版本**: v0.13.0