#!/usr/bin/env python3
"""
快速测试火山引擎 API 连接
不需要音频文件，只测试 WebSocket 连接和认证
"""

import asyncio
import aiohttp
import json
import uuid

# 从环境变量或直接配置
# 请替换为你的实际密钥
APP_KEY = "your_app_key_here"
ACCESS_KEY = "your_access_key_here"  # 请替换为你的 Access Token（从控制台复制）
API_URL = "openspeech.bytedance.com/api/v3/sauc/bigmodel"

async def test_connection():
    """测试 WebSocket 连接"""
    request_id = str(uuid.uuid4())
    connect_id = str(uuid.uuid4())  # 连接ID，每次连接都需要新的UUID
    headers = {
        "X-Api-Resource-Id": "volc.seedasr.sauc.duration",  # volc.seedasr 不被允许
        "X-Api-Request-Id": request_id,
        "X-Api-Connect-Id": connect_id,  # 必需：连接ID
        "X-Api-Access-Key": ACCESS_KEY,
        "X-Api-App-Key": APP_KEY
    }
    
    print(f"\n🔗 测试连接火山引擎 API...")
    print(f"  URL: {API_URL}")
    print(f"  APP Key: {APP_KEY}")
    print(f"  Access Key: {ACCESS_KEY[:15]}...")
    print(f"  Request ID: {request_id}")
    print(f"  Connect ID: {connect_id}")
    print(f"  Headers: {json.dumps(headers, indent=2)}")
    print()
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(API_URL, headers=headers) as ws:
                print("✅ WebSocket 连接成功！")
                print("   认证信息正确，可以继续使用。\n")
                
                # 等待几秒看是否有响应
                try:
                    msg = await asyncio.wait_for(ws.receive(), timeout=2.0)
                    print(f"收到消息: {msg}")
                except asyncio.TimeoutError:
                    print("   连接正常，等待进一步操作...")
                    
                return True
                
    except aiohttp.ClientResponseError as e:
        if e.status == 403:
            print("❌ 403 错误：认证失败")
            print("\n可能的原因：")
            print("  1. Access Token 不正确或已过期")
            print("  2. APP Key 不正确")
            print("  3. 服务未开通或权限不足")
            print("\n请检查：")
            print(f"  - APP Key: {APP_KEY}")
            print(f"  - Access Key: {ACCESS_KEY[:20]}...")
            print("  - 火山引擎控制台中的认证信息")
        else:
            print(f"❌ HTTP 错误: {e.status} - {e.message}")
        return False
        
    except Exception as e:
        print(f"❌ 连接失败: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    # 检查配置
    if ACCESS_KEY == "your_access_key_here":
        print("⚠️  警告: 请先修改 ACCESS_KEY 为你的实际 Access Token")
        print("   编辑此文件，修改第 11 行的 ACCESS_KEY 值\n")
    
    result = asyncio.run(test_connection())
    
    if result:
        print("\n✅ 测试通过！可以继续使用代理服务器。")
    else:
        print("\n❌ 测试失败！请检查认证信息。")
