# 本地测试指南

## 🧪 测试简化后的部署流程

### 方式1：使用本地构建（推荐，不需要 DockerHub）

```bash
# 1. 创建测试用的 .env 文件
cp .env.example .env

# 2. 修改 .env 文件（填入你的配置）
nano .env
# 至少需要：
# - DOMAIN=localhost
# - GEMINI_API_KEY=your_key

# 3. 构建并启动（使用测试配置）
docker-compose -f docker-compose.test.yml build
docker-compose -f docker-compose.test.yml up -d

# 4. 查看日志
docker-compose -f docker-compose.test.yml logs -f

# 5. 测试
curl http://localhost:3002/health
# 浏览器访问: http://localhost
```

### 方式2：模拟生产环境（需要先推送镜像到 DockerHub）

```bash
# 1. 先推送镜像（只需一次）
export DOCKERHUB_USERNAME=your-username
make push-images

# 2. 创建 .env 文件
cp .env.example .env
nano .env
# 填入：DOCKERHUB_USERNAME, DOMAIN, GEMINI_API_KEY

# 3. 从 DockerHub 拉取并启动
docker-compose -f docker-compose.prod.yml up -d

# 4. 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

---

## ✅ 验证测试

### 检查服务状态

```bash
# 查看所有服务
docker-compose -f docker-compose.test.yml ps
# 或
docker-compose -f docker-compose.prod.yml ps
```

### 测试接口

```bash
# 后端健康检查
curl http://localhost:3002/health

# 记录查询接口
curl http://localhost:3002/api/records/statistics
```

### 查看日志

```bash
# 所有服务日志
docker-compose -f docker-compose.test.yml logs -f

# 特定服务日志
docker-compose -f docker-compose.test.yml logs -f backend
docker-compose -f docker-compose.test.yml logs -f frontend
```

---

## 🐛 常见问题

### 问题1：镜像不存在

**错误**: `pull access denied` 或 `image not found`

**解决**: 使用 `docker-compose.test.yml` 本地构建，或先推送镜像到 DockerHub

### 问题2：端口被占用

**错误**: `port is already allocated`

**解决**: 
```bash
# 检查占用端口的进程
lsof -i :80
lsof -i :3002

# 停止占用端口的服务
docker-compose -f docker-compose.test.yml down
```

### 问题3：环境变量未读取

**检查**:
```bash
# 验证 .env 文件格式
cat .env

# 检查变量是否被读取
docker-compose -f docker-compose.test.yml config
```

---

## 🧹 清理测试环境

```bash
# 停止并删除容器
docker-compose -f docker-compose.test.yml down

# 删除镜像（可选）
docker-compose -f docker-compose.test.yml down --rmi all

# 清理未使用的资源
docker system prune -f
```
