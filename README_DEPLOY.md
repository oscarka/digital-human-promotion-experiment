# 🚀 一键部署指南

## 超简单！只需2步

### 1. 配置环境变量

```bash
# 复制配置文件
cp .env.example .env

# 编辑配置文件（只需修改这一个文件！）
nano .env
```

**最少配置**（必须填写）：
```bash
DOCKERHUB_USERNAME=your-username    # 你的 DockerHub 用户名
DOMAIN=your-domain.com              # 你的域名
GEMINI_API_KEY=your_api_key         # Gemini API Key
```

### 2. 一键部署

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**完成！** 🎉

---

## 📋 完整配置示例

```bash
# DockerHub 用户名（必需）
DOCKERHUB_USERNAME=your-username

# 域名（必需）
DOMAIN=your-domain.com

# API Keys（必需）
GEMINI_API_KEY=your_gemini_api_key

# 火山引擎（如果使用）
VOLCANO_APP_KEY=your_key
VOLCANO_ACCESS_KEY=your_key
VOLCANO_SECRET_KEY=your_key

# 其他配置（通常不需要修改）
TELEPHONE_SERVER_PORT=3002
PROXY_PORT=3001
NODE_ENV=production
```

---

## 🔧 常用命令

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 更新镜像
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🌐 使用火山引擎

如果使用火山引擎语音识别，启动时加上 `--profile volcano`：

```bash
docker-compose -f docker-compose.prod.yml --profile volcano up -d
```

---

## ✅ 验证部署

```bash
# 检查服务
docker-compose -f docker-compose.prod.yml ps

# 测试后端
curl http://localhost:3002/health

# 访问前端
# http://your-domain.com 或 http://localhost
```

---

## ❓ 常见问题

### Q: 域名会自动识别吗？
**A:** 是的！如果 `API_BASE_URL` 留空，系统会自动使用 `DOMAIN`。

### Q: 需要修改代码吗？
**A:** 不需要！只需修改 `.env` 文件。

### Q: 配置在哪里？
**A:** 所有配置都在 `.env` 文件中，这是唯一的配置文件。
