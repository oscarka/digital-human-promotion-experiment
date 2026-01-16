# 云部署指南

本项目使用 Docker 容器化部署，支持快速部署到 Google Cloud、阿里云、火山云等各大云平台。

## 架构说明

项目包含 3 个服务：

1. **前端服务** (frontend)
   - React + Vite 构建
   - Nginx 提供静态文件服务
   - 端口：80

2. **后端服务** (backend)
   - Node.js Express + WebSocket
   - 处理 API 请求和 WebSocket 连接
   - 端口：3002

3. **代理服务** (proxy) - 可选
   - 火山引擎 WebSocket 代理
   - 端口：3001
   - 仅在使用火山引擎语音识别时需要

## 快速开始

### 1. 准备环境变量

创建 `.env.production` 文件：

```bash
# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# 火山引擎（如果使用）
VOLCANO_APP_KEY=your_volcano_app_key
VOLCANO_ACCESS_KEY=your_volcano_access_key
VOLCANO_SECRET_KEY=your_volcano_secret_key

# 服务器配置
TELEPHONE_SERVER_PORT=3002
PROXY_PORT=3001
NODE_ENV=production
```

### 2. 构建和启动

```bash
# 构建所有服务
docker-compose build

# 启动服务（不包含代理）
docker-compose up -d

# 启动服务（包含火山引擎代理）
docker-compose --profile volcano up -d
```

### 3. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f frontend
docker-compose logs -f backend
```

### 4. 停止服务

```bash
docker-compose down
```

## 云平台部署

### Google Cloud Platform (GCP)

#### 方式1：Cloud Run（推荐）

```bash
# 1. 安装 gcloud CLI
# 2. 登录
gcloud auth login

# 3. 设置项目
gcloud config set project YOUR_PROJECT_ID

# 4. 构建并推送镜像
docker build -f Dockerfile.frontend -t gcr.io/YOUR_PROJECT_ID/frontend .
docker build -f Dockerfile.backend -t gcr.io/YOUR_PROJECT_ID/backend .
docker push gcr.io/YOUR_PROJECT_ID/frontend
docker push gcr.io/YOUR_PROJECT_ID/backend

# 5. 部署到 Cloud Run
gcloud run deploy frontend \
  --image gcr.io/YOUR_PROJECT_ID/frontend \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated

gcloud run deploy backend \
  --image gcr.io/YOUR_PROJECT_ID/backend \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars="TELEPHONE_SERVER_PORT=3002" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

#### 方式2：Compute Engine (VM)

```bash
# 1. 创建 VM 实例
gcloud compute instances create digital-human-app \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --machine-type=e2-medium \
  --zone=asia-east1-a

# 2. SSH 到实例
gcloud compute ssh digital-human-app --zone=asia-east1-a

# 3. 在实例上安装 Docker
# 4. 克隆项目并启动
docker-compose up -d
```

### 阿里云

#### 方式1：容器服务 ACK（推荐）

```bash
# 1. 登录阿里云容器镜像服务
docker login --username=YOUR_USERNAME registry.cn-hangzhou.aliyuncs.com

# 2. 构建并推送镜像
docker build -f Dockerfile.frontend -t registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/frontend .
docker build -f Dockerfile.backend -t registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/backend .
docker push registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/frontend
docker push registry.cn-hangzhou.aliyuncs.com/YOUR_NAMESPACE/backend

# 3. 在 ACK 控制台创建 Deployment 和 Service
# 或使用 kubectl 部署
kubectl apply -f k8s/
```

#### 方式2：ECS 服务器

```bash
# 1. 创建 ECS 实例（Ubuntu 20.04）
# 2. SSH 连接
# 3. 安装 Docker 和 Docker Compose
sudo apt-get update
sudo apt-get install docker.io docker-compose -y

# 4. 克隆项目
git clone YOUR_REPO_URL
cd digital-human-promotion-experiment

# 5. 配置环境变量
cp .env.production.example .env.production
# 编辑 .env.production

# 6. 启动服务
docker-compose up -d
```

### 火山引擎

```bash
# 1. 登录火山引擎容器镜像服务
docker login --username=YOUR_USERNAME cr.cc-bj-1.volces.com

# 2. 构建并推送镜像
docker build -f Dockerfile.frontend -t cr.cc-bj-1.volces.com/YOUR_NAMESPACE/frontend .
docker build -f Dockerfile.backend -t cr.cc-bj-1.volces.com/YOUR_NAMESPACE/backend .
docker push cr.cc-bj-1.volces.com/YOUR_NAMESPACE/frontend
docker push cr.cc-bj-1.volces.com/YOUR_NAMESPACE/backend

# 3. 在火山引擎容器服务中创建应用
```

## 数据持久化

数据存储在 `server/data/` 目录，已配置为 Docker volume，确保数据不丢失：

```yaml
volumes:
  - ./server/data:/app/data
  - ./server/config:/app/config
```

## 环境变量管理

### 本地开发
- 使用 `.env.local` 文件

### 生产环境
- 使用 `.env.production` 文件
- 或使用云平台的密钥管理服务（推荐）：
  - GCP: Secret Manager
  - 阿里云: KMS
  - 火山引擎: 密钥管理

## 健康检查

```bash
# 检查服务状态
docker-compose ps

# 检查前端
curl http://localhost

# 检查后端健康
curl http://localhost:3002/health

# 检查记录查询
curl http://localhost:3002/api/records/statistics
```

## 监控和日志

### 查看日志
```bash
# 实时日志
docker-compose logs -f

# 最近100行
docker-compose logs --tail=100
```

### 资源监控
```bash
# 查看资源使用
docker stats
```

## 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
docker-compose build

# 3. 重启服务（零停机）
docker-compose up -d --force-recreate
```

## 故障排查

### 服务无法启动
1. 检查端口是否被占用
2. 检查环境变量是否正确
3. 查看日志：`docker-compose logs`

### 前端无法连接后端
1. 检查网络配置
2. 确认 `VITE_API_BASE_URL` 环境变量
3. 检查防火墙规则

### WebSocket 连接失败
1. 检查 Nginx 配置
2. 确认 WebSocket 代理设置
3. 检查后端服务是否运行

## 安全建议

1. **使用 HTTPS**：配置 SSL 证书（Let's Encrypt）
2. **环境变量**：使用云平台密钥管理服务
3. **防火墙**：只开放必要端口
4. **定期更新**：保持 Docker 镜像和依赖更新

## 扩展性

### 水平扩展
```bash
# 扩展后端服务（负载均衡）
docker-compose up -d --scale backend=3
```

### 使用 Kubernetes
创建 `k8s/` 目录下的配置文件，支持自动扩缩容和负载均衡。

## 成本优化

1. **使用云平台托管服务**：Cloud Run、ACK 等按需计费
2. **选择合适的实例规格**：根据实际负载选择
3. **使用 CDN**：加速静态资源访问
4. **定期清理日志和临时文件**
