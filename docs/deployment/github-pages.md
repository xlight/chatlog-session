# GitHub Pages 部署指南

本文档介绍如何使用 GitHub Actions 自动构建并部署 Chatlog Session 到 GitHub Pages。

## 部署架构

```mermaid
graph LR
    A[推送代码到 main] --> B[触发 GitHub Actions]
    B --> C[安装依赖]
    C --> D[构建项目]
    D --> E[上传构建产物]
    E --> F[部署到 GitHub Pages]
    F --> G[公开访问地址]
```

## 配置步骤

### 1. 启用 GitHub Pages

在 GitHub 仓库中启用 Pages：

1. 进入仓库的 **Settings** → **Pages**
2. 在 **Source** 中选择 **GitHub Actions**
3. 保存设置

### 2. 工作流配置

工作流配置文件位于 `.github/workflows/deploy.yml`，包含以下关键配置：

- **触发条件**：推送到 main 分支、PR 或手动触发
- **权限**：需要 `contents: read`、`pages: write`、`id-token: write`
- **构建步骤**：安装依赖 → 构建 → 上传产物
- **部署步骤**：仅在 main 分支推送时执行

### 3. Vite 配置

`vite.config.ts` 中的 `base` 配置确保资源路径正确：

```typescript
base: process.env.NODE_ENV === 'production' ? '/chatlog-session/' : '/'
```

- 开发环境：使用根路径 `/`
- 生产环境：使用仓库名作为基础路径 `/chatlog-session/`

## 部署流程

### 自动部署

1. 推送代码到 `main` 分支
2. GitHub Actions 自动触发构建
3. 构建成功后自动部署到 GitHub Pages
4. 访问 `https://<username>.github.io/chatlog-session/`

### 手动部署

在 GitHub 仓库的 **Actions** 页面：

1. 选择 **Build and Deploy to GitHub Pages** 工作流
2. 点击 **Run workflow**
3. 选择分支并运行

## 访问地址

部署成功后，应用将可以通过以下地址访问：

```
https://<username>.github.io/chatlog-session/
```

将 `<username>` 替换为你的 GitHub 用户名或组织名。

## 注意事项

### API 配置

由于静态托管无法使用开发环境的代理，需要：

1. 在 **设置** 中配置正确的 API 地址
2. 确保 API 服务器支持 CORS
3. 建议配置：
   - API 基础地址：你的实际 API 服务器地址
   - 超时时间：根据网络情况调整
   - 重试次数：建议 2-3 次

### 首次访问

首次访问部署后的应用时：

1. 应用会从 IndexedDB 加载数据（如果有）
2. 如果数据库为空，需要在设置中配置 API
3. 点击 **后台刷新** 按钮加载联系人数据

### 数据隔离

每个浏览器的 IndexedDB 是独立的：

- 不同设备间数据不共享
- 清除浏览器数据会删除 IndexedDB
- 建议定期备份重要数据

## 构建优化

当前构建配置包含以下优化：

- **代码分割**：Vue 核心库和 Element Plus 单独打包
- **压缩优化**：使用 Terser 压缩，移除 console 和 debugger
- **资源优化**：CSS、JS、图片等资源分类存放
- **缓存友好**：文件名包含哈希值，便于缓存

## 故障排查

### 部署失败

检查 Actions 日志：

1. 进入 **Actions** 页面
2. 点击失败的工作流
3. 查看具体步骤的错误信息

常见问题：

- **依赖安装失败**：检查 `package.json` 和网络
- **构建失败**：检查 TypeScript 类型错误
- **部署权限不足**：确认仓库 Settings → Pages 已启用

### npm 缓存问题

如果遇到以下错误：

```
Error: Dependencies lock file is not found
Error: Some specified paths were not resolved, unable to cache dependencies
```

**解决方案**：

我们的工作流已使用手动缓存配置而非内置缓存，这样更可靠：

```yaml
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-

- name: Install dependencies
  run: npm ci --prefer-offline
```

**缓存策略说明**：

- 缓存 `~/.npm` 目录（npm 全局缓存）
- 缓存 `node_modules` 目录（项目依赖）
- 使用 `package-lock.json` 哈希作为缓存键
- 使用 `--prefer-offline` 标志优先使用缓存

**验证缓存工作**：

在 Actions 日志中查看：

```
Cache dependencies
Post job cleanup.
/usr/bin/tar -xz -f /home/runner/work/_temp/xxx/cache.tgz -P -C /home/runner/work/chatlog-session
Cache restored successfully
```

如果看到 "Cache restored successfully"，说明缓存正常工作。

### 页面无法访问

1. 确认 GitHub Pages 已启用
2. 检查部署状态是否成功
3. 等待几分钟让 CDN 更新
4. 清除浏览器缓存后重试

### 资源加载 404

如果静态资源（CSS、JS）返回 404：

1. 检查 `vite.config.ts` 中的 `base` 配置
2. 确保仓库名与配置一致
3. 重新构建并部署

## 高级配置

### 自定义域名

如果要使用自定义域名：

1. 在 Settings → Pages 中配置自定义域名
2. 更新 `vite.config.ts` 的 `base` 为 `/`
3. 在 DNS 提供商处添加 CNAME 记录

### 多环境部署

可以创建额外的工作流用于不同环境：

- `deploy-dev.yml`：部署到开发环境
- `deploy-staging.yml`：部署到测试环境
- `deploy-prod.yml`：部署到生产环境

### 版本标签

建议在重要版本时创建 Git 标签：

```bash
git tag -a v0.4.1 -m "Release v0.4.1"
git push origin v0.4.1
```

可以配置工作流在标签推送时触发特定部署。

## 性能监控

部署后可以监控以下指标：

- **首次加载时间**：通过浏览器开发工具查看
- **资源大小**：检查 dist 目录的构建产物
- **加载速度**：使用 Lighthouse 等工具测试
- **缓存命中率**：通过 Network 面板观察

## 相关链接

- [GitHub Pages 官方文档](https://docs.github.com/pages)
- [GitHub Actions 文档](https://docs.github.com/actions)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)