# 服务启动指南

## 服务说明

项目需要启动以下服务（根据使用场景选择）：

### 1. 火山引擎代理服务器（可选，仅在使用火山引擎时需要）

**用途**：为火山引擎 WebSocket 连接提供代理，解决浏览器无法发送自定义 headers 的问题

**启动方式**：
```bash
npm run proxy
```

**端口**：3001

**何时需要**：
- 选择"火山引擎"作为语音识别服务时
- 如果只使用 Gemini，则不需要

---

### 2. 电话服务后端（必需，用于登录和推流功能）

**用途**：处理医生登录、WebSocket 通信、推流接收、回调处理

**启动方式**：
```bash
cd server
npm install  # 首次运行需要
node index.js
```

**端口**：3002

**何时需要**：
- 使用登录功能
- 使用电话推流功能（真实推流或模拟推流）
- 如果只测试文件上传且不需要登录，可以不启动

---

### 3. 前端开发服务器（必需）

**启动方式**：
```bash
npm run dev
```

**端口**：通常是 5173（Vite 默认）

---

## 完整启动流程

### 场景1：使用 Gemini + 文件上传（最简单）

```bash
# 终端1：启动前端
npm run dev

# 终端2：启动电话服务后端（用于登录）
cd server
node index.js
```

**不需要启动**：proxy-server

---

### 场景2：使用火山引擎 + 文件上传

```bash
# 终端1：启动前端
npm run dev

# 终端2：启动火山引擎代理
npm run proxy

# 终端3：启动电话服务后端（用于登录）
cd server
node index.js
```

---

### 场景3：使用模拟推流测试（完整功能）

```bash
# 终端1：启动前端
npm run dev

# 终端2：启动火山引擎代理（如果使用火山引擎）
npm run proxy

# 终端3：启动电话服务后端
cd server
node index.js
```

---

## 快速检查

启动后，可以通过以下方式检查服务是否正常运行：

1. **火山引擎代理** (3001端口)：
   ```bash
   curl http://localhost:3001
   # 应该返回连接错误（正常，因为这是WebSocket服务）
   ```

2. **电话服务后端** (3002端口)：
   ```bash
   curl http://localhost:3002/health
   # 应该返回: {"status":"ok","timestamp":"..."}
   ```

3. **前端** (通常是5173端口)：
   - 浏览器访问 `http://localhost:5173`
   - 应该看到登录页面

---

## 常见问题

### Q: 为什么需要两个后端服务？

A: 
- `proxy-server.js` (3001) 专门用于火山引擎 WebSocket 代理
- `server/index.js` (3002) 用于电话服务的业务逻辑（登录、推流、回调）

### Q: 可以合并成一个服务吗？

A: 可以，但当前架构更清晰，职责分离。如果端口冲突，可以修改配置。

### Q: 端口被占用怎么办？

A: 
- 修改 `proxy-server.js` 中的 `PROXY_PORT`（默认3001）
- 修改 `server/index.js` 中的 `TELEPHONE_SERVER_PORT`（默认3002）
- 同时更新 `.env.local` 中的相关配置
