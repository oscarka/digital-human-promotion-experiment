# 数字人医疗推广实验平台

一个基于实时语音识别和AI分析的医疗数字人推广平台，支持多种语音识别服务（Google Gemini Live API 和火山引擎豆包语音），能够实时分析医患对话，提取健康问题，推荐医疗产品并生成推荐话术。

## ✨ 功能特性

- 🎤 **多语音识别服务支持**
  - Google Gemini Live API（实时语音识别）
  - 火山引擎豆包语音（流式语音识别，支持说话人分离）

- 🤖 **智能AI分析**
  - 实时提取健康问题和风险点
  - 智能诊断总结（使用第二个AI进行严谨性管理）
  - 基于诊断结果推荐医疗产品
  - 生成专业的数字人推荐话术

- 📊 **产品推荐系统**
  - 支持呼吸科、妇科、消化科、心血管科等多个科室
  - 每个科室提供多个产品选项
  - 智能匹配产品与诊断结果

- 🎯 **稳定性优化**
  - 智能去重和内容相似度比较
  - AI驱动的总结更新决策
  - 防止频繁刷新和内容闪烁

## 🚀 快速开始

### 前置要求

- Node.js 18+ 
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd digital-human-promotion-experiment
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

创建 `.env.local` 文件（参考 `.env.example`）：

```env
# Google Gemini API（必需 - 用于AI分析和产品推荐）
GEMINI_API_KEY=your_gemini_api_key_here

# 火山引擎豆包语音 API（可选 - 如果使用火山引擎进行语音识别）
VOLCANO_APP_KEY=your_volcano_app_key_here
VOLCANO_ACCESS_KEY=your_volcano_access_key_here
VOLCANO_API_URL=wss://openspeech.bytedance.com/api/v3/sauc/bigmodel
VOLCANO_PROXY_URL=ws://localhost:3001
VOLCANO_USE_PROXY=true
```

**注意：**
- 如果只使用 Gemini 进行语音识别，只需要配置 `GEMINI_API_KEY`
- 如果要使用火山引擎进行语音识别，需要同时配置火山引擎的相关变量

4. **获取 API 密钥**

#### Gemini API Key
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建新的 API Key
3. 复制到 `.env.local` 文件

#### 火山引擎 API Key（可选）
1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 开通"语音识别"服务（豆包流式语音识别模型）
3. 在控制台获取 `app_key` 和 `access_key`
4. 复制到 `.env.local` 文件

### 运行项目

#### 如果使用火山引擎语音识别

1. **启动代理服务器**（新开一个终端）
```bash
npm run proxy
```

2. **启动前端应用**（另一个终端）
```bash
npm run dev
```

#### 如果只使用 Gemini 语音识别

直接运行：
```bash
npm run dev
```

访问 `http://localhost:5173/` 开始使用。

## 📖 使用指南

### 基本流程

1. **选择语音识别服务**
   - 在页面顶部选择 "Google Gemini" 或 "火山引擎豆包语音"

2. **选择AI分析模型**
   - Gemini 3 Flash（快速）
   - Gemini 3 Pro（复杂场景）

3. **上传音频文件**
   - 支持 WAV 格式
   - 系统会自动进行语音识别和AI分析

4. **查看结果**
   - 左侧：实时转录的医患对话
   - 右侧：AI分析的健康问题、风险点、推荐产品和话术

### 产品库

系统内置了以下科室的产品：

- **呼吸科**：智能慢性咳嗽管理、呼吸健康智慧管理
- **妇科**：孕期健康监测、女性健康全周期管理
- **消化科**：肠胃健康订阅服务、肠胃健康调理方案
- **心血管科**：高血压守护包、心血管健康守护计划

## 🛠️ 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **AI服务**: Google Gemini API
- **语音识别**: 
  - Google Gemini Live API
  - 火山引擎豆包语音 API
- **WebSocket**: 用于实时通信
- **音频处理**: Web Audio API

## 📁 项目结构

```
digital-human-promotion-experiment/
├── components/          # React 组件
│   ├── LiveConsultant.tsx    # 实时咨询组件
│   └── SimulationMode.tsx   # 模拟模式组件
├── services/           # 服务层
│   ├── audioUtils.ts        # 音频工具函数
│   ├── geminiService.ts     # Gemini API 服务
│   ├── simulationService.ts # 模拟服务
│   └── volcanoEngineService.ts # 火山引擎服务
├── sauc_python/       # Python 测试脚本（参考）
├── proxy-server.js    # WebSocket 代理服务器（用于火山引擎）
├── constants.ts       # 常量定义（产品库等）
├── types.ts          # TypeScript 类型定义
└── README.md         # 项目说明文档
```

## 🔧 开发

### 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run proxy` - 启动 WebSocket 代理服务器（用于火山引擎）

### 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `GEMINI_API_KEY` | 是 | Google Gemini API 密钥 |
| `VOLCANO_APP_KEY` | 否 | 火山引擎 App Key |
| `VOLCANO_ACCESS_KEY` | 否 | 火山引擎 Access Key |
| `VOLCANO_API_URL` | 否 | 火山引擎 API 地址 |
| `VOLCANO_PROXY_URL` | 否 | 代理服务器地址 |
| `VOLCANO_USE_PROXY` | 否 | 是否使用代理服务器 |

## 📚 文档

- [设置指南](SETUP_CHECKLIST.md) - 详细的配置步骤
- [测试指南](TESTING_GUIDE.md) - 测试方法和注意事项
- [故障排查](TROUBLESHOOTING.md) - 常见问题和解决方案
- [API模式说明](API_MODES_EXPLAINED.md) - 火山引擎API模式详解
- [火山引擎设置](VOLCANO_SETUP.md) - 火山引擎服务配置指南
- [代理服务器设置](PROXY_SETUP.md) - WebSocket代理服务器配置

## ⚠️ 注意事项

1. **API密钥安全**
   - 不要将 `.env.local` 文件提交到版本控制系统
   - 使用 `.env.example` 作为模板

2. **浏览器兼容性**
   - 推荐使用 Chrome、Edge 或 Firefox 最新版本
   - 需要支持 Web Audio API 和 WebSocket

3. **音频格式**
   - 推荐使用 WAV 格式（16kHz, 16bit, mono）
   - 系统会自动转换音频格式

## 📝 许可证

本项目仅供学习和研究使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
