import { WebSocketServer } from 'ws';

// 存储医生客户端连接：Map<doctor_id, WebSocket>
const doctorConnections = new Map();

export function setupWebSocketManager(server) {
  // 使用 noServer: true 以便与其他 WebSocket 服务器共享 upgrade 处理
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws'
  });
  
  // 手动处理 /ws 路径的升级
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    console.log('📱 新客户端连接:', req.socket.remoteAddress);
    
    let registeredDoctorId = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'register') {
          const { doctorId } = data;
          
          if (!doctorId) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'doctorId 不能为空' 
            }));
            return;
          }

          // 注册医生客户端
          registeredDoctorId = doctorId;
          doctorConnections.set(doctorId, ws);
          
          console.log(`✅ 医生 ${doctorId} 已注册`);
          
          ws.send(JSON.stringify({ 
            type: 'registered', 
            doctorId,
            message: '注册成功' 
          }));
        } else if (data.type === 'ping') {
          // 心跳检测
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (e) {
        console.error('❌ WebSocket消息解析错误:', e.message);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: '消息格式错误' 
        }));
      }
    });

    ws.on('close', () => {
      if (registeredDoctorId) {
        doctorConnections.delete(registeredDoctorId);
        console.log(`🔌 医生 ${registeredDoctorId} 断开连接`);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket错误:', error.message);
      if (registeredDoctorId) {
        doctorConnections.delete(registeredDoctorId);
      }
    });
  });

  console.log('✅ WebSocket管理器已启动');

  // 返回管理器对象，提供发送消息的方法
  return {
    // 向特定医生发送消息
    sendToDoctor(doctorId, message) {
      const ws = doctorConnections.get(doctorId);
      if (ws && ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(message));
        return true;
      }
      console.warn(`⚠️  医生 ${doctorId} 未连接或连接已关闭`);
      return false;
    },

    // 检查医生是否在线
    isDoctorOnline(doctorId) {
      const ws = doctorConnections.get(doctorId);
      return ws && ws.readyState === 1;
    },

    // 获取所有在线医生
    getOnlineDoctors() {
      return Array.from(doctorConnections.keys());
    }
  };
}
