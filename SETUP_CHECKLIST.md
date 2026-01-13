# 项目运行准备清单

## ✅ 必需配置

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
# Google Gemini API（必需 - 用于AI分析和产品推荐）
GEMINI_API_KEY=your_gemini_api_key_here

# 火山引擎豆包语音 API（如果使用火山引擎进行语音识别）
VOLCANO_APP_KEY=your_volcano_app_key_here
VOLCANO_ACCESS_KEY=your_volcano_access_key_here
VOLCANO_API_URL=wss://openspeech.bytedance.com/api/v3/sauc/bigmodel
```

**注意：**
- 如果只使用 Gemini 进行语音识别，只需要配置 `GEMINI_API_KEY`
- 如果要使用火山引擎进行语音识别，需要同时配置火山引擎的三个变量

### 3. 获取 API 密钥

#### Gemini API Key
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建新的 API Key
3. 复制到 `.env.local` 文件

#### 火山引擎 API Key（可选）
1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 开通"语音识别"服务
3. 在控制台获取 `app_key` 和 `access_key`
4. 复制到 `.env.local` 文件

## 🚀 运行项目

```bash
npm run dev
```

项目会在 `http://localhost:3000` 启动

## 🌐 浏览器兼容性

### 必需功能支持
- **WebSocket API** - 所有现代浏览器都支持 ✅
- **CompressionStream API** - 用于 Gzip 压缩/解压
  - Chrome 80+ ✅
  - Firefox 113+ ✅
  - Safari 16.4+ ✅
  - Edge 80+ ✅
  
**如果浏览器不支持 CompressionStream：**
- Chrome/Edge: 更新到最新版本
- Firefox: 更新到 113+
- Safari: 更新到 16.4+（macOS 13+ 或 iOS 16.4+）

### 测试浏览器支持
打开浏览器控制台，运行：
```javascript
console.log('CompressionStream:', typeof CompressionStream !== 'undefined');
console.log('DecompressionStream:', typeof DecompressionStream !== 'undefined');
```
应该都返回 `'function'`

## ⚠️ 重要提示

### 火山引擎 WebSocket 认证问题

**浏览器限制：** 浏览器 WebSocket API **不支持自定义 HTTP Headers**

火山引擎 API 需要通过 Headers 传递认证信息，但浏览器不支持。当前实现尝试通过 URL 参数传递，但**可能不被服务端支持**。

**如果遇到连接问题：**

1. **方案1：使用后端代理（推荐）**
   - 创建一个 Node.js 后端代理服务器
   - 在代理中添加认证 headers
   - 前端连接到代理服务器
   - 详见 `VOLCANO_SETUP.md`

2. **方案2：使用 Gemini 语音识别**
   - 在前端界面选择 "Google Gemini" 作为语音识别服务
   - Gemini 不需要额外的认证配置

3. **方案3：联系火山引擎**
   - 确认是否支持 URL 参数认证
   - 或是否有其他浏览器端认证方式

### 音频格式要求

- **支持的输入格式：** MP3, WAV, M4A, OGG 等（浏览器 AudioContext 支持的格式）
- **自动转换：** 系统会自动转换为 WAV 16kHz, 16bit, 单声道
- **文件大小：** 建议不超过 50MB（浏览器内存限制）

## 📋 快速检查清单

- [ ] Node.js 已安装（建议 18+）
- [ ] 运行 `npm install` 安装依赖
- [ ] 创建 `.env.local` 文件
- [ ] 配置 `GEMINI_API_KEY`
- [ ] （可选）配置火山引擎 API 密钥
- [ ] 浏览器支持 CompressionStream API
- [ ] 运行 `npm run dev` 启动项目

## 🐛 常见问题

### 1. 环境变量不生效
- 确保文件名为 `.env.local`（不是 `.env`）
- 重启开发服务器（`npm run dev`）
- 检查 `vite.config.ts` 中的环境变量定义

### 2. 火山引擎连接失败
- 检查 API 密钥是否正确
- 确认网络连接正常
- 考虑使用后端代理（见 `VOLCANO_SETUP.md`）

### 3. 音频处理失败
- 检查音频文件格式是否支持
- 确认浏览器支持 Web Audio API
- 查看浏览器控制台错误信息

### 4. CompressionStream 不支持
- 更新浏览器到最新版本
- 或使用 Chrome/Edge/Firefox 最新版

## 📞 需要帮助？

如果遇到问题，请检查：
1. 浏览器控制台的错误信息
2. 网络请求是否成功（Network 面板）
3. 环境变量是否正确配置
4. API 密钥是否有效
