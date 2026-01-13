# 火山引擎代理服务器设置指南

## 问题说明

浏览器 WebSocket API **不支持自定义 HTTP Headers**，而火山引擎 API 需要通过 Headers 传递认证信息（`X-Api-App-Key` 和 `X-Api-Access-Key`）。

因此需要创建一个后端代理服务器来转发 WebSocket 连接并添加认证 headers。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

这会安装 `ws` 包（WebSocket 服务器库）。

### 2. 配置环境变量

确保 `.env.local` 文件包含：

```env
VOLCANO_APP_KEY=5825385546
VOLCANO_ACCESS_KEY=your_access_token_here
VOLCANO_API_URL=wss://openspeech.bytedance.com/api/v3/sauc/bigmodel
VOLCANO_PROXY_URL=ws://localhost:3001
VOLCANO_USE_PROXY=true
```

### 3. 启动代理服务器

**新开一个终端窗口**，运行：

```bash
npm run proxy
```

或者：

```bash
node proxy-server.js
```

你会看到：

```
✅ 代理服务器已启动
📡 监听端口: 3001
🔗 火山引擎 API: wss://openspeech.bytedance.com/api/v3/sauc/bigmodel

前端应连接到: ws://localhost:3001
```

### 4. 启动前端应用

**在另一个终端窗口**，运行：

```bash
npm run dev
```

### 5. 测试

1. 打开浏览器访问 `http://localhost:3000`
2. 选择"火山引擎豆包语音"作为语音识别服务
3. 上传音频文件测试

## 工作原理

```
浏览器 (前端)
    ↓ WebSocket (无认证)
    ↓
代理服务器 (proxy-server.js)
    ↓ WebSocket (添加认证 headers)
    ↓
火山引擎 API
```

代理服务器会：
1. 接收来自浏览器的 WebSocket 连接
2. 自动添加认证 headers（`X-Api-App-Key` 和 `X-Api-Access-Key`）
3. 转发所有消息到火山引擎 API
4. 将响应返回给浏览器

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VOLCANO_APP_KEY` | 火山引擎 APP ID | 必需 |
| `VOLCANO_ACCESS_KEY` | 火山引擎 Access Token | 必需 |
| `VOLCANO_API_URL` | 火山引擎 API 地址 | `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel` |
| `VOLCANO_PROXY_URL` | 代理服务器地址 | `ws://localhost:3001` |
| `VOLCANO_USE_PROXY` | 是否使用代理 | `true` |
| `PROXY_PORT` | 代理服务器端口 | `3001` |

## 故障排查

### 1. 代理服务器无法启动

**错误**: `Cannot find module 'ws'`

**解决**: 
```bash
npm install ws
```

### 2. 前端连接失败

**错误**: `Failed to connect to proxy server`

**检查**:
- 代理服务器是否正在运行（`npm run proxy`）
- 端口 3001 是否被占用
- `.env.local` 中的 `VOLCANO_PROXY_URL` 是否正确

### 3. 认证失败

**错误**: `WebSocket closed unexpectedly: 1006`

**检查**:
- `.env.local` 中的 `VOLCANO_APP_KEY` 和 `VOLCANO_ACCESS_KEY` 是否正确
- 代理服务器的环境变量是否正确（代理服务器会读取 `.env.local`）

### 4. 端口冲突

如果 3001 端口被占用，可以修改：

**方法1**: 修改环境变量
```env
PROXY_PORT=3002
VOLCANO_PROXY_URL=ws://localhost:3002
```

**方法2**: 直接修改 `proxy-server.js` 中的 `PROXY_PORT` 常量

## 开发模式建议

为了方便开发，可以同时运行两个服务：

**终端1** - 代理服务器：
```bash
npm run proxy
```

**终端2** - 前端开发服务器：
```bash
npm run dev
```

或者使用 `concurrently` 同时运行（可选）：

```bash
npm install --save-dev concurrently
```

然后在 `package.json` 中添加：

```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run proxy\" \"npm run dev\""
  }
}
```

然后运行：
```bash
npm run dev:all
```

## 生产环境部署

在生产环境中，你需要：

1. 将代理服务器部署到服务器（如 Node.js 服务器）
2. 配置 HTTPS/WSS（如果前端使用 HTTPS）
3. 更新 `VOLCANO_PROXY_URL` 为生产环境的代理地址
4. 确保代理服务器的环境变量正确配置

## 安全提示

⚠️ **重要**: 代理服务器包含敏感信息（API 密钥），请确保：

1. 不要将 `.env.local` 提交到 Git
2. 在生产环境中使用环境变量管理工具
3. 限制代理服务器的访问（如只允许特定域名访问）
4. 考虑添加身份验证（如果需要）
