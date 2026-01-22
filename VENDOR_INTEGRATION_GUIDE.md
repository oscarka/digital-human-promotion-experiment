# 供应商语音流对接文档

> **文档目标**: 说明如何将实时语音流对接到我们的数字人平台，使用火山引擎流式语音识别服务

---

## 📌 核心要求总览

### ✅ 必须满足的要求

| 项目 | 要求 |
|------|------|
| **音频采样率** | 16000 Hz |
| **音频位深** | 16 bit |
| **音频声道** | 单声道 (Mono) |
| **音频编码** | Linear PCM, Little Endian |
| **连接方式** | WebSocket (通过我们的代理服务器) |
| **数据格式** | 二进制协议 (具体格式见下文) |

### 💡 推荐配置

| 项目 | 推荐值 | 说明 |
|------|--------|------|
| **发送频率** | 每 200ms 一段 | 模拟实时流，提升识别效果 |
| **每段大小** | 约 6400 字节 | 200ms × 16000Hz × 2字节 |

---

## 1️⃣ 接口信息

### 代理服务器地址

```
WebSocket: ws://[服务器IP]:3001
```

> ⚠️ **重要**: 
> - 浏览器 WebSocket 不支持自定义 Headers，所以**必须**通过我们的代理服务器连接
> - 代理服务器会自动添加认证信息并转发到火山引擎 API

### 火山引擎 API (仅供参考，不需要直连)

```
wss://openspeech.bytedance.com/api/v3/sauc/bigmodel
```

### 认证信息

由代理服务器自动处理，供应商**不需要**关心以下认证细节：
- X-Api-App-Key
- X-Api-Access-Key
- X-Api-Resource-Id
- X-Api-Request-Id
- X-Api-Connect-Id

---

## 2️⃣ 数据对接流程

### 完整流程图

```
供应商系统
    ↓
① 建立 WebSocket 连接 (ws://[IP]:3001)
    ↓
② 等待连接确认消息 {"type": "connected"}
    ↓
③ 发送配置请求 (一次性)
    ↓
④ 开始发送音频流 (PCM 数据，分段发送)
    ↓
⑤ 接收识别结果 (实时返回)
    ↓
⑥ 发送最后一段 (标记结束)
    ↓
⑦ 关闭连接
```

---

## 3️⃣ 音频流格式要求

### 【必须】音频参数

```javascript
{
  采样率: 16000,      // Hz - 必须
  位深: 16,           // bit - 必须
  声道: 1,            // 单声道 - 必须
  编码: "Linear PCM", // 必须
  字节序: "Little Endian" // 必须
}
```

### 【必须】数据格式

**发送的是 PCM 原始音频数据，不是 WAV 文件**

```
错误 ❌: 发送完整的 WAV 文件 (包含 44 字节文件头)
正确 ✅: 发送纯 PCM 音频数据 (16-bit signed integers, little endian)
```

### 数据示例

假设录制了 1 秒的音频：
```
总字节数 = 16000 samples/sec × 2 bytes/sample = 32000 字节
```

这 32000 字节应该分段发送，推荐每段 200ms:
```
每段大小 = 16000 × 0.2 × 2 = 6400 字节
总共需要发送 5 段
```

---

## 4️⃣ WebSocket 通信协议

### 步骤 1: 建立连接

```javascript
const ws = new WebSocket('ws://[服务器IP]:3001');

ws.onopen = () => {
  console.log('WebSocket 已连接');
};
```

### 步骤 2: 等待确认

【必须】等待代理服务器发送连接确认：

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'connected') {
    console.log('✅ 已连接到火山引擎，可以发送数据');
    // 现在可以发送配置和音频数据
  }
};
```

### 步骤 3: 发送配置请求

【必须】第一条消息必须是配置请求，使用我们的协议格式：

```javascript
// 使用我们提供的函数构建
const configRequest = buildFullClientRequest(1); // 序列号从 1 开始
ws.send(configRequest);
```

配置内容 (已编码到 `buildFullClientRequest` 中):
```json
{
  "audio": {
    "format": "wav",
    "rate": 16000,
    "bits": 16,
    "channel": 1
  },
  "request": {
    "enable_itn": true,      // 【推荐】数字转中文
    "enable_punc": true,     // 【推荐】自动标点
    "enable_ddc": true,      // 【推荐】说话人分离
    "show_utterances": true  // 【必须】显示话语片段
  }
}
```

### 步骤 4: 发送音频流

【必须】使用我们的协议格式发送 PCM 数据：

```javascript
let seq = 2; // 配置请求用了序列号 1

// 假设 pcmData 是录制的 PCM 音频数据 (Uint8Array)
const segmentSize = 6400; // 推荐每段 6400 字节 (200ms)

for (let i = 0; i < pcmData.length; i += segmentSize) {
  const end = Math.min(i + segmentSize, pcmData.length);
  const segment = pcmData.slice(i, end);
  
  const isLast = (end >= pcmData.length);
  
  // 使用我们提供的函数构建音频请求
  const audioRequest = buildAudioRequest(seq, segment, isLast);
  ws.send(audioRequest);
  
  if (!isLast) {
    seq++;
    // 【推荐】模拟实时流，延迟 200ms
    await new Promise(r => setTimeout(r, 200));
  }
}
```

### 步骤 5: 接收识别结果

```javascript
ws.onmessage = async (event) => {
  // 区分控制消息和识别结果
  
  if (typeof event.data === 'string') {
    // 控制消息 (JSON)
    const msg = JSON.parse(event.data);
    if (msg.type === 'connected') {
      console.log('连接已建立');
    } else if (msg.type === 'error') {
      console.error('错误:', msg.message);
    }
  } 
  else if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
    // 识别结果 (二进制)
    const data = event.data instanceof ArrayBuffer
      ? new Uint8Array(event.data)
      : new Uint8Array(await event.data.arrayBuffer());
    
    const response = await parseResponse(data);
    
    // 解析结果
    if (response.payloadMsg?.result?.utterances) {
      response.payloadMsg.result.utterances.forEach(utterance => {
        console.log({
          说话人: utterance.speaker_id === 0 ? '医生' : '患者',
          文本: utterance.text,
          开始时间: utterance.start_time + 'ms',
          结束时间: utterance.end_time + 'ms',
          是否最终结果: utterance.definite
        });
      });
    }
  }
};
```

---

## 5️⃣ 识别结果格式

### 返回数据结构

```javascript
{
  "result": {
    "utterances": [
      {
        "text": "您好，请问哪里不舒服",        // 识别文本
        "start_time": 100,                      // 开始时间 (ms)
        "end_time": 1500,                       // 结束时间 (ms)
        "speaker_id": 0,                        // 说话人 ID (0=医生, 1=患者)
        "definite": false                       // 是否最终结果
      }
    ]
  }
}
```

### 【重要】definite 字段说明

| definite | 含义 | 处理方式 |
|----------|------|---------|
| `false` | 中间结果 | 可能会被后续结果更新/覆盖 |
| `true` | 最终结果 | 不会再变化，可以永久保存 |

**示例**:
```
时间 0.5s: {"text": "你好", "definite": false}        ← 中间结果
时间 1.0s: {"text": "你好请问", "definite": false}    ← 更新
时间 1.5s: {"text": "你好请问哪里不舒服", "definite": true}  ← 最终结果
```

---

## 6️⃣ 协议编码函数

供应商需要使用以下我们提供的函数来编码数据:

### 必须使用的函数

```javascript
// 1. 构建配置请求
buildFullClientRequest(seq)
// 参数: seq - 序列号 (从 1 开始)
// 返回: Uint8Array - 编码后的二进制数据

// 2. 构建音频数据请求
buildAudioRequest(seq, audioData, isLast)
// 参数:
//   seq - 序列号 (递增)
//   audioData - PCM 音频数据 (Uint8Array)
//   isLast - 是否最后一段 (boolean)
// 返回: Uint8Array - 编码后的二进制数据

// 3. 解析响应
parseResponse(data)
// 参数: data - 服务器返回的二进制数据 (Uint8Array)
// 返回: Promise<Object> - 解析后的响应对象
```

### 函数实现代码

完整实现请参考:
- `services/volcanoEngineService.ts` (第 230-409 行)

我们会提供编译后的 JavaScript 版本供您使用。

---

## 7️⃣ 错误处理

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| 连接失败 | 代理服务器未运行 | 确认服务器地址和端口 |
| `type: 'error'` 消息 | 认证失败或协议错误 | 检查音频格式和序列号 |
| WebSocket 关闭 (1006) | 音频格式错误 | 检查采样率、位深、声道 |
| 无识别结果 | 音频数据为空或格式错误 | 检查 PCM 数据是否正确 |

### 错误处理代码

```javascript
ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};

ws.onclose = (event) => {
  console.log(`连接关闭: ${event.code}`);
  
  if (event.code === 1006) {
    console.error('异常关闭，请检查:');
    console.error('1. 音频采样率是否为 16000 Hz');
    console.error('2. 音频是否为 16-bit PCM');
    console.error('3. 音频是否为单声道');
  }
};
```

---

## 8️⃣ 完整对接示例

```javascript
// ========== 完整示例代码 ==========

class VoiceStreamClient {
  constructor(serverUrl) {
    this.ws = new WebSocket(serverUrl);
    this.seq = 1;
    this.connected = false;
  }
  
  // 等待连接
  async waitForConnection() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        console.log('WebSocket 已打开');
      };
      
      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          if (msg.type === 'connected') {
            this.connected = true;
            console.log('✅ 火山引擎连接已建立');
            resolve();
          } else if (msg.type === 'error') {
            reject(new Error(msg.message));
          }
        }
      };
      
      this.ws.onerror = reject;
    });
  }
  
  // 发送配置
  async sendConfig() {
    const request = buildFullClientRequest(this.seq++);
    this.ws.send(request);
    console.log('✅ 配置已发送');
    
    // 等待 100ms 让服务器处理
    await new Promise(r => setTimeout(r, 100));
  }
  
  // 发送音频流
  async sendAudioStream(pcmData) {
    const segmentSize = 6400; // 200ms
    
    for (let i = 0; i < pcmData.length; i += segmentSize) {
      const end = Math.min(i + segmentSize, pcmData.length);
      const segment = pcmData.slice(i, end);
      const isLast = (end >= pcmData.length);
      
      const request = buildAudioRequest(this.seq, segment, isLast);
      this.ws.send(request);
      
      console.log(`发送段 ${Math.floor(i/segmentSize) + 1}, ${segment.length} 字节`);
      
      if (!isLast) {
        this.seq++;
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    console.log('✅ 音频流发送完成');
  }
  
  // 监听识别结果
  onResult(callback) {
    this.ws.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        const data = event.data instanceof ArrayBuffer
          ? new Uint8Array(event.data)
          : new Uint8Array(await event.data.arrayBuffer());
        
        const response = await parseResponse(data);
        callback(response);
      }
    };
  }
}

// ========== 使用示例 ==========

async function main() {
  // 1. 创建客户端
  const client = new VoiceStreamClient('ws://localhost:3001');
  
  // 2. 等待连接
  await client.waitForConnection();
  
  // 3. 监听结果
  client.onResult((response) => {
    if (response.payloadMsg?.result?.utterances) {
      response.payloadMsg.result.utterances.forEach(u => {
        console.log(`[${u.speaker_id === 0 ? '医生' : '患者'}] ${u.text}`);
      });
    }
  });
  
  // 4. 发送配置
  await client.sendConfig();
  
  // 5. 获取 PCM 音频数据 (您的录音系统提供)
  const pcmData = await yourRecordingSystem.getPCMData();
  
  // 6. 发送音频流
  await client.sendAudioStream(pcmData);
}
```

---

## 9️⃣ 测试检查清单

### 音频数据检查

- [ ] 采样率 = 16000 Hz
- [ ] 位深 = 16 bit  
- [ ] 声道 = 1 (单声道)
- [ ] 格式 = PCM (不是 WAV 文件)
- [ ] 字节序 = Little Endian

### 连接检查

- [ ] 可以连接到 `ws://[IP]:3001`
- [ ] 收到 `{"type": "connected"}` 消息
- [ ] WebSocket 状态为 OPEN

### 发送检查

- [ ] 第一条消息是配置请求 (`buildFullClientRequest`)
- [ ] 音频数据按约 6400 字节分段
- [ ] 最后一段标记 `isLast = true`
- [ ] 序列号正确递增

### 接收检查

- [ ] 可以接收二进制消息
- [ ] 可以解析识别结果
- [ ] 能正确处理 `definite` 字段

---

## 🔟 技术支持

### 我们提供的资源

1. **协议编码函数** - `buildFullClientRequest`, `buildAudioRequest`, `parseResponse`
2. **代理服务器** - 已部署运行
3. **测试音频样本** - 用于验证对接

### 需要提供的信息

如遇问题，请提供:
1. 音频采样参数 (采样率、位深、声道)
2. WebSocket 连接日志
3. 错误消息和错误码
4. 测试音频样本 (前 5 秒即可)

---

**文档版本**: v2.0  
**更新日期**: 2026-01-19  
**联系方式**: [您的联系方式]
