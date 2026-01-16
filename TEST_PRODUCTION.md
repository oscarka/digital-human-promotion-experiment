# 方式2测试：模拟生产环境部署

## 📋 测试流程（5步）

### 步骤1: 登录 DockerHub

```bash
docker login
# 输入你的 DockerHub 用户名和密码
```

### 步骤2: 修改 .env 文件

```bash
nano .env
# 修改 DOCKERHUB_USERNAME 为你的真实 DockerHub 用户名
# 例如: DOCKERHUB_USERNAME=your-real-username
```

### 步骤3: 推送镜像到 DockerHub

```bash
# 方式1: 使用脚本（推荐）
./scripts/push-to-dockerhub.sh your-username

# 方式2: 使用 Makefile
export DOCKERHUB_USERNAME=your-username
make push-images
```

**注意**: 首次推送需要 5-10 分钟（构建+上传）

### 步骤4: 测试从 DockerHub 拉取并部署

```bash
# 拉取镜像
docker-compose -f docker-compose.prod.yml pull

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

### 步骤5: 验证部署

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 测试后端接口
curl http://localhost:3002/health

# 测试记录查询
curl http://localhost:3002/api/records/statistics

# 访问前端（如果端口80可用）
# http://localhost
```

---

## ✅ 验证清单

- [ ] DockerHub 已登录
- [ ] .env 文件中 DOCKERHUB_USERNAME 已设置
- [ ] 镜像已推送到 DockerHub
- [ ] 镜像已成功拉取
- [ ] 服务已启动
- [ ] 后端接口正常响应
- [ ] 前端可以访问（如果端口80可用）

---

## 🐛 常见问题

### 问题1: 推送失败 - 未授权

**错误**: `denied: requested access to the resource is denied`

**解决**: 
```bash
# 确保已登录
docker login

# 检查用户名是否正确
docker info | grep Username
```

### 问题2: 拉取失败 - 镜像不存在

**错误**: `pull access denied` 或 `manifest unknown`

**解决**: 
- 确保镜像已成功推送
- 检查 DockerHub 用户名是否正确
- 访问 https://hub.docker.com 确认镜像存在

### 问题3: 端口80被占用

**错误**: `port is already allocated`

**解决**: 
```bash
# 检查占用
lsof -i :80

# 或修改 docker-compose.prod.yml 中的端口映射
# 例如: "8080:80"
```

---

## 🧹 清理测试

```bash
# 停止服务
docker-compose -f docker-compose.prod.yml down

# 删除本地镜像（可选）
docker rmi your-username/digital-human-frontend:latest
docker rmi your-username/digital-human-backend:latest
docker rmi your-username/digital-human-proxy:latest
```

---

## 📝 测试结果记录

测试完成后，记录以下信息：

- [ ] 推送镜像耗时: ___ 分钟
- [ ] 拉取镜像耗时: ___ 秒
- [ ] 服务启动耗时: ___ 秒
- [ ] 后端健康检查: ✅ / ❌
- [ ] 前端访问: ✅ / ❌
- [ ] 遇到的问题: ___
