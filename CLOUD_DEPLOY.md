# 云平台一键部署指南

## 📋 部署流程总览

1. **本地准备**：构建镜像并推送到 DockerHub
2. **云服务器配置**：配置 `config.env` 文件
3. **一键部署**：从 DockerHub 拉取镜像并启动

---

## 🚀 第一步：推送镜像到 DockerHub（只需一次）

### 1.1 登录 DockerHub

```bash
docker login
# 输入你的 DockerHub 用户名和密码
```

### 1.2 配置本地环境

```bash
# 复制配置文件
cp config.env.example config.env

# 编辑配置文件（填入你的域名和 API Key）
nano config.env
```

**最少配置**：
```bash
DOMAIN=your-domain.com
GEMINI_API_KEY=your_api_key
```

### 1.3 推送镜像

```bash
# 方式1：使用脚本（推荐）
chmod +x scripts/push-to-dockerhub.sh
./scripts/push-to-dockerhub.sh your-dockerhub-username

# 方式2：使用 Makefile
export DOCKERHUB_USERNAME=your-dockerhub-username
make push-images
```

完成后，镜像已推送到 DockerHub，可以在任何云平台使用。

---

## ☁️ 第二步：云平台部署

### 方式A：Google Cloud Platform (GCP)

#### 选项1：Cloud Run（推荐，最简单）

```bash
# 1. 安装 gcloud CLI
# 2. 登录
gcloud auth login

# 3. 设置项目
gcloud config set project YOUR_PROJECT_ID

# 4. 部署前端
gcloud run deploy digital-human-frontend \
  --image your-dockerhub-username/digital-human-frontend:latest \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 80 \
  --set-env-vars="DOMAIN=your-domain.com"

# 5. 部署后端
gcloud run deploy digital-human-backend \
  --image your-dockerhub-username/digital-human-backend:latest \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 3002 \
  --set-secrets="GEMINI_API_KEY=gemini-key:latest" \
  --set-env-vars="TELEPHONE_SERVER_PORT=3002,NODE_ENV=production"

# 6. 配置域名（在 Cloud Run 控制台）
# 7. 配置环境变量（在 Cloud Run 控制台）
```

#### 选项2：Compute Engine (VM)

```bash
# 1. 创建 VM 实例
gcloud compute instances create digital-human-app \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --machine-type=e2-medium \
  --zone=asia-east1-a \
  --boot-disk-size=20GB

# 2. SSH 到实例
gcloud compute ssh digital-human-app --zone=asia-east1-a

# 3. 在 VM 上执行以下命令（见下方"通用部署步骤"）
```

---

### 方式B：阿里云

#### 选项1：容器服务 ACK（推荐）

```bash
# 1. 在 ACK 控制台创建 Deployment
# 使用镜像: your-dockerhub-username/digital-human-frontend:latest
# 使用镜像: your-dockerhub-username/digital-human-backend:latest

# 2. 配置环境变量和密钥
# 3. 配置 Service 和 Ingress
```

#### 选项2：ECS 服务器（推荐，最简单）

```bash
# 1. 创建 ECS 实例（Ubuntu 20.04，2核4G）
# 2. 配置安全组：开放 80, 3002, 3001 端口
# 3. SSH 连接服务器
# 4. 在服务器上执行以下命令（见下方"通用部署步骤"）
```

---

### 方式C：火山引擎

#### 选项1：容器服务 VKE

```bash
# 1. 在 VKE 控制台创建应用
# 使用镜像: your-dockerhub-username/digital-human-frontend:latest
# 使用镜像: your-dockerhub-username/digital-human-backend:latest
```

#### 选项2：云服务器 ECS

```bash
# 1. 创建云服务器（Ubuntu 20.04）
# 2. 配置安全组：开放 80, 3002, 3001 端口
# 3. SSH 连接服务器
# 4. 在服务器上执行以下命令（见下方"通用部署步骤"）
```

---

## 🖥️ 通用部署步骤（适用于所有云平台的 VM/ECS）

在云服务器上执行以下命令：

### 1. 安装 Docker 和 Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录使权限生效
exit
# 重新 SSH 连接
```

### 2. 克隆项目（或直接下载配置文件）

```bash
# 方式1：克隆整个项目
git clone https://github.com/yourusername/digital-human-promotion-experiment.git
cd digital-human-promotion-experiment

# 方式2：只下载必要文件（推荐）
mkdir digital-human-app && cd digital-human-app
curl -O https://raw.githubusercontent.com/yourusername/digital-human-promotion-experiment/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/yourusername/digital-human-promotion-experiment/main/config.env.example
curl -O https://raw.githubusercontent.com/yourusername/digital-human-promotion-experiment/main/scripts/generate-env.sh
curl -O https://raw.githubusercontent.com/yourusername/digital-human-promotion-experiment/main/Makefile
chmod +x scripts/generate-env.sh
```

### 3. 配置环境变量

```bash
# 复制配置文件
cp config.env.example config.env

# 编辑配置文件
nano config.env
```

**填入以下内容**：
```bash
# 你的 DockerHub 用户名
DOCKERHUB_USERNAME=your-dockerhub-username

# 域名配置
DOMAIN=your-domain.com
# API_BASE_URL 和 WS_BASE_URL 留空，自动使用 DOMAIN

# API Keys
GEMINI_API_KEY=your_gemini_api_key
VOLCANO_APP_KEY=your_volcano_key  # 如果使用
VOLCANO_ACCESS_KEY=your_access_key  # 如果使用
VOLCANO_SECRET_KEY=your_secret_key  # 如果使用

# 服务器配置（通常不需要修改）
TELEPHONE_SERVER_PORT=3002
PROXY_PORT=3001
NODE_ENV=production
```

### 4. 生成环境变量文件

```bash
# 如果使用脚本
./scripts/generate-env.sh

# 或手动创建 .env.production
cat > .env.production << EOF
GEMINI_API_KEY=your_gemini_api_key
VOLCANO_APP_KEY=your_volcano_key
VOLCANO_ACCESS_KEY=your_access_key
VOLCANO_SECRET_KEY=your_secret_key
TELEPHONE_SERVER_PORT=3002
PROXY_PORT=3001
NODE_ENV=production
EOF
```

### 5. 一键部署

```bash
# 从 DockerHub 拉取镜像并启动（不使用火山引擎）
export DOCKERHUB_USERNAME=your-dockerhub-username
docker-compose -f docker-compose.prod.yml up -d

# 或使用火山引擎代理
docker-compose -f docker-compose.prod.yml --profile volcano up -d
```

### 6. 验证部署

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 测试接口
curl http://localhost:3002/health
```

### 7. 配置域名（可选）

```bash
# 在云平台控制台配置域名解析
# A 记录: your-domain.com -> 云服务器 IP

# 如果需要 HTTPS，可以使用 Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 📝 快速部署脚本（一键执行）

创建 `deploy.sh` 文件：

```bash
#!/bin/bash
set -e

echo "🚀 开始部署..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
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

# 生成环境变量
if [ -f "scripts/generate-env.sh" ]; then
    ./scripts/generate-env.sh
fi

# 部署
echo "📦 从 DockerHub 拉取镜像..."
export DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME:-your-dockerhub-username}
docker-compose -f docker-compose.prod.yml pull

echo "🚀 启动服务..."
docker-compose -f docker-compose.prod.yml up -d

echo "✅ 部署完成！"
echo ""
echo "服务地址:"
echo "  前端: http://${DOMAIN:-localhost}"
echo "  后端: http://${DOMAIN:-localhost}:3002"
echo ""
echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
```

使用方式：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔄 更新部署

```bash
# 1. 拉取最新镜像
docker-compose -f docker-compose.prod.yml pull

# 2. 重启服务
docker-compose -f docker-compose.prod.yml up -d

# 3. 清理旧镜像
docker image prune -f
```

---

## ❓ 常见问题

### Q: 如何修改配置？
**A:** 
1. 修改 `config.env` 文件
2. 运行 `./scripts/generate-env.sh` 重新生成环境变量
3. 运行 `docker-compose -f docker-compose.prod.yml restart` 重启服务

### Q: 如何查看日志？
**A:** 
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Q: 如何停止服务？
**A:** 
```bash
docker-compose -f docker-compose.prod.yml down
```

### Q: 数据会丢失吗？
**A:** 不会。数据存储在 `./server/data` 目录，已配置为持久化卷。

---

## 📋 部署检查清单

- [ ] DockerHub 镜像已推送
- [ ] 云服务器已创建
- [ ] Docker 和 Docker Compose 已安装
- [ ] `config.env` 已配置
- [ ] 环境变量文件已生成
- [ ] 服务已启动
- [ ] 域名已解析（如需要）
- [ ] HTTPS 已配置（如需要）
- [ ] 防火墙端口已开放（80, 3002, 3001）
