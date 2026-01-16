#!/bin/bash

# 本地运行脚本 - 自动加载 .env 并启动 Docker

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未发现 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "📢 请在 .env 文件中配置 VOLCANO_APP_KEY 和 VOLCANO_ACCESS_KEY"
fi

# 确保 docker-compose 需要的生产环境配置文件存在
if [ ! -f .env.production ]; then
    echo "⚠️  未发现 .env.production，正在从 .env 创建..."
    cp .env .env.production
fi

if [ ! -f .env.production.proxy ]; then
    echo "⚠️  未发现 .env.production.proxy，正在从 .env 创建..."
    cp .env .env.production.proxy
fi

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误: Docker 未启动，请先启动 Docker Desktop"
    exit 1
fi

echo "🚀 正在启动本地环境..."
echo "📡 前端: http://localhost:3005"
echo "📡 后端: http://localhost:3002"
echo "📡 代理: http://localhost:3001 (Volcano)"

# 启动容器 (包含 volcano profile)
# 如果想看详细构建日志，可以加上 --progress=plain
docker-compose --profile volcano up --build
