# 🚀 云平台一键部署步骤

## ✅ 是的，可以！修改 config 文件后，从 DockerHub 一键部署

---

## 📋 完整部署流程（3步）

### 第一步：推送镜像到 DockerHub（只需做一次）

在**本地电脑**执行：

```bash
# 1. 登录 DockerHub
docker login

# 2. 配置 config.env
cp config.env.example config.env
nano config.env
# 填入：DOCKERHUB_USERNAME, DOMAIN, GEMINI_API_KEY

# 3. 推送镜像
export DOCKERHUB_USERNAME=your-username
make push-images
```

完成后，镜像已推送到 DockerHub，可以在任何云平台使用。

---

### 第二步：在云服务器上配置

在**云服务器**（GCP/阿里云/火山云）执行：

```bash
# 1. 安装 Docker（如果还没有）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# 重新登录使权限生效

# 2. 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. 下载项目文件（或只下载必要文件）
git clone https://github.com/yourusername/digital-human-promotion-experiment.git
cd digital-human-promotion-experiment

# 或只下载必要文件：
mkdir digital-human-app && cd digital-human-app
curl -O https://raw.githubusercontent.com/yourusername/digital-human-promotion-experiment/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/yourusername/digital-human-promotion-experiment/main/config.env.example
curl -O https://raw.githubusercontent.com/yourusername/digital-human-promotion-experiment/main/deploy.sh
curl -O https://raw.githubusercontent.com/yourusername/digital-human-promotion-experiment/main/scripts/generate-env.sh
chmod +x deploy.sh scripts/generate-env.sh
```

---

### 第三步：配置并一键部署

在**云服务器**执行：

```bash
# 1. 配置 config.env（只需修改这一个文件！）
cp config.env.example config.env
nano config.env
```

**填入以下内容**：
```bash
# DockerHub 用户名（必需）
DOCKERHUB_USERNAME=your-dockerhub-username

# 域名（必需）
DOMAIN=your-domain.com

# API Key（必需）
GEMINI_API_KEY=your_gemini_api_key

# API_BASE_URL 和 WS_BASE_URL 留空 = 自动使用 DOMAIN
```

```bash
# 2. 一键部署
./deploy.sh
```

**完成！** 🎉

---

## 🌐 各云平台具体步骤

### Google Cloud Platform

#### 方式1：Cloud Run（最简单，推荐）

```bash
# 1. 安装 gcloud CLI
# 2. 登录
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 3. 部署前端
gcloud run deploy digital-human-frontend \
  --image your-username/digital-human-frontend:latest \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 80 \
  --set-env-vars="DOMAIN=your-domain.com"

# 4. 部署后端
gcloud run deploy digital-human-backend \
  --image your-username/digital-human-backend:latest \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 3002 \
  --set-secrets="GEMINI_API_KEY=gemini-key:latest"
```

#### 方式2：Compute Engine（VM）

```bash
# 1. 创建 VM
gcloud compute instances create digital-human-app \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --machine-type=e2-medium \
  --zone=asia-east1-a

# 2. SSH 连接
gcloud compute ssh digital-human-app --zone=asia-east1-a

# 3. 在 VM 上执行"第二步"和"第三步"
```

---

### 阿里云

#### 方式1：容器服务 ACK

在 ACK 控制台：
1. 创建 Deployment，使用镜像：`your-username/digital-human-frontend:latest`
2. 创建 Deployment，使用镜像：`your-username/digital-human-backend:latest`
3. 配置环境变量和密钥
4. 配置 Service 和 Ingress

#### 方式2：ECS 服务器（推荐，最简单）

```bash
# 1. 创建 ECS 实例（Ubuntu 20.04，2核4G）
# 2. 配置安全组：开放 80, 3002 端口
# 3. SSH 连接服务器
# 4. 执行"第二步"和"第三步"
```

---

### 火山引擎

#### 方式1：容器服务 VKE

在 VKE 控制台创建应用，使用 DockerHub 镜像。

#### 方式2：云服务器 ECS

```bash
# 1. 创建云服务器（Ubuntu 20.04）
# 2. 配置安全组：开放 80, 3002 端口
# 3. SSH 连接服务器
# 4. 执行"第二步"和"第三步"
```

---

## 📝 config.env 配置示例

### 最少配置（推荐）

```bash
DOCKERHUB_USERNAME=your-username
DOMAIN=api.yourcompany.com
GEMINI_API_KEY=AIzaSy...
# API_BASE_URL 和 WS_BASE_URL 留空 = 自动使用 DOMAIN
```

### 完整配置（使用火山引擎）

```bash
DOCKERHUB_USERNAME=your-username
DOMAIN=api.yourcompany.com
GEMINI_API_KEY=AIzaSy...
VOLCANO_APP_KEY=your_key
VOLCANO_ACCESS_KEY=your_key
VOLCANO_SECRET_KEY=your_key
```

---

## ✅ 部署后验证

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 测试接口
curl http://localhost:3002/health
```

---

## 🔄 更新部署

```bash
# 1. 在本地推送新镜像
make push-images

# 2. 在云服务器上更新
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## ❓ 常见问题

### Q: 域名会自动识别吗？
**A:** 是的！如果 `API_BASE_URL` 留空，系统会自动使用 `DOMAIN`。

### Q: 接口会自动发布吗？
**A:** 是的！Nginx 自动代理 `/api` 和 `/ws` 到后端。

### Q: 需要修改代码吗？
**A:** 不需要！只需修改 `config.env` 文件。

### Q: 可以一键部署吗？
**A:** 可以！运行 `./deploy.sh` 即可。

---

## 📋 还差什么？

### ✅ 已完成
- [x] Docker 配置
- [x] DockerHub 推送脚本
- [x] 一键部署脚本
- [x] 统一配置文件
- [x] 自动域名识别
- [x] 详细部署文档

### 🔲 你需要做的
1. **创建 DockerHub 账号**（如果还没有）
2. **第一次推送镜像**（只需一次）：`make push-images`
3. **在云服务器配置 config.env**（每次部署）
4. **运行 deploy.sh**（每次部署）

**就这么简单！** 🎉
