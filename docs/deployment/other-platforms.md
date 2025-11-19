# 其他部署平台指南

本文档介绍如何将 Chatlog Session 部署到各种静态托管平台。

## 部署平台对比

| 平台 | 免费额度 | 自动部署 | 自定义域名 | 构建时间 | 推荐度 |
|------|---------|---------|-----------|---------|--------|
| GitHub Pages | ✅ 无限 | ✅ | ✅ | ~2-3分钟 | ⭐⭐⭐⭐⭐ |
| Vercel | 100GB/月 | ✅ | ✅ | ~1-2分钟 | ⭐⭐⭐⭐⭐ |
| Netlify | 100GB/月 | ✅ | ✅ | ~2分钟 | ⭐⭐⭐⭐ |
| Cloudflare Pages | ✅ 无限 | ✅ | ✅ | ~2分钟 | ⭐⭐⭐⭐ |
| 自托管 | 自定义 | ❌ | ✅ | - | ⭐⭐⭐ |

## Vercel 部署

### 方式 1: 通过 Git 集成（推荐）

1. **导入项目**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 **New Project**
   - 选择 GitHub 仓库 `chatlog-session`

2. **配置构建**
   
   Vercel 会自动检测 Vite 项目，默认配置如下：
   
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **环境变量**（可选）
   
   如需预配置 API 地址：
   
   - `VITE_API_BASE_URL`: API 基础地址
   - `VITE_API_TIMEOUT`: 超时时间（毫秒）

4. **部署**
   
   点击 **Deploy** 开始部署，约 1-2 分钟完成。

5. **访问地址**
   
   部署成功后获得地址：
   ```
   https://chatlog-session.vercel.app
   ```

### 方式 2: 使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 部署到生产环境
vercel --prod
```

### 自定义域名

1. 在 Vercel 项目设置中选择 **Domains**
2. 添加自定义域名
3. 按照提示配置 DNS 记录（CNAME 或 A 记录）
4. 等待 SSL 证书自动配置

### 自动部署

- 推送到 `main` 分支自动部署到生产环境
- 推送到其他分支创建预览部署
- PR 自动生成预览链接

## Netlify 部署

### 方式 1: 通过 Git 集成

1. **创建新站点**
   - 访问 [netlify.com](https://netlify.com)
   - 点击 **Add new site** → **Import an existing project**
   - 选择 GitHub 仓库

2. **构建设置**
   
   配置如下：
   
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Base directory**: 留空

3. **环境变量**
   
   在 **Site settings** → **Environment variables** 中添加：
   
   ```
   VITE_API_BASE_URL=https://your-api-domain.com
   VITE_API_TIMEOUT=30000
   ```

4. **部署**
   
   点击 **Deploy site** 开始构建。

5. **访问地址**
   
   ```
   https://your-site-name.netlify.app
   ```

### 方式 2: 拖拽部署

适合快速测试：

```bash
# 本地构建
npm run build

# 拖拽 dist 目录到 Netlify Drop
# 访问 https://app.netlify.com/drop
```

### 方式 3: 使用 Netlify CLI

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 登录
netlify login

# 初始化
netlify init

# 部署
netlify deploy

# 部署到生产环境
netlify deploy --prod
```

### 重定向配置

创建 `public/_redirects` 文件处理 SPA 路由：

```
/*    /index.html   200
```

## Cloudflare Pages

### 通过 Git 集成

1. **创建项目**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 **Pages** → **Create a project**
   - 连接 GitHub 仓库

2. **构建配置**
   
   - **Framework preset**: Vue
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: 留空

3. **环境变量**
   
   在 **Settings** → **Environment variables** 中配置。

4. **部署**
   
   保存后自动开始构建和部署。

5. **访问地址**
   
   ```
   https://chatlog-session.pages.dev
   ```

### 使用 Wrangler CLI

```bash
# 安装 Wrangler
npm i -g wrangler

# 登录
wrangler login

# 部署
wrangler pages deploy dist
```

### 自定义域名

1. 在项目设置中选择 **Custom domains**
2. 添加域名
3. Cloudflare 自动配置 DNS（如果域名在 Cloudflare）

## 自托管部署

### Nginx

1. **构建项目**
   
   ```bash
   npm run build
   ```

2. **Nginx 配置**
   
   创建 `/etc/nginx/sites-available/chatlog-session`:
   
   ```nginx
   server {
       listen 80;
       server_name chatlog.example.com;
       
       root /var/www/chatlog-session;
       index index.html;
       
       # Gzip 压缩
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
       
       # 缓存配置
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
       
       # SPA 路由支持
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # 安全头
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
   }
   ```

3. **部署文件**
   
   ```bash
   # 复制构建产物
   sudo cp -r dist/* /var/www/chatlog-session/
   
   # 设置权限
   sudo chown -R www-data:www-data /var/www/chatlog-session
   
   # 启用站点
   sudo ln -s /etc/nginx/sites-available/chatlog-session /etc/nginx/sites-enabled/
   
   # 测试配置
   sudo nginx -t
   
   # 重载 Nginx
   sudo systemctl reload nginx
   ```

4. **SSL 证书**（使用 Let's Encrypt）
   
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d chatlog.example.com
   ```

### Apache

1. **Apache 配置**
   
   创建 `/etc/apache2/sites-available/chatlog-session.conf`:
   
   ```apache
   <VirtualHost *:80>
       ServerName chatlog.example.com
       DocumentRoot /var/www/chatlog-session
       
       <Directory /var/www/chatlog-session>
           Options -Indexes +FollowSymLinks
           AllowOverride All
           Require all granted
       </Directory>
       
       # 启用压缩
       <IfModule mod_deflate.c>
           AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
       </IfModule>
       
       # 缓存控制
       <IfModule mod_expires.c>
           ExpiresActive On
           ExpiresByType image/jpg "access plus 1 year"
           ExpiresByType image/jpeg "access plus 1 year"
           ExpiresByType image/gif "access plus 1 year"
           ExpiresByType image/png "access plus 1 year"
           ExpiresByType text/css "access plus 1 year"
           ExpiresByType application/javascript "access plus 1 year"
       </IfModule>
   </VirtualHost>
   ```

2. **.htaccess 配置**
   
   在 `dist/.htaccess` 中添加：
   
   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
   </IfModule>
   ```

3. **启用站点**
   
   ```bash
   sudo a2ensite chatlog-session
   sudo a2enmod rewrite expires deflate
   sudo systemctl reload apache2
   ```

### Docker

创建 `Dockerfile`:

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

创建 `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

构建和运行：

```bash
# 构建镜像
docker build -t chatlog-session .

# 运行容器
docker run -d -p 80:80 --name chatlog-session chatlog-session

# 使用 docker-compose
docker-compose up -d
```

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

## 环境配置

### 构建时环境变量

所有平台都支持构建时环境变量：

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `VITE_API_BASE_URL` | API 基础地址 | - | `https://api.example.com` |
| `VITE_API_TIMEOUT` | 请求超时（毫秒） | `30000` | `60000` |
| `VITE_ENABLE_DEBUG` | 调试模式 | `false` | `true` |

### 运行时配置

用户可以在应用内 **设置 → API 设定** 中修改配置，无需重新构建。

## 性能优化

### CDN 加速

1. **Cloudflare CDN**
   
   - 免费全球 CDN
   - 自动优化图片
   - 自动压缩资源

2. **使用建议**
   
   - 启用 Brotli 压缩
   - 配置浏览器缓存
   - 启用 HTTP/3

### 资源优化

在构建配置中已包含：

- 代码分割（Vue、Element Plus 单独打包）
- Tree shaking（移除未使用代码）
- 压缩优化（Terser）
- 资源哈希（缓存友好）

### 监控和分析

推荐工具：

- **Google Analytics**: 访问统计
- **Sentry**: 错误监控
- **Lighthouse**: 性能分析
- **Web Vitals**: 核心指标

## 故障排查

### 404 错误

如果刷新页面出现 404，说明缺少 SPA 路由配置：

- **Nginx**: 添加 `try_files $uri $uri/ /index.html;`
- **Apache**: 添加 `.htaccess` 重写规则
- **Netlify**: 添加 `_redirects` 文件
- **Vercel**: 自动处理，无需配置

### 资源加载失败

检查 `base` 配置是否正确：

```typescript
// vite.config.ts
export default defineConfig({
  base: '/your-path/', // 根据部署路径调整
})
```

### API 连接问题

确保：

1. API 地址配置正确
2. API 服务器支持 CORS
3. HTTPS 站点只能访问 HTTPS API

添加 CORS 头示例（后端）：

```
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## 安全建议

### HTTPS

所有生产环境都应启用 HTTPS：

- GitHub Pages、Vercel、Netlify、Cloudflare 自动提供
- 自托管使用 Let's Encrypt 免费证书

### 安全头

推荐添加的响应头：

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### API 密钥

⚠️ **重要**: 不要在前端代码中硬编码 API 密钥

- 使用环境变量
- 在应用内让用户配置
- 考虑使用代理隐藏真实 API

## 成本估算

### 免费方案对比

所有平台都提供慷慨的免费额度，足够个人使用：

- **GitHub Pages**: 完全免费，无限流量
- **Vercel**: 100GB 流量/月，100 次构建/月
- **Netlify**: 100GB 流量/月，300 分钟构建/月
- **Cloudflare Pages**: 无限流量，500 次构建/月

### 付费方案

如果需要更多资源：

- **Vercel Pro**: $20/月
- **Netlify Pro**: $19/月
- **Cloudflare Pages**: 按需付费

自托管成本取决于服务器配置。

## 相关链接

- [GitHub Pages 部署指南](./github-pages.md)
- [Vercel 官方文档](https://vercel.com/docs)
- [Netlify 官方文档](https://docs.netlify.com)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages)