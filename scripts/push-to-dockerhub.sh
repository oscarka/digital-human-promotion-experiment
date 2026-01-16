#!/bin/bash

# 推送镜像到 DockerHub
# 使用方式: ./scripts/push-to-dockerhub.sh [your-dockerhub-username]

set -e

DOCKERHUB_USERNAME=${1:-${DOCKERHUB_USERNAME}}

if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo "❌ 错误: 请提供 DockerHub 用户名"
    echo "使用方式: ./scripts/push-to-dockerhub.sh your-username"
    echo "或设置环境变量: export DOCKERHUB_USERNAME=your-username"
    exit 1
fi

echo "📦 开始构建并推送镜像到 DockerHub..."
echo "DockerHub 用户名: $DOCKERHUB_USERNAME"
echo ""

# 读取配置（用于构建时注入环境变量）
# 优先使用 .env，然后是 config.env
if [ -f ".env" ]; then
    source .env
    echo "✅ 已加载 .env"
elif [ -f "config.env" ]; then
    source config.env
    echo "✅ 已加载 config.env"
else
    echo "⚠️  警告: 未找到配置文件，将使用默认值"
fi

# 确定 API 和 WS 地址
if [ -z "$API_BASE_URL" ] || [ "$API_BASE_URL" = "" ]; then
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "" ]; then
        API_BASE_URL=""
        WS_BASE_URL=""
    else
        API_BASE_URL="https://${DOMAIN}"
        WS_BASE_URL="wss://${DOMAIN}"
    fi
fi

# 配置代理（如果系统有代理）
# 检查系统代理设置
if [ -z "$HTTP_PROXY" ] && [ -z "$HTTPS_PROXY" ]; then
    # 尝试从系统设置读取代理
    PROXY_HOST=$(scutil --proxy 2>/dev/null | grep "HTTPProxy" | awk '{print $3}' | head -1)
    PROXY_PORT=$(scutil --proxy 2>/dev/null | grep "HTTPPort" | awk '{print $3}' | head -1)
    
    if [ -n "$PROXY_HOST" ] && [ -n "$PROXY_PORT" ]; then
        export HTTP_PROXY="http://${PROXY_HOST}:${PROXY_PORT}"
        export HTTPS_PROXY="http://${PROXY_HOST}:${PROXY_PORT}"
        export http_proxy="http://${PROXY_HOST}:${PROXY_PORT}"
        export https_proxy="http://${PROXY_HOST}:${PROXY_PORT}"
        echo "✅ 检测到系统代理: ${HTTP_PROXY}"
    fi
fi

# 修正 Docker构建时的代理地址 (macOS 特有)
# 在 macOS Docker VM 中，127.0.0.1 指向 VM 自身，无法连接宿主机代理
# 需要替换为 host.docker.internal
DOCKER_HTTP_PROXY="${HTTP_PROXY:-}"
DOCKER_HTTPS_PROXY="${HTTPS_PROXY:-}"

if [[ "$(uname)" == "Darwin" ]]; then
    DOCKER_HTTP_PROXY=$(echo "$DOCKER_HTTP_PROXY" | sed 's/127.0.0.1/host.docker.internal/g')
    DOCKER_HTTPS_PROXY=$(echo "$DOCKER_HTTPS_PROXY" | sed 's/127.0.0.1/host.docker.internal/g')
    if [ "$DOCKER_HTTP_PROXY" != "$HTTP_PROXY" ]; then
        echo "🍎 macOS环境: 将 Docker 构建代理修正为 ${DOCKER_HTTP_PROXY}"
    fi
fi

# 构建并推送前端镜像
# 方案2：不设置代理，让容器直接访问外网（已测试网络连通）
echo ""
echo "🔨 构建前端镜像..."
echo "ℹ️  使用直接网络连接（不通过代理）..."
docker build \
  --platform linux/amd64 \
  --no-cache \
  --progress=plain \
  --network=host \
  --build-arg HTTP_PROXY="${HTTP_PROXY:-}" \
  --build-arg HTTPS_PROXY="${HTTPS_PROXY:-}" \
  --build-arg http_proxy="${http_proxy:-}" \
  --build-arg https_proxy="${https_proxy:-}" \
  -f Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL="$API_BASE_URL" \
  --build-arg VITE_WS_BASE_URL="$WS_BASE_URL" \
  --build-arg VITE_DOMAIN="$DOMAIN" \
  -t ${DOCKERHUB_USERNAME}/digital-human-frontend:latest \
  -t ${DOCKERHUB_USERNAME}/digital-human-frontend:$(date +%Y%m%d) \
  .

echo "📤 推送前端镜像..."
docker push ${DOCKERHUB_USERNAME}/digital-human-frontend:latest
docker push ${DOCKERHUB_USERNAME}/digital-human-frontend:$(date +%Y%m%d)

# 构建并推送后端镜像
echo ""
echo "🔨 构建后端镜像..."
docker build \
  --platform linux/amd64 \
  --no-cache \
  --network=host \
  --build-arg HTTP_PROXY="${HTTP_PROXY:-}" \
  --build-arg HTTPS_PROXY="${HTTPS_PROXY:-}" \
  --build-arg http_proxy="${http_proxy:-}" \
  --build-arg https_proxy="${https_proxy:-}" \
  -f Dockerfile.backend \
  -t ${DOCKERHUB_USERNAME}/digital-human-backend:latest \
  -t ${DOCKERHUB_USERNAME}/digital-human-backend:$(date +%Y%m%d) \
  .

echo "📤 推送后端镜像..."
docker push ${DOCKERHUB_USERNAME}/digital-human-backend:latest
docker push ${DOCKERHUB_USERNAME}/digital-human-backend:$(date +%Y%m%d)

# 构建并推送代理镜像
echo ""
echo "🔨 构建代理镜像..."
docker build \
  --platform linux/amd64 \
  --no-cache \
  --network=host \
  --build-arg HTTP_PROXY="${HTTP_PROXY:-}" \
  --build-arg HTTPS_PROXY="${HTTPS_PROXY:-}" \
  --build-arg http_proxy="${http_proxy:-}" \
  --build-arg https_proxy="${https_proxy:-}" \
  -f Dockerfile.proxy \
  -t ${DOCKERHUB_USERNAME}/digital-human-proxy:latest \
  -t ${DOCKERHUB_USERNAME}/digital-human-proxy:$(date +%Y%m%d) \
  .

echo "📤 推送代理镜像..."
docker push ${DOCKERHUB_USERNAME}/digital-human-proxy:latest
docker push ${DOCKERHUB_USERNAME}/digital-human-proxy:$(date +%Y%m%d)

echo ""
echo "✅ 所有镜像已推送到 DockerHub!"
echo ""
echo "镜像地址:"
echo "  - ${DOCKERHUB_USERNAME}/digital-human-frontend:latest"
echo "  - ${DOCKERHUB_USERNAME}/digital-human-backend:latest"
echo "  - ${DOCKERHUB_USERNAME}/digital-human-proxy:latest"
echo ""
echo "💡 提示: 在云服务器上使用 docker-compose -f docker-compose.prod.yml up -d 即可一键部署"
