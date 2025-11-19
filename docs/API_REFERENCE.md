# Chatlog Session API 参考文档

## 📋 目录

- [1. API 概述](#1-api-概述)
- [2. 认证与授权](#2-认证与授权)
- [3. 聊天记录 API](#3-聊天记录-api)
- [4. 会话管理 API](#4-会话管理-api)
- [5. 联系人 API](#5-联系人-api)
- [6. 多媒体 API](#6-多媒体-api)
- [7. 搜索 API](#7-搜索-api)
- [8. 错误处理](#8-错误处理)
- [9. 状态码说明](#9-状态码说明)

---

## 1. API 概述

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| **基础 URL** | `http://127.0.0.1:5030` |
| **API 版本** | v1 |
| **协议** | HTTP/HTTPS |
| **数据格式** | JSON |
| **字符编码** | UTF-8 |

### 1.2 通用响应格式

#### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 响应数据
  }
}
```

#### 错误响应

```json
{
  "code": 1001,
  "message": "错误描述",
  "data": null
}
```

### 1.3 通用请求头

```http
Content-Type: application/json
Accept: application/json
```

### 1.4 分页参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `limit` | integer | 否 | 50 | 每页数量 |
| `offset` | integer | 否 | 0 | 偏移量 |

---

## 2. 认证与授权

### 2.1 说明

当前版本为本地使用，暂不需要认证。未来版本可能会添加认证机制。

### 2.2 未来认证方案（规划中）

```http
Authorization: Bearer <token>
```

---

## 3. 聊天记录 API

### 3.1 获取聊天记录

#### 接口说明

获取指定会话的聊天记录。

#### 请求

```http
GET /api/v1/chatlog
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `talker` | string | 否 | 聊天对象ID | `wxid_abc123` |
| `time` | string | 否 | 时间范围 | `2024-01-01` 或 `2024-01-01~2024-12-31` |
| `sender` | string | 否 | 发送者ID | `wxid_xyz789` |
| `limit` | integer | 否 | 返回数量 | `50` |
| `offset` | integer | 否 | 偏移量 | `0` |
| `format` | string | 否 | 输出格式 | `json`, `csv`, `text` |

#### 时间格式说明

- **单个日期**: `YYYY-MM-DD` - 查询指定日期的消息
- **日期范围**: `YYYY-MM-DD~YYYY-MM-DD` - 查询时间段内的消息
- **空值**: 不限制时间范围

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 1250,
    "messages": [
      {
        "seq": 1737089400000,
        "time": "2025-11-17T10:30:00+08:00",
        "talker": "wxid_abc123",
        "talkerName": "张三",
        "sender": "wxid_abc123",
        "senderName": "张三",
        "isSelf": false,
        "isChatRoom": false,
        "type": 1,
        "subType": 0,
        "content": "明天见"
      },
      {
        "seq": 1737089460000,
        "time": "2025-11-17T10:31:00+08:00",
        "talker": "wxid_abc123",
        "talkerName": "张三",
        "sender": "self",
        "senderName": "我",
        "isSelf": true,
        "isChatRoom": false,
        "type": 1,
        "subType": 0,
        "content": "好的"
      },
      {
        "seq": 1737089520000,
        "time": "2025-11-17T10:32:00+08:00",
        "talker": "wxid_abc123",
        "talkerName": "张三",
        "sender": "wxid_abc123",
        "senderName": "张三",
        "isSelf": false,
        "isChatRoom": false,
        "type": 3,
        "subType": 0,
        "content": "[图片]",
        "imageUrl": "/image/12345"
      }
    ]
  }
}
```

#### 消息类型 (type)

| 值 | 类型 | 说明 |
|----|------|------|
| 1 | 文本 | 普通文本消息 |
| 3 | 图片 | 图片消息 |
| 34 | 语音 | 语音消息 |
| 43 | 视频 | 视频消息 |
| 47 | 表情 | 大表情、动画表情 |
| 49 | 文件/链接 | 文件、链接、小程序等 |
| 10000 | 系统 | 系统消息 |
| 10002 | 撤回 | 消息撤回 |

#### cURL 示例

```bash
# 获取指定联系人的聊天记录
curl "http://127.0.0.1:5030/api/v1/chatlog?talker=wxid_abc123&limit=20"

# 获取指定时间范围的消息
curl "http://127.0.0.1:5030/api/v1/chatlog?talker=wxid_abc123&time=2025-11-01~2025-11-30"

# 获取群聊中某人的消息
curl "http://127.0.0.1:5030/api/v1/chatlog?talker=12345@chatroom&sender=wxid_abc123"
```

---

## 4. 会话管理 API

### 4.1 获取会话列表

#### 接口说明

获取所有聊天会话列表，按最后消息时间倒序排列。

#### 请求

```http
GET /api/v1/session
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | integer | 否 | 返回数量，默认 50 |
| `offset` | integer | 否 | 偏移量，默认 0 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "talker": "wxid_abc123",
      "talkerName": "张三",
      "avatar": "/image/avatar_abc123",
      "lastMessage": "明天见",
      "lastTime": "2025-11-17T10:30:00+08:00",
      "lastMessageType": 1,
      "unreadCount": 0,
      "isPinned": false,
      "isChatRoom": false,
      "messageCount": 1250
    },
    {
      "talker": "12345@chatroom",
      "talkerName": "项目组",
      "avatar": "/image/avatar_chatroom",
      "lastMessage": "[图片]",
      "lastTime": "2025-11-17T09:15:00+08:00",
      "lastMessageType": 3,
      "unreadCount": 5,
      "isPinned": true,
      "isChatRoom": true,
      "messageCount": 3420
    }
  ]
}
```

#### cURL 示例

```bash
# 获取所有会话
curl "http://127.0.0.1:5030/api/v1/session"

# 分页获取
curl "http://127.0.0.1:5030/api/v1/session?limit=20&offset=0"
```

### 4.2 获取会话详情

#### 接口说明

获取指定会话的详细信息。

#### 请求

```http
GET /api/v1/session/:talker
```

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `talker` | string | 是 | 会话ID |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "talker": "wxid_abc123",
    "talkerName": "张三",
    "avatar": "/image/avatar_abc123",
    "remark": "张三备注",
    "alias": "zhangsan",
    "isChatRoom": false,
    "messageCount": 1250,
    "firstMessageTime": "2024-06-01T08:00:00+08:00",
    "lastMessageTime": "2025-11-17T10:30:00+08:00"
  }
}
```

---

## 5. 联系人 API

### 5.1 获取联系人列表

#### 接口说明

获取所有联系人列表。

#### 请求

```http
GET /api/v1/contact
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 否 | 联系人类型：`friend`, `chatroom`, `official` |
| `keyword` | string | 否 | 搜索关键词 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "wxid": "wxid_abc123",
      "nickname": "张三",
      "remark": "张三备注",
      "alias": "zhangsan",
      "avatar": "/image/avatar_abc123",
      "type": "friend",
      "labelIds": ["1", "2"]
    },
    {
      "wxid": "wxid_xyz789",
      "nickname": "李四",
      "remark": "",
      "alias": "lisi",
      "avatar": "/image/avatar_xyz789",
      "type": "friend",
      "labelIds": []
    }
  ]
}
```

#### cURL 示例

```bash
# 获取所有联系人
curl "http://127.0.0.1:5030/api/v1/contact"

# 搜索联系人
curl "http://127.0.0.1:5030/api/v1/contact?keyword=张三"

# 获取好友列表
curl "http://127.0.0.1:5030/api/v1/contact?type=friend"
```

### 5.2 获取群聊列表

#### 接口说明

获取所有群聊列表。

#### 请求

```http
GET /api/v1/chatroom
```

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "chatroomId": "12345@chatroom",
      "name": "项目组",
      "avatar": "/image/avatar_chatroom",
      "memberCount": 15,
      "owner": "wxid_abc123",
      "members": [
        {
          "wxid": "wxid_abc123",
          "nickname": "张三",
          "displayName": "张三-PM"
        },
        {
          "wxid": "wxid_xyz789",
          "nickname": "李四",
          "displayName": "李四"
        }
      ]
    }
  ]
}
```

### 5.3 获取联系人详情

#### 接口说明

获取指定联系人的详细信息。

#### 请求

```http
GET /api/v1/contact/:wxid
```

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "wxid": "wxid_abc123",
    "nickname": "张三",
    "remark": "张三备注",
    "alias": "zhangsan",
    "avatar": "/image/avatar_abc123",
    "type": "friend",
    "gender": 1,
    "province": "北京",
    "city": "北京",
    "signature": "个性签名",
    "labelIds": ["1", "2"],
    "labels": ["同事", "重要"]
  }
}
```

---

## 6. 多媒体 API

### 6.1 获取图片

#### 接口说明

获取图片内容，返回 302 重定向或直接返回图片。

#### 请求

```http
GET /image/:id
```

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 图片ID |

#### 响应

- **成功**: 302 重定向到图片URL 或 直接返回图片二进制数据
- **失败**: 404 Not Found

#### cURL 示例

```bash
# 获取图片
curl "http://127.0.0.1:5030/image/12345" -o image.jpg
```

### 6.2 获取视频

#### 接口说明

获取视频内容。

#### 请求

```http
GET /video/:id
```

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 视频ID |

#### 响应

- **成功**: 302 重定向到视频URL 或 直接返回视频二进制数据
- **失败**: 404 Not Found

### 6.3 获取语音

#### 接口说明

获取语音内容，自动将 SILK 格式转换为 MP3。

#### 请求

```http
GET /voice/:id
```

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 语音ID |

#### 响应

- **成功**: 返回 MP3 音频流
- **失败**: 404 Not Found

#### 响应头

```http
Content-Type: audio/mpeg
Content-Length: 123456
```

### 6.4 获取文件

#### 接口说明

获取文件内容。

#### 请求

```http
GET /file/:id
```

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 文件ID |

#### 响应

- **成功**: 302 重定向到文件URL 或 直接返回文件二进制数据
- **失败**: 404 Not Found

### 6.5 获取多媒体数据

#### 接口说明

直接访问数据目录下的文件。

#### 请求

```http
GET /data/:path
```

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string | 是 | 相对路径 |

#### 示例

```bash
# 获取图片
curl "http://127.0.0.1:5030/data/Msg/Image/2024-01/abc123.jpg"

# 获取视频
curl "http://127.0.0.1:5030/data/Msg/Video/2024-01/video.mp4"
```

---

## 7. 搜索 API

### 7.1 全局搜索

#### 接口说明

在所有聊天记录中搜索关键词。

#### 请求

```http
GET /api/v1/search
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 是 | 搜索关键词 |
| `time` | string | 否 | 时间范围 |
| `type` | integer | 否 | 消息类型 |
| `talker` | string | 否 | 限定会话 |
| `limit` | integer | 否 | 返回数量 |
| `offset` | integer | 否 | 偏移量 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 125,
    "results": [
      {
        "message": {
          "seq": 1737089400000,
          "time": "2025-11-17T10:30:00+08:00",
          "talker": "wxid_abc123",
          "talkerName": "张三",
          "content": "明天见面讨论项目",
          "type": 1
        },
        "highlight": "明天见面讨论<em>项目</em>",
        "context": {
          "before": "今天有点忙",
          "after": "好的，到时候见"
        }
      }
    ]
  }
}
```

#### cURL 示例

```bash
# 全局搜索
curl "http://127.0.0.1:5030/api/v1/search?keyword=项目"

# 在指定会话中搜索
curl "http://127.0.0.1:5030/api/v1/search?keyword=项目&talker=wxid_abc123"

# 按时间范围搜索
curl "http://127.0.0.1:5030/api/v1/search?keyword=项目&time=2025-11-01~2025-11-30"
```

### 7.2 会话内搜索

#### 接口说明

在指定会话内搜索关键词。

#### 请求

```http
GET /api/v1/chatlog/search
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 是 | 搜索关键词 |
| `talker` | string | 是 | 会话ID |
| `time` | string | 否 | 时间范围 |
| `type` | integer | 否 | 消息类型 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 25,
    "messages": [
      {
        "seq": 1737089400000,
        "time": "2025-11-17T10:30:00+08:00",
        "content": "明天见面讨论项目",
        "type": 1,
        "matchIndex": 6,
        "matchLength": 2
      }
    ]
  }
}
```

---

## 8. 错误处理

### 8.1 错误码定义

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|-------------|
| 0 | 成功 | 200 |
| 1001 | 参数错误 | 400 |
| 1002 | 未授权 | 401 |
| 1003 | 禁止访问 | 403 |
| 1004 | 资源不存在 | 404 |
| 1005 | 请求超时 | 408 |
| 2001 | 服务器错误 | 500 |
| 2002 | 数据库错误 | 500 |
| 2003 | 服务不可用 | 503 |

### 8.2 错误响应示例

```json
{
  "code": 1004,
  "message": "聊天记录不存在",
  "data": null,
  "timestamp": "2025-11-17T10:30:00+08:00",
  "path": "/api/v1/chatlog"
}
```

### 8.3 错误处理建议

#### 客户端处理

```typescript
try {
  const response = await fetch('/api/v1/chatlog?talker=wxid_abc123');
  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message);
  }
  
  return data.data;
} catch (error) {
  console.error('API Error:', error);
  // 显示错误提示
  showError(error.message);
}
```

#### 错误重试

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## 9. 状态码说明

### 9.1 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 302 | 重定向 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 408 | 请求超时 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

### 9.2 业务状态码

| 状态码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1xxx | 客户端错误 |
| 2xxx | 服务器错误 |

---

## 10. 使用示例

### 10.1 JavaScript/TypeScript

```typescript
// API 客户端封装
class ChatlogAPI {
  private baseURL = 'http://127.0.0.1:5030';

  async getChatlog(params: {
    talker?: string;
    time?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await fetch(`${this.baseURL}/api/v1/chatlog?${queryString}`);
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(data.message);
    }
    
    return data.data;
  }

  async getSessions() {
    const response = await fetch(`${this.baseURL}/api/v1/session`);
    const data = await response.json();
    return data.data;
  }

  async getContacts(type?: string) {
    const url = type 
      ? `${this.baseURL}/api/v1/contact?type=${type}`
      : `${this.baseURL}/api/v1/contact`;
    const response = await fetch(url);
    const data = await response.json();
    return data.data;
  }

  getImageUrl(id: string) {
    return `${this.baseURL}/image/${id}`;
  }

  getVideoUrl(id: string) {
    return `${this.baseURL}/video/${id}`;
  }

  getVoiceUrl(id: string) {
    return `${this.baseURL}/voice/${id}`;
  }
}

// 使用示例
const api = new ChatlogAPI();

// 获取聊天记录
const messages = await api.getChatlog({
  talker: 'wxid_abc123',
  time: '2025-11-01~2025-11-30',
  limit: 50
});

// 获取会话列表
const sessions = await api.getSessions();

// 获取联系人
const contacts = await api.getContacts('friend');
```

### 10.2 Python

```python
import requests

class ChatlogAPI:
    def __init__(self, base_url='http://127.0.0.1:5030'):
        self.base_url = base_url
    
    def get_chatlog(self, talker=None, time=None, limit=50, offset=0):
        """获取聊天记录"""
        params = {
            'talker': talker,
            'time': time,
            'limit': limit,
            'offset': offset
        }
        # 移除 None 值
        params = {k: v for k, v in params.items() if v is not None}
        
        response = requests.get(
            f'{self.base_url}/api/v1/chatlog',
            params=params
        )
        data = response.json()
        
        if data['code'] != 0:
            raise Exception(data['message'])
        
        return data['data']
    
    def get_sessions(self):
        """获取会话列表"""
        response = requests.get(f'{self.base_url}/api/v1/session')
        data = response.json()
        return data['data']
    
    def get_image_url(self, image_id):
        """获取图片URL"""
        return f'{self.base_url}/image/{image_id}'

# 使用示例
api = ChatlogAPI()

# 获取聊天记录
messages = api.get_chatlog(
    talker='wxid_abc123',
    time='2025-11-01~2025-11-30',
    limit=50
)

# 获取会话列表
sessions = api.get_sessions()
```

---

## 11. 最佳实践

### 11.1 性能优化

1. **分页加载**: 使用 `limit` 和 `offset` 分页加载数据
2. **缓存数据**: 在客户端缓存常用数据
3. **并发请求**: 合理使用并发请求提高效率
4. **请求合并**: 避免短时间内重复请求

### 11.2 错误处理

1. **统一错误处理**: 封装统一的错误处理逻辑
2. **错误重试**: 对网络错误实现自动重试
3. **用户友好提示**: 将技术错误转换为用户可理解的提示

### 11.3 安全建议

1. **输入验证**: 对用户输入进行验证
2. **XSS 防护**: 对输出内容进行转义
3. **HTTPS**: 生产环境使用 HTTPS
4. **敏感信息**: 不在 URL 中传递敏感信息

---

## 12. 变更日志

### v1.0.0 (2025-11)
- ✅ 初始版本
- ✅ 聊天记录 API
- ✅ 会话管理 API
- ✅ 联系人 API
- ✅ 多媒体 API

### 未来版本规划

- [ ] WebSocket 支持（实时消息推送）
- [ ] 批量操作 API
- [ ] 数据导出 API
- [ ] 统计分析 API

---

## 13. 联系我们

- **GitHub Issues**: https://github.com/xlight/chatlog-session/issues
- **讨论区**: https://github.com/xlight/chatlog-session/discussions
- **Chatlog 项目**: https://github.com/sjzar/chatlog

---

**文档版本**: v1.0.0  
**最后更新**: 2025-11
