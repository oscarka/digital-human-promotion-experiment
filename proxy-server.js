// 火山引擎 WebSocket 代理服务器
// 解决浏览器 WebSocket API 不支持自定义 headers 的问题

import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { HttpsProxyAgent } from 'https-proxy-agent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取环境变量（支持 .env, .env.production 和 .env.local）
function loadEnv() {
  let envFile = '.env';
  try {
    // 优先使用 .env，然后是 .env.production，最后是 .env.local
    if (!existsSync(join(__dirname, '.env'))) {
      envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
    }
    const envPath = join(__dirname, envFile);
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim();
          // 移除引号（如果存在）
          if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          env[key.trim()] = value;
        }
      }
    });
    Object.assign(process.env, env);
    console.log(`✅ 已加载环境变量 (${envFile}):`, Object.keys(env).join(', '));
  } catch (e) {
    console.warn(`⚠️  无法读取 ${envFile} 文件:`, e.message);
    console.log('将使用系统环境变量或 Docker 传入的环境变量');
  }
}

loadEnv();

console.log('\n🚀 Starting Proxy Server with following env:');
console.log('  VOLCANO_APP_KEY:', process.env.VOLCANO_APP_KEY || 'NOT SET');
console.log('  VOLCANO_ACCESS_KEY:', process.env.VOLCANO_ACCESS_KEY ? `${process.env.VOLCANO_ACCESS_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('  VOLCANO_API_URL:', process.env.VOLCANO_API_URL || 'DEFAULT');
console.log('  PROXY_PORT:', process.env.PROXY_PORT || '3001');

// 从环境变量读取配置
const VOLCANO_APP_KEY = process.env.VOLCANO_APP_KEY || '';
const VOLCANO_ACCESS_KEY = process.env.VOLCANO_ACCESS_KEY || '';
const VOLCANO_API_URL = process.env.VOLCANO_API_URL || 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
const PROXY_PORT = process.env.PROXY_PORT || 3001;

if (!VOLCANO_APP_KEY || !VOLCANO_ACCESS_KEY) {
  console.error('\n❌ 错误: 请设置环境变量 VOLCANO_APP_KEY 和 VOLCANO_ACCESS_KEY');
  console.error('请在 .env.local 文件中配置，或通过环境变量设置\n');
  console.log('示例 .env.local 内容:');
  console.log('VOLCANO_APP_KEY=5825385546');
  console.log('VOLCANO_ACCESS_KEY=your_access_token_here\n');
  process.exit(1);
}

console.log('\n📋 配置信息:');
console.log('APP Key:', VOLCANO_APP_KEY);
console.log('Access Key:', VOLCANO_ACCESS_KEY.substring(0, 15) + '...');
console.log('API URL:', VOLCANO_API_URL);
console.log('');

const server = http.createServer();

const wss = new WebSocketServer({
  server,
  // 允许跨域
  verifyClient: (info) => {
    return true;
  }
});

wss.on('connection', (clientWs, req) => {
  console.log('客户端连接:', req.socket.remoteAddress);

  // 检查认证信息
  if (!VOLCANO_APP_KEY || !VOLCANO_ACCESS_KEY) {
    console.error('错误: 认证信息缺失');
    console.log('VOLCANO_APP_KEY:', VOLCANO_APP_KEY ? '已设置' : '未设置');
    console.log('VOLCANO_ACCESS_KEY:', VOLCANO_ACCESS_KEY ? '已设置' : '未设置');
    clientWs.close(1008, 'Authentication credentials missing');
    return;
  }

  // 生成认证 headers
  const requestId = crypto.randomUUID();
  const connectId = crypto.randomUUID(); // 连接ID，每次连接都需要新的UUID
  const headers = {
    'X-Api-Resource-Id': 'volc.bigasr.sauc.duration', // 注意：volc.seedasr 返回 400，使用 volc.bigasr
    'X-Api-Request-Id': requestId,
    'X-Api-Connect-Id': connectId, // 必需：连接ID
    'X-Api-Access-Key': VOLCANO_ACCESS_KEY,
    'X-Api-App-Key': VOLCANO_APP_KEY
  };

  console.log('\n🔗 连接火山引擎 API:');
  console.log('  URL:', VOLCANO_API_URL);
  console.log('  Request ID:', requestId);
  console.log('  Connect ID:', connectId);
  console.log('  APP Key:', VOLCANO_APP_KEY);
  console.log('  Access Key 长度:', VOLCANO_ACCESS_KEY.length);
  console.log('  Access Key 前15位:', VOLCANO_ACCESS_KEY.substring(0, 15) + '...');
  console.log('  Headers:', JSON.stringify(headers, null, 2));

  // 连接到火山引擎 API
  const wsOptions = {
    headers,
    handshakeTimeout: 10000,
    perMessageDeflate: false
  };

  // 检查是否需要使用代理
  const proxyUrl = process.env.HTTPS_PROXY || process.env.http_proxy;
  if (proxyUrl) {
    console.log(`🔌 使用代理连接: ${proxyUrl}`);
    wsOptions.agent = new HttpsProxyAgent(proxyUrl);
  }

  const volcanoWs = new WebSocket(VOLCANO_API_URL, wsOptions);

  // 监听 WebSocket 升级响应（用于捕获 400 错误的响应体）
  volcanoWs.on('unexpected-response', (request, response) => {
    console.error('\n❌ WebSocket 升级失败:');
    console.error('  状态码:', response.statusCode);
    console.error('  状态消息:', response.statusMessage);
    console.error('  响应头:', response.headers);

    // 尝试读取响应体
    let responseBody = '';
    response.on('data', (chunk) => {
      responseBody += chunk.toString();
    });
    response.on('end', () => {
      console.error('  响应体:', responseBody);
      try {
        const parsed = JSON.parse(responseBody);
        console.error('  解析后的错误:', JSON.stringify(parsed, null, 2));
        if (parsed.error) {
          console.error('\n💡 错误提示:', parsed.error);
        }
      } catch (e) {
        // 不是 JSON，直接显示
        console.error('  原始响应:', responseBody);
      }
    });
  });

  // 消息队列：缓存客户端消息，直到火山引擎连接建立
  const messageQueue = [];
  let volcanoConnected = false;

  volcanoWs.on('open', () => {
    console.log('✅ 已连接到火山引擎 API');
    volcanoConnected = true;

    // 发送连接成功消息给客户端
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'connected' }));
      console.log('📤 已通知客户端：火山引擎连接已建立');
    }

    // 转发队列中的消息
    const queueLength = messageQueue.length;
    if (queueLength > 0) {
      console.log(`📦 转发 ${queueLength} 个队列中的消息到火山引擎`);
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (volcanoWs.readyState === WebSocket.OPEN) {
          volcanoWs.send(msg);
        }
      }
    } else {
      console.log('📭 消息队列为空，等待客户端发送请求');
    }
  });

  volcanoWs.on('error', (error) => {
    console.error('\n❌ 火山引擎连接错误:');
    console.error('错误消息:', error.message);
    console.error('错误代码:', error.code);
    console.error('完整错误:', error);

    // 403 错误通常是认证失败
    if (error.message && error.message.includes('403')) {
      console.error('\n⚠️  403 错误可能的原因:');
      console.error('1. Access Token 不正确或已过期');
      console.error('2. APP Key 不正确');
      console.error('3. API 服务未开通或权限不足');
      console.error('4. 请检查火山引擎控制台的认证信息\n');
    }

    // 清空消息队列
    messageQueue.length = 0;

    if (clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: `Failed to connect to Volcano Engine API: ${error.message}`
        }));
      } catch (e) {
        console.error('发送错误消息失败:', e);
      }
    }
  });

  volcanoWs.on('close', (code, reason) => {
    const reasonStr = reason.toString();
    console.log('火山引擎连接关闭:', code, reasonStr);

    // 记录关闭原因
    if (code === 1006) {
      console.error('⚠️  异常关闭 (1006): 连接异常断开，可能是协议错误或服务器拒绝');
    } else if (code === 1000) {
      if (reasonStr.includes('session failed')) {
        console.error('⚠️  会话失败: 服务器拒绝了会话');
        console.error('   可能的原因:');
        console.error('   1. Resource-Id 不正确');
        console.error('   2. 连接后没有及时发送完整请求');
        console.error('   3. 协议格式错误');
      } else {
        console.log('✅ 正常关闭 (1000)');
      }
    } else {
      console.warn(`⚠️  关闭代码: ${code}, 原因: ${reasonStr}`);
    }

    volcanoConnected = false;
    messageQueue.length = 0; // 清空队列

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });

  // 转发客户端消息到火山引擎（使用队列机制）
  clientWs.on('message', (data) => {
    // 记录消息信息
    const msgSize = Buffer.isBuffer(data) ? data.length : data.byteLength || data.size || 'unknown';
    if (Buffer.isBuffer(data) && data.length >= 4) {
      const msgType = (data[1] >> 4) & 0x0F;
      // console.log(`📨 收到客户端消息: ${msgSize} bytes, 消息类型: 0x${msgType.toString(16)}`);
    } else {
      // console.log(`📨 收到客户端消息: ${msgSize} bytes`);
    }

    if (volcanoWs.readyState === WebSocket.OPEN && volcanoConnected) {
      // 连接已建立，直接转发
      volcanoWs.send(data);
      // console.log(`✅ 已转发消息到火山引擎`);
    } else if (volcanoWs.readyState === WebSocket.CONNECTING) {
      // 连接中，加入队列等待
      messageQueue.push(data);
      // console.log(`📦 消息已加入队列（等待连接建立），队列长度: ${messageQueue.length}`);
    } else {
      // 连接未就绪或已关闭
      console.warn(`⚠️  火山引擎连接未就绪，无法转发消息。状态: ${volcanoWs.readyState}, 已连接: ${volcanoConnected}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: 'Volcano Engine connection not ready'
        }));
      }
    }
  });

  // 转发火山引擎消息到客户端
  volcanoWs.on('message', (data) => {
    const msgSize = Buffer.isBuffer(data) ? data.length : data.byteLength || data.size || 'unknown';
    if (Buffer.isBuffer(data) && data.length >= 4) {
      const msgType = (data[1] >> 4) & 0x0F;
      // console.log(`📥 收到火山引擎消息: ${msgSize} bytes, 消息类型: 0x${msgType.toString(16)}`);
    } else {
      // console.log(`📥 收到火山引擎消息: ${msgSize} bytes`);
    }

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
      // console.log(`✅ 已转发消息到客户端`);
    } else {
      console.warn('客户端连接未就绪，无法转发消息。状态:', clientWs.readyState);
    }
  });

  // 处理客户端关闭
  clientWs.on('close', () => {
    console.log('客户端断开连接');
    if (volcanoWs.readyState === WebSocket.OPEN) {
      volcanoWs.close();
    }
  });

  // 处理错误
  clientWs.on('error', (error) => {
    console.error('客户端错误:', error);
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`\n✅ 代理服务器已启动`);
  console.log(`📡 监听端口: ${PROXY_PORT}`);
  console.log(`🔗 火山引擎 API: ${VOLCANO_API_URL}`);
  console.log(`\n前端应连接到: ws://localhost:${PROXY_PORT}\n`);
});
