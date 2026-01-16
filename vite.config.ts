import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
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
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          records: path.resolve(__dirname, 'records.html'),
        },
      },
    },
  };
});
