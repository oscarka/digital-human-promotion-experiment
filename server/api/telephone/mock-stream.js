import multer from 'multer';
import { readFileSync } from 'fs';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 读取WAV文件信息（简化版，只读取关键信息）
function readWavInfo(buffer) {
  const view = new DataView(buffer.buffer);
  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const dataOffset = 44; // WAV文件头通常是44字节
  const dataLength = buffer.length - dataOffset;

  return { numChannels, sampleRate, dataOffset, dataLength };
}

// 将音频数据分段（模拟服务商推流）
function splitAudio(buffer, segmentSize) {
  const segments = [];
  for (let i = 0; i < buffer.length; i += segmentSize) {
    segments.push(buffer.slice(i, i + segmentSize));
  }
  return segments;
}

export function setupMockStreamRoutes(app) {
  // 模拟推流接口：接收WAV文件，模拟服务商推流
  app.post('/api/telephone/mock-stream', upload.single('audio'), async (req, res) => {
    try {
      const { doctor_id, call_id } = req.body;
      const audioFile = req.file;

      if (!doctor_id) {
        return res.status(400).json({
          success: false,
          message: '缺少 doctor_id'
        });
      }

      if (!audioFile) {
        return res.status(400).json({
          success: false,
          message: '缺少音频文件'
        });
      }

      const callId = call_id || `mock_call_${Date.now()}`;
      console.log(`🎭 开始模拟推流: callId=${callId}, doctorId=${doctor_id}`);

      // 读取WAV文件信息
      const buffer = Buffer.from(audioFile.buffer);
      const { numChannels, sampleRate, dataOffset, dataLength } = readWavInfo(buffer);

      console.log(`📊 音频信息: ${numChannels}声道, ${sampleRate}Hz, ${dataLength}字节`);

      // 提取PCM数据（跳过WAV头）
      const pcmData = buffer.slice(dataOffset);

      // 计算分段大小（200ms的音频数据）
      const sizePerSec = numChannels * 2 * sampleRate; // 16bit = 2 bytes
      const segmentSize = Math.floor((sizePerSec * 200) / 1000); // 200ms

      // 分段音频数据
      const segments = splitAudio(pcmData, segmentSize);
      console.log(`📦 音频分段: ${segments.length}段, 每段约${segmentSize}字节`);

      // 立即返回响应，不等待推流完成
      res.json({
        success: true,
        message: '模拟推流已启动',
        callId,
        segments: segments.length
      });

      // 异步处理推流（不阻塞HTTP响应）
      (async () => {
        try {
          // 连接到推流接收服务（模拟服务商推流）
          // 在 Cloud Run 中使用当前服务的端口，在本地使用配置的端口
          const PORT = process.env.PORT || process.env.TELEPHONE_SERVER_PORT || 3002;
          const streamUrl = `ws://localhost:${PORT}/api/telephone/stream?doctor_id=${doctor_id}&call_id=${callId}`;
          const ws = new WebSocket(streamUrl);

          await new Promise((resolve, reject) => {
            ws.on('open', async () => {
              console.log('✅ 已连接到推流接收服务');

              // 先发送call_started回调（模拟服务商行为）
              const callbackUrl = `http://localhost:${PORT}/api/telephone/callback`;
              try {
                await fetch(callbackUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event: 'call_started',
                    call_id: callId,
                    doctor_id: doctor_id,
                    patient_id: 'mock_patient_001',
                    patient_name: '测试患者',
                    timestamp: new Date().toISOString()
                  })
                });
                console.log('✅ 已发送 call_started 回调');
              } catch (e) {
                console.error('❌ 发送回调失败:', e.message);
              }

              // 分段发送音频数据（模拟实时推流）
              let segmentIndex = 0;
              const sendInterval = setInterval(() => {
                if (segmentIndex < segments.length) {
                  ws.send(segments[segmentIndex]);
                  segmentIndex++;

                  if (segmentIndex % 10 === 0) {
                    console.log(`📤 已发送 ${segmentIndex}/${segments.length} 段`);
                  }
                } else {
                  clearInterval(sendInterval);

                  // 所有音频发送完成，关闭连接
                  setTimeout(() => {
                    ws.close();

                    // 发送call_ended回调
                    fetch(callbackUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        event: 'call_ended',
                        call_id: callId,
                        doctor_id: doctor_id,
                        timestamp: new Date().toISOString()
                      })
                    }).then(() => {
                      console.log('✅ 已发送 call_ended 回调');
                      resolve();
                    }).catch(e => {
                      console.error('❌ 发送call_ended回调失败:', e.message);
                      resolve(); // 即使失败也resolve，因为推流已完成
                    });
                  }, 500);
                }
              }, 200); // 每200ms发送一段，模拟实时推流
            });

            ws.on('error', (error) => {
              console.error('❌ WebSocket连接错误:', error.message);
              reject(error);
            });
          });
        } catch (error) {
          console.error('❌ 异步推流处理错误:', error);
        }
      })();

    } catch (error) {
      console.error('❌ 模拟推流错误:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  console.log('✅ 模拟推流服务已启动');
}
