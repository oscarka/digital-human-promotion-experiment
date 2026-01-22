// 火山引擎豆包语音识别服务
// 基于 sauc_python 的 TypeScript 实现

// 协议常量
const ProtocolVersion = {
  V1: 0b0001
};

const MessageType = {
  CLIENT_FULL_REQUEST: 0b0001,
  CLIENT_AUDIO_ONLY_REQUEST: 0b0010,
  SERVER_FULL_RESPONSE: 0b1001,
  SERVER_ERROR_RESPONSE: 0b1111
};

const MessageTypeSpecificFlags = {
  NO_SEQUENCE: 0b0000,
  POS_SEQUENCE: 0b0001,
  NEG_SEQUENCE: 0b0010,
  NEG_WITH_SEQUENCE: 0b0011
};

const SerializationType = {
  NO_SERIALIZATION: 0b0000,
  JSON: 0b0001
};

const CompressionType = {
  GZIP: 0b0001
};

const DEFAULT_SAMPLE_RATE = 16000;

export interface TimedTranscriptNode {
  startTime: number;
  endTime: number;
  role: 'Doctor' | 'Patient';
  text: string;
  isDefinite?: boolean; // 是否为最终结果（definite: true）
}

export interface AsrResponse {
  code: number;
  event: number;
  isLastPackage: boolean;
  payloadSequence: number;
  payloadSize: number;
  payloadMsg: any;
}

// Gzip 压缩/解压工具（使用 pako 库，需要安装）
// 如果不想引入外部库，可以使用 Web API 的 CompressionStream（需要浏览器支持）
async function gzipCompress(data: Uint8Array): Promise<Uint8Array> {
  // 使用浏览器原生 CompressionStream API
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  writer.write(data);
  writer.close();
  
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) chunks.push(value);
  }
  
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  writer.write(data);
  writer.close();
  
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) chunks.push(value);
  }
  
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// 判断是否为 WAV 格式
function isWavFormat(data: Uint8Array): boolean {
  if (data.length < 44) return false;
  const header = new Uint8Array(data.slice(0, 12));
  return (
    String.fromCharCode(...header.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...header.slice(8, 12)) === 'WAVE'
  );
}

// 将音频文件转换为 WAV 格式（16kHz, 16bit, 单声道）
async function convertToWav(audioFile: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: DEFAULT_SAMPLE_RATE
      });
      
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const wavData = audioBufferToWav(audioBuffer);
        resolve(new Uint8Array(wavData));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(audioFile);
  });
}

// AudioBuffer 转 WAV 格式
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length;
  const numberOfChannels = 1; // 强制单声道
  const sampleRate = DEFAULT_SAMPLE_RATE;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  
  // 合并所有声道为单声道
  const mergedChannel = new Float32Array(length);
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let j = 0; j < channels.length; j++) {
      sum += channels[j][i];
    }
    mergedChannel[i] = sum / channels.length;
  }
  
  // WAV 文件头
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // 写入 PCM 数据
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, mergedChannel[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return arrayBuffer;
}

// 读取 WAV 文件信息
function readWavInfo(data: Uint8Array): { numChannels: number; sampleRate: number; dataOffset: number; dataLength: number } {
  if (data.length < 44) throw new Error('Invalid WAV file: too short');
  
  const sampleRate = new DataView(data.buffer, data.byteOffset + 24, 4).getUint32(0, true);
  const numChannels = new DataView(data.buffer, data.byteOffset + 22, 2).getUint16(0, true);
  
  // 查找 data 子块
  let pos = 36;
  while (pos < data.length - 8) {
    const subchunkId = String.fromCharCode(...data.slice(pos, pos + 4));
    const subchunkSize = new DataView(data.buffer, data.byteOffset + pos + 4, 4).getUint32(0, true);
    if (subchunkId === 'data') {
      return {
        numChannels,
        sampleRate,
        dataOffset: pos + 8,
        dataLength: subchunkSize
      };
    }
    pos += 8 + subchunkSize;
  }
  
  throw new Error('Invalid WAV file: no data subchunk found');
}

// 构建请求头
function buildRequestHeader(messageType: number, flags: number): Uint8Array {
  const header = new Uint8Array(4);
  header[0] = (ProtocolVersion.V1 << 4) | 1;
  header[1] = (messageType << 4) | flags;
  header[2] = (SerializationType.JSON << 4) | CompressionType.GZIP;
  header[3] = 0x00; // reserved
  return header;
}

// 构建完整客户端请求
async function buildFullClientRequest(seq: number): Promise<Uint8Array> {
  const header = buildRequestHeader(
    MessageType.CLIENT_FULL_REQUEST,
    MessageTypeSpecificFlags.POS_SEQUENCE
  );
  
  const payload = {
    user: { uid: 'demo_uid' },
    audio: {
      format: 'wav',
      codec: 'raw',
      rate: 16000,
      bits: 16,
      channel: 1
    },
    request: {
      model_name: 'bigmodel', // bigmodel 默认识别中文普通话
      enable_itn: true, // 逆文本规范化（数字转中文）
      enable_punc: true, // 标点符号
      enable_ddc: true, // 说话人分离
      show_utterances: true, // 显示话语片段
      enable_nonstream: false // 流式输出
    }
  };
  
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const compressedPayload = await gzipCompress(payloadBytes);
  
  const request = new Uint8Array(header.length + 4 + 4 + compressedPayload.length);
  let offset = 0;
  request.set(header, offset);
  offset += header.length;
  
  // 写入序列号（大端序）
  const seqView = new DataView(request.buffer, request.byteOffset + offset, 4);
  seqView.setInt32(0, seq, false);
  offset += 4;
  
  // 写入 payload 大小（大端序）
  const sizeView = new DataView(request.buffer, request.byteOffset + offset, 4);
  sizeView.setUint32(0, compressedPayload.length, false);
  offset += 4;
  
  request.set(compressedPayload, offset);
  
  return request;
}

// 构建音频数据请求
async function buildAudioRequest(seq: number, audioData: Uint8Array, isLast: boolean): Promise<Uint8Array> {
  const flags = isLast 
    ? MessageTypeSpecificFlags.NEG_WITH_SEQUENCE 
    : MessageTypeSpecificFlags.POS_SEQUENCE;
  const finalSeq = isLast ? -seq : seq;
  
  const header = buildRequestHeader(MessageType.CLIENT_AUDIO_ONLY_REQUEST, flags);
  const compressedAudio = await gzipCompress(audioData);
  
  const request = new Uint8Array(header.length + 4 + 4 + compressedAudio.length);
  let offset = 0;
  request.set(header, offset);
  offset += header.length;
  
  // 写入序列号（大端序）
  const seqView = new DataView(request.buffer, request.byteOffset + offset, 4);
  seqView.setInt32(0, finalSeq, false);
  offset += 4;
  
  // 写入 payload 大小（大端序）
  const sizeView = new DataView(request.buffer, request.byteOffset + offset, 4);
  sizeView.setUint32(0, compressedAudio.length, false);
  offset += 4;
  
  request.set(compressedAudio, offset);
  
  return request;
}

// 解析服务器响应
async function parseResponse(data: Uint8Array): Promise<AsrResponse> {
  const response: AsrResponse = {
    code: 0,
    event: 0,
    isLastPackage: false,
    payloadSequence: 0,
    payloadSize: 0,
    payloadMsg: null
  };
  
  const headerSize = data[0] & 0x0f;
  const messageType = data[1] >> 4;
  const flags = data[1] & 0x0f;
  const serialization = data[2] >> 4;
  const compression = data[2] & 0x0f;
  
  let payload = data.slice(headerSize * 4);
  
  // 解析 flags
  if (flags & 0x01) {
    const seqView = new DataView(payload.buffer, payload.byteOffset, 4);
    response.payloadSequence = seqView.getInt32(0, false);
    payload = payload.slice(4);
  }
  if (flags & 0x02) {
    response.isLastPackage = true;
  }
  if (flags & 0x04) {
    const eventView = new DataView(payload.buffer, payload.byteOffset, 4);
    response.event = eventView.getInt32(0, false);
    payload = payload.slice(4);
  }
  
  // 解析消息类型
  if (messageType === MessageType.SERVER_FULL_RESPONSE) {
    const sizeView = new DataView(payload.buffer, payload.byteOffset, 4);
    response.payloadSize = sizeView.getUint32(0, false);
    payload = payload.slice(4);
  } else if (messageType === MessageType.SERVER_ERROR_RESPONSE) {
    const codeView = new DataView(payload.buffer, payload.byteOffset, 4);
    response.code = codeView.getInt32(0, false);
    const sizeView = new DataView(payload.buffer, payload.byteOffset + 4, 4);
    response.payloadSize = sizeView.getUint32(0, false);
    const errorPayload = payload.slice(8, 8 + response.payloadSize);
    
    // 解析错误响应的 payload
    if (errorPayload.length > 0) {
      let errorData = errorPayload;
      
      // 解压缩（如果压缩）
      if (compression === CompressionType.GZIP) {
        try {
          errorData = await gzipDecompress(errorData);
        } catch (e) {
          console.error('Failed to decompress error payload:', e);
        }
      }
      
      // 解析 JSON
      if (serialization === SerializationType.JSON) {
        try {
          const text = new TextDecoder().decode(errorData);
          response.payloadMsg = JSON.parse(text);
          console.error('❌ 错误响应详情:', response.payloadMsg);
        } catch (e) {
          console.error('Failed to parse error payload:', e);
          console.error('原始错误数据:', new TextDecoder().decode(errorData));
        }
      }
    }
    
    return response;
  }
  
  if (payload.length === 0) return response;
  
  // 解压缩（只有在压缩标志为 GZIP 时才解压缩）
  // 注意：服务器可能返回未压缩的响应（compression = 0）
  if (compression === CompressionType.GZIP) {
    try {
      payload = await gzipDecompress(payload);
    } catch (e) {
      console.error('Failed to decompress payload:', e);
      return response;
    }
  }
  // 如果 compression = 0，payload 已经是未压缩的数据，直接使用
  
  // 解析 JSON
  if (serialization === SerializationType.JSON) {
    try {
      const text = new TextDecoder().decode(payload);
      response.payloadMsg = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse payload:', e);
    }
  }
  
  return response;
}

export class VolcanoEngineService {
  private appKey: string;
  private accessKey: string;
  private url: string;
  private ws: WebSocket | null = null;
  private seq: number = 1;
  private segmentDuration: number = 200; // ms

  constructor(appKey: string, accessKey: string, url?: string) {
    this.appKey = appKey;
    this.accessKey = accessKey;
    this.url = url || 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
  }

  // 生成认证头
  // 注意：generateAuthHeaders 方法当前未使用（通过代理服务器连接）
  // 但保留此方法以备将来需要
  private generateAuthHeaders(): Record<string, string> {
    const reqId = crypto.randomUUID();
    const connectId = crypto.randomUUID();
    return {
      'X-Api-Resource-Id': 'volc.bigasr.sauc.duration', // 注意：volc.seedasr 不被允许，应使用 volc.bigasr
      'X-Api-Request-Id': reqId,
      'X-Api-Connect-Id': connectId,
      'X-Api-Access-Key': this.accessKey,
      'X-Api-App-Key': this.appKey
    };
  }

  // 连接 WebSocket
  // 注意：浏览器 WebSocket API 不支持自定义 headers
  // 解决方案：使用本地代理服务器（proxy-server.js）
  // 如果设置了 PROXY_URL，则通过代理连接；否则尝试直接连接（可能失败）
  private async connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      // 优先使用代理服务器（推荐）
      const proxyUrl = process.env.VOLCANO_PROXY_URL || 'ws://localhost:3001';
      const useProxy = process.env.VOLCANO_USE_PROXY !== 'false'; // 默认使用代理
      
      const wsUrl = useProxy ? proxyUrl : `${this.url}?app_key=${encodeURIComponent(this.appKey)}&access_key=${encodeURIComponent(this.accessKey)}`;
      
      // console.log(`Connecting to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      
      let connected = false;
      let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
      let connectionMessageHandler: ((event: MessageEvent) => void) | null = null;
      
      // 处理代理服务器发送的连接确认消息
      connectionMessageHandler = (event: MessageEvent) => {
        try {
          // 检查是否是代理服务器的控制消息（JSON 格式）
          if (event.data instanceof Blob) {
            // 二进制消息，可能是实际的响应，暂时忽略（会在其他地方处理）
            return;
          }
          
          const text = typeof event.data === 'string' ? event.data : event.data.toString();
          const message = JSON.parse(text);
          
          if (message.type === 'connected') {
            console.log('✅ 代理服务器确认：火山引擎连接已建立');
            connected = true;
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            // 移除这个临时消息处理器
            if (connectionMessageHandler) {
              ws.removeEventListener('message', connectionMessageHandler);
              connectionMessageHandler = null;
            }
            resolve(ws);
          } else if (message.type === 'error') {
            console.error('❌ 代理服务器错误:', message.message);
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
            }
            if (connectionMessageHandler) {
              ws.removeEventListener('message', connectionMessageHandler);
            }
            reject(new Error(message.message));
          }
        } catch (e) {
          // 不是 JSON 消息，可能是实际的二进制响应
          // 如果已经连接，忽略（会在其他地方处理）
          if (connected) {
            return;
          }
        }
      };
      
      ws.addEventListener('message', connectionMessageHandler);
      
      ws.onopen = () => {
        // console.log('WebSocket connected to', useProxy ? 'proxy server' : 'Volcano Engine');
        
        if (!useProxy) {
          // 直接连接，不需要等待确认
          connected = true;
          resolve(ws);
        } else {
          // 使用代理，等待代理服务器确认火山引擎连接建立
          // 设置超时（5秒）
          connectionTimeout = setTimeout(() => {
            if (!connected) {
              console.warn('⚠️  等待代理服务器连接确认超时，继续...');
              connected = true;
              if (connectionMessageHandler) {
                ws.removeEventListener('message', connectionMessageHandler);
                connectionMessageHandler = null;
              }
              resolve(ws);
            }
          }, 5000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
        if (connectionMessageHandler) {
          ws.removeEventListener('message', connectionMessageHandler);
        }
        if (useProxy) {
          reject(new Error('Failed to connect to proxy server. Please ensure proxy-server.js is running on ' + proxyUrl));
        } else {
          reject(new Error('Failed to connect to Volcano Engine API. Browser WebSocket cannot send custom headers. Please use proxy server (set VOLCANO_USE_PROXY=true and run proxy-server.js).'));
        }
      };
      
      ws.onclose = (event) => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
        if (connectionMessageHandler) {
          ws.removeEventListener('message', connectionMessageHandler);
        }
        if (event.code !== 1000) {
          console.error('WebSocket closed unexpectedly:', event.code, event.reason);
        }
      };
      
      this.ws = ws;
    });
  }

  // 发送完整客户端请求
  private async sendFullRequest(): Promise<void> {
    if (!this.ws) throw new Error('WebSocket not connected');
    
    const request = await buildFullClientRequest(this.seq);
    this.seq++;
    
    // console.log(`📤 发送完整客户端请求 (seq: ${this.seq - 1}), 大小: ${request.length} bytes`);
    this.ws.send(request);
    
    // 等待响应（只处理二进制消息，忽略代理服务器的控制消息）
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.removeEventListener('message', handler);
        reject(new Error('等待服务器响应超时（10秒）'));
      }, 10000);
      
      const handler = async (event: MessageEvent) => {
        try {
          // 忽略代理服务器的控制消息（JSON 格式）
          if (!(event.data instanceof ArrayBuffer || event.data instanceof Blob)) {
            // 可能是代理服务器的控制消息，忽略
            try {
              const text = typeof event.data === 'string' ? event.data : event.data.toString();
              const msg = JSON.parse(text);
              if (msg.type === 'connected' || msg.type === 'error') {
                // 这是代理服务器的控制消息，忽略
                console.log('忽略代理服务器控制消息:', msg.type);
                return;
              }
            } catch {
              // 不是 JSON，继续处理
            }
          }
          
          // 只处理二进制消息
          const data = event.data instanceof ArrayBuffer 
            ? new Uint8Array(event.data)
            : event.data instanceof Blob
            ? new Uint8Array(await event.data.arrayBuffer())
            : null;
          
          if (!data) {
            console.warn('收到非二进制消息，忽略');
            return;
          }
          
          const response = await parseResponse(data);
          // 收到完整请求响应，静默处理
          
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', handler);
          
          if (response.code !== 0) {
            reject(new Error(`Server error: ${response.code}`));
          } else {
            resolve();
          }
        } catch (e) {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', handler);
          reject(e);
        }
      };
      this.ws?.addEventListener('message', handler);
    });
  }

  // 分割音频数据
  private splitAudio(data: Uint8Array, segmentSize: number): Uint8Array[] {
    const segments: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += segmentSize) {
      const end = Math.min(i + segmentSize, data.length);
      segments.push(data.slice(i, end));
    }
    return segments;
  }

  // 处理转录结果，转换为统一格式
  // 注意：火山引擎流式返回会包含增量更新，需要处理 definite 标志
  private parseTranscription(payloadMsg: any): TimedTranscriptNode[] {
    const results: TimedTranscriptNode[] = [];
    
    if (!payloadMsg) return results;
    
    // 火山引擎返回格式：
    // payloadMsg.result.utterances[] - 包含多个话语片段
    // 每个 utterance 可能有：
    //   - text: 文本内容
    //   - start_time/end_time: 时间范围
    //   - speaker_id: 说话人ID（如果启用DDC）
    //   - definite: 是否为最终结果（true表示最终，false表示中间结果）
    
    let utterances: any[] = [];
    
    if (payloadMsg.result) {
      if (Array.isArray(payloadMsg.result.utterances)) {
        utterances = payloadMsg.result.utterances;
      } else if (payloadMsg.result.text) {
        // 单个结果（向后兼容）
        utterances = [{
          text: payloadMsg.result.text,
          start_time: payloadMsg.result.start_time || 0,
          end_time: payloadMsg.result.end_time || 0,
          speaker_id: payloadMsg.result.speaker_id,
          definite: payloadMsg.result.definite !== undefined ? payloadMsg.result.definite : true
        }];
      }
    } else if (payloadMsg.text) {
      // 直接文本格式（向后兼容）
      utterances = [{
        text: payloadMsg.text,
        start_time: 0,
        end_time: 0,
        definite: true
      }];
    }
    
    for (const utterance of utterances) {
      const text = (utterance.text || '').trim();
      if (!text) continue;
      
      // 检查是否为最终结果（definite: true）
      // 对于流式识别，definite: false 表示中间结果，definite: true 表示最终结果
      const isDefinite = utterance.definite !== undefined ? utterance.definite : true;
      
      const startTime = utterance.start_time || utterance.startTime || 0;
      const endTime = utterance.end_time || utterance.endTime || startTime;
      
      // 根据 DDC 结果判断说话人（如果有）
      let role: 'Doctor' | 'Patient' = 'Patient';
      
      if (utterance.speaker_id !== undefined || utterance.speakerId !== undefined) {
        const speakerId = utterance.speaker_id !== undefined ? utterance.speaker_id : utterance.speakerId;
        // speaker_id: 0 通常是医生，1 通常是患者（根据实际API文档调整）
        role = speakerId === 0 || speakerId === '0' ? 'Doctor' : 'Patient';
      } else {
        // 启发式判断：包含医生常用词汇的判断为医生
        const doctorKeywords = ['医生', '大夫', '您好', '请问', '什么', '怎么', '多久', '哪里'];
        const hasDoctorKeyword = doctorKeywords.some(keyword => text.includes(keyword));
        if (hasDoctorKeyword && text.length < 50) {
          role = 'Doctor';
        }
      }
      
      results.push({
        startTime,
        endTime,
        role,
        text,
        isDefinite // 标记是否为最终结果
      });
    }
    
    return results;
  }

  // 发送音频段（并发执行）
  private async sendAudioSegments(
    ws: WebSocket,
    segments: Uint8Array[]
  ): Promise<void> {
    for (let i = 0; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      const request = await buildAudioRequest(this.seq, segments[i], isLast);
      
      if (!isLast) {
        this.seq++;
      }
      
      // 检查 WebSocket 状态
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(request);
        // 隐藏音频段发送日志，减少控制台噪音
        // if ((i + 1) % 10 === 0 || isLast) {
        //   console.log(`📤 已发送音频段 ${i + 1}/${segments.length}`);
        // }
      } else {
        console.warn('WebSocket 未就绪，无法发送音频数据。状态:', ws.readyState);
        break;
      }
      
      // 模拟实时流（延迟发送，最后一个包不延迟）
      if (!isLast) {
          await new Promise(resolve => setTimeout(resolve, this.segmentDuration));
        }
      }
      // 隐藏完成日志，减少控制台噪音
      // console.log('✅ 所有音频段已发送完成');
    }

  // 接收响应（异步生成器模式，类似 Python demo 的 recv_messages）
  private async *receiveResponses(
    ws: WebSocket,
    sendCompleted: Promise<void>
  ): AsyncGenerator<AsrResponse, void, unknown> {
    const messageQueue: MessageEvent[] = [];
    let isReceiving = true;
    let resolveNext: ((value: MessageEvent) => void) | null = null;
    let sendFinished = false;
    let lastResponseTime = Date.now();

    // 监听发送完成
    sendCompleted.then(() => {
      sendFinished = true;
            // 隐藏发送完成日志，减少控制台噪音
            // console.log('📤 发送任务已完成，等待服务器最终响应...');
    });

    // 消息处理器：将消息加入队列或立即解析
    const messageHandler = (event: MessageEvent) => {
      if (!isReceiving) return;
      
      // 忽略代理服务器的控制消息（JSON 格式）
      if (!(event.data instanceof ArrayBuffer || event.data instanceof Blob)) {
        try {
          const text = typeof event.data === 'string' ? event.data : event.data.toString();
          const msg = JSON.parse(text);
          if (msg.type === 'connected' || msg.type === 'error') {
            // 这是代理服务器的控制消息，忽略
            return;
          }
        } catch {
          // 不是 JSON，继续处理
        }
      }
      
      if (resolveNext) {
        // 如果有等待的 Promise，立即解析
        const resolve = resolveNext;
        resolveNext = null;
        resolve(event);
      } else {
        // 否则加入队列
        messageQueue.push(event);
      }
    };

    ws.addEventListener('message', messageHandler);

    try {
      const MAX_IDLE_TIME = 10000; // 发送完成后，如果10秒没有收到响应，停止接收

      while (isReceiving && ws.readyState === WebSocket.OPEN) {
        let event: MessageEvent | null = null;
        
        // 优先从队列中取消息
        if (messageQueue.length > 0) {
          event = messageQueue.shift()!;
        } else {
          // 等待下一个消息
          // 如果发送已完成，缩短超时时间
          const timeout = sendFinished ? 2000 : 5000;
          event = await Promise.race([
            new Promise<MessageEvent>((resolve) => {
              resolveNext = resolve;
            }),
            new Promise<MessageEvent | null>((resolve) => {
              setTimeout(() => {
                if (resolveNext) {
                  resolveNext = null;
                }
                resolve(ws.readyState === WebSocket.OPEN ? null : null);
              }, timeout);
            })
          ]);
        }

        // 如果 event 为 null（超时）
        if (!event) {
          // 如果发送已完成且超时，检查是否应该停止
          if (sendFinished) {
            const idleTime = Date.now() - lastResponseTime;
            if (idleTime > MAX_IDLE_TIME) {
              console.warn('⏱️ 发送完成后超过10秒未收到响应，停止接收');
              isReceiving = false;
              break;
            }
          }
          // 继续等待
          continue;
        }

        // 处理二进制消息
        let data: Uint8Array | null = null;
        if (event.data instanceof ArrayBuffer) {
          data = new Uint8Array(event.data);
        } else if (event.data instanceof Blob) {
          data = new Uint8Array(await event.data.arrayBuffer());
        }
        
        if (!data || data.length === 0) {
          continue;
        }

        const response = await parseResponse(data);
        lastResponseTime = Date.now(); // 更新最后响应时间
        
        // 只在有错误或最终响应时输出日志
        if (response.code !== 0) {
          console.error('❌ 服务器返回错误:', {
            code: response.code,
            payload: response.payloadMsg
          });
        } else if (response.isLastPackage) {
          console.log('✅ 收到最终响应');
        }
        
        yield response;

        // 检查是否应该停止接收
        if (response.isLastPackage || response.code !== 0) {
          // console.log('✅ 收到最终响应，停止接收');
          isReceiving = false;
          break;
        }
      }
    } catch (error) {
      // 如果等待消息时出错，停止接收
      isReceiving = false;
      if (error instanceof Error) {
        throw error;
      }
    } finally {
      ws.removeEventListener('message', messageHandler);
      isReceiving = false;
    }
  }

  // 流式识别音频文件（修复：并发发送和接收）
  async transcribeAudioFile(
    audioFile: File,
    onTranscript: (transcript: TimedTranscriptNode[]) => void,
    onError?: (error: Error) => void
  ): Promise<TimedTranscriptNode[]> {
    let ws: WebSocket | null = null;
    
    try {
      // 1. 转换音频为 WAV 格式
      const wavData = await convertToWav(audioFile);
      
      // 2. 读取 WAV 信息（用于计算分段大小）
      const { numChannels, sampleRate } = readWavInfo(wavData);
      
      // 3. 计算分段大小（基于完整的 WAV 文件，包括文件头）
      // 注意：Python demo 对完整的 WAV 文件进行分割，第一个分段包含文件头
      const sizePerSec = numChannels * 2 * sampleRate; // 16bit = 2 bytes
      const segmentSize = Math.floor((sizePerSec * this.segmentDuration) / 1000);
      
      // 4. 连接 WebSocket
      ws = await this.connect();
      this.ws = ws;
      
      // 5. 发送完整请求并等待响应
      await this.sendFullRequest();
      
      // 6. 分割音频数据（使用完整的 WAV 文件，包括文件头）
      // Python demo 也是这样做的：对完整的 WAV 文件进行分割
      const segments = this.splitAudio(new Uint8Array(wavData), segmentSize);
      const allResults: TimedTranscriptNode[] = [];
      
      // 7. 并发执行：发送音频段和接收响应
      const sendPromise = this.sendAudioSegments(ws, segments);
      
      // 接收响应并实时处理（传入发送 Promise 以跟踪发送完成状态）
      const receivePromise = (async () => {
        try {
          // 用于跟踪已处理的话语：使用 startTime + endTime 作为唯一标识
          // 同一句话的多次更新会有相同的 startTime，但 endTime 会逐渐增加
          const processedUtterances = new Map<string, TimedTranscriptNode>();
          
          for await (const response of this.receiveResponses(ws, sendPromise)) {
            if (response.payloadMsg) {
              const transcripts = this.parseTranscription(response.payloadMsg);
              
              // 处理每个转录结果：更新或添加新的话语
              const newTranscripts: TimedTranscriptNode[] = [];
              
              for (const transcript of transcripts) {
                // 使用 startTime 作为唯一标识（同一句话的 startTime 相同）
                const utteranceKey = `${transcript.startTime.toFixed(2)}_${transcript.role}`;
                const existing = processedUtterances.get(utteranceKey);
                
                // 如果是最终结果（definite: true），或者新结果比旧结果更完整（endTime 更大或文本更长）
                if (!existing || 
                    transcript.isDefinite || 
                    transcript.endTime > existing.endTime ||
                    (transcript.endTime === existing.endTime && transcript.text.length > existing.text.length)) {
                  
                  // 更新或添加
                  processedUtterances.set(utteranceKey, transcript);
                  
                  // 只返回最终结果或更新的结果
                  if (transcript.isDefinite || !existing) {
                    newTranscripts.push(transcript);
                  } else if (transcript.endTime > existing.endTime || transcript.text.length > existing.text.length) {
                    // 这是同一句话的更新，标记为更新
                    newTranscripts.push(transcript);
                  }
                }
              }
              
              if (newTranscripts.length > 0) {
                allResults.push(...newTranscripts);
                onTranscript(newTranscripts); // 只回调新的或更新的转录结果
              }
            }
            
            if (response.code !== 0) {
              const errorMsg = response.payloadMsg 
                ? `Server error: ${response.code}, Details: ${JSON.stringify(response.payloadMsg)}`
                : `Server error: ${response.code}`;
              onError?.(new Error(errorMsg));
              break;
            }
          }
        } catch (e) {
          console.error('Error receiving responses:', e);
          onError?.(e as Error);
        }
      })();
      
      // 等待发送和接收都完成
      await Promise.all([sendPromise, receivePromise]);
      
      return allResults;
      
    } catch (error) {
      console.error('Transcription error:', error);
      onError?.(error as Error);
      throw error;
    } finally {
      // 安全关闭连接
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      this.ws = null;
    }
  }

  // 关闭连接
  close(): void {
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, 'Normal closure');
        }
      } catch (e) {
        // 忽略关闭错误
      }
      this.ws = null;
    }
  }
}
