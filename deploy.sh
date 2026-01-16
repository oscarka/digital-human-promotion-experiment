#!/bin/bash
# 一键部署脚本（从 DockerHub 拉取镜像）

set -e

echo "🚀 开始部署..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查配置文件
if [ ! -f "config.env" ]; then
    echo "❌ 未找到 config.env 文件"
    echo "请先复制 config.env.example 为 config.env 并填入配置"
    exit 1
fi

# 加载配置
source config.env

if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo "❌ 错误: config.env 中未设置 DOCKERHUB_USERNAME"
    echo "请在 config.env 中添加: DOCKERHUB_USERNAME=your-dockerhub-username"
    exit 1
fi

# 生成环境变量
if [ -f "scripts/generate-env.sh" ]; then
    echo "📝 生成环境变量文件..."
    ./scripts/generate-env.sh
fi

# 部署
echo "📦 从 DockerHub 拉取镜像..."
export DOCKERHUB_USERNAME
docker-compose -f docker-compose.prod.yml pull

echo "🚀 启动服务..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "✅ 部署完成！"
echo ""
echo "服务地址:"
echo "  前端: http://${DOMAIN:-localhost}"
echo "  后端: http://${DOMAIN:-localhost}:3002"
echo ""
echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "停止服务: docker-compose -f docker-compose.prod.yml down"
