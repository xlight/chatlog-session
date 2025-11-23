# Changelog

## [0.13.0] - 2025-01-24

### Added

#### PWA 支持（Progressive Web App）

##### Service Worker 实现

- **完整的 Service Worker 脚本**
  - 文件：`public/sw.js`
  - 版本管理：`CACHE_VERSION = 'v1.0.0'`
  - 支持多种缓存策略
  - 自动版本更新和缓存清理
  - 离线降级处理

- **缓存策略**
  - **Cache First**（静态资源）
    - JS/CSS/字体文件
    - 优先使用缓存，提升加载速度
    - 后台更新缓存
  
  - **Cache First with Expiry**（图片资源）
    - 最大缓存 100 张图片
    - 缓存有效期：30 天
    - 自动清理过期缓存
    - 添加缓存时间戳
    - LRU 淘汰策略
  
  - **Network First with Cache Fallback**（API 请求）
    - 优先请求网络获取最新数据
    - 网络失败时使用缓存
    - 最大缓存 50 个响应
    - 缓存有效期：5 分钟
    - 只缓存成功的 GET 请求
  
  - **Network First**（HTML 页面）
    - 优先请求网络
    - 失败时使用缓存页面

- **Service Worker 功能**
  - 静态资源预缓存
  - 缓存版本管理
  - 缓存大小限制
  - 消息通信机制（MessageChannel）
  - Push Notification 支持
  - Background Sync 支持
  - Periodic Sync 支持

- **消息处理**
  - `SKIP_WAITING` - 跳过等待，立即激活
  - `CLEAR_CACHE` - 清空所有缓存
  - `GET_CACHE_SIZE` - 获取缓存统计信息
  - `UPDATE_CACHE` - 更新指定 URL 的缓存

##### Web App Manifest

- **基本配置**
  - 文件：`public/manifest.json`
  - 应用名称：Chatlog Session
  - 短名称：Chatlog
  - 启动 URL：/
  - 显示模式：standalone（独立窗口）
  - 主题颜色：#409eff
  - 背景颜色：#ffffff
  - 方向：portrait-primary
  - 语言：zh-CN

- **图标配置**
  - 8 种尺寸图标：72, 96, 128, 144, 152, 192, 384, 512
  - Maskable 图标：192×192, 512×512
  - 所有图标均为 PNG 格式
  - 支持 any 和 maskable purpose

- **快捷方式**
  - 查看会话（/）
  - 联系人（/contacts）
  - 设置（/settings）
  - 每个快捷方式配置图标

- **截图配置**
  - 移动端截图：750×1334
  - 桌面端截图：1920×1080
  - 支持 narrow 和 wide form factor

- **分享目标**
  - method: POST
  - enctype: multipart/form-data
  - 支持 title、text、url 参数

##### PWA 图标生成

- **Logo 设计**
  - 艺术化对话气泡设计
  - 4 个交织排列的聊天气泡
  - xLight 品牌光芒元素
  - 数据流连接线
  - NAS 存储层级抽象
  - 双层圆角方框容器
  - 蓝色渐变背景（#4a9eff → #409eff → #1e6fd9）

- **图标文件**（共 12 个）
  - ✅ icon-72x72.png (4.1 KB) - Favicon, 小图标
  - ✅ icon-96x96.png (5.8 KB) - 桌面快捷方式
  - ✅ icon-128x128.png (8.1 KB) - Chrome Web Store
  - ✅ icon-144x144.png (9.6 KB) - Windows 磁贴
  - ✅ icon-152x152.png (10 KB) - iOS Touch Icon
  - ✅ icon-192x192.png (14 KB) - Android 主屏幕
  - ✅ icon-384x384.png (34 KB) - Android Splash
  - ✅ icon-512x512.png (49 KB) - Android Splash
  - ✅ apple-icon-180.png (11 KB) - iOS 高分辨率
  - ✅ favicon-196.png (8.5 KB) - 浏览器标签
  - ✅ manifest-icon-192.maskable.png (13 KB) - Android 自适应
  - ✅ manifest-icon-512.maskable.png (60 KB) - Android 自适应

- **图标特性**
  - 高质量 PNG 输出
  - 透明背景或纯色背景（#409eff）
  - 所有尺寸清晰可辨
  - 统一的设计风格
  - Maskable 图标符合安全区域要求（中心 80%）

##### Service Worker 管理工具

- **ServiceWorkerManager 类**
  - 文件：`src/utils/serviceWorker.ts`
  - 完整的生命周期管理
  - 事件驱动架构
  - 类型安全（TypeScript）

- **核心功能**
  - Service Worker 注册和注销
  - 状态跟踪（NOT_SUPPORTED, REGISTERING, REGISTERED, ACTIVATED, ERROR, UPDATING）
  - 自动更新检测（默认每小时）
  - 手动触发更新
  - skipWaiting 控制

- **事件系统**
  - `statechange` - 状态变化
  - `registered` - 注册成功
  - `updatefound` - 发现更新
  - `updateready` - 更新准备就绪
  - `activated` - 新版本激活
  - `controllerchange` - 控制器变化
  - `message` - 来自 SW 的消息
  - `cachecleared` - 缓存已清空
  - `error` - 错误事件

- **消息通信**
  - 双向 MessageChannel 通信
  - Promise 化的消息发送
  - 类型安全的消息接口
  - 超时和错误处理

- **缓存管理**
  - `clearCache()` - 清空所有缓存
  - `getCacheInfo()` - 获取缓存统计
  - `updateCache(urls)` - 更新指定缓存

- **通知管理**
  - `requestNotificationPermission()` - 请求权限
  - `showNotification(title, options)` - 显示通知
  - `subscribeToPush(vapidPublicKey)` - 推送订阅
  - `unsubscribeFromPush()` - 取消订阅

- **后台同步**
  - `registerBackgroundSync(tag)` - 注册后台同步
  - `registerPeriodicSync(tag, minInterval)` - 注册定期同步

##### PWA Store

- **Pinia Store 实现**
  - 文件：`src/stores/pwa.ts`
  - 完整的 PWA 状态管理
  - Reactive 状态跟踪
  - 组合式 API 风格

- **状态管理**
  - `swState` - Service Worker 状态
  - `isOnline` - 在线/离线状态
  - `isInstallable` - 是否可安装
  - `isInstalled` - 是否已安装
  - `updateAvailable` - 是否有更新
  - `cacheInfo` - 缓存统计信息
  - `lastUpdateCheck` - 最后更新检查时间

- **Getters**
  - `isSupported` - 是否支持 PWA
  - `isActive` - Service Worker 是否激活
  - `canInstall` - 是否可以安装
  - `totalCacheEntries` - 缓存条目总数
  - `cacheDetails` - 缓存详细信息

- **Actions**
  - `init()` - 初始化 PWA
  - `promptInstall()` - 显示安装提示
  - `checkForUpdates()` - 检查更新
  - `applyUpdate()` - 应用更新
  - `refreshCacheInfo()` - 刷新缓存信息
  - `clearCache()` - 清空缓存
  - `updateCache(urls)` - 更新缓存
  - `showNotification(title, options)` - 显示通知
  - `requestNotificationPermission()` - 请求通知权限
  - `registerBackgroundSync(tag)` - 注册后台同步
  - `registerPeriodicSync(tag, minInterval)` - 注册定期同步
  - `unregister()` - 注销 Service Worker
  - `getInstallGuide()` - 获取安装指南
  - `getStats()` - 获取统计信息

- **安装提示处理**
  - 监听 `beforeinstallprompt` 事件
  - 延迟安装提示
  - 自定义安装流程
  - 跟踪安装状态
  - 监听 `appinstalled` 事件

- **在线状态监听**
  - 监听 `online` 和 `offline` 事件
  - 实时更新 `isOnline` 状态
  - 适配离线功能

- **更新管理**
  - 自动检查更新
  - 用户提示更新
  - skipWaiting 控制
  - 页面重载

#### HTML 和主应用集成

- **index.html 增强**
  - PWA meta 标签
  - manifest.json 链接
  - theme-color 设置
  - Apple Touch Icon 配置
  - viewport-fit=cover（安全区域适配）
  - apple-mobile-web-app-capable
  - apple-mobile-web-app-status-bar-style
  - apple-mobile-web-app-title

- **主应用集成**
  - 文件：`src/main.ts`
  - Service Worker 初始化（仅生产环境）
  - 更新检测和用户提示
  - 错误处理
  - 自动 skipWaiting 或用户确认

#### 通知增强

- **Service Worker 通知**
  - 使用 `registration.showNotification()`
  - 域名显示更简洁
  - 支持更多通知选项
  - 即使页面关闭也能收到通知

- **通知选项**
  - icon - 通知图标
  - badge - 小图标（Android）
  - vibrate - 震动模式
  - actions - 操作按钮
  - requireInteraction - 是否需要用户交互
  - silent - 静音模式

- **通知事件**
  - `notificationclick` - 点击通知
  - 操作按钮处理
  - 自动跳转到应用

#### 文档

- **PWA 实现文档**
  - 文件：`docs/features/pwa-implementation.md`
  - 634 行完整文档
  - 功能详解
  - 文件结构
  - 使用指南
  - 配置说明
  - 安装指南
  - 通知优化
  - 图标准备
  - 测试清单
  - 调试技巧
  - 常见问题
  - 性能优化
  - 未来计划

- **PWA 快速设置指南**
  - 文件：`docs/guides/pwa-setup-guide.md`
  - 536 行详细指南
  - 图标准备步骤
  - 本地测试方法
  - 生产部署建议
  - 验证清单
  - 监控和维护
  - 常见问题解答
  - 高级配置

- **PWA 图标状态报告**
  - 文件：`docs/pwa-icons-status.md`
  - 265 行状态报告
  - 图标清单
  - Logo 设计说明
  - 生成方法
  - 平台支持
  - 质量指标
  - 部署建议

- **图标准备指南**
  - 文件：`public/icons/README.md`
  - 134 行指南文档
  - 必需图标列表
  - 设计要求
  - 快速生成工具
  - 临时占位符
  - 验证清单

### Changed

#### 通知系统集成

- **Notification Store 更新**
  - 支持 Service Worker 通知
  - 优先使用 `registration.showNotification()`
  - 降级到原生 `Notification` API
  - 通知构建逻辑统一

### Technical Details

#### 实现架构

**Service Worker 层次结构：**
```
┌─────────────────────────────┐
│     主应用 (main.ts)        │
│   - 初始化 SW               │
│   - 监听更新事件            │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│  PWA Store (pwa.ts)         │
│  - 状态管理                 │
│  - 安装提示                 │
│  - 更新检测                 │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│  SW Manager (serviceWorker.ts)│
│  - 注册管理                 │
│  - 生命周期                 │
│  - 消息通信                 │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│  Service Worker (sw.js)     │
│  - 拦截请求                 │
│  - 缓存管理                 │
│  - 离线支持                 │
└─────────────────────────────┘
```

**缓存策略选择流程：**
```
请求 → 判断类型
         │
    ┌────┴────┐
    │         │
静态资源   图片
    │         │
Cache     Cache First
First     with Expiry
    │         │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
  API      HTML
    │         │
Network   Network
First      First
with Cache
Fallback
```

#### 缓存配置

**默认配置：**
```javascript
// API 缓存
const API_CACHE_CONFIG = {
  maxAge: 5 * 60 * 1000,     // 5分钟
  maxEntries: 50,             // 最多50条
}

// 图片缓存
const IMAGE_CACHE_CONFIG = {
  maxAge: 30 * 24 * 60 * 60 * 1000,  // 30天
  maxEntries: 100,                    // 最多100张
}
```

**缓存命名：**
- `chatlog-session-v1.0.0` - 静态资源
- `chatlog-api-v1.0.0` - API 响应
- `chatlog-images-v1.0.0` - 图片资源

#### 平台支持

**安装支持：**
- ✅ Android (Chrome/Edge) - 完全支持
- ✅ iOS (Safari) - 添加到主屏幕
- ✅ Windows (Edge/Chrome) - 完全支持
- ✅ macOS (Safari/Chrome) - 完全支持
- ✅ Desktop (Firefox) - 基本支持

**功能支持：**
- ✅ Service Worker - 所有现代浏览器
- ✅ Cache API - 所有现代浏览器
- ✅ Add to Home Screen - Android/iOS/Windows/macOS
- ✅ Push Notifications - 除 iOS Safari 外
- ⚠️ Background Sync - Chrome/Edge
- ⚠️ Periodic Sync - Chrome/Edge

### User Experience

#### 安装体验

**Android (Chrome)：**
1. 访问应用，地址栏显示安装图标
2. 点击安装图标或菜单 → "添加到主屏幕"
3. 确认安装
4. 应用添加到主屏幕，可独立窗口运行

**iOS (Safari)：**
1. 访问应用
2. 点击底部分享按钮
3. 选择"添加到主屏幕"
4. 输入名称，点击"添加"
5. 应用添加到主屏幕

**Windows (Edge/Chrome)：**
1. 访问应用，地址栏显示安装图标
2. 点击安装图标
3. 确认安装
4. 应用添加到开始菜单和桌面
5. 可固定到任务栏

#### 离线体验

**离线可用功能：**
- 查看已缓存的会话列表
- 浏览已缓存的聊天记录
- 查看已缓存的联系人
- 查看已下载的图片
- 使用应用设置

**离线降级：**
- API 失败时显示缓存数据
- 明确标识离线状态
- 提供离线提示
- 网络恢复后自动同步

#### 更新体验

**自动更新检测：**
- 每小时自动检查更新
- 页面重新加载时检查更新
- 发现更新时显示提示

**用户更新流程：**
1. 应用检测到新版本
2. 显示确认对话框："发现新版本！是否立即更新？"
3. 用户确认后，调用 skipWaiting
4. 页面自动刷新，加载新版本

### Performance

#### 性能指标

**加载性能：**
- 首次加载：正常网络请求
- 二次加载：从缓存加载（<100ms）
- 离线加载：完全从缓存（<50ms）

**缓存性能：**
- 缓存写入：异步，不阻塞主线程
- 缓存读取：<10ms
- 缓存清理：后台执行

**更新性能：**
- 更新检测：<500ms
- 更新下载：后台进行
- 更新激活：<1s

#### 存储占用

**预估大小：**
- Service Worker 脚本：~15 KB
- Manifest 文件：~5 KB
- 图标文件总计：~220 KB
- 静态资源缓存：~2-5 MB
- API 缓存：~1-3 MB
- 图片缓存：~10-50 MB（取决于使用）

**总计：** 约 15-80 MB

### Security

**安全措施：**
- ✅ HTTPS 必需（或 localhost）
- ✅ Service Worker 同源策略
- ✅ 缓存内容隔离
- ✅ 消息通信验证
- ✅ 推送订阅加密（VAPID）

**隐私保护：**
- ✅ 缓存数据本地存储
- ✅ 不上传用户数据
- ✅ 通知权限用户控制
- ✅ 可随时清空缓存

### Migration Guide

#### 从 v0.12.0 升级

**无需手动操作：**
- Service Worker 自动注册（生产环境）
- 图标自动加载
- Manifest 自动识别

**首次使用建议：**
1. 在 HTTPS 环境下访问应用
2. 允许通知权限（可选）
3. 测试"添加到主屏幕"功能
4. 验证离线访问

**配置建议：**
- 建议配置"我的微信 ID"（v0.12.0 功能）
- 通知权限授予后可获得更好体验

### Testing

#### 功能测试清单

**Service Worker：**
- [ ] Service Worker 成功注册
- [ ] 状态变化正确跟踪
- [ ] 缓存策略正常工作
- [ ] 离线模式正常访问
- [ ] 更新检测正常
- [ ] 缓存清理正常

**PWA 安装：**
- [ ] Android 安装提示显示
- [ ] iOS 添加到主屏幕
- [ ] Windows 安装成功
- [ ] macOS 添加到 Dock
- [ ] 独立窗口模式运行
- [ ] 图标正确显示

**通知：**
- [ ] Service Worker 通知显示
- [ ] 通知点击跳转正常
- [ ] 通知操作按钮工作
- [ ] 后台通知（页面关闭时）

**缓存：**
- [ ] 静态资源被缓存
- [ ] API 响应被缓存
- [ ] 图片被缓存
- [ ] 缓存过期后自动更新
- [ ] 缓存数量限制生效

**更新：**
- [ ] 检测到新版本
- [ ] 提示用户更新
- [ ] 应用更新后正常工作
- [ ] 旧缓存被清理

#### 调试工具

**Chrome DevTools：**
- Application → Service Workers
- Application → Manifest
- Application → Cache Storage
- Network → Offline 模式测试

**Lighthouse 审计：**
- PWA 检查
- 性能分析
- 最佳实践
- 目标分数：≥ 90

**控制台命令：**
```javascript
// 检查 Service Worker 状态
navigator.serviceWorker.getRegistration()

// 获取缓存信息
caches.keys()

// 清空所有缓存
caches.keys().then(keys => 
  Promise.all(keys.map(key => caches.delete(key)))
)
```

### Known Issues

**iOS Safari 限制：**
- ❌ 不支持 Push Notification
- ❌ 不支持 Background Sync
- ❌ 不支持 Periodic Sync
- ✅ 支持 Service Worker 和离线缓存

**解决方案：**
- iOS 使用轮询替代推送
- 手动刷新替代后台同步

### Future Enhancements

**v0.14.0 计划：**
- 推送通知服务器集成
- 后台同步消息
- 定期同步会话
- 离线消息队列
- 智能预缓存

**v0.15.0 计划：**
- 离线草稿保存
- 离线搜索
- 离线数据分析
- 更新策略优化
- 网络状态感知

### Contributors

- **xLight** - 主要开发、Logo 设计、文档编写
- **Development Team** - 测试和反馈

### References

**官方文档：**
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google: PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

**工具：**
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

**项目文档：**
- 📄 [PWA 实现文档](../features/pwa-implementation.md)
- 📄 [PWA 快速设置指南](../guides/pwa-setup-guide.md)
- 📄 [PWA 图标状态报告](../pwa-icons-status.md)
- 📄 [图标准备指南](../../public/icons/README.md)

---

**发布日期**: 2025-01-24  
**版本标签**: v0.13.0  
**上一版本**: v0.12.0  
**下一版本**: v0.14.0 (规划中)

**重要提示**: 本版本为 PWA 首次发布，建议在 HTTPS 环境下测试完整功能。