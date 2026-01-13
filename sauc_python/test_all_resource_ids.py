#!/usr/bin/env python3
"""
测试所有 Resource-Id 选项
"""

import asyncio
import aiohttp
import json
import uuid

# 请替换为你的实际密钥
APP_KEY = "your_app_key_here"
ACCESS_KEY = "your_access_key_here"
API_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel"

# 所有要测试的 Resource-Id
RESOURCE_IDS = [
    {
        "name": "豆包流式语音识别模型1.0 - 小时版",
        "id": "volc.bigasr.sauc.duration"
    },
    {
        "name": "豆包流式语音识别模型1.0 - 并发版",
        "id": "volc.bigasr.sauc.concurrent"
    },
    {
        "name": "豆包流式语音识别模型2.0 - 小时版",
        "id": "volc.seedasr.sauc.duration"
    },
    {
        "name": "豆包流式语音识别模型2.0 - 并发版",
        "id": "volc.seedasr.sauc.concurrent"
    }
]

async def test_resource_id(resource_id_info):
    """测试单个 Resource-Id"""
    resource_id = resource_id_info["id"]
    name = resource_id_info["name"]
    
    request_id = str(uuid.uuid4())
    connect_id = str(uuid.uuid4())
    
    headers = {
        "X-Api-Resource-Id": resource_id,
        "X-Api-Request-Id": request_id,
        "X-Api-Connect-Id": connect_id,
        "X-Api-Access-Key": ACCESS_KEY,
        "X-Api-App-Key": APP_KEY
    }
    
    print(f"\n{'='*70}")
    print(f"测试: {name}")
    print(f"Resource-Id: {resource_id}")
    print(f"{'='*70}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(
                API_URL, 
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as ws:
                print("✅ 连接成功！")
                
                # 等待一下看是否有响应
                try:
                    msg = await asyncio.wait_for(ws.receive(), timeout=2.0)
                    print(f"📥 收到响应: {msg.type}")
                    if msg.type == aiohttp.WSMsgType.BINARY:
                        print(f"   数据长度: {len(msg.data)} bytes")
                except asyncio.TimeoutError:
                    print("   ⏱️  2秒内无响应（正常，因为还没发送请求）")
                
                return True, None
                
    except aiohttp.ClientResponseError as e:
        error_msg = f"HTTP {e.status}"
        
        # 尝试读取错误响应体
        if e.status == 400:
            try:
                # 用 HTTP GET 获取错误详情
                http_url = API_URL.replace('wss://', 'https://').replace('ws://', 'http://')
                async with aiohttp.ClientSession() as session:
                    async with session.get(http_url, headers=headers) as resp:
                        body = await resp.text()
                        try:
                            error_data = json.loads(body)
                            error_msg = f"HTTP {e.status}: {error_data.get('error', body)}"
                        except:
                            error_msg = f"HTTP {e.status}: {body}"
            except:
                pass
        
        print(f"❌ {error_msg}")
        return False, error_msg
        
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"❌ {error_msg}")
        return False, error_msg

async def test_all():
    """测试所有 Resource-Id"""
    print("=" * 70)
    print("火山引擎 API Resource-Id 测试")
    print("=" * 70)
    print(f"\nURL: {API_URL}")
    print(f"APP Key: {APP_KEY}")
    print(f"Access Key: {ACCESS_KEY[:20]}...")
    print(f"\n将测试 {len(RESOURCE_IDS)} 个 Resource-Id\n")
    
    results = []
    
    for i, resource_id_info in enumerate(RESOURCE_IDS, 1):
        print(f"\n[{i}/{len(RESOURCE_IDS)}]")
        success, error = await test_resource_id(resource_id_info)
        results.append({
            "name": resource_id_info["name"],
            "id": resource_id_info["id"],
            "success": success,
            "error": error
        })
        
        # 稍微延迟，避免请求过快
        if i < len(RESOURCE_IDS):
            await asyncio.sleep(1)
    
    # 打印总结
    print("\n" + "=" * 70)
    print("测试总结")
    print("=" * 70)
    
    success_count = sum(1 for r in results if r["success"])
    print(f"\n成功: {success_count}/{len(results)}")
    print(f"失败: {len(results) - success_count}/{len(results)}\n")
    
    for result in results:
        status = "✅ 成功" if result["success"] else "❌ 失败"
        print(f"{status} - {result['name']}")
        print(f"      Resource-Id: {result['id']}")
        if result["error"]:
            print(f"      错误: {result['error']}")
        print()
    
    # 找出成功的 Resource-Id
    successful = [r for r in results if r["success"]]
    if successful:
        print("\n✅ 可用的 Resource-Id:")
        for r in successful:
            print(f"   - {r['id']} ({r['name']})")
    else:
        print("\n❌ 没有找到可用的 Resource-Id")
        print("   可能的原因：")
        print("   1. 服务未开通或未激活")
        print("   2. Access Token 不正确或已过期")
        print("   3. 账户权限不足")

if __name__ == "__main__":
    asyncio.run(test_all())
