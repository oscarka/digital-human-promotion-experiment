#!/usr/bin/env python3
"""
测试火山引擎 API 原始响应
按照正确协议格式发送请求，查看服务器返回的完整数据
"""

import asyncio
import aiohttp
import json
import uuid
import struct
import gzip

# 配置
# 请替换为你的实际密钥
APP_KEY = "your_app_key_here"
ACCESS_KEY = "your_access_key_here"
API_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel"

# 协议常量（从 sauc_websocket_demo.py 复制）
ProtocolVersion = 0b0001
MessageType_CLIENT_FULL_REQUEST = 0b0001
MessageTypeSpecificFlags_POS_SEQUENCE = 0b0001
SerializationType_JSON = 0b0001
CompressionType_GZIP = 0b0001

def build_request_header():
    """构建请求头"""
    header = bytearray(4)
    header[0] = (ProtocolVersion << 4) | 1
    header[1] = (MessageType_CLIENT_FULL_REQUEST << 4) | MessageTypeSpecificFlags_POS_SEQUENCE
    header[2] = (SerializationType_JSON << 4) | CompressionType_GZIP
    header[3] = 0x00  # reserved
    return bytes(header)

def build_full_client_request(seq: int):
    """构建完整客户端请求"""
    header = build_request_header()
    
    payload = {
        "user": {"uid": "test_uid"},
        "audio": {
            "format": "wav",
            "codec": "raw",
            "rate": 16000,
            "bits": 16,
            "channel": 1
        },
        "request": {
            "model_name": "bigmodel",
            "enable_itn": True,
            "enable_punc": True,
            "enable_ddc": True,
            "show_utterances": True,
            "enable_nonstream": False
        }
    }
    
    payload_json = json.dumps(payload).encode('utf-8')
    compressed_payload = gzip.compress(payload_json)
    
    request = bytearray()
    request.extend(header)
    request.extend(struct.pack('>i', seq))  # 序列号（大端序）
    request.extend(struct.pack('>I', len(compressed_payload)))  # payload 大小（大端序）
    request.extend(compressed_payload)
    
    return bytes(request)

async def test_raw_response():
    """测试并查看原始响应"""
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
    print("火山引擎 API 原始响应测试")
    print("=" * 70)
    print(f"\n🔗 连接信息:")
    print(f"  URL: {API_URL}")
    print(f"  APP Key: {APP_KEY}")
    print(f"  Access Key: {ACCESS_KEY[:20]}...")
    print(f"  Request ID: {request_id}")
    print(f"  Connect ID: {connect_id}")
    print(f"\n📋 Headers:")
    for k, v in headers.items():
        if 'Key' in k:
            print(f"  {k}: {v[:20]}...")
        else:
            print(f"  {k}: {v}")
    print()
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(API_URL, headers=headers) as ws:
                print("✅ WebSocket 连接成功！\n")
                
                # 发送完整客户端请求
                seq = 1
                request_data = build_full_client_request(seq)
                
                print(f"📤 发送初始请求 (seq={seq})...")
                print(f"  请求数据长度: {len(request_data)} bytes")
                print(f"  请求头: {[hex(b) for b in request_data[:4]]}")
                print()
                
                await ws.send_bytes(request_data)
                
                # 等待并接收响应
                print("📥 等待服务器响应...\n")
                print("-" * 70)
                
                response_count = 0
                timeout_count = 0
                
                while True:
                    try:
                        # 设置超时，避免无限等待
                        msg = await asyncio.wait_for(ws.receive(), timeout=5.0)
                        response_count += 1
                        
                        print(f"\n【响应 #{response_count}】")
                        print(f"消息类型: {msg.type}")
                        
                        if msg.type == aiohttp.WSMsgType.BINARY:
                            data = msg.data
                            print(f"数据长度: {len(data)} bytes")
                            
                            # 解析响应头
                            if len(data) >= 4:
                                header_byte = data[0]
                                version = (header_byte >> 4) & 0x0F
                                header_size = header_byte & 0x0F
                                
                                msg_type_byte = data[1]
                                message_type = (msg_type_byte >> 4) & 0x0F
                                flags = msg_type_byte & 0x0F
                                
                                comp_byte = data[2]
                                serialization = (comp_byte >> 4) & 0x0F
                                compression = comp_byte & 0x0F
                                
                                print(f"\n响应头解析:")
                                print(f"  协议版本: {version}")
                                print(f"  头大小: {header_size * 4} bytes")
                                print(f"  消息类型: {message_type} (0x{message_type:X})")
                                print(f"  标志位: {flags} (0x{flags:X})")
                                print(f"  序列化: {serialization} (JSON={serialization==SerializationType_JSON})")
                                print(f"  压缩: {compression} (GZIP={compression==CompressionType_GZIP})")
                                
                                # 解析 payload
                                payload_start = header_size * 4
                                payload = data[payload_start:]
                                
                                # 检查是否有序列号
                                seq_offset = 0
                                if flags & 0x01:  # 有序列号
                                    seq_value = struct.unpack('>i', payload[:4])[0]
                                    print(f"  序列号: {seq_value}")
                                    seq_offset = 4
                                
                                # 检查是否是最后一个包
                                is_last = bool(flags & 0x02)
                                print(f"  是否最后包: {is_last}")
                                
                                # 检查是否有事件
                                event_offset = seq_offset
                                if flags & 0x04:  # 有事件
                                    event_value = struct.unpack('>i', payload[seq_offset:seq_offset+4])[0]
                                    print(f"  事件: {event_value}")
                                    event_offset += 4
                                
                                # 解析消息类型
                                if message_type == 0b1001:  # SERVER_FULL_RESPONSE
                                    if len(payload) > event_offset + 4:
                                        payload_size = struct.unpack('>I', payload[event_offset:event_offset+4])[0]
                                        print(f"  Payload 大小: {payload_size} bytes")
                                        actual_payload = payload[event_offset+4:]
                                        
                                        # 解压缩
                                        if compression == CompressionType_GZIP:
                                            try:
                                                decompressed = gzip.decompress(actual_payload)
                                                print(f"  解压缩后大小: {len(decompressed)} bytes")
                                                
                                                # 解析 JSON
                                                if serialization == SerializationType_JSON:
                                                    text = decompressed.decode('utf-8')
                                                    print(f"\n📄 JSON 内容:")
                                                    try:
                                                        parsed = json.loads(text)
                                                        print(json.dumps(parsed, indent=2, ensure_ascii=False))
                                                    except:
                                                        print(f"  原始文本: {text[:500]}...")
                                            except Exception as e:
                                                print(f"  解压缩/解析失败: {e}")
                                                print(f"  原始 payload (前100字节): {actual_payload[:100]}")
                                
                                elif message_type == 0b1111:  # SERVER_ERROR_RESPONSE
                                    if len(payload) > event_offset + 8:
                                        error_code = struct.unpack('>i', payload[event_offset:event_offset+4])[0]
                                        payload_size = struct.unpack('>I', payload[event_offset+4:event_offset+8])[0]
                                        print(f"  错误代码: {error_code}")
                                        print(f"  Payload 大小: {payload_size} bytes")
                                        
                                        error_payload = payload[event_offset+8:]
                                        if compression == CompressionType_GZIP:
                                            try:
                                                decompressed = gzip.decompress(error_payload)
                                                text = decompressed.decode('utf-8')
                                                print(f"\n❌ 错误信息:")
                                                try:
                                                    parsed = json.loads(text)
                                                    print(json.dumps(parsed, indent=2, ensure_ascii=False))
                                                except:
                                                    print(text)
                                            except Exception as e:
                                                print(f"  解析错误信息失败: {e}")
                            
                            print(f"\n原始数据 (hex, 前64字节):")
                            print(' '.join(f'{b:02x}' for b in data[:64]))
                            
                        elif msg.type == aiohttp.WSMsgType.TEXT:
                            print(f"文本数据: {msg.data}")
                            try:
                                parsed = json.loads(msg.data)
                                print(json.dumps(parsed, indent=2, ensure_ascii=False))
                            except:
                                pass
                        
                        elif msg.type == aiohttp.WSMsgType.ERROR:
                            print(f"❌ 错误: {msg.data}")
                        
                        elif msg.type == aiohttp.WSMsgType.CLOSE:
                            print(f"🔒 连接关闭")
                            print(f"关闭代码: {msg.data}")
                            break
                        
                        print("-" * 70)
                        
                        # 如果收到最后包或错误，停止接收
                        if msg.type == aiohttp.WSMsgType.CLOSE:
                            break
                        
                        # 限制接收数量
                        if response_count >= 10:
                            print("\n已接收10个响应，停止接收...")
                            break
                    
                    except asyncio.TimeoutError:
                        timeout_count += 1
                        if timeout_count >= 2:
                            print(f"\n⏱️  等待超时 ({timeout_count}次)，停止接收...")
                            break
                        print(f"⏱️  等待响应超时 ({timeout_count}/2)...")
                
                print(f"\n📊 总结:")
                print(f"  总共接收 {response_count} 个响应")
                
    except aiohttp.ClientResponseError as e:
        print(f"\n❌ HTTP 错误: {e.status} - {e.message}")
        if e.headers:
            print(f"\n响应头:")
            for k, v in e.headers.items():
                print(f"  {k}: {v}")
        
        # 尝试读取错误响应体
        try:
            if hasattr(e, 'request_info') and e.request_info:
                print(f"\n请求信息: {e.request_info}")
        except:
            pass
    except Exception as e:
        print(f"\n❌ 错误: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_raw_response())
