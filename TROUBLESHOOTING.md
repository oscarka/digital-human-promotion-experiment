# 火山引擎 403 错误排查指南

## 问题现象

代理服务器连接火山引擎 API 时返回 403 错误：
```
Unexpected server response: 403
```

## 可能的原因和解决方案

### 1. Access Token 不正确或已过期 ⭐ 最常见

**检查步骤：**
1. 登录 [火山引擎控制台](https://console.volcengine.com/)
2. 进入"语音识别"服务页面
3. 查看"服务接口认证信息"
4. 确认 `Access Token` 是否与 `.env.local` 中的一致
5. 如果不同，更新 `.env.local` 文件

**注意：**
- Access Token 可能会过期，需要重新生成
- 确保复制完整的 Token（不要有空格或换行）

### 2. APP Key 不正确

**检查步骤：**
1. 确认控制台中的 `APP ID` 与 `.env.local` 中的 `VOLCANO_APP_KEY` 一致
2. 确保 `VOLCANO_APP_KEY` 配置正确

### 3. 服务未开通或权限不足

**检查步骤：**
1. 确认"豆包流式语音识别模型2.0"服务已开通
2. 检查服务状态是否为"运行中"
3. 确认有足够的用量额度（试用包有 20 小时）

### 4. 使用 Python 示例验证认证信息

**测试步骤：**

1. 修改 `sauc_python/sauc_websocket_demo.py`：
```python
class Config:
    def __init__(self):
        self.auth = {
            "app_key": "your_app_key_here",  # 你的 APP ID
            "access_key": "your_access_key_here"  # 你的 Access Token
        }
```

2. 运行 Python 测试：
```bash
cd sauc_python
python3 sauc_websocket_demo.py --file /path/to/your/audio.wav
```

3. 如果 Python 代码可以连接，说明认证信息正确，问题可能在代理服务器
4. 如果 Python 代码也返回 403，说明认证信息有问题

### 5. 检查环境变量格式

**确保 `.env.local` 格式正确：**
```env
VOLCANO_APP_KEY=5825385546
VOLCANO_ACCESS_KEY=Wkpl6_o_N_c6v-ikzXMUXOh7GAyuWJpt
```

**常见错误：**
- ❌ `VOLCANO_ACCESS_KEY="Wkpl6_o_N_c6v-ikzXMUXOh7GAyuWJpt"` （不要加引号）
- ❌ `VOLCANO_ACCESS_KEY = Wkpl6_o_N_c6v-ikzXMUXOh7GAyuWJpt` （不要有空格）
- ✅ `VOLCANO_ACCESS_KEY=Wkpl6_o_N_c6v-ikzXMUXOh7GAyuWJpt` （正确格式）

### 6. 检查 API 端点

**确认使用的 API 端点：**
- 流式识别：`wss://openspeech.bytedance.com/api/v3/sauc/bigmodel`
- 异步识别：`wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async`
- 非流式识别：`wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream`

**Python 示例默认使用：** `bigmodel_nostream`

可以尝试切换到非流式端点测试：
```env
VOLCANO_API_URL=wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream
```

### 7. 网络问题

**检查：**
- 网络连接是否正常
- 是否有防火墙阻止 WebSocket 连接
- 是否可以使用代理访问

## 调试步骤

1. **查看代理服务器日志**
   - 确认环境变量是否正确加载
   - 查看完整的 Access Key（前15位）
   - 查看 Request ID

2. **测试 Python 代码**
   - 如果 Python 代码可以工作，说明认证信息正确
   - 如果 Python 代码也失败，说明认证信息有问题

3. **检查控制台**
   - 确认服务状态
   - 确认认证信息
   - 确认用量额度

4. **联系火山引擎支持**
   - 如果以上都正确，可能需要联系技术支持
   - 提供 Request ID 和错误信息

## 临时解决方案

如果火山引擎 API 一直无法连接，可以：

1. **使用 Gemini 语音识别**（推荐）
   - 在前端选择 "Google Gemini"
   - 不需要代理服务器
   - 功能完整

2. **等待或联系支持**
   - 检查是否是服务端问题
   - 确认账户权限

## 下一步

请先运行 Python 测试代码，确认认证信息是否正确：

```bash
cd sauc_python
# 修改 sauc_websocket_demo.py 中的 app_key 和 access_key
python3 sauc_websocket_demo.py --file /path/to/test.wav
```

如果 Python 代码可以工作，我们再检查代理服务器的问题。
