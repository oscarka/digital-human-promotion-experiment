# Google Cloud Run 一键部署指南

## 📋 前置准备

### 1. 安装 gcloud CLI

```bash
# macOS
brew install google-cloud-sdk

# 或下载安装包
# https://cloud.google.com/sdk/docs/install
```

### 2. 登录并设置项目

```bash
# 登录 Google Cloud
gcloud auth login

# 设置项目（如果没有项目，先创建）
gcloud config set project YOUR_PROJECT_ID

# 启用必要的 API
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com  # 用于存储密钥
```

### 3. 准备配置文件

**本地创建 `config.env`**（基于 `config.env.example`）：

```bash
cp config.env.example config.env
nano config.env  # 或使用其他编辑器
```

**最少需要配置**：
```bash
# DockerHub 用户名（已推送镜像）
DOCKERHUB_USERNAME=oscarzhangzzzz

# 域名（Cloud Run 会自动分配，也可以自定义）
DOMAIN=your-domain.com

# Google Gemini API Key（必需）
GEMINI_API_KEY=your_gemini_api_key_here

# 火山引擎配置（如果使用）
VOLCANO_APP_KEY=your_volcano_app_key_here
VOLCANO_ACCESS_KEY=your_volcano_access_key_here
VOLCANO_SECRET_KEY=your_volcano_secret_key_here
```

---

## 🚀 一键部署步骤

### 方式1：使用 Secret Manager（推荐，更安全）

#### 步骤1：创建 Secret

```bash
# 创建 GEMINI_API_KEY secret
echo -n "your_gemini_api_key_here" | gcloud secrets create gemini-api-key --data-file=-

# 如果使用火山引擎，也创建对应的 secret
echo -n "your_volcano_app_key" | gcloud secrets create volcano-app-key --data-file=-
echo -n "your_volcano_access_key" | gcloud secrets create volcano-access-key --data-file=-
echo -n "your_volcano_secret_key" | gcloud secrets create volcano-secret-key --data-file=-
```

#### 步骤2：部署后端服务
... (同上)

#### 步骤3：部署代理服务 (新增)

```bash
# 部署代理
gcloud run deploy digital-human-proxy \
  --image ${DOCKERHUB_USERNAME}/digital-human-proxy:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3001 \
  --set-env-vars="VOLCANO_APP_KEY=${VOLCANO_APP_KEY},VOLCANO_ACCESS_KEY=${VOLCANO_ACCESS_KEY},VOLCANO_API_URL=${VOLCANO_API_URL},PROXY_PORT=3001" \
  --project ${PROJECT_ID}
```

#### 步骤4：部署前端服务

```bash
# 获取后端和代理 URL
export BACKEND_URL=$(gcloud run services describe digital-human-backend --region ${REGION} --format 'value(status.url)')
export PROXY_URL=$(gcloud run services describe digital-human-proxy --region ${REGION} --format 'value(status.url)')
export VOLCANO_PROXY_URL="${PROXY_URL//https/wss}"

# 部署前端
gcloud run deploy digital-human-frontend \
  --image ${DOCKERHUB_USERNAME}/digital-human-frontend:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 80 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10 \
  --set-env-vars="VITE_API_BASE_URL=${BACKEND_URL},VITE_WS_BASE_URL=${BACKEND_URL//https/wss}" \
  --set-env-vars="VOLCANO_USE_PROXY=true,VOLCANO_PROXY_URL=${VOLCANO_PROXY_URL},GEMINI_API_KEY=your_key_here" \
  --project ${PROJECT_ID}
```

---

### 方式2：使用环境变量（简单，但密钥会暴露在配置中）

#### 步骤1：部署后端

```bash
export DOCKERHUB_USERNAME=oscarzhangzzzz
export REGION=asia-east1
export GEMINI_API_KEY=your_gemini_api_key_here

gcloud run deploy digital-human-backend \
  --image ${DOCKERHUB_USERNAME}/digital-human-backend:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3002 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY},TELEPHONE_SERVER_PORT=3002,NODE_ENV=production" \
  --project $(gcloud config get-value project)
```

#### 步骤2：部署前端

```bash
# 获取后端 URL
export BACKEND_URL=$(gcloud run services describe digital-human-backend --region ${REGION} --format 'value(status.url)')

gcloud run deploy digital-human-frontend \
  --image ${DOCKERHUB_USERNAME}/digital-human-frontend:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 80 \
  --memory 256Mi \
  --cpu 1 \
  --set-env-vars="VITE_API_BASE_URL=${BACKEND_URL},VITE_WS_BASE_URL=${BACKEND_URL//https/wss}" \
  --project $(gcloud config get-value project)
```

---

## 📝 一键部署脚本

创建 `deploy-cloud-run.sh`：

```bash
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
    else
        echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
    fi
    
    echo "✅ Secret 已创建/更新"
    echo ""
    
    echo "🔨 部署后端服务..."
    gcloud run deploy digital-human-backend \
      --image ${DOCKERHUB_USERNAME}/digital-human-backend:latest \
      --platform managed \
      --region ${REGION} \
      --allow-unauthenticated \
      --port 3002 \
      --memory 512Mi \
      --cpu 1 \
      --timeout 300 \
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
    gcloud run deploy digital-human-frontend \
      --image ${DOCKERHUB_USERNAME}/digital-human-frontend:latest \
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
    gcloud run deploy digital-human-backend \
      --image ${DOCKERHUB_USERNAME}/digital-human-backend:latest \
      --platform managed \
      --region ${REGION} \
      --allow-unauthenticated \
      --port 3002 \
      --memory 512Mi \
      --cpu 1 \
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
```

使用方式：
```bash
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

---

## 🔄 更新部署

```bash
# 1. 本地重新推送镜像到 DockerHub
./scripts/push-to-dockerhub.sh oscarzhangzzzz

# 2. 在 Cloud Run 上更新服务
gcloud run services update digital-human-frontend \
  --image oscarzhangzzzz/digital-human-frontend:latest \
  --region asia-east1

gcloud run services update digital-human-backend \
  --image oscarzhangzzzz/digital-human-backend:latest \
  --region asia-east1
```

---

## 🌐 配置自定义域名

1. 在 Cloud Run 控制台，选择服务
2. 点击"管理自定义域名"
3. 添加你的域名
4. 按照提示配置 DNS 记录

---

## 📊 查看服务状态

```bash
# 列出所有服务
gcloud run services list --region asia-east1

# 查看服务详情
gcloud run services describe digital-human-frontend --region asia-east1

# 查看日志
gcloud run logs read digital-human-frontend --region asia-east1 --limit 50
```

---

## ⚠️ 注意事项

1. **WebSocket 支持**：Cloud Run 支持 WebSocket，但需要确保后端正确处理 WebSocket 升级
2. **超时设置**：后端可能需要较长时间处理，已设置 300 秒超时
3. **并发限制**：默认最大 10 个实例，可根据需要调整
4. **成本**：Cloud Run 按使用量计费，有免费额度

---

## ❓ 常见问题

### Q: 如何修改环境变量？
**A:** 
```bash
gcloud run services update digital-human-backend \
  --update-env-vars="KEY=VALUE" \
  --region asia-east1
```

### Q: 如何查看日志？
**A:** 
```bash
gcloud run logs read digital-human-backend --region asia-east1 --follow
```

### Q: 如何删除服务？
**A:** 
```bash
gcloud run services delete digital-human-frontend --region asia-east1
gcloud run services delete digital-human-backend --region asia-east1
```
