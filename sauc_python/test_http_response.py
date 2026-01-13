#!/usr/bin/env python3
"""
测试 HTTP 响应（WebSocket 升级前的错误）
"""

import asyncio
import aiohttp
import json
import uuid

# 请替换为你的实际密钥
APP_KEY = "your_app_key_here"
ACCESS_KEY = "your_access_key_here"
API_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel"

async def test_http_response():
    """测试 HTTP 响应"""
    request_id = str(uuid.uuid4())
    connect_id = str(uuid.uuid4())
    
    headers = {
        "X-Api-Resource-Id": "volc.seedasr.sauc.duration",
        "X-Api-Request-Id": request_id,
        "X-Api-Connect-Id": connect_id,
        "X-Api-Access-Key": ACCESS_KEY,
        "X-Api-App-Key": APP_KEY
    }
    
    print("=" * 70)
    print("测试 HTTP 响应（WebSocket 升级前）")
    print("=" * 70)
    print(f"\nURL: {API_URL}")
    print(f"Headers:")
    for k, v in headers.items():
        if 'Key' in k:
            print(f"  {k}: {v[:20]}...")
        else:
            print(f"  {k}: {v}")
    print()
    
    try:
        async with aiohttp.ClientSession() as session:
            # 尝试连接并捕获错误
            try:
                async with session.ws_connect(
                    API_URL, 
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as ws:
                    print("✅ WebSocket 连接成功！")
                    return True
            except aiohttp.ClientResponseError as e:
                print(f"❌ HTTP 错误: {e.status}")
                print(f"消息: {e.message}")
                print(f"\n响应头:")
                for k, v in e.headers.items():
                    print(f"  {k}: {v}")
                
                # 尝试读取响应体
                # 注意：aiohttp 的 WebSocket 连接错误可能不包含响应体
                # 我们需要用 HTTP 请求来获取错误信息
                print(f"\n尝试用 HTTP GET 获取错误信息...")
                
                # 将 wss:// 改为 https:// 来测试
                http_url = API_URL.replace('wss://', 'https://').replace('ws://', 'http://')
                
                async with session.get(http_url, headers=headers) as resp:
                    print(f"HTTP 状态: {resp.status}")
                    print(f"响应头:")
                    for k, v in resp.headers.items():
                        print(f"  {k}: {v}")
                    
                    body = await resp.text()
                    print(f"\n响应体:")
                    print(body)
                    
                    try:
                        parsed = json.loads(body)
                        print(f"\n解析为 JSON:")
                        print(json.dumps(parsed, indent=2, ensure_ascii=False))
                    except:
                        pass
                
                return False
                
    except Exception as e:
        print(f"\n❌ 错误: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_http_response())
    print(f"\n结果: {'成功' if result else '失败'}")
