// 统一配置服务
// 所有 API 地址和配置都从这里获取

const getApiBaseUrl = (): string => {
  // 优先使用环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 如果环境变量为空，使用当前域名（生产环境）
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  
  // 开发环境默认值
  return 'http://localhost:3002';
};

const getWsBaseUrl = (): string => {
  // 优先使用环境变量
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  
  // 如果环境变量为空，使用当前域名（生产环境）
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  
  // 开发环境默认值
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
  domain: import.meta.env.VITE_DOMAIN || (typeof window !== 'undefined' ? window.location.host : 'localhost'),
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
