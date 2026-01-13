# 火山引擎豆包语音 API 配置指南

## 环境变量配置

在项目根目录创建 `.env.local` 文件，添加以下配置：

```env
# Google Gemini API (原有配置)
GEMINI_API_KEY=your_gemini_api_key

# 火山引擎豆包语音 API 配置
VOLCANO_APP_KEY=your_app_key
VOLCANO_ACCESS_KEY=your_access_key
VOLCANO_API_URL=wss://openspeech.bytedance.com/api/v3/sauc/bigmodel
```

## 获取 API 凭证

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 开通"语音识别"服务
3. 在控制台获取 `app_key` 和 `access_key`

## API 端点说明

火山引擎提供三个不同的 WebSocket 端点：

- **流式识别**：`wss://openspeech.bytedance.com/api/v3/sauc/bigmodel`
  - 实时返回识别结果，延迟低
  
- **异步识别**：`wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async`
  - 异步处理，适合长音频
  
- **非流式识别**：`wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream`
  - 等待完整音频后返回结果

## 重要提示

### 浏览器 WebSocket 限制

**⚠️ 浏览器 WebSocket API 不支持自定义 HTTP Headers**

火山引擎 API 需要通过 HTTP Headers 传递认证信息（`X-Api-App-Key` 和 `X-Api-Access-Key`），但浏览器 WebSocket API 不支持自定义 headers。

### 解决方案

#### 方案1：使用后端代理（推荐）

创建一个后端代理服务器，将 WebSocket 连接转发到火山引擎，并在代理中添加认证 headers。

示例 Node.js 代理代码：

```javascript
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
  const headers = {
    'X-Api-App-Key': process.env.VOLCANO_APP_KEY,
    'X-Api-Access-Key': process.env.VOLCANO_ACCESS_KEY,
    'X-Api-Resource-Id': 'volc.bigasr.sauc.duration',
    'X-Api-Request-Id': crypto.randomUUID()
  };
  
  const volcanoWs = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel', {
    headers
  });
  
  clientWs.on('message', (data) => {
    volcanoWs.send(data);
  });
  
  volcanoWs.on('message', (data) => {
    clientWs.send(data);
  });
  
  clientWs.on('close', () => volcanoWs.close());
  volcanoWs.on('close', () => clientWs.close());
});

server.listen(3001);
```

然后在前端连接到 `ws://localhost:3001`。

#### 方案2：使用 URL 参数（如果服务端支持）

如果火山引擎 API 支持通过 URL 参数传递认证信息，可以直接使用。当前实现已尝试这种方式，但可能不被服务端支持。

#### 方案3：使用 WebSocket 子协议

如果火山引擎 API 支持通过 WebSocket 子协议传递认证信息，可以使用：

```typescript
const ws = new WebSocket(url, ['auth', `${appKey}:${accessKey}`]);
```

## 功能特性

- ✅ 流式语音识别
- ✅ 说话人分离（DDC）
- ✅ 逆文本规范化（ITN）
- ✅ 标点符号识别
- ✅ 实时转录结果回调

## 使用示例

在前端界面选择"火山引擎豆包语音"作为语音识别服务，然后上传音频文件即可使用。

## 故障排查

1. **连接失败**：检查 API 凭证是否正确，网络是否正常
2. **认证错误**：确认 `app_key` 和 `access_key` 已正确配置
3. **浏览器限制**：如果遇到 CORS 或 WebSocket headers 问题，请使用后端代理方案
