# Chatlog Session 文档中心

项目全部文档索引，共 321 篇。归档文档见 external-docs/_archive/。

---

## 生态系统架构总览

Chatlog 生态由多个子项目协同工作，共同实现微信聊天记录的**读取 → 查看 → 搜索 → 发送 → 自动化**全链路能力。

```mermaid
graph TB
    subgraph 用户层["👤 用户层"]
        Browser["Chatlog Session<br/>Vue 3 前端 (浏览器)"]
    end

    subgraph 服务层["⚙️ 服务层"]
        ChatlogAPI["Chatlog API<br/>Golang 后端 (:5039)<br/>聊天记录读取 & 解密"]
        SendMsg["wechat-sendmsg<br/>Python 服务 (:8765)<br/>消息发送 (GUI 自动化)"]
        CFWorker["CF Worker Proxy<br/>Cloudflare Worker<br/>多媒体资源代理"]
    end

    subgraph 数据层["💾 数据层"]
        WeChatDB["微信本地数据库<br/>contact.db / message.db / session.db<br/>(SQLCipher 加密)"]
        IndexedDB["浏览器 IndexedDB<br/>本地缓存 & 离线支持"]
    end

    subgraph 自动化层["🤖 自动化层"]
        Butler["WeChat Butler<br/>微信消息自动化管家<br/>规则引擎 + 自动回复"]
        WeChatClient["微信桌面客户端<br/>Win / Mac / Linux"]
    end

    Browser -->|"HTTP API<br/>会话/消息/联系人"| ChatlogAPI
    Browser -->|"HTTP API<br/>发送消息/图片/文件"| SendMsg
    Browser -->|"代理请求<br/>图片/视频/语音"| CFWorker
    ChatlogAPI -->|"SQLCipher 解密<br/>读取本地数据库"| WeChatDB
    SendMsg -->|"GUI 自动化<br/>pyautogui + 剪贴板"| WeChatClient
    Butler -->|"规则匹配<br/>消息处理"| WeChatClient
    Browser -->|"本地持久化<br/>缓存 & 离线"| IndexedDB

    style Browser fill:#42b883,stroke:#2c3e50,color:#fff
    style ChatlogAPI fill:#00ADD8,stroke:#2c3e50,color:#fff
    style SendMsg fill:#3776AB,stroke:#2c3e50,color:#fff
    style CFWorker fill:#F38020,stroke:#2c3e50,color:#fff
    style WeChatDB fill:#9B59B6,stroke:#2c3e50,color:#fff
    style IndexedDB fill:#E67E22,stroke:#2c3e50,color:#fff
    style Butler fill:#E74C3C,stroke:#2c3e50,color:#fff
    style WeChatClient fill:#27AE60,stroke:#2c3e50,color:#fff
```

### 数据流架构

```mermaid
flowchart LR
    subgraph 数据读取流["📖 数据读取流"]
        A1["微信本地数据库<br/>(SQLCipher)"] -->|"解密读取"| A2["Chatlog API<br/>(Golang :5039)"]
        A2 -->|"HTTP JSON"| A3["Chatlog Session<br/>(Vue 3 前端)"]
        A3 -->|"IndexedDB<br/>缓存"| A4["本地缓存层"]
    end

    subgraph 消息发送流["📤 消息发送流"]
        B1["SendBox 组件<br/>用户输入"] -->|"HTTP POST"| B2["wechat-sendmsg<br/>(Python :8765)"]
        B2 -->|"消息队列<br/>SQLite 持久化"| B3["GUI 自动化<br/>pyautogui"]
        B3 -->|"剪贴板+快捷键"| B4["微信桌面客户端"]
    end

    subgraph 多媒体流["🖼️ 多媒体流"]
        C1["腾讯 CDN<br/>图片/视频/语音"] -->|"CF Worker<br/>代理转发"| C2["Chatlog Session<br/>前端展示"]
    end

    subgraph 自动化流["🤖 自动化流"]
        D1["WeChat Butler<br/>规则引擎"] -->|"消息匹配<br/>& 自动回复"| D2["微信桌面客户端"]
    end
```

---

## 子项目概览

| 子项目 | 定位 | 技术栈 | 端口 | 核心能力 |
|--------|------|--------|------|----------|
| **Chatlog Session** | 微信聊天记录查看器 | Vue 3 + TS + Vite + Pinia | — | 会话浏览、消息查看、联系人管理、全文搜索、消息发送、数据导出 |
| **Chatlog API** | 聊天记录读取 & 解密服务 | Golang + SQLCipher | :5039 | 数据库解密、会话查询、消息分页、联系人读取、多媒体代理 |
| **wechat-sendmsg** | 微信消息发送工具 | Python + FastAPI + pyautogui | :8765 | 文本/图片/文件发送、消息队列持久化、重试机制、MCP 协议 |
| **CF Worker Proxy** | 多媒体资源代理 | Cloudflare Workers | — | 腾讯域名白名单代理、CORS 头注入、来源验证 |
| **WeChat Butler** | 微信消息自动化管家 | 规划中 | — | 规则引擎、消息匹配、自动回复、系统集成 |

### Chatlog Session 前端架构

```mermaid
graph TB
    subgraph Views["视图层 (Views)"]
        Chat["Chat<br/>聊天消息"]
        Contact["Contact<br/>联系人"]
        Search["Search<br/>搜索"]
        Settings["Settings<br/>设置"]
        Dashboard["Dashboard<br/>仪表盘"]
        Onboarding["Onboarding<br/>引导页"]
    end

    subgraph Stores["状态层 (Pinia Stores)"]
        SessionStore["session<br/>会话列表"]
        ChatStore["chatMessages<br/>消息数据"]
        ContactStore["contact<br/>联系人"]
        SettingsStore["settings<br/>配置"]
        SearchStore["search<br/>搜索"]
        NotificationStore["notification<br/>通知"]
    end

    subgraph API["API 层"]
        ChatlogAPI["chatlog.ts<br/>聊天记录 API"]
        SessionAPI["session.ts<br/>会话 API"]
        ContactAPI["contact.ts<br/>联系人 API"]
        MediaAPI["media.ts<br/>多媒体 API"]
        SendmsgAPI["sendmsg.ts<br/>消息发送 API"]
    end

    subgraph Components["组件层"]
        ChatComponents["chat/<br/>MessageBubble, SendBox..."]
        LayoutComponents["layout/<br/>MainLayout, Sidebar..."]
        CommonComponents["common/<br/>LoadingProgress..."]
    end

    subgraph Composables["组合式函数"]
        AutoRefresh["useAutoRefreshManager"]
        MessageCache["useMessageCache"]
        MobileGesture["useMobileGesture"]
        KeyboardShortcuts["useKeyboardShortcuts"]
    end

    Views --> Stores
    Stores --> API
    Views --> Components
    Views --> Composables
    Stores --> Composables
```

---

## 技术栈全景

```mermaid
graph LR
    subgraph 前端["Chatlog Session (前端)"]
        Vue["Vue 3"]
        TS["TypeScript"]
        Vite["Vite 8"]
        EP["Element Plus"]
        Pinia["Pinia 3"]
        VueRouter["Vue Router 5"]
        VueUse["VueUse"]
        VirtualScroller["vue-virtual-scroller"]
        Marked["marked"]
        Dayjs["dayjs"]
        Pinyin["pinyin-pro"]
        DOMPurify["DOMPurify"]
    end

    subgraph 后端["Chatlog API (后端)"]
        Go["Golang"]
        SQLCipher["SQLCipher"]
        HTTP["net/http"]
    end

    subgraph 发送["wechat-sendmsg"]
        Python["Python"]
        FastAPI["FastAPI"]
        PyAutoGUI["pyautogui"]
        SQLite["SQLite"]
    end

    subgraph 代理["CF Worker Proxy"]
        CF["Cloudflare Workers"]
    end

    Vue --- TS --- Vite
    Go --- SQLCipher
    Python --- FastAPI --- PyAutoGUI
```

---

## 文档目录结构

```
docs/
├── faq.md                                # 常见问题
├── changelog/                            # 版本变更日志 (29 篇)
│   ├── CHANGELOG_v0.2.0.md ~ v0.25.0.md
│   └── ...
└── external-docs/                        # 外部文档中心
    ├── api/                              # API 参考文档 (26 篇)
    │   ├── reference.md                  # 完整 API 接口文档
    │   ├── data-structure.md             # 数据模型和字段说明
    │   ├── http-api.md                   # HTTP API 说明
    │   ├── pagination.md                 # 分页参数和使用方法
    │   ├── session-mapping.md            # 会话数据处理
    │   ├── response-fix.md               # 常见响应问题处理
    │   └── examples/                     # API 调用示例 (21 篇)
    ├── architecture/                     # 架构设计文档 (5 篇)
    │   ├── product-design.md             # 产品需求和设计
    │   ├── core/                         # 核心架构
    │   │   ├── message-loading-flow.md           # 消息加载完整流程
    │   │   └── message-loading-quick-reference.md # 消息加载快速参考
    │   └── ui/                           # UI 架构
    │       ├── main-layout.md                    # 主布局设计
    │       └── view-switching.md                 # 视图切换机制
    ├── backend-golang/                   # Chatlog API 后端文档 (41 篇)
    │   ├── db-analysis/                  # 微信数据库结构分析 (9 篇)
    │   ├── db-copy/                      # 数据库复制与备份机制 (9 篇)
    │   ├── implementation/               # 核心功能实现细节 (4 篇)
    │   ├── optimizations/                # 性能优化方案 (7 篇)
    │   ├── refactoring/                  # 代码重构总结 (2 篇)
    │   └── ...                           # 解密、SQLCipher 迁移等
    ├── cf-worker-proxy/                  # CF Worker 代理文档
    ├── deployment/                       # 部署指南 (3 篇)
    ├── design/                           # 技术设计文档 (1 篇)
    │   └── v0.26.0-sendmsg-integration.md  # SendMsg 集成设计
    ├── examples/                         # 使用示例 (4 篇)
    ├── features/                         # 功能特性文档 (34 篇)
    │   ├── api/                          # API 相关功能
    │   ├── background/                   # 后台刷新/加载
    │   ├── contact/                      # 联系人功能
    │   ├── core/                         # 核心功能 (消息加载/缓存/滚动/虚拟消息)
    │   ├── messages/                     # 消息类型功能 (basic/media/rich)
    │   ├── notification/                 # 通知功能
    │   ├── performance/                  # 性能优化功能
    │   ├── pwa/                          # PWA 功能
    │   ├── search/                       # 搜索功能
    │   └── ui/                           # UI 增强功能 (含移动端)
    ├── fixes/                            # 问题修复文档 (10 篇)
    ├── guides/                           # 使用和开发指南 (27 篇)
    │   ├── quick-start/                  # 快速开始指南
    │   ├── developer/                    # 开发者指南 (含调试/实现/测试)
    │   ├── user/                         # 用户使用手册
    │   ├── message-types/                # 消息类型指南
    │   └── troubleshooting/              # 故障排查指南
    ├── issues/                           # 问题追踪 (4 篇)
    ├── openspec/                         # OpenSpec 变更管理 (115 篇)
    │   ├── specs/                        # 规格定义
    │   └── changes/                      # 变更记录
    │       ├── integrate-ai-panel-butler/  # AI 面板集成 (进行中)
    │       └── archive/                   # 已归档变更 (10 个)
    ├── performance/                      # 性能优化文档 (1 篇)
    ├── planning/                         # 规划文档 (4 篇)
    ├── refactoring/                      # 重构文档 (2 篇)
    ├── references/                       # 参考资料 (7 篇)
    ├── scripts/                          # 辅助脚本
    ├── troubleshooting/                  # 故障排查 (2 篇)
    ├── _archive/                         # 已归档文档 (61 篇)
    ├── 其他同类工具/                      # 同类工具对比参考 (2 篇)
    ├── CHANGELOG.md                      # 变更日志
    ├── ROADMAP.md                        # 项目路线图
    └── TODO.md                           # 待办事项
```

---

## 文档导航

### 按项目查找

#### Chatlog Session (前端)

| 类别 | 文档 | 说明 |
|------|------|------|
| 入门 | [快速开始](external-docs/guides/quick-start/main-layout-quick-start.md) | 5 分钟了解项目结构 |
| 用户 | [用户使用手册](external-docs/guides/user/user-guide.md) | 完整的用户使用说明 |
| 开发 | [开发者指南](external-docs/guides/developer/developer-guide.md) | 开发环境搭建和开发流程 |
| 测试 | [测试指南](external-docs/guides/developer/testing-guide.md) | 测试方法和最佳实践 |
| API | [API 参考手册](external-docs/api/reference.md) | 完整的 API 接口文档 |
| 架构 | [主布局架构](external-docs/architecture/ui/main-layout.md) | 应用布局设计 |
| 路线图 | [项目路线图](external-docs/ROADMAP.md) | 开发路线图和版本规划 |

#### Chatlog API (后端)

| 类别 | 文档 | 说明 |
|------|------|------|
| 概览 | [后端文档索引](external-docs/backend-golang/README.md) | 后端文档导航 |
| 数据库 | [数据库结构分析](external-docs/backend-golang/db-analysis/) | 微信本地数据库表结构 |
| 优化 | [性能优化方案](external-docs/backend-golang/optimizations/) | 各方面优化细节 |
| 实现 | [核心功能实现](external-docs/backend-golang/implementation/) | 解密、模板提取等 |

#### wechat-sendmsg (消息发送)

| 类别 | 文档 | 说明 |
|------|------|------|
| 设计 | [SendMsg 集成设计](external-docs/design/v0.26.0-sendmsg-integration.md) | v0.26.0 集成技术方案 |

#### WeChat Butler (自动化)

| 类别 | 文档 | 说明 |
|------|------|------|
| 规划 | [AI 面板集成变更](external-docs/openspec/changes/integrate-ai-panel-butler/) | Butler 集成变更规格 |
| 规划 | [AI/MCP 集成规划](external-docs/planning/ai-mcp-integration-plan.md) | AI 集成整体规划 |

### 按主题查找

| 主题 | 关键文档 |
|------|---------|
| 消息加载 | [完整流程](external-docs/architecture/core/message-loading-flow.md) / [快速参考](external-docs/architecture/core/message-loading-quick-reference.md) |
| 性能优化 | [Contact DB 模式](external-docs/features/contact/contact-db-mode.md) / [虚拟滚动](external-docs/features/performance/virtual-scroll.md) / [拼音优化](external-docs/performance/pinyin-optimization.md) |
| 数据管理 | [数据结构](external-docs/api/data-structure.md) / [分页机制](external-docs/api/pagination.md) / [会话映射](external-docs/api/session-mapping.md) |
| 部署运维 | [GitHub Pages](external-docs/deployment/github-pages.md) / [PWA 配置](external-docs/guides/pwa-setup-guide.md) / [故障排查](external-docs/troubleshooting/TROUBLESHOOTING.md) |
| 移动端 | [主布局](external-docs/architecture/ui/main-layout.md) / [视图切换](external-docs/architecture/ui/view-switching.md) / [移动端 UI](external-docs/features/ui/mobile/mobile-ui.md) |

---

## 版本历程

| 版本 | 日期 | 里程碑 |
|------|------|--------|
| v0.26.0 | 2026-05-08 | SendMsg 集成、微信风格 SendBox、可配置快捷键 |
| v0.25.0 | 2026-05-06 | 链接消息、Live Photo 高清修复、Vite v8 |
| v0.24.0 | 2026-04-13 | 收藏消息类型支持 |
| v0.22.0 | 2026-03-12 | Gap 置信度分级、锚点逻辑统一 |
| v0.20.0 | 2026-03-11 | EmptyRange 窗口探测优化 |
| v0.16.0 | 2026-02-11 | 聊天记录导出 (JSON/CSV/TXT/Markdown) |
| v0.15.0 | 2025-12-05 | 会话置顶、Live Photo、Dashboard 重构、PWA |
| v0.14.0 | 2025-11-25 | 转发消息增强、EmptyRange/Gap/Revoke 虚拟消息 |
| v0.10.0 | 2025-01-24 | 群聊管理、搜索、IndexedDB v3、智能消息加载 |
| v0.9.0 | 2025-11-21 | 移动端响应式布局、keep-alive 缓存 |

完整版本记录见 [ROADMAP.md](external-docs/ROADMAP.md) 和 [CHANGELOG.md](external-docs/CHANGELOG.md)。

---

## 文档统计

| 分类 | 数量 |
|------|------|
| 总文档数 | 321 篇 |
| 归档文档 | 61 篇 |
| API 文档 | 26 篇 |
| 功能特性 | 34 篇 |
| 架构设计 | 5 篇 |
| 指南文档 | 27 篇 |
| 后端文档 | 41 篇 |
| OpenSpec 变更 | 115 篇 |
| 变更日志 | 29 篇 |

---

## docs/

- [faq.md](faq.md) — 常见问题 (FAQ)

### changelog/

- [CHANGELOG_v0.10.0.md](changelog/CHANGELOG_v0.10.0.md) — v0.10.0. 变更日志
- [CHANGELOG_v0.11.0.md](changelog/CHANGELOG_v0.11.0.md) — v0.11.0. 变更日志
- [CHANGELOG_v0.12.0.md](changelog/CHANGELOG_v0.12.0.md) — v0.12.0. 变更日志
- [CHANGELOG_v0.13.0.md](changelog/CHANGELOG_v0.13.0.md) — v0.13.0. 变更日志
- [CHANGELOG_v0.14.0.md](changelog/CHANGELOG_v0.14.0.md) — v0.14.0. 变更日志
- [CHANGELOG_v0.15.0.md](changelog/CHANGELOG_v0.15.0.md) — v0.15.0. 变更日志
- [CHANGELOG_v0.16.0.md](changelog/CHANGELOG_v0.16.0.md) — v0.16.0. 变更日志
- [CHANGELOG_v0.17.0.md](changelog/CHANGELOG_v0.17.0.md) — v0.17.0. 变更日志
- [CHANGELOG_v0.18.0.md](changelog/CHANGELOG_v0.18.0.md) — v0.18.0. 变更日志
- [CHANGELOG_v0.19.0.md](changelog/CHANGELOG_v0.19.0.md) — v0.19.0. 变更日志
- [CHANGELOG_v0.2.0.md](changelog/CHANGELOG_v0.2.0.md) — v0.2.0. 变更日志
- [CHANGELOG_v0.20.0.md](changelog/CHANGELOG_v0.20.0.md) — v0.20.0. 变更日志
- [CHANGELOG_v0.21.0.md](changelog/CHANGELOG_v0.21.0.md) — v0.21.0. 变更日志
- [CHANGELOG_v0.22.0.md](changelog/CHANGELOG_v0.22.0.md) — v0.22.0. 变更日志
- [CHANGELOG_v0.24.0.md](changelog/CHANGELOG_v0.24.0.md) — v0.24.0. 变更日志
- [CHANGELOG_v0.25.0.md](changelog/CHANGELOG_v0.25.0.md) — v0.25.0. 变更日志
- [CHANGELOG_v0.3.0.md](changelog/CHANGELOG_v0.3.0.md) — v0.3.0. 变更日志
- [CHANGELOG_v0.3.1.md](changelog/CHANGELOG_v0.3.1.md) — v0.3.1. 变更日志
- [CHANGELOG_v0.3.2_summary.md](changelog/CHANGELOG_v0.3.2_summary.md) — v0.3.2 变更日志
- [CHANGELOG_v0.3.3.md](changelog/CHANGELOG_v0.3.3.md) — v0.3.3. 变更日志
- [CHANGELOG_v0.4.0.md](changelog/CHANGELOG_v0.4.0.md) — v0.4.0. 变更日志
- [CHANGELOG_v0.4.1.md](changelog/CHANGELOG_v0.4.1.md) — v0.4.1. 变更日志
- [CHANGELOG_v0.5.0.md](changelog/CHANGELOG_v0.5.0.md) — v0.5.0. 变更日志
- [CHANGELOG_v0.5.1.md](changelog/CHANGELOG_v0.5.1.md) — v0.5.1. 变更日志
- [CHANGELOG_v0.6.0.md](changelog/CHANGELOG_v0.6.0.md) — v0.6.0. 变更日志
- [CHANGELOG_v0.7.0.md](changelog/CHANGELOG_v0.7.0.md) — v0.7.0. 变更日志
- [CHANGELOG_v0.8.0.md](changelog/CHANGELOG_v0.8.0.md) — v0.8.0. 变更日志
- [CHANGELOG_v0.9.0.md](changelog/CHANGELOG_v0.9.0.md) — v0.9.0. 变更日志
- [CHANGELOG_v0.9.2.md](changelog/CHANGELOG_v0.9.2.md) — v0.9.2. 变更日志

## docs/external-docs/

### 根目录/ (3 篇)

- [CHANGELOG.md](external-docs/CHANGELOG.md) — Changelog
- [ROADMAP.md](external-docs/ROADMAP.md) — 文档信息
- [TODO.md](external-docs/TODO.md) — TODO

### API 文档/ (26 篇)

- [api/data-structure.md](external-docs/api/data-structure.md) — 概述
- [api/http-api.md](external-docs/api/http-api.md) — Chatlog HTTP API 文档
- [api/pagination.md](external-docs/api/pagination.md) — 概述
- [api/reference.md](external-docs/api/reference.md) — 目录
- [api/response-fix.md](external-docs/api/response-fix.md) — API 响应处理修复说明
- [api/session-mapping.md](external-docs/api/session-mapping.md) — 概述
- [api/examples/auto-decrypt.md](external-docs/api/examples/auto-decrypt.md) — auto-decrypt
- [api/examples/chatlog-2.md](external-docs/api/examples/chatlog-2.md) — /api/v1/chatlog
- [api/examples/chatlog.md](external-docs/api/examples/chatlog.md) — /api/v1/chatlog
- [api/examples/chatroom.md](external-docs/api/examples/chatroom.md) — https://chatlog.x.qiubobo.com:60443/api/v1/chatroom?keywo...
- [api/examples/contact.md](external-docs/api/examples/contact.md) — {
- [api/examples/dashboard.md](external-docs/api/examples/dashboard.md) — 数据总览
- [api/examples/decrypt.md](external-docs/api/examples/decrypt.md) — POST /api/v1/actions/decrypt
- [api/examples/diary-2.md](external-docs/api/examples/diary-2.md) — diary-2
- [api/examples/diary.md](external-docs/api/examples/diary.md) — diary
- [api/examples/msgtype-emoji-not-downloaded.md](external-docs/api/examples/msgtype-emoji-not-downloaded.md) — 暂不支持的表情包
- [api/examples/msgtype-fav.md](external-docs/api/examples/msgtype-fav.md) — 收藏类的消息
- [api/examples/msgtype-file-downloading.md](external-docs/api/examples/msgtype-file-downloading.md) — chatlog 返回数据结构 下载中的文件
- [api/examples/msgtype-forward-group.md](external-docs/api/examples/msgtype-forward-group.md) — 多选转发的消息，包含附件
- [api/examples/msgtype-link.md](external-docs/api/examples/msgtype-link.md) — chatlog 返回数据结构 qqmail
- [api/examples/msgtype-qqmail.md](external-docs/api/examples/msgtype-qqmail.md) — chatlog 返回数据结构 qqmail
- [api/examples/msgtype-voicecall.md](external-docs/api/examples/msgtype-voicecall.md) — chatlog 返回数据结构 下载中的文件
- [api/examples/search.md](external-docs/api/examples/search.md) — search
- [api/examples/session-v2.md](external-docs/api/examples/session-v2.md) — 请求近期聊天session列表
- [api/examples/session.md](external-docs/api/examples/session.md) — 请求近期聊天session列表
- [api/examples/setting.md](external-docs/api/examples/setting.md) — setting

### 架构设计/ (5 篇)

- [architecture/product-design.md](external-docs/architecture/product-design.md) — 目录
- [architecture/core/message-loading-flow.md](external-docs/architecture/core/message-loading-flow.md) — 概述
- [architecture/core/message-loading-quick-reference.md](external-docs/architecture/core/message-loading-quick-reference.md) — 核心流程图
- [architecture/ui/main-layout.md](external-docs/architecture/ui/main-layout.md) — 概述
- [architecture/ui/view-switching.md](external-docs/architecture/ui/view-switching.md) — 概述

### 后端 Golang/ (41 篇)

- [backend-golang/Sarv微信聊天记录解密.md](external-docs/backend-golang/Sarv微信聊天记录解密.md) — 概述
- [backend-golang/[原创]wx新版本（after4.0）数据库key逆向.md](external-docs/backend-golang/[原创]wx新版本（after4.0）数据库key逆向.md) — 1、 前提
- [backend-golang/fts-native-testing-report.md](external-docs/backend-golang/fts-native-testing-report.md) — 测试日期
- [backend-golang/sqlcipher-data-realtime-fix.md](external-docs/backend-golang/sqlcipher-data-realtime-fix.md) — 文档信息
- [backend-golang/sqlcipher-migration.md](external-docs/backend-golang/sqlcipher-migration.md) — SQLCipher 迁移指南
- [backend-golang/troubleshooting-sqlcipher.md](external-docs/backend-golang/troubleshooting-sqlcipher.md) — SQLCipher 故障排除指南
- [backend-golang/使用pysqlcipher3操作Windows微信数据库.md](external-docs/backend-golang/使用pysqlcipher3操作Windows微信数据库.md) — 使用pysqlcipher3操作Windows微信数据库
- [backend-golang/db-analysis/contact_db_analysis.md](external-docs/backend-golang/db-analysis/contact_db_analysis.md) — SQLite 数据库结构分析报告：contact.db
- [backend-golang/db-analysis/contact_db_deep_analysis.md](external-docs/backend-golang/db-analysis/contact_db_deep_analysis.md) — SQLite 数据库深度分析报告：contact.db
- [backend-golang/db-analysis/darwin_v4_vfs_analysis.md](external-docs/backend-golang/db-analysis/darwin_v4_vfs_analysis.md) — Darwin V4 微信数据库 VFS 测试分析报告
- [backend-golang/db-analysis/emoticon_db_analysis.md](external-docs/backend-golang/db-analysis/emoticon_db_analysis.md) — emoticon.db 深度分析报告
- [backend-golang/db-analysis/favorite_db_analysis.md](external-docs/backend-golang/db-analysis/favorite_db_analysis.md) — favorite.db 深度分析报告
- [backend-golang/db-analysis/general_db_analysis.md](external-docs/backend-golang/db-analysis/general_db_analysis.md) — general.db 深度分析报告
- [backend-golang/db-analysis/hardlink_db_analysis.md](external-docs/backend-golang/db-analysis/hardlink_db_analysis.md) — hardlink.db 深度分析报告
- [backend-golang/db-analysis/message_db_analysis.md](external-docs/backend-golang/db-analysis/message_db_analysis.md) — SQLite 数据库深度分析报告：Message 数据库群
- [backend-golang/db-analysis/other_db_analysis.md](external-docs/backend-golang/db-analysis/other_db_analysis.md) — SQLite 数据库深度分析报告：其他功能数据库
- [backend-golang/db-analysis/session_db_analysis.md](external-docs/backend-golang/db-analysis/session_db_analysis.md) — SQLite 数据库深度分析报告：session.db
- [backend-golang/db-copy/application_file_copy_analysis.md](external-docs/backend-golang/db-copy/application_file_copy_analysis.md) — 文件复制解密逻辑流程图
- [backend-golang/db-copy/copy_temp_analysis.md](external-docs/backend-golang/db-copy/copy_temp_analysis.md) — User
- [backend-golang/db-copy/direct_access_wechat_db.md](external-docs/backend-golang/db-copy/direct_access_wechat_db.md) — User
- [backend-golang/db-copy/error_filecopy_delete.md](external-docs/backend-golang/db-copy/error_filecopy_delete.md) — 问题总结
- [backend-golang/db-copy/issues_direct_open.md](external-docs/backend-golang/db-copy/issues_direct_open.md) — 解决方案
- [backend-golang/db-copy/optimization_general.md](external-docs/backend-golang/db-copy/optimization_general.md) — 1. 问题分析
- [backend-golang/db-copy/optimization_io.md](external-docs/backend-golang/db-copy/optimization_io.md) — FileCopy IO 优化方案
- [backend-golang/db-copy/rationale_copy_temp.md](external-docs/backend-golang/db-copy/rationale_copy_temp.md) — 为什么 Windows 下一定要临时复制？
- [backend-golang/db-copy/sqlite_incremental_backup.md](external-docs/backend-golang/db-copy/sqlite_incremental_backup.md) — User
- [backend-golang/db-copy/vfs_compatibility.md](external-docs/backend-golang/db-copy/vfs_compatibility.md) — 概述
- [backend-golang/db-copy/vfs_integration.md](external-docs/backend-golang/db-copy/vfs_integration.md) — VFS 集成文档
- [backend-golang/implementation/debug_logging.md](external-docs/backend-golang/implementation/debug_logging.md) — 1. 目标
- [backend-golang/implementation/decryption_logic.md](external-docs/backend-golang/implementation/decryption_logic.md) — ChatLog Decrypt 流程详解
- [backend-golang/implementation/image_decryption_fix.md](external-docs/backend-golang/implementation/image_decryption_fix.md) — 问题背景
- [backend-golang/implementation/template_extraction.md](external-docs/backend-golang/implementation/template_extraction.md) — 概述
- [backend-golang/optimizations/dat_to_img_conversion.md](external-docs/backend-golang/optimizations/dat_to_img_conversion.md) — 1. 背景
- [backend-golang/optimizations/http_server.md](external-docs/backend-golang/optimizations/http_server.md) — 1. 问题分析
- [backend-golang/optimizations/indexer_performance.md](external-docs/backend-golang/optimizations/indexer_performance.md) — 1. 问题分析
- [backend-golang/optimizations/indexer_startup.md](external-docs/backend-golang/optimizations/indexer_startup.md) — 1. 问题分析
- [backend-golang/optimizations/mcp_protocol.md](external-docs/backend-golang/optimizations/mcp_protocol.md) — 1. 问题分析
- [backend-golang/optimizations/wechat_db_access.md](external-docs/backend-golang/optimizations/wechat_db_access.md) — 1. 问题分析
- [backend-golang/optimizations/wechat_initialization.md](external-docs/backend-golang/optimizations/wechat_initialization.md) — 1. 问题分析
- [backend-golang/refactoring/http_router_refactor.md](external-docs/backend-golang/refactoring/http_router_refactor.md) — 概述
- [backend-golang/refactoring/large_files_analysis.md](external-docs/backend-golang/refactoring/large_files_analysis.md) — 一些较大的代码文件

### 部署指南/ (3 篇)

- [deployment/custom-path.md](external-docs/deployment/custom-path.md) — 自定义路径部署指南
- [deployment/github-pages.md](external-docs/deployment/github-pages.md) — GitHub Pages 部署指南
- [deployment/other-platforms.md](external-docs/deployment/other-platforms.md) — 其他部署平台指南

### 技术设计/ (1 篇)

- [design/v0.26.0-sendmsg-integration.md](external-docs/design/v0.26.0-sendmsg-integration.md) — 概述

### 示例文档/ (4 篇)

- [examples/api/forwarded-message-example.md](external-docs/examples/api/forwarded-message-example.md) — 快速开始
- [examples/messages/emoji-message-example.md](external-docs/examples/messages/emoji-message-example.md) — 概述
- [examples/messages/miniprogram-message-example.md](external-docs/examples/messages/miniprogram-message-example.md) — 概述
- [examples/messages/shortvideo-message-example.md](external-docs/examples/messages/shortvideo-message-example.md) — 概述

### 功能特性/ (34 篇)

- [features/README_p0_features.md](external-docs/features/README_p0_features.md) — 文档信息
- [features/batch-update-mode.md](external-docs/features/batch-update-mode.md) — 概述
- [features/live-photo-compatibility.md](external-docs/features/live-photo-compatibility.md) — 背景
- [features/system-hotkey.md](external-docs/features/system-hotkey.md) — PWA（渐进式 Web 应用）本身无法直接绑定系统级快捷键
- [features/api/api-config-unification.md](external-docs/features/api/api-config-unification.md) — 概述
- [features/api/api-settings.md](external-docs/features/api/api-settings.md) — 概述
- [features/background/background-refresh.md](external-docs/features/background/background-refresh.md) — 概述
- [features/contact/contact-auto-load.md](external-docs/features/contact/contact-auto-load.md) — 概述
- [features/contact/contact-db-mode.md](external-docs/features/contact/contact-db-mode.md) — 概述
- [features/contact/contact-features.md](external-docs/features/contact/contact-features.md) — 概述
- [features/contact/contact-index/contact-chinese-index.md](external-docs/features/contact/contact-index/contact-chinese-index.md) — 概述
- [features/contact/contact-indexeddb/contact-index-db-clear-guide.md](external-docs/features/contact/contact-indexeddb/contact-index-db-clear-guide.md) — 问题背景
- [features/contact/contact-indexeddb/contact-index-db-upgrade.md](external-docs/features/contact/contact-indexeddb/contact-index-db-upgrade.md) — 概述
- [features/core/message-cache/message-cache.md](external-docs/features/core/message-cache/message-cache.md) — 概述
- [features/core/message-loading/message-loading.md](external-docs/features/core/message-loading/message-loading.md) — 概述
- [features/core/scroll-position/scroll-position-memory.md](external-docs/features/core/scroll-position/scroll-position-memory.md) — 概述
- [features/core/virtual-messages/virtual-gap-message.md](external-docs/features/core/virtual-messages/virtual-gap-message.md) — 概述
- [features/messages/basic/contact-card-message.md](external-docs/features/messages/basic/contact-card-message.md) — 概述
- [features/messages/basic/empty-range-in-history-loading.md](external-docs/features/messages/basic/empty-range-in-history-loading.md) — 概述
- [features/messages/basic/location-message.md](external-docs/features/messages/basic/location-message.md) — 概述
- [features/messages/basic/voice-playback.md](external-docs/features/messages/basic/voice-playback.md) — 概述
- [features/messages/media/media-display-control.md](external-docs/features/messages/media/media-display-control.md) — 概述
- [features/messages/media/video-link-message.md](external-docs/features/messages/media/video-link-message.md) — 概述
- [features/messages/rich/forwarded-message-dialog.md](external-docs/features/messages/rich/forwarded-message-dialog.md) — 功能概述
- [features/messages/rich/forwarded-message-enhancement.md](external-docs/features/messages/rich/forwarded-message-enhancement.md) — 概述
- [features/messages/rich/jielong-message.md](external-docs/features/messages/rich/jielong-message.md) — 概述
- [features/messages/rich/transfer-message.md](external-docs/features/messages/rich/transfer-message.md) — 概述
- [features/notification/message-notification.md](external-docs/features/notification/message-notification.md) — 概述
- [features/performance/virtual-scroll.md](external-docs/features/performance/virtual-scroll.md) — 概述
- [features/pwa/pwa-implementation.md](external-docs/features/pwa/pwa-implementation.md) — 概述
- [features/search/search-feature.md](external-docs/features/search/search-feature.md) — 概述
- [features/ui/message-bubble-enhancement.md](external-docs/features/ui/message-bubble-enhancement.md) — 概述
- [features/ui/onboarding-guide.md](external-docs/features/ui/onboarding-guide.md) — 1. 概述
- [features/ui/mobile/mobile-ui.md](external-docs/features/ui/mobile/mobile-ui.md) — 概述

### 问题修复/ (10 篇)

- [fixes/2025-01_session_list_auto_refresh.md](external-docs/fixes/2025-01_session_list_auto_refresh.md) — 问题描述
- [fixes/virtual-messages-display-fix.md](external-docs/fixes/virtual-messages-display-fix.md) — 问题描述
- [fixes/auto-refresh/auto-refresh-cache-update.md](external-docs/fixes/auto-refresh/auto-refresh-cache-update.md) — 问题描述
- [fixes/auto-refresh/auto-refresh-messages-enhancement.md](external-docs/fixes/auto-refresh/auto-refresh-messages-enhancement.md) — 文档信息
- [fixes/history-loading/history-loading-hasmore-logic-fix.md](external-docs/fixes/history-loading/history-loading-hasmore-logic-fix.md) — 问题描述
- [fixes/history-loading/history-loading-offset-fix.md](external-docs/fixes/history-loading/history-loading-offset-fix.md) — 修正概述
- [fixes/mix-content/mix-content.md](external-docs/fixes/mix-content/mix-content.md) — Mixed Content 问题
- [fixes/mix-content/solution.md](external-docs/fixes/mix-content/solution.md) — URL 替换方案
- [fixes/mix-content/tunnel-error-fix.md](external-docs/fixes/mix-content/tunnel-error-fix.md) — 问题描述
- [fixes/mix-content/worker-comparison.md](external-docs/fixes/mix-content/worker-comparison.md) — 问题背景

### 指南文档/ (27 篇)

- [guides/ai-assistant-usage.md](external-docs/guides/ai-assistant-usage.md) — 概述
- [guides/pwa-setup-guide.md](external-docs/guides/pwa-setup-guide.md) — 概述
- [guides/developer/developer-guide.md](external-docs/guides/developer/developer-guide.md) — 目录
- [guides/developer/history-loading-optimization-summary.md](external-docs/guides/developer/history-loading-optimization-summary.md) — 概述
- [guides/developer/testing-guide.md](external-docs/guides/developer/testing-guide.md) — API 测试指南
- [guides/developer/version-management.md](external-docs/guides/developer/version-management.md) — 版本管理指南
- [guides/developer/debugging/auto-refresh-debugging.md](external-docs/guides/developer/debugging/auto-refresh-debugging.md) — 文档信息
- [guides/developer/debugging/debug-empty-range.md](external-docs/guides/developer/debugging/debug-empty-range.md) — 概述
- [guides/developer/debugging/debug-message-date.md](external-docs/guides/developer/debugging/debug-message-date.md) — 问题描述
- [guides/developer/debugging/virtual-gap-debug-guide.md](external-docs/guides/developer/debugging/virtual-gap-debug-guide.md) — 目标读者
- [guides/developer/implementation/gap-message-usage.md](external-docs/guides/developer/implementation/gap-message-usage.md) — 概述
- [guides/developer/implementation/history-message-loading-process.md](external-docs/guides/developer/implementation/history-message-loading-process.md) — 历史消息加载流程详解
- [guides/developer/implementation/live-message-implementation.md](external-docs/guides/developer/implementation/live-message-implementation.md) — 概述
- [guides/developer/implementation/timezone-usage.md](external-docs/guides/developer/implementation/timezone-usage.md) — 概述
- [guides/developer/testing/contact-chinese-index-testing.md](external-docs/guides/developer/testing/contact-chinese-index-testing.md) — 功能概述
- [guides/developer/testing/test-empty-range-time-gap.md](external-docs/guides/developer/testing/test-empty-range-time-gap.md) — 测试目标
- [guides/developer/testing/test-empty-range.md](external-docs/guides/developer/testing/test-empty-range.md) — 目标
- [guides/developer/testing/test-loadmessages-empty-range.md](external-docs/guides/developer/testing/test-loadmessages-empty-range.md) — 概述
- [guides/message-types/message-type-checklist.md](external-docs/guides/message-types/message-type-checklist.md) — 开发前检查
- [guides/message-types/message-type-config-guide.md](external-docs/guides/message-types/message-type-config-guide.md) — 概述
- [guides/message-types/message-type-quick-reference.md](external-docs/guides/message-types/message-type-quick-reference.md) — 添加新消息类型（3 步完成）
- [guides/message-types/message-type-refactoring-summary.md](external-docs/guides/message-types/message-type-refactoring-summary.md) — 重构概述
- [guides/quick-start/api-settings-quick-guide.md](external-docs/guides/quick-start/api-settings-quick-guide.md) — 快速开始
- [guides/quick-start/contact-db-quick-reference.md](external-docs/guides/quick-start/contact-db-quick-reference.md) — 核心改变
- [guides/quick-start/main-layout-quick-start.md](external-docs/guides/quick-start/main-layout-quick-start.md) — 快速预览
- [guides/user/background-refresh-guide.md](external-docs/guides/user/background-refresh-guide.md) — 快速开始
- [guides/user/user-guide.md](external-docs/guides/user/user-guide.md) — 目录

### 问题记录/ (4 篇)

- [issues/history-loading-issues-2025-11-22.md](external-docs/issues/history-loading-issues-2025-11-22.md) — 问题概述
- [issues/history-loading-issues-fix-patch.md](external-docs/issues/history-loading-issues-fix-patch.md) — 概述
- [issues/安全报告.md](external-docs/issues/安全报告.md) — Chatlog Session 安全分析报告
- [issues/solutions/empty-range-solution-summary.md](external-docs/issues/solutions/empty-range-solution-summary.md) — 概述

### OpenSpec 变更管理/ (115 篇)

- [openspec/readme.md](external-docs/openspec/readme.md) — OpenSpec 说明
- [openspec/changes/integrate-ai-panel-butler/design.md](external-docs/openspec/changes/integrate-ai-panel-butler/design.md) — Context
- [openspec/changes/integrate-ai-panel-butler/proposal.md](external-docs/openspec/changes/integrate-ai-panel-butler/proposal.md) — Why
- [openspec/changes/integrate-ai-panel-butler/tasks.md](external-docs/openspec/changes/integrate-ai-panel-butler/tasks.md) — 1. Types and API Client
- [openspec/changes/integrate-ai-panel-butler/specs/ai-context-feed/spec.md](external-docs/openspec/changes/integrate-ai-panel-butler/specs/ai-context-feed/spec.md) — ADDED Requirements
- [openspec/changes/integrate-ai-panel-butler/specs/ai-conversation/spec.md](external-docs/openspec/changes/integrate-ai-panel-butler/specs/ai-conversation/spec.md) — ADDED Requirements
- [openspec/changes/integrate-ai-panel-butler/specs/ai-panel/spec.md](external-docs/openspec/changes/integrate-ai-panel-butler/specs/ai-panel/spec.md) — ADDED Requirements
- [openspec/changes/integrate-ai-panel-butler/specs/ai-prompt-library/spec.md](external-docs/openspec/changes/integrate-ai-panel-butler/specs/ai-prompt-library/spec.md) — ADDED Requirements
- [openspec/changes/integrate-ai-panel-butler/specs/butler-connection/spec.md](external-docs/openspec/changes/integrate-ai-panel-butler/specs/butler-connection/spec.md) — ADDED Requirements
- [openspec/changes/integrate-ai-panel-butler/specs/unified-settings/spec.md](external-docs/openspec/changes/integrate-ai-panel-butler/specs/unified-settings/spec.md) — ADDED Requirements
- [openspec/specs/background-batch-loader/spec.md](external-docs/openspec/specs/background-batch-loader/spec.md) — ADDED Requirements
- [openspec/specs/chat-export-api/spec.md](external-docs/openspec/specs/chat-export-api/spec.md) — Purpose
- [openspec/specs/chat-export-dialog/spec.md](external-docs/openspec/specs/chat-export-dialog/spec.md) — Purpose
- [openspec/specs/chat-export-manager/spec.md](external-docs/openspec/specs/chat-export-manager/spec.md) — Purpose
- [openspec/specs/chat-favorite-message-support/spec.md](external-docs/openspec/specs/chat-favorite-message-support/spec.md) — Requirement
- [openspec/specs/chat-image-gallery-preview/spec.md](external-docs/openspec/specs/chat-image-gallery-preview/spec.md) — Purpose
- [openspec/specs/chat-selection/spec.md](external-docs/openspec/specs/chat-selection/spec.md) — Requirement
- [openspec/specs/drag-file-send/spec.md](external-docs/openspec/specs/drag-file-send/spec.md) — ADDED Requirements
- [openspec/specs/file-download-utils/spec.md](external-docs/openspec/specs/file-download-utils/spec.md) — Purpose
- [openspec/specs/history-emptyrange-windowing/spec.md](external-docs/openspec/specs/history-emptyrange-windowing/spec.md) — Purpose
- [openspec/specs/message-order-stabilization/spec.md](external-docs/openspec/specs/message-order-stabilization/spec.md) — Purpose
- [openspec/specs/package-manager-pnpm-migration/spec.md](external-docs/openspec/specs/package-manager-pnpm-migration/spec.md) — ADDED Requirements
- [openspec/specs/paste-image-send/spec.md](external-docs/openspec/specs/paste-image-send/spec.md) — ADDED Requirements
- [openspec/specs/send-shortcut-config/spec.md](external-docs/openspec/specs/send-shortcut-config/spec.md) — ADDED Requirements
- [openspec/specs/sendbox-async-send/spec.md](external-docs/openspec/specs/sendbox-async-send/spec.md) — ADDED Requirements
- [openspec/specs/sendbox-wechat-layout/spec.md](external-docs/openspec/specs/sendbox-wechat-layout/spec.md) — ADDED Requirements
- [openspec/specs/session-list-search/spec.md](external-docs/openspec/specs/session-list-search/spec.md) — Requirement
- [openspec/specs/unified-settings/spec.md](external-docs/openspec/specs/unified-settings/spec.md) — Requirement
- [openspec/specs/virtual-window-lifecycle/spec.md](external-docs/openspec/specs/virtual-window-lifecycle/spec.md) — Purpose

### 项目规划/ (4 篇)

- [planning/ai-integration-refactor.md](external-docs/planning/ai-integration-refactor.md) — 概述
- [planning/ai-mcp-integration-plan.md](external-docs/planning/ai-mcp-integration-plan.md) — 文档信息
- [planning/connection-test-guide.md](external-docs/planning/connection-test-guide.md) — AI 连接测试功能说明
- [planning/implementation-progress.md](external-docs/planning/implementation-progress.md) — AI MCP 集成功能实施进度

### 重构文档/ (2 篇)

- [refactoring/message-loading-refactor.md](external-docs/refactoring/message-loading-refactor.md) — 概述
- [refactoring/component/MessageBubble.md](external-docs/refactoring/component/MessageBubble.md) — 概述

### 参考资料/ (7 篇)

- [references/auto-background-refresh.md](external-docs/references/auto-background-refresh.md) — 概述
- [references/contact-db-mode-changelog.md](external-docs/references/contact-db-mode-changelog.md) — Contact View 数据库模式变更日志
- [references/final-summary.md](external-docs/references/final-summary.md) — Contact View 功能完善 - 最终总结
- [references/forwarded-media-backend-analysis.md](external-docs/references/forwarded-media-backend-analysis.md) — 背景
- [references/implementation-summary.md](external-docs/references/implementation-summary.md) — 需求回顾
- [references/progress.md](external-docs/references/progress.md) — Chatlog Session v1.0 开发进度报告
- [references/version-history.md](external-docs/references/version-history.md) — v0.8.0 - v0.26.0 版本

### 故障排查/ (2 篇)

- [troubleshooting/notification-issues.md](external-docs/troubleshooting/notification-issues.md) — 文档信息
- [troubleshooting/notification_debug.md](external-docs/troubleshooting/notification_debug.md) — 问题：notificationStore.isEnabled 为什么是 false？

### 其他同类工具/ (2 篇)

- [其他同类工具/留痕-2.md](external-docs/其他同类工具/留痕-2.md) — 永久免费，被吹爆了的神器
- [其他同类工具/留痕.md](external-docs/其他同类工具/留痕.md) — 留痕 MemoTrace v3.0

### performance/ (2 篇)

- [performance/pinyin-optimization.md](external-docs/performance/pinyin-optimization.md) — 性能瓶颈分析
- [performance-analysis-2026-06-17.md](performance-analysis-2026-06-17.md) — 性能测试分析报告 (2026-06-17)

---

**文档总数**: 322 篇 | **归档**: 61 篇 | **最后更新**: 2026-06-17 | **版本**: v0.70.0
