# 电话服务集成 - 实施清单

## 🎯 整体目标

**目标**：在现有功能基础上，增加电话服务商推流功能。现有上传音频文件的功能保持不变，两种方式可以并存。

**核心思路**：
- **复用现有功能**：SimulationMode、VolcanoEngineService、GeminiService 等全部复用
- **向后兼容**：保留现有的文件上传流程，新增电话推流流程
- **统一入口**：两种方式最终都进入相同的识别和分析流程

---

## 📋 第一步：向服务商提出要求（假设已完成）

### 服务商必须提供的配置

#### 推流配置
- ✅ 推流协议：WebSocket
- ✅ 推流地址：`wss://your-domain.com/api/telephone/stream`
- ✅ 音频格式：PCM，16kHz，单声道，16bit
- ✅ 推流请求头必须包含：`X-Doctor-Id: doctor_123`

#### 回调配置
- ✅ 回调地址：`https://your-domain.com/api/telephone/callback`
- ✅ 回调方式：HTTP POST，JSON格式
- ✅ 回调数据必须包含：`event`、`call_id`、`doctor_id`、`patient_id`、`patient_name`

**假设**：服务商已经按照以上要求配置完成，我们可以直接开始开发。

---

## 🏗️ 第二步：后端开发（新建Node.js服务）

### 2.1 简易登录系统

**核心功能**：医生登录，获取 doctor_id，用于账号关联

**具体实现**：
- [ ] 创建登录接口 `/api/auth/login`
  - 接收医生账号和密码（或简单的账号验证）
  - 验证账号有效性（可以从配置文件或简单数据库读取）
  - 返回 `doctor_id` 和 `doctor_name`
  - 返回简单的token（可选，用于后续请求验证）

- [ ] 创建医生账号配置（`server/config/doctors.json` 或环境变量）
  ```json
  [
    {
      "username": "doctor001",
      "password": "123456",
      "doctor_id": "doctor_001",
      "doctor_name": "张医生"
    },
    {
      "username": "doctor002",
      "password": "123456",
      "doctor_id": "doctor_002",
      "doctor_name": "李医生"
    }
  ]
  ```
  - 或者使用环境变量：`DOCTORS_CONFIG`（JSON字符串）

- [ ] 实现账号验证逻辑
  - 验证用户名和密码
  - 返回对应的 `doctor_id`

**注意**：这是内部使用的简易登录，不需要复杂的JWT或OAuth，简单验证即可。

### 2.2 项目结构

```
server/
├── index.js                    # 主服务器（Express + WebSocket）
├── config/
│   └── doctors.json           # 医生账号配置（简易）
├── api/
│   ├── auth/
│   │   └── login.js           # 医生登录接口
│   └── telephone/
│       ├── stream.js          # 接收服务商推流
│       └── callback.js        # 接收服务商回调
└── websocket/
    └── manager.js             # WebSocket连接管理（前后端通信）
```

**具体要做**：
- [ ] 创建 `server/` 目录
- [ ] 安装依赖：`npm install express ws dotenv`
- [ ] 创建上述文件结构
- [ ] 创建 `server/config/doctors.json`（医生账号配置）
- [ ] 实现登录接口

### 2.2 推流接收服务（`server/api/telephone/stream.js`）

**核心思路**：接收服务商的音频流，直接转发给现有的 `VolcanoEngineService`

**具体实现**：
- [ ] 创建WebSocket服务器，监听服务商的推流连接
- [ ] 从连接请求头中提取 `doctor_id` 和 `call_id`
- [ ] 验证 `doctor_id` 是否有效
- [ ] **复用现有代码**：创建 `VolcanoEngineService` 实例
- [ ] 将接收到的音频数据直接传给 `VolcanoEngineService.transcribeAudioFile()`
- [ ] 接收识别结果，通过WebSocket通知前端

**关键点**：
- 不需要修改 `VolcanoEngineService`，直接复用
- 音频数据格式必须符合火山引擎要求（16kHz、单声道、PCM）
- 如果服务商格式不对，需要实时转换

### 2.3 回调接收服务（`server/api/telephone/callback.js`）

**功能**：接收服务商的回调，通知前端

**具体实现**：
- [ ] 创建HTTP POST端点 `/api/telephone/callback`
- [ ] 验证回调签名（如果服务商提供）
- [ ] 解析回调数据（JSON）
- [ ] 通过WebSocket通知对应医生的客户端
- [ ] 处理 `call_started`：通知前端弹出提示
- [ ] 处理 `call_ended`：通知前端通话结束

### 2.4 WebSocket管理器（`server/websocket/manager.js`）

**功能**：管理前后端的WebSocket连接

**具体实现**：
- [ ] 创建WebSocket服务器（端口：3003）
- [ ] 客户端连接时，要求发送 `doctor_id` 注册
- [ ] 维护映射表：`Map<doctor_id, WebSocket>`
- [ ] 提供方法：根据 `doctor_id` 发送消息给对应客户端
- [ ] 客户端断开时，从映射表移除

---

## 💻 第三步：前端开发（复用现有功能）

### 3.1 添加简易登录功能

**核心思路**：医生必须先登录，获取 doctor_id，才能使用电话推流功能

**具体实现**：
- [ ] 创建 `components/Login.tsx` 组件
  - 简单的登录表单（用户名、密码）
  - 调用后端登录接口 `/api/auth/login`
  - 保存登录信息到 localStorage：
    - `doctor_id`
    - `doctor_name`
    - `login_token`（可选）
  - 登录成功后跳转到主界面

- [ ] 创建 `services/authService.ts` 服务
  - `login(username, password)` - 调用登录接口
  - `logout()` - 清除登录信息
  - `getCurrentDoctor()` - 从 localStorage 获取当前医生信息
  - `isAuthenticated()` - 检查是否已登录

- [ ] 修改 `App.tsx`：
  - 添加登录状态检查
  - 如果未登录，显示登录页面
  - 如果已登录，显示主界面
  - 保存当前登录医生的 `doctor_id` 到状态中

### 3.2 修改 `App.tsx`（向后兼容）

**核心思路**：保留现有上传功能，新增电话推流功能

**具体修改**：
- [ ] 添加新的状态：`mode: 'upload' | 'telephone'`（默认为 'upload'）
- [ ] 在步骤1添加模式切换：
  - 选项A：上传音频文件（现有功能，保持不变，不需要登录）
  - 选项B：电话推流模式（新增，需要登录）
- [ ] 电话推流模式下：
  - 检查是否已登录（未登录则提示登录）
  - 显示"等待通话中..."状态
  - 建立WebSocket连接（连接后端WebSocket服务器）
  - 发送当前登录医生的 `doctor_id` 进行注册
  - 监听后端消息（推流通知、回调通知）
- [ ] **复用现有逻辑**：
  - 电话推流和文件上传最终都调用相同的 `SimulationMode` 组件
  - 只是数据来源不同（一个来自文件，一个来自推流）

### 3.2 修改 `SimulationMode.tsx`（支持两种数据源）

**核心思路**：让 SimulationMode 既能处理文件，也能处理推流

**具体修改**：
- [ ] 修改组件Props：
  ```typescript
  interface SimulationModeProps {
    // 方式1：文件上传（现有）
    audioFile?: File;
    // 方式2：电话推流（新增）
    callId?: string;
    streamUrl?: string;
    // 其他保持不变
    provider: SpeechRecognitionProvider;
    onFinish: ...;
    onClose: ...;
  }
  ```
- [ ] 修改 `startLiveProcessing` 函数：
  - 如果有 `audioFile`：使用现有逻辑（读取文件，转WAV，发送给识别服务）
  - 如果有 `callId` 和 `streamUrl`：从推流URL接收音频数据，发送给识别服务
- [ ] **复用现有代码**：
  - `handleVolcanoTranscript`：完全复用
  - `triggerDeepAnalysis`：完全复用
  - `generateProductAndScript`：完全复用
  - AI分析逻辑：完全复用

### 3.3 创建 `components/CallStartNotification.tsx`（新组件）

**功能**：通话开始时的提示弹窗

**包含内容**：
- [ ] 显示患者姓名、通话时间
- [ ] "开始实时解析"按钮 → 调用 `SimulationMode`（传入 `callId` 和 `streamUrl`）
- [ ] "稍后处理"按钮 → 关闭弹窗，稍后可以查看

### 3.4 创建 `services/websocketClient.ts`（新服务）

**功能**：WebSocket客户端，连接后端

**包含内容**：
- [ ] 建立WebSocket连接（`ws://localhost:3003`）
- [ ] 发送注册消息：`{ type: 'register', doctorId: 'doctor_123' }`
- [ ] 监听后端消息：
  - `call_started` → 弹出 `CallStartNotification`
  - `call_ended` → 通知 `SimulationMode` 通话结束
  - `transcript` → 转发给 `SimulationMode` 显示
- [ ] 处理连接断开和重连

### 3.5 修改 `types.ts`（新增类型）

- [ ] 添加 `Doctor` 类型（医生信息）
- [ ] 添加 `LoginResponse` 类型（登录响应）
- [ ] 添加 `CallInfo` 类型
- [ ] 添加 `WebSocketMessage` 类型
- [ ] 修改 `SimulationModeProps`（支持两种模式）

---

## 🔗 第四步：数据流转（复用现有流程）

### 4.1 电话推流模式的数据流

```
服务商推流 
  → 后端推流接收服务 
    → 复用 VolcanoEngineService 
      → 识别结果 
        → WebSocket通知前端 
          → SimulationMode 接收 
            → 复用现有 handleVolcanoTranscript 
              → 复用现有 triggerDeepAnalysis 
                → 复用现有 generateProductAndScript 
                  → 显示结果（步骤3）
```

### 4.2 文件上传模式的数据流（保持不变）

```
用户上传文件 
  → SimulationMode 读取文件 
    → 复用 VolcanoEngineService 
      → 识别结果 
        → 复用现有 handleVolcanoTranscript 
          → 复用现有 triggerDeepAnalysis 
            → 复用现有 generateProductAndScript 
              → 显示结果（步骤3）
```

**关键点**：两种模式在 `SimulationMode` 内部统一，后续流程完全相同。

---

## ✅ 第五步：配置和测试

### 5.1 环境配置

**`.env.local`**：
```env
# 现有配置（保持不变）
GEMINI_API_KEY=...
VOLCANO_APP_KEY=...
VOLCANO_ACCESS_KEY=...

# 新增配置
TELEPHONE_SERVICE_ENABLED=true
TELEPHONE_STREAM_RECEIVE_URL=wss://your-domain.com/api/telephone/stream
TELEPHONE_CALLBACK_URL=https://your-domain.com/api/telephone/callback
TELEPHONE_WEBSOCKET_PORT=3003

# 简易登录配置（可选，如果使用环境变量而不是JSON文件）
# DOCTORS_CONFIG='[{"username":"doctor001","password":"123456","doctor_id":"doctor_001","doctor_name":"张医生"}]'
```

### 5.2 启动服务

**终端1：启动后端服务**
```bash
cd server
node index.js
```

**终端2：启动前端**
```bash
npm run dev
```

### 5.3 测试流程

#### 测试1：现有功能（文件上传）
- [ ] 打开前端
- [ ] 选择"上传音频文件"模式
- [ ] 上传文件
- [ ] 验证识别和分析是否正常（应该和之前一样）

#### 测试2：电话推流功能
- [ ] 打开前端
- [ ] 选择"电话推流"模式
- [ ] 显示"等待通话中..."
- [ ] 服务商开始推流（模拟或真实）
- [ ] 验证是否弹出"开始实时解析"提示
- [ ] 点击"开始实时解析"
- [ ] 验证识别和分析是否正常（应该和文件上传一样）

#### 测试3：两种模式切换
- [ ] 在电话推流模式下，可以切换回文件上传模式
- [ ] 在文件上传模式下，可以切换到电话推流模式
- [ ] 验证两种模式互不干扰

---

## 📝 实施步骤（按顺序）

### 阶段1：后端基础（1-2天）
1. [ ] 创建 `server/` 目录和基础结构
2. [ ] 创建医生账号配置文件
3. [ ] 实现简易登录接口
4. [ ] 实现WebSocket管理器（前后端通信）
5. [ ] 实现回调接收服务
6. [ ] 测试登录和WebSocket通信

### 阶段2：推流接收（2-3天）
1. [ ] 实现推流接收服务
2. [ ] **复用 VolcanoEngineService**，将推流数据转发
3. [ ] 测试推流接收和识别

### 阶段3：前端集成（2-3天）
1. [ ] 创建登录页面和认证服务
2. [ ] 修改 `App.tsx`，添加登录检查和模式切换
3. [ ] 修改 `SimulationMode.tsx`，支持两种数据源
4. [ ] 创建 `CallStartNotification` 组件
5. [ ] 创建 `websocketClient` 服务（连接时发送doctor_id）
6. [ ] 测试登录和前端功能

### 阶段4：集成测试（1-2天）
1. [ ] 测试文件上传功能（确保不受影响）
2. [ ] 测试电话推流功能
3. [ ] 测试两种模式切换
4. [ ] 测试多医生场景

**总计**：约6-10个工作日

---

## 🔄 复用现有代码清单

### 完全复用（不需要修改）
- ✅ `services/volcanoEngineService.ts` - 语音识别服务
- ✅ `services/geminiService.ts` - AI分析服务
- ✅ `services/audioUtils.ts` - 音频工具函数
- ✅ `components/SimulationMode.tsx` 中的：
  - `handleVolcanoTranscript` - 转录处理
  - `triggerDeepAnalysis` - 深度分析
  - `generateProductAndScript` - 产品推荐
  - `hasSignificantHealthChange` - 健康变化判断
  - `isScriptSimilar` - 话术相似度判断
  - 所有AI分析逻辑

### 需要扩展（向后兼容）
- 🔧 `components/SimulationMode.tsx`：
  - 支持两种数据源（文件 or 推流）
  - 内部逻辑保持不变
- 🔧 `App.tsx`：
  - 添加模式选择
  - 保留现有上传功能

### 新建代码
- 🆕 `server/` - 后端服务（全新）
- 🆕 `server/api/auth/login.js` - 简易登录接口
- 🆕 `server/config/doctors.json` - 医生账号配置
- 🆕 `components/Login.tsx` - 登录页面（新组件）
- 🆕 `components/CallStartNotification.tsx` - 提示弹窗（新组件）
- 🆕 `services/authService.ts` - 认证服务（新服务）
- 🆕 `services/websocketClient.ts` - WebSocket客户端（新服务）

---

## ⚠️ 关键注意事项

1. **向后兼容**：确保现有文件上传功能完全不受影响
2. **代码复用**：最大化复用现有代码，减少重复
3. **统一流程**：两种模式最终都走相同的识别和分析流程
4. **测试充分**：确保两种模式都能正常工作

---

## 🎯 快速开始（假设服务商已配置好）

1. **配置环境变量**（5分钟）
   - 在 `.env.local` 添加电话服务配置

2. **配置医生账号**（2分钟）
   - 在 `server/config/doctors.json` 添加医生账号信息
   - 或者使用环境变量配置

3. **启动后端服务**（5分钟）
   ```bash
   cd server
   npm install
   node index.js
   ```

4. **启动前端**（1分钟）
   ```bash
   npm run dev
   ```

5. **登录**（2分钟）
   - 打开前端，显示登录页面
   - 输入医生账号和密码登录
   - 获取 doctor_id

6. **测试**（10分钟）
   - 测试文件上传（确保正常，不需要登录）
   - 测试电话推流（需要登录，服务商开始推流后测试）

**总计**：约25分钟即可开始测试

---

## 🧪 本地测试方案（开发阶段）

### 目标
在开发阶段，不需要真实服务商，就能测试完整流程：
1. 上传WAV文件
2. 点击"模拟推流"按钮
3. 系统模拟服务商推流
4. 自动匹配医生，走完整流程

### 实现方案

#### 后端：模拟推流服务

**创建 `server/api/telephone/mock-stream.js`**

**功能**：
- [ ] 创建模拟推流接口 `/api/telephone/mock-stream`
- [ ] 接收前端上传的WAV文件
- [ ] 模拟服务商推流行为：
  - 读取WAV文件
  - 按照服务商协议格式，分段推送音频数据
  - 模拟推流请求头（包含 `X-Doctor-Id`）
  - 调用真实的推流接收服务 `/api/telephone/stream`
- [ ] 模拟回调通知：
  - 发送 `call_started` 回调
  - 推流完成后发送 `call_ended` 回调

**工作流程**：
```
前端上传WAV文件 
  → 调用 /api/telephone/mock-stream 
    → 读取WAV文件，分段推送 
      → 调用 /api/telephone/stream（模拟服务商推流）
        → 走真实推流流程 
          → 识别和分析 
            → 显示结果
```

#### 前端：添加模拟推流按钮

**修改 `App.tsx`**：
- [ ] 在步骤1（上传文件后）添加"模拟推流"按钮
- [ ] 点击后：
  - 将上传的文件发送到 `/api/telephone/mock-stream`
  - 系统自动模拟服务商推流
  - 自动弹出"开始实时解析"提示（模拟回调）
  - 进入实时识别流程

**修改 `components/SimulationMode.tsx`**：
- [ ] 支持两种模式：
  - 模式A：直接处理文件（现有功能，保持不变）
  - 模式B：通过模拟推流处理（新增）
- [ ] 模拟推流模式下：
  - 等待后端模拟推流
  - 接收推流数据
  - 走正常的识别和分析流程

### 测试步骤

1. **启动服务**
   ```bash
   # 终端1：启动后端
   cd server
   node index.js
   
   # 终端2：启动前端
   npm run dev
   ```

2. **登录**
   - 打开前端，登录医生账号（获取 doctor_id）

3. **上传文件并模拟推流**
   - 选择"上传音频文件"模式
   - 上传WAV文件
   - 点击"模拟推流"按钮
   - 系统自动模拟服务商推流

4. **验证流程**
   - 验证是否弹出"开始实时解析"提示
   - 点击"开始实时解析"
   - 验证识别和分析是否正常
   - 验证结果是否正确生成

### 优势

- ✅ **不需要真实服务商**：开发阶段就能测试完整流程
- ✅ **快速迭代**：修改代码后立即测试，不需要等待服务商
- ✅ **真实场景**：模拟推流走真实的推流接收服务，测试真实流程
- ✅ **调试方便**：可以控制推流速度、添加延迟等，方便调试

### 注意事项

- 模拟推流应该尽量模拟真实服务商的行为
- 推流格式必须符合真实服务商的要求（16kHz、单声道、PCM）
- 推流速度可以稍慢一些，方便观察流程
- 测试完成后，可以关闭模拟推流功能，只保留真实推流
