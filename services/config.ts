// 统一配置服务
// 所有 API 地址和配置都从这里获取

// 全局类型扩展
declare global {
  interface Window {
    env: {
      VITE_API_BASE_URL?: string;
      VITE_WS_BASE_URL?: string;
      VITE_DOMAIN?: string;
      VOLCANO_APP_KEY?: string;
      VOLCANO_ACCESS_KEY?: string;
      VOLCANO_SECRET_KEY?: string;
      VOLCANO_API_URL?: string;
      VOLCANO_USE_PROXY?: string;
      VOLCANO_PROXY_URL?: string;
      GEMINI_API_KEY?: string;
    }
  }
}

const getApiBaseUrl = (): string => {
  // 1. 优先使用运行时注入的环境变量 (Docker/Commmand Line)
  if (window.env?.VITE_API_BASE_URL) {
    return window.env.VITE_API_BASE_URL;
  }

  // 2. 其次使用构建时环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 3. 如果环境变量为空，使用当前域名（生产环境）
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  // 4. 开发环境默认值
  return 'http://localhost:3002';
};

const getWsBaseUrl = (): string => {
  // 1. 优先使用运行时注入的环境变量
  if (window.env?.VITE_WS_BASE_URL) {
    return window.env.VITE_WS_BASE_URL;
  }

  // 2. 其次使用构建时环境变量
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }

  // 3. 如果环境变量为空，使用当前域名（生产环境）
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  // 4. 开发环境默认值
  return 'ws://localhost:3002';
};

export const config = {
  // API 基础地址
  apiBaseUrl: getApiBaseUrl(),

  // WebSocket 基础地址
  wsBaseUrl: getWsBaseUrl(),

  // 后端端口
  backendPort: import.meta.env.VITE_TELEPHONE_SERVER_PORT || '3002',

  // 域名
  domain: window.env?.VITE_DOMAIN || import.meta.env.VITE_DOMAIN || (typeof window !== 'undefined' ? window.location.host : 'localhost'),

  // 火山引擎配置 - 使用getter以支持运行时环境变量
  get volcano() {
    const windowEnv = typeof window !== 'undefined' ? window.env : undefined;
    const appKey = windowEnv?.VOLCANO_APP_KEY || process.env.VOLCANO_APP_KEY || '';
    const accessKey = windowEnv?.VOLCANO_ACCESS_KEY || process.env.VOLCANO_ACCESS_KEY || '';
    const secretKey = windowEnv?.VOLCANO_SECRET_KEY || process.env.VOLCANO_SECRET_KEY || '';
    const apiUrl = windowEnv?.VOLCANO_API_URL || process.env.VOLCANO_API_URL || 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
    const useProxy = windowEnv?.VOLCANO_USE_PROXY || process.env.VOLCANO_USE_PROXY || 'false';

    if (!appKey || !accessKey) {
      console.warn('⚠️ Volcano Engine config accessed without keys:', {
        hasWindowEnv: !!windowEnv,
        hasAppKey: !!appKey,
        hasAccessKey: !!accessKey
      });
    }

    const volcanoConfig = {
      appKey,
      accessKey,
      secretKey,
      apiUrl,
      useProxy,
    };

    console.log('🌋 Volcano Config Access:', {
      source: windowEnv ? 'window.env' : 'process.env',
      appKey: appKey || 'MISSING',
      accessKey: accessKey ? `${accessKey.substring(0, 10)}...` : 'MISSING',
      useProxy,
      apiUrl
    });

    return volcanoConfig;
  },

  // Gemini 配置
  get gemini() {
    const windowEnv = typeof window !== 'undefined' ? window.env : undefined;
    const apiKey = windowEnv?.GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';

    if (!apiKey) {
      console.warn('⚠️ Gemini API Key missing:', {
        hasWindowEnv: !!windowEnv,
        hasEnvKey: !!(process.env.GEMINI_API_KEY || process.env.API_KEY)
      });
    }

    return {
      apiKey
    };
  },
};


// 导出便捷方法
export const getApiUrl = (path: string): string => {
  const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${apiPath}`;
};

export const getWsUrl = (path: string): string => {
  const baseUrl = config.wsBaseUrl.replace(/\/$/, '');
  const wsPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${wsPath}`;
};
