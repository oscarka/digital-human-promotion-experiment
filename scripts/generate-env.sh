#!/bin/bash

# 从统一配置文件生成各服务的环境变量文件

CONFIG_FILE="config.env"
FRONTEND_ENV=".env.production"
BACKEND_ENV="server/.env.production"
PROXY_ENV=".env.production.proxy"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 错误: 找不到配置文件 $CONFIG_FILE"
    echo "请先复制 config.env.example 为 config.env 并填入配置"
    exit 1
fi

# 读取配置
source "$CONFIG_FILE"

# 确定 API 和 WS 地址
if [ -z "$API_BASE_URL" ] || [ "$API_BASE_URL" = "" ]; then
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "" ]; then
        API_BASE_URL="http://localhost:3002"
        WS_BASE_URL="ws://localhost:3002"
    else
        API_BASE_URL="https://${DOMAIN}"
        WS_BASE_URL="wss://${DOMAIN}"
    fi
fi

if [ -z "$WS_BASE_URL" ] || [ "$WS_BASE_URL" = "" ]; then
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "" ]; then
        WS_BASE_URL="ws://localhost:3002"
    else
        WS_BASE_URL="wss://${DOMAIN}"
    fi
fi

# 生成前端环境变量
cat > "$FRONTEND_ENV" << EOF
# 自动生成 - 请勿手动编辑
# 从 config.env 生成

VITE_API_BASE_URL=${API_BASE_URL}
VITE_WS_BASE_URL=${WS_BASE_URL}
VITE_TELEPHONE_SERVER_PORT=3002
VITE_DOMAIN=${DOMAIN}

# API Keys (构建时注入)
GEMINI_API_KEY=${GEMINI_API_KEY}
VOLCANO_APP_KEY=${VOLCANO_APP_KEY}
VOLCANO_ACCESS_KEY=${VOLCANO_ACCESS_KEY}
VOLCANO_SECRET_KEY=${VOLCANO_SECRET_KEY}
VOLCANO_API_URL=${VOLCANO_API_URL}
VOLCANO_PROXY_URL=ws://proxy:3001
VOLCANO_USE_PROXY=${VOLCANO_USE_PROXY}
EOF

# 生成后端环境变量
cat > "$BACKEND_ENV" << EOF
# 自动生成 - 请勿手动编辑
# 从 config.env 生成

TELEPHONE_SERVER_PORT=${TELEPHONE_SERVER_PORT}
NODE_ENV=${NODE_ENV}
DOMAIN=${DOMAIN}
EOF

# 生成代理环境变量
cat > "$PROXY_ENV" << EOF
# 自动生成 - 请勿手动编辑
# 从 config.env 生成

PROXY_PORT=${PROXY_PORT}
NODE_ENV=${NODE_ENV}
VOLCANO_APP_KEY=${VOLCANO_APP_KEY}
VOLCANO_ACCESS_KEY=${VOLCANO_ACCESS_KEY}
VOLCANO_SECRET_KEY=${VOLCANO_SECRET_KEY}
VOLCANO_API_URL=${VOLCANO_API_URL}
EOF

echo "✅ 环境变量文件已生成:"
echo "   - $FRONTEND_ENV"
echo "   - $BACKEND_ENV"
echo "   - $PROXY_ENV"
echo ""
echo "📝 配置摘要:"
echo "   域名: ${DOMAIN:-未设置}"
echo "   API地址: $API_BASE_URL"
echo "   WebSocket地址: $WS_BASE_URL"
