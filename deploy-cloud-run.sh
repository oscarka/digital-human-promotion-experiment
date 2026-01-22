#!/bin/bash
set -e

# 加载配置
if [ ! -f "config.env" ]; then
    echo "❌ 未找到 config.env 文件"
    echo "请先复制 config.env.example 为 config.env 并填入配置"
    exit 1
fi

source config.env

# 检查必需配置
if [ -z "$DOCKERHUB_USERNAME" ] || [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ 请先配置 DOCKERHUB_USERNAME 和 GEMINI_API_KEY"
    exit 1
fi

# 设置变量
export REGION=${REGION:-asia-east1}
export PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ 请先设置 Google Cloud 项目"
    echo "运行: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "🚀 开始部署到 Google Cloud Run..."
echo "项目: $PROJECT_ID"
echo "区域: $REGION"
echo ""

# 方式1：使用 Secret Manager（推荐）
read -p "是否使用 Secret Manager 存储密钥？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 创建 Secret..."
    
    # 创建或更新 secret
    if gcloud secrets describe gemini-api-key --project $PROJECT_ID &>/dev/null; then
        echo -n "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
        echo "✅ GEMINI_API_KEY secret 已更新"
    else
        echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
        echo "✅ GEMINI_API_KEY secret 已创建"
    fi
    
    echo ""
    
    echo "🔨 部署后端服务..."
    # 获取最新镜像的摘要（强制使用最新镜像，避免缓存）
    echo "📦 获取最新镜像摘要..."
    IMAGE_DIGEST=$(docker inspect ${DOCKERHUB_USERNAME}/digital-human-backend:latest --format='{{index .RepoDigests 0}}' 2>/dev/null | cut -d'@' -f2)
    if [ -z "$IMAGE_DIGEST" ]; then
      echo "⚠️  无法获取镜像摘要，使用标签 latest"
      IMAGE_REF="${DOCKERHUB_USERNAME}/digital-human-backend:latest"
    else
      echo "✅ 使用镜像摘要: ${IMAGE_DIGEST}"
      IMAGE_REF="${DOCKERHUB_USERNAME}/digital-human-backend@${IMAGE_DIGEST}"
    fi
    
    gcloud run deploy digital-human-backend \
      --image ${IMAGE_REF} \
      --platform managed \
      --region ${REGION} \
      --allow-unauthenticated \
      --port 3002 \
      --memory 512Mi \
      --cpu 2 \
      --timeout 600 \
      --max-instances 10 \
      --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
      --set-env-vars="TELEPHONE_SERVER_PORT=3002,NODE_ENV=production" \
      --project ${PROJECT_ID}
    
    echo ""
    echo "✅ 后端部署完成"
    
    # 获取后端 URL
    export BACKEND_URL=$(gcloud run services describe digital-human-backend --region ${REGION} --format 'value(status.url)')
    echo "后端 URL: $BACKEND_URL"
    echo ""
    
    echo "🔨 部署前端服务..."
    # 获取最新镜像的摘要（强制使用最新镜像，避免缓存）
    echo "📦 获取最新前端镜像摘要..."
    FRONTEND_IMAGE_DIGEST=$(docker inspect ${DOCKERHUB_USERNAME}/digital-human-frontend:latest --format='{{index .RepoDigests 0}}' 2>/dev/null | cut -d'@' -f2)
    if [ -z "$FRONTEND_IMAGE_DIGEST" ]; then
      echo "⚠️  无法获取前端镜像摘要，使用标签 latest"
      FRONTEND_IMAGE_REF="${DOCKERHUB_USERNAME}/digital-human-frontend:latest"
    else
      echo "✅ 使用前端镜像摘要: ${FRONTEND_IMAGE_DIGEST}"
      FRONTEND_IMAGE_REF="${DOCKERHUB_USERNAME}/digital-human-frontend@${FRONTEND_IMAGE_DIGEST}"
    fi
    
    gcloud run deploy digital-human-frontend \
      --image ${FRONTEND_IMAGE_REF} \
      --platform managed \
      --region ${REGION} \
      --allow-unauthenticated \
      --port 80 \
      --memory 256Mi \
      --cpu 1 \
      --timeout 60 \
      --max-instances 10 \
      --set-env-vars="VITE_API_BASE_URL=${BACKEND_URL},VITE_WS_BASE_URL=${BACKEND_URL//https/wss}" \
      --project ${PROJECT_ID}
    
    echo ""
    echo "✅ 前端部署完成"
    
else
    # 方式2：使用环境变量
    echo "🔨 部署后端服务（使用环境变量）..."
    # 获取最新镜像的摘要（强制使用最新镜像，避免缓存）
    echo "📦 获取最新镜像摘要..."
    IMAGE_DIGEST=$(docker inspect ${DOCKERHUB_USERNAME}/digital-human-backend:latest --format='{{index .RepoDigests 0}}' 2>/dev/null | cut -d'@' -f2)
    if [ -z "$IMAGE_DIGEST" ]; then
      echo "⚠️  无法获取镜像摘要，使用标签 latest"
      IMAGE_REF="${DOCKERHUB_USERNAME}/digital-human-backend:latest"
    else
      echo "✅ 使用镜像摘要: ${IMAGE_DIGEST}"
      IMAGE_REF="${DOCKERHUB_USERNAME}/digital-human-backend@${IMAGE_DIGEST}"
    fi
    
    gcloud run deploy digital-human-backend \
      --image ${IMAGE_REF} \
      --platform managed \
      --region ${REGION} \
      --allow-unauthenticated \
      --port 3002 \
      --memory 512Mi \
      --cpu 2 \
      --timeout 600 \
      --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY},TELEPHONE_SERVER_PORT=3002,NODE_ENV=production" \
      --project ${PROJECT_ID}
    
    echo ""
    echo "✅ 后端部署完成"
    
    # 获取后端 URL
    export BACKEND_URL=$(gcloud run services describe digital-human-backend --region ${REGION} --format 'value(status.url)')
    echo "后端 URL: $BACKEND_URL"
    echo ""
    
    echo "🔨 部署前端服务..."
    gcloud run deploy digital-human-frontend \
      --image ${DOCKERHUB_USERNAME}/digital-human-frontend:latest \
      --platform managed \
      --region ${REGION} \
      --allow-unauthenticated \
      --port 80 \
      --memory 256Mi \
      --cpu 1 \
      --set-env-vars="VITE_API_BASE_URL=${BACKEND_URL},VITE_WS_BASE_URL=${BACKEND_URL//https/wss}" \
      --project ${PROJECT_ID}
    
    echo ""
    echo "✅ 前端部署完成"
fi

# 获取前端 URL
export FRONTEND_URL=$(gcloud run services describe digital-human-frontend --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ 部署完成！"
echo ""
echo "服务地址:"
echo "  前端: $FRONTEND_URL"
echo "  后端: $BACKEND_URL"
echo ""
echo "查看日志:"
echo "  前端: gcloud run logs read digital-human-frontend --region ${REGION}"
echo "  后端: gcloud run logs read digital-human-backend --region ${REGION}"
