import express from 'express';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import cors from 'cors';
import { setupWebSocketManager } from './websocket/manager.js';
import { setupAuthRoutes } from './api/auth/login.js';
import { setupTelephoneRoutes, setWsManager } from './api/telephone/callback.js';
import { setupStreamRoutes, setStreamWsManager } from './api/telephone/stream.js';
import { setupMockStreamRoutes } from './api/telephone/mock-stream.js';
import { setupRecordRoutes } from './api/records/query.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
function loadEnv() {
  let envFile = '.env'; // 在 try 外部定义，确保 catch 中可以访问
  try {
    // 优先使用 .env，然后是 .env.production，最后是 .env.local
    const envDir = join(__dirname, '..');
    if (!existsSync(join(envDir, '.env'))) {
      envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
    }
    const envPath = join(envDir, envFile);
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      const env = {};
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            let value = valueParts.join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            env[key.trim()] = value;
          }
        }
      });
      Object.assign(process.env, env);
      console.log(`✅ 已加载环境变量 (${envFile})`);
    } else {
      console.log(`ℹ️  环境变量文件 ${envFile} 不存在，使用系统环境变量`);
    }
  } catch (e) {
    console.warn(`⚠️  无法读取 ${envFile} 文件:`, e.message);
    console.log('将使用系统环境变量');
  }
}

loadEnv();

// 添加启动日志
console.log('🔍 环境变量检查:');
console.log('  PORT:', process.env.PORT);
console.log('  TELEPHONE_SERVER_PORT:', process.env.TELEPHONE_SERVER_PORT);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '已设置' : '未设置');

const app = express();
const server = http.createServer(app);
// Cloud Run 会自动设置 PORT 环境变量，优先使用它
const PORT = process.env.PORT || process.env.TELEPHONE_SERVER_PORT || 3002;
console.log('📡 使用端口:', PORT);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 设置WebSocket管理器（必须在路由之前）
const wsManager = setupWebSocketManager(server);

// 设置路由（传入wsManager）
setupAuthRoutes(app);
setupTelephoneRoutes(app);
setWsManager(wsManager); // 设置回调服务的wsManager引用
setStreamWsManager(wsManager); // 设置推流服务的wsManager引用
setupStreamRoutes(app, server);
setupMockStreamRoutes(app);
setupRecordRoutes(app);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
console.log('🚀 准备启动服务器，监听端口:', PORT);
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✅ 电话服务后端服务器已启动');
  console.log(`📡 HTTP服务器: http://0.0.0.0:${PORT}`);
  console.log(`🔌 WebSocket服务器: ws://0.0.0.0:${PORT}`);
  console.log('✅ 服务器已就绪，等待请求...');
  console.log('');
});

// 添加错误处理
server.on('error', (err) => {
  console.error('❌ 服务器启动错误:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 导出WebSocket管理器供其他模块使用
export { wsManager };
