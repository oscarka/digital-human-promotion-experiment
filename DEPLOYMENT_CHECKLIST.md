# 部署检查清单

## ✅ 已完成的功能

- [x] Docker 配置文件（Dockerfile.frontend, Dockerfile.backend, Dockerfile.proxy）
- [x] Docker Compose 配置（docker-compose.yml）
- [x] 生产环境 Docker Compose（docker-compose.prod.yml - 从 DockerHub 拉取）
- [x] 统一配置文件（config.env.example）
- [x] 环境变量生成脚本（scripts/generate-env.sh）
- [x] 镜像推送脚本（scripts/push-to-dockerhub.sh）
- [x] 一键部署脚本（deploy.sh）
- [x] 自动域名识别（services/config.ts）
- [x] 修复所有硬编码（使用统一配置）
- [x] Nginx 配置（自动代理 API 和 WebSocket）
- [x] 部署文档（CLOUD_DEPLOY.md）

## 📋 部署步骤总结

### 第一次部署（本地准备）

1. **配置 config.env**
   ```bash
   cp config.env.example config.env
   nano config.env  # 填入域名和 API Key
   ```

2. **推送镜像到 DockerHub**
   ```bash
   export DOCKERHUB_USERNAME=your-username
   make push-images
   # 或
   ./scripts/push-to-dockerhub.sh your-username
   ```

### 云服务器部署（每次部署）

1. **安装 Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

2. **下载配置文件**
   ```bash
   git clone <repo>  # 或只下载必要文件
   cd digital-human-promotion-experiment
   ```

3. **配置 config.env**
   ```bash
   cp config.env.example config.env
   nano config.env  # 填入配置，包括 DOCKERHUB_USERNAME
   ```

4. **一键部署**
   ```bash
   ./deploy.sh
   # 或
   make deploy-prod
   ```

## 🎯 还差什么？

### 需要你做的：

1. **创建 DockerHub 账号**（如果还没有）
   - 访问 https://hub.docker.com
   - 注册账号
   - 记住用户名

2. **在 config.env 中添加 DockerHub 用户名**
   ```bash
   DOCKERHUB_USERNAME=your-dockerhub-username
   ```

3. **第一次推送镜像**（只需一次）
   ```bash
   make push-images
   ```

4. **在云服务器上配置 config.env**
   - 下载项目文件
   - 配置 config.env（包括 DOCKERHUB_USERNAME）
   - 运行 deploy.sh

### 可选优化（未来可以添加）：

1. **CI/CD 自动化**
   - GitHub Actions 自动构建和推送镜像
   - 代码提交后自动部署

2. **多环境配置**
   - 开发、测试、生产环境分离
   - 使用不同的 DockerHub 标签

3. **健康检查**
   - 添加健康检查端点
   - 自动重启失败的服务

4. **监控和日志**
   - 集成日志收集服务
   - 添加监控告警

## 🚀 现在就可以部署！

所有必需的功能都已完成，你可以：

1. 修改 `config.env` 文件
2. 推送镜像到 DockerHub（只需一次）
3. 在任何云服务器上运行 `./deploy.sh` 一键部署

**不需要修改任何代码！**
