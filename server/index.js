import express from 'express';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import cors from 'cors';
import { setupWebSocketManager } from './websocket/manager.js';
import { setupAuthRoutes } from './api/auth/login.js';
import { setupTelephoneRoutes, setWsManager } from './api/telephone/callback.js';
import { setupStreamRoutes, setStreamWsManager } from './api/telephone/stream.js';
import { setupMockStreamRoutes } from './api/telephone/mock-stream.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local');
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
    console.log('✅ 已加载环境变量');
  } catch (e) {
    console.warn('⚠️  无法读取 .env.local 文件:', e.message);
  }
}

loadEnv();

const app = express();
const server = http.createServer(app);
const PORT = process.env.TELEPHONE_SERVER_PORT || 3002;

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

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 电话服务后端服务器已启动');
  console.log(`📡 HTTP服务器: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket服务器: ws://localhost:${PORT}`);
  console.log('');
});

// 导出WebSocket管理器供其他模块使用
export { wsManager };
