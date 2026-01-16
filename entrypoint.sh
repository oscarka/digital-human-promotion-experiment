#!/bin/sh

# 运行时动态生成配置文件 (Updated for Gemin Key)
# 将容器环境变量写入 window.env

# 默认值处理
API_URL=${VITE_API_BASE_URL:-""}
WS_URL=${VITE_WS_BASE_URL:-""}

# 生成 config.js
cat <<EOF > /usr/share/nginx/html/env-config.js
window.env = {
  VITE_API_BASE_URL: "${API_URL}",
  VITE_WS_BASE_URL: "${WS_URL}",
  VITE_DOMAIN: "${VITE_DOMAIN}",
  VOLCANO_APP_KEY: "${VOLCANO_APP_KEY}",
  VOLCANO_ACCESS_KEY: "${VOLCANO_ACCESS_KEY}",
  VOLCANO_SECRET_KEY: "${VOLCANO_SECRET_KEY}",
  VOLCANO_API_URL: "${VOLCANO_API_URL}",
  VOLCANO_USE_PROXY: "${VOLCANO_USE_PROXY}",
  VOLCANO_PROXY_URL: "${VOLCANO_PROXY_URL}",
  GEMINI_API_KEY: "${GEMINI_API_KEY}"
};
EOF

# 启动 Nginx
exec "$@"
