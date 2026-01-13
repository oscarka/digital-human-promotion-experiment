#!/usr/bin/env python3
"""
最简单的测试：只连接，不发送数据，看看服务器返回什么
"""

import asyncio
import aiohttp
import json
import uuid

# 请替换为你的实际密钥
APP_KEY = "your_app_key_here"
ACCESS_KEY = "your_access_key_here"
API_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel"

async def test_simple():
    """简单测试：只连接"""
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
    print("简单连接测试 - 只连接，不发送数据")
    print("=" * 70)
    print(f"\nURL: {API_URL}")
    print(f"Headers: {json.dumps({k: v[:20]+'...' if 'Key' in k else v for k, v in headers.items()}, indent=2)}")
    print()
    
    try:
        async with aiohttp.ClientSession() as session:
            print("正在连接...")
            async with session.ws_connect(API_URL, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as ws:
                print("✅ WebSocket 连接成功！\n")
                
                print("等待服务器响应（10秒）...\n")
                
                try:
                    # 等待第一个响应
                    msg = await asyncio.wait_for(ws.receive(), timeout=10.0)
                    
                    print("📥 收到响应:")
                    print(f"  类型: {msg.type}")
                    
                    if msg.type == aiohttp.WSMsgType.BINARY:
                        print(f"  数据长度: {len(msg.data)} bytes")
                        print(f"  前32字节 (hex): {' '.join(f'{b:02x}' for b in msg.data[:32])}")
                        print(f"  前32字节 (ascii): {msg.data[:32]}")
                        
                        # 尝试解析
                        if len(msg.data) >= 4:
                            print(f"\n  解析:")
                            print(f"    Byte 0: {msg.data[0]:02x} = 版本{msg.data[0]>>4}, 头大小{(msg.data[0]&0x0F)*4}")
                            print(f"    Byte 1: {msg.data[1]:02x} = 消息类型{msg.data[1]>>4}, 标志{msg.data[1]&0x0F}")
                            print(f"    Byte 2: {msg.data[2]:02x} = 序列化{msg.data[2]>>4}, 压缩{msg.data[2]&0x0F}")
                    
                    elif msg.type == aiohttp.WSMsgType.TEXT:
                        print(f"  文本: {msg.data}")
                    
                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        print(f"  错误: {msg.data}")
                    
                    elif msg.type == aiohttp.WSMsgType.CLOSE:
                        print(f"  关闭: {msg.data}")
                    
                except asyncio.TimeoutError:
                    print("⏱️  10秒内没有收到响应（这是正常的，因为还没有发送请求）")
                
                print("\n✅ 连接测试完成")
                return True
                
    except aiohttp.ClientResponseError as e:
        print(f"\n❌ HTTP 错误: {e.status}")
        print(f"消息: {e.message}")
        print(f"\n响应头:")
        for k, v in e.headers.items():
            print(f"  {k}: {v}")
        
        # 尝试读取响应体
        try:
            async with aiohttp.ClientSession() as session:
                async with session.ws_connect(API_URL, headers=headers) as ws:
                    pass
        except Exception as e2:
            print(f"\n详细错误: {e2}")
        
        return False
        
    except Exception as e:
        print(f"\n❌ 错误: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_simple())
    print(f"\n结果: {'成功' if result else '失败'}")
