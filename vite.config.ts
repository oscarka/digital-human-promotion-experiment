import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // 调试：检查环境变量是否正确加载
    console.log('🔍 Vite 环境变量检查:');
    console.log('  GEMINI_API_KEY:', env.GEMINI_API_KEY ? env.GEMINI_API_KEY.substring(0, 20) + '...' : '未设置');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3002',
            changeOrigin: true,
          },
          '/ws': {
            target: 'ws://localhost:3002',
            ws: true,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VOLCANO_APP_KEY': JSON.stringify(env.VOLCANO_APP_KEY || ''),
        'process.env.VOLCANO_ACCESS_KEY': JSON.stringify(env.VOLCANO_ACCESS_KEY || ''),
        'process.env.VOLCANO_API_URL': JSON.stringify(env.VOLCANO_API_URL || 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel'),
        'process.env.VOLCANO_PROXY_URL': JSON.stringify(env.VOLCANO_PROXY_URL || 'ws://localhost:3001'),
        'process.env.VOLCANO_USE_PROXY': JSON.stringify(env.VOLCANO_USE_PROXY !== 'false') // 默认使用代理
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
