<div align="center">

# Chatlog Session

*基于 Chatlog API 的现代化微信聊天记录查看器*

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Chatlog API](https://img.shields.io/badge/backend-chatlog-green.svg)](https://github.com/sjzar/chatlog)
[![Vue 3](https://img.shields.io/badge/vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)

一个现代化的 Web 应用，提供类似微信的界面来查看和管理您的聊天记录。

[在线演示](https://xlight.github.io/chatlog-session/) •
[功能特性](#-功能特性) •
[快速开始](#-快速开始) •
[文档](#-文档) •
[路线图](https://github.com/xlight/chatlog-session-docs/blob/main/ROADMAP.md)

</div>

---

## 📖 简介

Chatlog Session 是一个基于 [Chatlog](https://github.com/sjzar/chatlog) API 的现代化前端应用，采用 Vue 3 + TypeScript + Vite 技术栈，为用户提供熟悉、流畅的聊天记录查看体验。

### 🔒 100% 隐私保护承诺

> **这是一个纯前端应用**，所有数据都在您的浏览器本地处理和存储，**不会上传到任何服务器**。  
> 您的聊天记录、联系人信息等敏感数据完全由您掌控，我们不收集、不存储、不传输任何用户数据。

### ✨ 核心特性

- 🔐 **隐私优先** - 纯前端应用，数据仅存储在浏览器本地
- 🎨 **熟悉界面** - 仿微信设计，零学习成本
- ⚡ **极致性能** - 虚拟滚动、IndexedDB 缓存，加载速度提升 20-40 倍
- 📱 **PWA 支持** - 支持离线使用，可安装到桌面/主屏幕
- 💬 **完整功能** - 支持文本、图片、视频、语音、转发消息等多种类型
- 🔄 **智能同步** - 自动刷新会话列表，实时获取最新消息

## 🌐 在线演示

**🔗 https://xlight.github.io/chatlog-session/**

### 首次使用

1. 访问在线演示地址
2. 进入 **设置 → API 设定**，配置您的 Chatlog API 地址
3. 点击 **测试连接** 验证
4. 返回 **联系人** 视图，开始使用

## 🚀 快速开始

### 方式 1: 在线体验（推荐）

直接访问 [在线演示](https://xlight.github.io/chatlog-session/)，无需安装。

### 方式 2: 本地部署

```bash
# 克隆仓库
git clone https://github.com/xlight/chatlog-session.git
cd chatlog-session

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 配置 Chatlog API

1. **应用内配置（推荐）**：进入 设置 → API 设定 → 输入 API 地址
2. **环境变量**（开发环境）：复制 `.env.example` 为 `.env`，配置 `VITE_API_BASE_URL`

详细说明请参考 [部署文档](docs/deployment/README.md)。

## 📚 文档

### 用户文档
- [用户指南](docs/user-guide/README.md) - 功能使用说明
- [常见问题](docs/user-guide/faq.md) - 疑难解答
- [隐私政策](docs/user-guide/privacy.md) - 隐私保护说明

### 开发文档
- [开发指南](docs/development/README.md) - 开发环境搭建
- [架构设计](docs/architecture/README.md) - 技术架构说明
- [贡献指南](docs/development/contributing.md) - 如何参与开发

### 部署文档
- [GitHub Pages 部署](docs/deployment/github-pages.md)
- [其他部署方式](docs/deployment/README.md)

### 参考文档
- [功能特性详解](docs/features/README.md)
- [API 文档](docs/api/README.md)
- [更新日志](docs/references/version-history.md)
- [路线图](https://github.com/xlight/chatlog-session-docs/blob/main/ROADMAP.md)

## 🛠️ 技术栈

| 类型 | 技术 | 版本 |
|------|------|------|
| **前端框架** | Vue.js | 3.x |
| **开发语言** | TypeScript | 5.x |
| **构建工具** | Vite | 5.x |
| **状态管理** | Pinia | 2.x |
| **UI 组件库** | Element Plus | 2.x |
| **虚拟滚动** | vue-virtual-scroller | next |
| **本地存储** | IndexedDB | - |

## 📋 路线图

### ✅ 已完成

- **v0.14.0** - 聊天记录/转发消息增强、消息列表体验优化、历史消息加载
- **v0.13.0** - PWA 核心功能（Service Worker、Manifest、PWA Store）
- **v0.12.0** - 通知优化、隐私设置、Settings 页面增强
- **v0.11.0** - 图片占位符、消息自动刷新与缓存、消息通知
- **v0.1.0 - v0.10.0** - 早期版本，基础功能和性能优化

### 🔮 规划中

- **v0.15.0 (2025 Q4)** - PWA 安装体验优化、会话列表操作菜单、虚拟滚动优化
- **v0.16.0 (2026 Q1)** - 数据导出增强、消息统计、高级搜索
- **v0.17.0 (2026 Q2)** - 滚动位置记忆、手势返回、下拉刷新、图片懒加载
- **v1.0.0 (2026 Q2)** - 全面测试、文档完善、社区反馈整合

> 详细路线图请参考 [ROADMAP.md](https://github.com/xlight/chatlog-session-docs/blob/main/ROADMAP.md)

## ❓ 常见问题

<details>
<summary><b>Q: 如何配置 API 地址？</b></summary>

进入 **设置 → API 设定**，输入您的 Chatlog API 地址（如 `http://localhost:8080`），点击 **测试连接** 验证。
</details>

<details>
<summary><b>Q: 无法连接到 Chatlog API</b></summary>

1. 确认 Chatlog API 服务已启动
2. 检查 API 地址是否正确
3. 检查浏览器是否允许跨域请求
4. 查看浏览器控制台的错误信息
</details>

<details>
<summary><b>Q: 联系人列表为空</b></summary>

1. 确认 Chatlog API 已成功连接
2. 点击 **后台刷新** 按钮加载数据
3. 等待数据加载完成（查看进度条）
4. 如果仍然为空，检查 Chatlog API 是否有数据
</details>

<details>
<summary><b>Q: 图片无法显示</b></summary>

1. 确认 Chatlog API 的图片服务正常
2. 检查图片 URL 是否正确
3. 尝试在浏览器中直接访问图片 URL
4. 如需提升性能，可在 **设置** 中关闭媒体资源显示
</details>

更多问题请查看 [FAQ 文档](docs/user-guide/faq.md)。

## 🔐 隐私与安全

### 我们的承诺

- ✅ **无服务器上传** - 所有数据仅存储在浏览器本地
- ✅ **无数据收集** - 不收集任何用户行为或敏感信息
- ✅ **无第三方追踪** - 不使用任何分析或追踪工具
- ✅ **完全开源** - 代码公开透明，接受社区审查
- ✅ **用户可控** - 数据随时可清除，完全由用户掌控

### 技术实现

- 🔒 **本地存储**：使用 IndexedDB 在浏览器本地存储数据
- 🔒 **无后端依赖**：纯前端应用，不需要自有后端服务器
- 🔒 **HTTPS 部署**：GitHub Pages 强制 HTTPS，保护传输安全
- 🔒 **开源透明**：所有代码在 GitHub 上公开，可自行审查

详细说明请参考 [隐私政策文档](docs/user-guide/privacy.md)。

## ⚠️ 免责声明

本项目仅供学习和研究使用。使用本项目时：

1. 您需要自行承担数据安全责任
2. 请遵守相关法律法规
3. 请尊重他人隐私权
4. 不得用于任何非法用途

详细声明请参考 [LICENSE](LICENSE) 文件。

## 📄 许可证

本项目采用 Apache License 2.0 许可证。详见 [LICENSE](LICENSE) 文件。

### 主要条款

- ✅ 可自由使用、修改、分发
- ✅ 可用于商业用途
- ✅ 提供专利授权
- ⚠️ 需保留版权声明
- ⚠️ 修改需声明变更
- ⚠️ 无担保责任

## 🙏 致谢

感谢以下开源项目：

- [Chatlog](https://github.com/sjzar/chatlog) - 后端 API 支持
- [Vue.js](https://vuejs.org/) - 前端框架
- [Element Plus](https://element-plus.org/) - UI 组件库
- [Vite](https://vitejs.dev/) - 构建工具

## 📞 联系方式

- 📧 **提交 Issue** - 发现 Bug 或有功能建议？请通过 [GitHub Issues](https://github.com/xlight/chatlog-session/issues) 告诉我们
- 💬 **参与讨论** - 欢迎加入 [GitHub Discussions](https://github.com/xlight/chatlog-session/discussions) 与我们交流
- 📖 **查阅文档** - 详细信息请参阅 [项目文档](docs/README.md)
- 🐧 **QQ 交流群** - 欢迎扫码加入 QQ 群，与其他用户和开发者互动

  <div align="center">
    <img src="./public/qq-group.jpg" alt="Chatlog Session QQ Group" width="250">
    <p><strong>QQ 群号: 1013023266</strong></p>
  </div>

## 🌟 Star History

如果这个项目对您有帮助，请给我们一个 ⭐️

[![Star History Chart](https://api.star-history.com/svg?repos=xlight/chatlog-session&type=Date)](https://star-history.com/#xlight/chatlog-session&Date)

---

<div align="center">

**Built with ❤️ by Chatlog Session Team**

**当前版本**: [v0.14.0](docs/references/version-history.md) | **发布日期**: 2025-11-25

[⬆ 返回顶部](#chatlog-session)

</div>
