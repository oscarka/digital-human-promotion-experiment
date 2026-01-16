import { WebSocketMessage } from '../types';
import { getWsUrl } from './config';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private doctorId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private isConnecting = false;

  constructor(doctorId: string) {
    this.doctorId = doctorId;
  }

  // 连接WebSocket
  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;
      const wsUrl = getWsUrl('/ws');
      
      console.log('🔌 连接WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket连接成功');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // 发送注册消息
        if (this.doctorId) {
          this.send({
            type: 'register',
            doctorId: this.doctorId
          } as any);
        }

        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 收到WebSocket消息:', message.type);

          // 触发对应的消息处理器
          const handlers = this.messageHandlers.get(message.type) || [];
          handlers.forEach(handler => handler(message));

          // 触发通用处理器
          const allHandlers = this.messageHandlers.get('*') || [];
          allHandlers.forEach(handler => handler(message));
        } catch (e) {
          console.error('❌ WebSocket消息解析错误:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket错误:', error);
        this.isConnecting = false;
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket连接关闭');
        this.isConnecting = false;
        this.ws = null;

        // 自动重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 ${this.reconnectDelay}ms后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => {
            this.connect().catch(() => {});
          }, this.reconnectDelay);
        } else {
          console.error('❌ 达到最大重连次数，停止重连');
        }
      };
    });
  }

  // 发送消息
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️  WebSocket未连接，无法发送消息');
    }
  }

  // 注册消息处理器
  on(messageType: string, handler: (message: WebSocketMessage) => void): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  // 移除消息处理器
  off(messageType: string, handler: (message: WebSocketMessage) => void): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
