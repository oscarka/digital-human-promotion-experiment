# 快速部署指南

## 🚀 一键部署（只需3步）

### 1. 配置环境变量（只需一次）

```bash
# 复制配置文件
cp config.env.example config.env

# 编辑配置文件（只需修改这一个文件！）
nano config.env  # 或使用你喜欢的编辑器
```

**最少配置**（必须填写）：
```bash
DOMAIN=your-domain.com          # 你的域名
GEMINI_API_KEY=your_api_key     # Gemini API Key
```

**完整配置**（如果使用火山引擎）：
```bash
DOMAIN=your-domain.com
GEMINI_API_KEY=your_api_key
VOLCANO_APP_KEY=your_volcano_key
VOLCANO_ACCESS_KEY=your_access_key
VOLCANO_SECRET_KEY=your_secret_key
```

### 2. 生成环境变量文件（自动）

```bash
make config
```

这会自动从 `config.env` 生成所有需要的环境变量文件。

### 3. 部署

```bash
# 不使用火山引擎
make deploy

# 使用火山引擎
make deploy-volcano
```

## ✅ 完成！

部署完成后：
- **前端**: `http://your-domain.com` 或 `http://localhost`
- **后端 API**: `http://your-domain.com/api` 或 `http://localhost:3002`
- **WebSocket**: `ws://your-domain.com/ws` 或 `ws://localhost:3002/ws`

## 📋 配置说明

### 域名自动识别

如果 `API_BASE_URL` 和 `WS_BASE_URL` 留空，系统会自动：
- 使用 `DOMAIN` 作为基础域名
- API 地址：`https://${DOMAIN}`
- WebSocket 地址：`wss://${DOMAIN}`

### 前后端分离部署

如果前后端不在同一域名：
```bash
DOMAIN=frontend-domain.com
API_BASE_URL=https://backend-domain.com
WS_BASE_URL=wss://backend-domain.com
```

### 本地开发

```bash
DOMAIN=localhost
API_BASE_URL=http://localhost:3002
WS_BASE_URL=ws://localhost:3002
```

## 🔧 常用命令

```bash
# 查看日志
make logs

# 重启服务
make restart

# 停止服务
make down

# 检查配置
make check-config
```

## ❓ 常见问题

### Q: 域名会自动识别吗？
**A:** 是的！如果 `API_BASE_URL` 留空，系统会自动使用 `DOMAIN` 作为 API 地址。

### Q: 接口会自动发布吗？
**A:** 是的！所有 API 接口都会自动通过 Nginx 代理发布，无需额外配置。

### Q: API Key 在哪配置？
**A:** 只需在 `config.env` 文件中配置一次，系统会自动应用到所有服务。

### Q: 修改配置后需要重新构建吗？
**A:** 
- 修改 `config.env` 后运行 `make config` 重新生成环境变量
- 如果修改了 API Key 等构建时变量，需要 `make build` 重新构建前端
- 如果只修改了后端配置，只需 `make restart` 重启服务

## 📝 配置示例

### 示例1：同一域名部署（推荐）

```bash
DOMAIN=api.yourcompany.com
GEMINI_API_KEY=AIzaSy...
# API_BASE_URL 和 WS_BASE_URL 留空，自动使用 DOMAIN
```

### 示例2：前后端分离

```bash
DOMAIN=app.yourcompany.com
API_BASE_URL=https://api.yourcompany.com
WS_BASE_URL=wss://api.yourcompany.com
GEMINI_API_KEY=AIzaSy...
```

### 示例3：本地测试

```bash
DOMAIN=localhost
API_BASE_URL=http://localhost:3002
WS_BASE_URL=ws://localhost:3002
GEMINI_API_KEY=AIzaSy...
```
