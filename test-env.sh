#!/bin/bash
# 快速创建测试用的 .env 文件

echo "🧪 创建测试用的 .env 文件..."

# 检查是否有 .env.local
if [ -f .env.local ]; then
    echo "发现 .env.local 文件，从中读取配置..."
    source .env.local
    
    cat > .env << ENVEOF
# 测试环境配置（自动生成）

# DockerHub 配置（测试时可以用本地构建，这里填个占位符）
DOCKERHUB_USERNAME=test-user

# 域名配置
DOMAIN=localhost
API_BASE_URL=http://localhost:3002
WS_BASE_URL=ws://localhost:3002

# API Keys（从 .env.local 读取）
GEMINI_API_KEY=${GEMINI_API_KEY}
VOLCANO_APP_KEY=${VOLCANO_APP_KEY:-}
VOLCANO_ACCESS_KEY=${VOLCANO_ACCESS_KEY:-}
VOLCANO_SECRET_KEY=${VOLCANO_SECRET_KEY:-}
VOLCANO_API_URL=${VOLCANO_API_URL:-wss://openspeech.bytedance.com/api/v3/sauc/bigmodel}

# 服务器配置
TELEPHONE_SERVER_PORT=3002
PROXY_PORT=3001
NODE_ENV=production
ENVEOF
    echo "✅ 已从 .env.local 创建 .env 文件"
else
    echo "⚠️  未找到 .env.local，创建最小配置..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请手动填入配置"
fi

echo ""
echo "📝 当前 .env 配置:"
grep -v "^#" .env | grep -v "^$" | sed 's/=.*/=***/' || true
