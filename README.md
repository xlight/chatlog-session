<div align="center">

# Chatlog Session

*基于 Chatlog API 的微信聊天记录查看器*

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Chatlog API](https://img.shields.io/badge/backend-chatlog-green.svg)](https://github.com/Rupert333/chatlog)

一个现代化的 Web 应用，提供类似微信的界面来查看和管理您的聊天记录。

[功能特性](#功能特性) •
[快速开始](#快速开始) •
[开发指南](#开发指南) •
[API 文档](#api-文档) •
[贡献指南](#贡献指南)

</div>

---

## 📖 简介

Chatlog Session 是一个基于 [Chatlog](https://github.com/Rupert333/chatlog) API 的前端应用，旨在为用户提供一个熟悉、易用的聊天记录查看界面。通过模仿微信的 UI/UX 设计，让用户能够轻松浏览、搜索和管理自己的历史聊天记录。

## ✨ 功能特性

- 🎨 **微信风格界面** - 熟悉的聊天界面设计，降低学习成本
- 💬 **聊天记录浏览** - 查看完整的聊天历史记录
- 🔍 **智能搜索** - 快速查找特定的聊天内容
- 📱 **响应式设计** - 支持桌面和移动设备
- 🖼️ **多媒体支持** - 查看图片、视频、语音等多媒体内容
- 👥 **联系人管理** - 浏览联系人和群聊列表
- 🚀 **无需数据库** - 直接使用 Chatlog API 提供的 SQLite 数据

## 🏗️ 技术栈

| 类型 | 技术 |
|------|------|
| **前端框架** | Vue.js |
| **后端 API** | [Chatlog](https://github.com/Rupert333/chatlog) |
| **数据存储** | SQLite (通过 Chatlog API) |

## 🚀 快速开始

### 前置要求

在开始之前，请确保您已经：

1. ✅ 安装了 [Chatlog](https://github.com/Rupert333/chatlog) 并成功启动 HTTP 服务
2. ✅ 安装了 [Node.js](https://nodejs.org/) (推荐 v16 或更高版本)
3. ✅ 安装了包管理器 (npm 或 yarn)

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/Rupert333/chatlog-session.git
cd chatlog-session

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 配置 Chatlog API

确保 Chatlog API 服务正在运行：

```bash
# 启动 Chatlog HTTP 服务（默认端口 5030）
chatlog server
```

在项目配置文件中设置 API 地址（默认为 `http://127.0.0.1:5030`）。

## 📚 API 文档

本项目使用 Chatlog 提供的 HTTP API，详细的 API 文档请参考：

- [Chatlog API 完整文档](./chatlog-api.md)
- [Chatlog 官方仓库](https://github.com/Rupert333/chatlog)

### 主要 API 端点

```
GET  /api/v1/chatlog     # 获取聊天记录
GET  /api/v1/contact     # 获取联系人列表
GET  /api/v1/chatroom    # 获取群聊列表
GET  /api/v1/session     # 获取会话列表
GET  /image/<id>         # 获取图片
GET  /video/<id>         # 获取视频
GET  /voice/<id>         # 获取语音
```

## 🛠️ 开发指南

### 项目结构

```
chatlog-session/
├── src/              # 源代码目录
├── public/           # 静态资源
├── docs/             # 文档
├── README.md         # 项目说明
└── package.json      # 项目配置
```

### 开发命令

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 代码检查
npm run lint

# 运行测试
npm run test
```

### 环境变量

创建 `.env` 文件配置环境变量：

```env
VITE_API_BASE_URL=http://127.0.0.1:5030
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是报告 bug、提出新功能建议，还是提交代码改进。

### 如何贡献

1. 🍴 Fork 本仓库
2. 🌿 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 💾 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 📤 推送到分支 (`git push origin feature/AmazingFeature`)
5. 🎉 提交 Pull Request

### 代码规范

- 遵循 Vue.js 官方风格指南
- 使用 ESLint 进行代码检查
- 提交前确保所有测试通过
- 编写清晰的 commit message

## 📋 路线图

- [ ] 基础聊天界面
- [ ] 联系人列表展示
- [ ] 搜索功能
- [ ] 多媒体内容预览
- [ ] 聊天记录导出
- [ ] 主题切换
- [ ] 国际化支持

## ❓ 常见问题

### 无法连接到 Chatlog API

确保 Chatlog 服务正在运行：

```bash
chatlog server
```

检查 API 地址配置是否正确。

### 图片无法显示

1. 确认 Chatlog 已正确解密数据库
2. 检查多媒体文件路径是否正确
3. 查看浏览器控制台的错误信息

### 更多问题

如遇到其他问题，请查看：
- [Issues](https://github.com/Rupert333/chatlog-session/issues) - 已知问题列表
- [Chatlog 文档](https://github.com/Rupert333/chatlog) - 后端 API 文档

## ⚠️ 免责声明

本项目仅供学习、研究和个人合法使用。使用本工具时，请遵守以下原则：

- ✅ 仅处理您自己合法拥有的聊天数据
- ✅ 遵守相关法律法规和隐私政策
- ❌ 严禁用于未经授权访问他人数据
- ❌ 禁止用于任何非法目的

使用本项目即表示您已阅读并同意遵守上述条款。开发者不对使用本工具可能导致的任何损失承担责任。

## 📄 许可证

本项目基于 [Apache-2.0 许可证](LICENSE) 开源。

## 🙏 致谢

- [Chatlog](https://github.com/Rupert333/chatlog) - 提供强大的后端 API 支持
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- 所有贡献者和支持者

## 📞 联系方式

- 提交 Issue: [GitHub Issues](https://github.com/Rupert333/chatlog-session/issues)
- 讨论交流: [GitHub Discussions](https://github.com/Rupert333/chatlog-session/discussions)

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐️**

Made with ❤️ by Chatlog Session Team

</div>