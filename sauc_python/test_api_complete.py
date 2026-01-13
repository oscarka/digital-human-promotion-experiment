#!/usr/bin/env python3
"""
完整测试火山引擎 API
按照正确协议格式发送请求，查看服务器返回的完整数据
"""

import asyncio
import aiohttp
import json
import uuid
import struct
import gzip
import os

# 配置
# 请替换为你的实际密钥
APP_KEY = "your_app_key_here"
ACCESS_KEY = "your_access_key_here"
API_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel"

# 协议常量
ProtocolVersion = 0b0001
MessageType_CLIENT_FULL_REQUEST = 0b0001
MessageType_CLIENT_AUDIO_ONLY_REQUEST = 0b0010
MessageType_SERVER_FULL_RESPONSE = 0b1001
MessageType_SERVER_ERROR_RESPONSE = 0b1111
MessageTypeSpecificFlags_POS_SEQUENCE = 0b0001
MessageTypeSpecificFlags_NEG_WITH_SEQUENCE = 0b0011
SerializationType_JSON = 0b0001
CompressionType_GZIP = 0b0001

def build_request_header(message_type, flags):
    """构建请求头"""
    header = bytearray(4)
    header[0] = (ProtocolVersion << 4) | 1
    header[1] = (message_type << 4) | flags
    header[2] = (SerializationType_JSON << 4) | CompressionType_GZIP
    header[3] = 0x00  # reserved
    return bytes(header)

def build_full_client_request(seq):
    """构建完整客户端请求"""
    header = build_request_header(
        MessageType_CLIENT_FULL_REQUEST,
        MessageTypeSpecificFlags_POS_SEQUENCE
    )
    
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

def build_audio_request(seq, audio_data, is_last=False):
    """构建音频数据请求"""
    flags = MessageTypeSpecificFlags_NEG_WITH_SEQUENCE if is_last else MessageTypeSpecificFlags_POS_SEQUENCE
    final_seq = -seq if is_last else seq
    
    header = build_request_header(MessageType_CLIENT_AUDIO_ONLY_REQUEST, flags)
    compressed_audio = gzip.compress(audio_data)
    
    request = bytearray()
    request.extend(header)
    request.extend(struct.pack('>i', final_seq))  # 序列号（大端序）
    request.extend(struct.pack('>I', len(compressed_audio)))  # payload 大小（大端序）
    request.extend(compressed_audio)
    
    return bytes(request)

def parse_response(data):
    """解析服务器响应"""
    header_size = data[0] & 0x0F
    message_type = data[1] >> 4
    flags = data[1] & 0x0F
    serialization = data[2] >> 4
    compression = data[2] & 0x0F
    
    payload = data[header_size * 4:]
    
    result = {
        "header_size": header_size * 4,
        "message_type": message_type,
        "flags": flags,
        "serialization": serialization,
        "compression": compression,
        "has_sequence": bool(flags & 0x01),
        "is_last": bool(flags & 0x02),
        "has_event": bool(flags & 0x04),
    }
    
    seq_offset = 0
    if flags & 0x01:  # 有序列号
        result["sequence"] = struct.unpack('>i', payload[:4])[0]
        seq_offset = 4
    
    event_offset = seq_offset
    if flags & 0x04:  # 有事件
        result["event"] = struct.unpack('>i', payload[seq_offset:seq_offset+4])[0]
        event_offset += 4
    
    if message_type == MessageType_SERVER_FULL_RESPONSE:
        if len(payload) > event_offset + 4:
            result["payload_size"] = struct.unpack('>I', payload[event_offset:event_offset+4])[0]
            actual_payload = payload[event_offset+4:]
            
            # 根据压缩标志处理 payload
            if compression == CompressionType_GZIP:
                try:
                    decompressed = gzip.decompress(actual_payload)
                    result["payload_size_decompressed"] = len(decompressed)
                    payload_data = decompressed
                except Exception as e:
                    result["decompress_error"] = str(e)
                    result["raw_payload"] = actual_payload[:100].hex()
                    payload_data = None
            else:
                # 未压缩，直接使用原始数据
                result["payload_size_decompressed"] = len(actual_payload)
                payload_data = actual_payload
            
            # 解析 JSON（如果序列化类型是 JSON）
            if payload_data and serialization == SerializationType_JSON:
                try:
                    if isinstance(payload_data, bytes):
                        result["payload"] = json.loads(payload_data.decode('utf-8'))
                    else:
                        result["payload"] = json.loads(payload_data)
                except Exception as e:
                    result["parse_error"] = str(e)
                    if isinstance(payload_data, bytes):
                        result["raw_payload_text"] = payload_data.decode('utf-8', errors='replace')[:500]
                    else:
                        result["raw_payload_text"] = str(payload_data)[:500]
    
    elif message_type == MessageType_SERVER_ERROR_RESPONSE:
        if len(payload) > event_offset + 8:
            result["error_code"] = struct.unpack('>i', payload[event_offset:event_offset+4])[0]
            result["payload_size"] = struct.unpack('>I', payload[event_offset+4:event_offset+8])[0]
            error_payload = payload[event_offset+8:]
            
            if compression == CompressionType_GZIP:
                try:
                    decompressed = gzip.decompress(error_payload)
                    result["error_payload"] = json.loads(decompressed.decode('utf-8'))
                except Exception as e:
                    result["error_decompress_error"] = str(e)
    
    return result

async def test_api():
    """测试 API"""
    request_id = str(uuid.uuid4())
    connect_id = str(uuid.uuid4())
    
    headers = {
        "X-Api-Resource-Id": "volc.bigasr.sauc.duration",
        "X-Api-Request-Id": request_id,
        "X-Api-Connect-Id": connect_id,
        "X-Api-Access-Key": ACCESS_KEY,
        "X-Api-App-Key": APP_KEY
    }
    
    print("=" * 70)
    print("火山引擎 API 完整测试")
    print("=" * 70)
    print(f"\n🔗 连接信息:")
    print(f"  URL: {API_URL}")
    print(f"  APP Key: {APP_KEY}")
    print(f"  Access Key: {ACCESS_KEY[:20]}...")
    print(f"  Request ID: {request_id}")
    print(f"  Connect ID: {connect_id}")
    print()
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(API_URL, headers=headers) as ws:
                print("✅ WebSocket 连接成功！\n")
                
                # 1. 发送完整客户端请求
                seq = 1
                request_data = build_full_client_request(seq)
                
                print(f"📤 步骤 1: 发送完整客户端请求 (seq={seq})")
                print(f"  请求数据长度: {len(request_data)} bytes")
                print(f"  请求头: {[hex(b) for b in request_data[:4]]}")
                print()
                
                await ws.send_bytes(request_data)
                
                # 2. 等待并接收第一个响应
                print("📥 步骤 2: 等待服务器响应...\n")
                print("-" * 70)
                
                response_count = 0
                seq = 2
                
                # 设置总体超时
                try:
                    async for msg in ws:
                        response_count += 1
                        
                        if msg.type == aiohttp.WSMsgType.BINARY:
                            data = msg.data
                            print(f"\n【响应 #{response_count}】")
                            print(f"数据长度: {len(data)} bytes")
                            
                            # 解析响应
                            response = parse_response(data)
                            
                            print(f"\n响应头解析:")
                            print(f"  头大小: {response['header_size']} bytes")
                            print(f"  消息类型: {response['message_type']} (0x{response['message_type']:X})")
                            print(f"  标志位: {response['flags']} (0x{response['flags']:X})")
                            print(f"  序列化: {response['serialization']} (JSON={response['serialization']==SerializationType_JSON})")
                            print(f"  压缩: {response['compression']} (GZIP={response['compression']==CompressionType_GZIP})")
                            print(f"  有序列号: {response['has_sequence']}")
                            print(f"  是否最后包: {response['is_last']}")
                            print(f"  有事件: {response['has_event']}")
                            
                            if 'sequence' in response:
                                print(f"  序列号: {response['sequence']}")
                            if 'event' in response:
                                print(f"  事件: {response['event']}")
                            if 'error_code' in response:
                                print(f"  错误代码: {response['error_code']}")
                            
                            # 显示 payload
                            if 'payload' in response:
                                print(f"\n📄 Payload (JSON):")
                                print(json.dumps(response['payload'], indent=2, ensure_ascii=False))
                                
                                # 提取识别结果
                                if isinstance(response['payload'], dict):
                                    if 'result' in response['payload']:
                                        result = response['payload']['result']
                                        if 'utterances' in result:
                                            print(f"\n🎤 识别结果 ({len(result['utterances'])} 个话语):")
                                            for i, utt in enumerate(result['utterances'], 1):
                                                print(f"  [{i}] {utt.get('text', '')}")
                                                if 'start_time' in utt:
                                                    print(f"      时间: {utt['start_time']:.2f}s - {utt.get('end_time', 0):.2f}s")
                                                if 'speaker_id' in utt:
                                                    print(f"      说话人: {utt['speaker_id']}")
                                        elif 'text' in result:
                                            print(f"\n🎤 识别结果: {result['text']}")
                            
                            if 'error_payload' in response:
                                print(f"\n❌ 错误信息:")
                                print(json.dumps(response['error_payload'], indent=2, ensure_ascii=False))
                            
                            print(f"\n原始数据 (hex, 前32字节):")
                            print(' '.join(f'{b:02x}' for b in data[:32]))
                            print("-" * 70)
                            
                            # 如果是错误响应，停止
                            if 'error_code' in response:
                                print("\n❌ 收到错误响应，停止测试")
                                break
                            
                            # 如果是最后包，停止
                            if response.get('is_last'):
                                print("\n✅ 收到最后包，停止测试")
                                break
                            
                            # 限制接收数量
                            if response_count >= 20:
                                print("\n⏱️  已接收20个响应，停止测试")
                                break
                        
                        elif msg.type == aiohttp.WSMsgType.ERROR:
                            print(f"\n❌ WebSocket 错误: {msg.data}")
                            break
                        
                        elif msg.type == aiohttp.WSMsgType.CLOSE:
                            print(f"\n🔒 WebSocket 关闭")
                            print(f"关闭代码: {msg.data}")
                            break
                
                except asyncio.TimeoutError:
                    print(f"\n⏱️  等待响应超时（30秒）")
                    print(f"  已接收 {response_count} 个响应")
                
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
            http_url = API_URL.replace('wss://', 'https://').replace('ws://', 'http://')
            async with aiohttp.ClientSession() as session:
                async with session.get(http_url, headers=headers) as resp:
                    body = await resp.text()
                    print(f"\n响应体:")
                    print(body)
        except:
            pass
            
    except Exception as e:
        print(f"\n❌ 错误: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("⚠️  注意: 此测试只发送配置请求，不发送音频数据")
    print("   主要用于验证连接和协议格式是否正确\n")
    
    asyncio.run(test_api())
