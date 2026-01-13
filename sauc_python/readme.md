# 火山引擎语音识别 Python 测试脚本

本目录包含用于测试火山引擎豆包语音识别 API 的 Python 脚本。

## 使用说明

### 前置要求

- Python 3.x
- 安装依赖：
```bash
pip install aiohttp websockets
```

### 配置

在使用这些脚本之前，需要：

1. 在火山引擎控制台获取你的 `app_key` 和 `access_key`
2. 在每个测试脚本中替换以下占位符：
   ```python
   APP_KEY = "your_app_key_here"
   ACCESS_KEY = "your_access_key_here"
   ```

### 测试脚本说明

- `sauc_websocket_demo.py` - 完整的 WebSocket 流式识别示例
- `test_connection.py` - 测试连接和认证
- `test_simple.py` - 简单的识别测试
- `test_api_complete.py` - 完整的 API 测试
- `test_raw_response.py` - 原始响应测试
- `test_http_response.py` - HTTP 响应测试
- `test_all_resource_ids.py` - 测试所有 Resource-Id

### 运行示例

```bash
# 运行完整示例
python3 sauc_websocket_demo.py --file /path/to/your/audio.wav

# 测试连接
python3 test_connection.py

# 简单测试
python3 test_simple.py
```

## 注意事项

- 这些脚本仅用于测试和参考
- 生产环境请使用 TypeScript 实现（`services/volcanoEngineService.ts`）
- 确保 API 密钥安全，不要提交到版本控制系统
