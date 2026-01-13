import { WebSocketServer } from 'ws';

// wsManager 将通过参数传入，避免循环依赖
let wsManagerInstance = null;

export function setStreamWsManager(manager) {
  wsManagerInstance = manager;
}

// 存储推流连接：Map<call_id, { ws, doctorId, startTime }>
const streamConnections = new Map();

export function setupStreamRoutes(app, server) {
  // 创建WebSocket服务器用于接收推流
  const streamWss = new WebSocketServer({ 
    noServer: true
  });

  // 升级HTTP请求到WebSocket
  // 注意：setupWebSocketManager 使用 server 选项会自动处理 /ws 路径
  // 我们需要在这里处理 /api/telephone/stream 路径
  // 由于 setupWebSocketManager 的 WebSocketServer 使用 server 选项，
  // 它会在内部注册 upgrade 监听器，所以我们需要确保我们的处理器在它之前或之后运行
  // 实际上，我们可以直接添加监听器，Node.js 会按顺序调用所有监听器
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    
    if (pathname === '/api/telephone/stream') {
      // 处理推流路径
      streamWss.handleUpgrade(request, socket, head, (ws) => {
        streamWss.emit('connection', ws, request);
      });
      // 阻止事件继续传播（虽然 Node.js 的 EventEmitter 不支持，但我们可以通过其他方式）
      return;
    }
    // 其他路径（如 /ws）由 setupWebSocketManager 的 WebSocketServer 自动处理
  });

  streamWss.on('connection', (ws, req) => {
    // 从请求头或URL参数中提取信息
    const url = new URL(req.url, `http://${req.headers.host}`);
    const doctorId = req.headers['x-doctor-id'] || url.searchParams.get('doctor_id');
    const callId = req.headers['x-call-id'] || url.searchParams.get('call_id') || `call_${Date.now()}`;

    console.log('📡 收到推流连接:', { callId, doctorId });

    if (!doctorId) {
      console.error('❌ 推流请求缺少 doctor_id');
      ws.close(1008, 'Missing doctor_id');
      return;
    }

    // 存储连接信息
    streamConnections.set(callId, {
      ws,
      doctorId,
      callId,
      startTime: new Date(),
      audioBuffer: []
    });

    // 通知前端：通话开始
    if (wsManagerInstance) {
      wsManagerInstance.sendToDoctor(doctorId, {
        type: 'call_started',
        callId,
        doctorId,
        timestamp: new Date().toISOString()
      });
    }

    // 接收音频数据
    ws.on('message', (data) => {
      const connection = streamConnections.get(callId);
      if (!connection) return;

      // 将音频数据转发给前端（通过WebSocket）
      if (wsManagerInstance) {
        wsManagerInstance.sendToDoctor(doctorId, {
          type: 'audio_data',
          callId,
          audioData: data.toString('base64'), // 转换为base64传输
          timestamp: new Date().toISOString()
        });
      }
    });

    ws.on('close', () => {
      const connection = streamConnections.get(callId);
      if (connection) {
        console.log(`🔌 推流连接关闭: ${callId}`);
        
        // 通知前端：通话结束
        if (wsManagerInstance) {
          wsManagerInstance.sendToDoctor(connection.doctorId, {
            type: 'call_ended',
            callId,
            doctorId: connection.doctorId,
            timestamp: new Date().toISOString()
          });
        }

        streamConnections.delete(callId);
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ 推流连接错误 (${callId}):`, error.message);
      const connection = streamConnections.get(callId);
      if (connection && wsManagerInstance) {
        wsManagerInstance.sendToDoctor(connection.doctorId, {
          type: 'stream_error',
          callId,
          error: error.message
        });
        streamConnections.delete(callId);
      }
    });
  });

  console.log('✅ 推流接收服务已启动');
}
