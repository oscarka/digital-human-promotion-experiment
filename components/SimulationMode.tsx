
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { createBlob } from '../services/audioUtils';
import { GeminiService } from '../services/geminiService';
import { VolcanoEngineService, TimedTranscriptNode } from '../services/volcanoEngineService';
import { StructuredDiagnosis, RecommendationScript, Product, SpeechRecognitionProvider } from '../types';
import { MOCK_PRODUCTS } from '../constants';

interface SimulationModeProps {
  audioFile: File;
  provider: SpeechRecognitionProvider;
  onFinish: (notes: string, structured: StructuredDiagnosis, product: Product, script: RecommendationScript) => void;
  onClose: () => void;
}

const SimulationMode: React.FC<SimulationModeProps> = ({ audioFile, provider, onFinish, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'streaming' | 'completed'>('connecting');
  const [transcription, setTranscription] = useState<{ role: 'Doctor' | 'Patient', text: string }[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [diagnosis, setDiagnosis] = useState<StructuredDiagnosis | null>(null);
  const [recommendedProduct, setRecommendedProduct] = useState<Product | null>(null);
  const [draftScript, setDraftScript] = useState<RecommendationScript | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 保存上一次的分析结果，用于比较相似度
  const lastAnalysisRef = useRef<{
    diagnosis: StructuredDiagnosis | null;
    productId: string | null;
    script: RecommendationScript | null;
  }>({
    diagnosis: null,
    productId: null,
    script: null
  });

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null); // 用于火山引擎模式的音频播放
  const currentTextBuffer = useRef<string>('');
  const lastAnalysisText = useRef<string>('');
  const volcanoServiceRef = useRef<VolcanoEngineService | null>(null);
  const isStreamingRef = useRef<boolean>(true);
  const isProcessingRef = useRef<boolean>(false); // 防止重复启动处理
  
  // 追踪当前识别到的角色状态，默认为医生
  const activeRoleRef = useRef<'Doctor' | 'Patient'>('Doctor');
  
  // 用于去重的已处理文本集合（基于时间戳和文本内容）
  const processedTranscriptsRef = useRef<Set<string>>(new Set());
  
  // 防抖定时器
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 处理火山引擎转录结果（添加去重逻辑）
  // 关键：同一句话会有多次更新（中间结果→最终结果），需要基于 startTime + role 去重
  const handleVolcanoTranscript = (transcripts: TimedTranscriptNode[]) => {
    if (transcripts.length === 0) return;
    
    // 使用 startTime + role 作为唯一标识，跟踪每个话语的最新版本
    const utteranceMap = new Map<string, TimedTranscriptNode>();
    let hasDefiniteResult = false; // 标记是否有最终结果
    
    transcripts.forEach(node => {
      const utteranceKey = `${node.startTime.toFixed(2)}_${node.role}`;
      const existing = utteranceMap.get(utteranceKey);
      
      // 如果是最终结果，或者新结果比旧结果更完整（endTime 更大或文本更长），则更新
      if (!existing || 
          node.isDefinite || 
          node.endTime > existing.endTime ||
          (node.endTime === existing.endTime && node.text.length > existing.text.length)) {
        utteranceMap.set(utteranceKey, node);
        if (node.isDefinite) {
          hasDefiniteResult = true;
        }
      }
    });
    
    // 只处理更新的或新的话语
    const updatedTranscripts = Array.from(utteranceMap.values());
    if (updatedTranscripts.length === 0) return;
    
    // 更新转录显示
    updatedTranscripts.forEach(node => {
      const textToAdd = node.text.trim();
      if (!textToAdd) return;
      
      const utteranceKey = `${node.startTime.toFixed(2)}_${node.role}`;
      
      setTranscription(prev => {
        // 查找是否已存在相同 startTime 和 role 的条目
        const existingIndex = prev.findIndex((entry, idx) => {
          const entryStartTime = (entry as any).startTime;
          return entry.role === node.role && 
                 entryStartTime !== undefined && 
                 Math.abs(entryStartTime - node.startTime) < 0.1; // 时间差小于0.1秒认为是同一句话
        });
        
        if (existingIndex >= 0) {
          // 更新已存在的条目（同一句话的更新）
          const newEntries = [...prev];
          newEntries[existingIndex] = {
            ...prev[existingIndex],
            text: textToAdd, // 使用最新文本替换
            ...(node.startTime !== undefined && { startTime: node.startTime }),
            ...(node.endTime !== undefined && { endTime: node.endTime })
          } as any;
          return newEntries;
        } else {
          // 新的话语，添加新条目
          const newEntry: any = { role: node.role, text: textToAdd };
          if (node.startTime !== undefined) newEntry.startTime = node.startTime;
          if (node.endTime !== undefined) newEntry.endTime = node.endTime;
          return [...prev, newEntry];
        }
      });
      
      // 更新文本缓冲区（基于 startTime + role 去重）
      // 关键：必须保留角色信息，不能因为文本相似就认为是重复
      if (!processedTranscriptsRef.current.has(utteranceKey)) {
        // 新话语，添加到缓冲区
        processedTranscriptsRef.current.add(utteranceKey);
        
        // 添加角色标记和文本内容
        // 格式：[角色]文本，这样在清理时也能保留角色信息
        const rolePrefix = node.role === 'Doctor' ? '[医生]' : '[患者]';
        currentTextBuffer.current += rolePrefix + textToAdd + '。';
      } else {
        // 已存在话语的更新：需要找到并替换对应的文本
        // 由于我们使用 startTime + role 作为唯一标识，需要找到对应的句子并替换
        const rolePrefix = node.role === 'Doctor' ? '[医生]' : '[患者]';
        const sentences = currentTextBuffer.current.split(/[。！？\n]/).filter(s => s.trim().length > 0);
        let updated = false;
        
        // 查找并更新对应的句子（基于角色前缀和文本开头）
        const updatedSentences = sentences.map(s => {
          const trimmed = s.trim();
          // 检查是否是同一角色的话语
          const hasRolePrefix = trimmed.startsWith('[医生]') || trimmed.startsWith('[患者]');
          const currentRolePrefix = trimmed.startsWith('[医生]') ? '[医生]' : trimmed.startsWith('[患者]') ? '[患者]' : '';
          
          // 如果角色匹配，且文本开头相似（前10个字符），认为是同一句话的更新
          if (hasRolePrefix && currentRolePrefix === rolePrefix && trimmed.length > rolePrefix.length + 5) {
            const textWithoutPrefix = trimmed.substring(rolePrefix.length);
            if (textWithoutPrefix.length > 5 && textToAdd.length > 5) {
              const key1 = textWithoutPrefix.substring(0, Math.min(10, textWithoutPrefix.length));
              const key2 = textToAdd.substring(0, Math.min(10, textToAdd.length));
              if (key1 === key2) {
                // 如果新文本更长，替换；否则保持原文本
                if (textToAdd.length > textWithoutPrefix.length) {
                  updated = true;
                  return rolePrefix + textToAdd;
                }
                return trimmed;
              }
            }
          }
          return trimmed;
        });
        
        if (updated) {
          currentTextBuffer.current = updatedSentences.filter(s => s.trim().length > 0).join('。') + '。';
        }
      }
    });
    
    // 智能触发分析：
    // 1. 如果有最终结果（definite: true），立即触发分析
    // 2. 否则，延迟触发（等待语音识别稳定）
    if (hasDefiniteResult) {
      // 有最终结果，立即触发分析
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
      }
      analysisTimerRef.current = setTimeout(() => {
        triggerDeepAnalysis();
      }, 200); // 短延迟，快速响应最终结果
    } else {
      // 只有中间结果，延迟更长时间，等待识别稳定
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
      }
      analysisTimerRef.current = setTimeout(() => {
        triggerDeepAnalysis();
      }, 1000); // 长延迟，等待识别稳定
    }
  };

  const startLiveProcessing = async () => {
    // 防止重复启动
    if (isProcessingRef.current) {
      console.warn('处理已在进行中，跳过重复启动');
      return;
    }
    
    isProcessingRef.current = true;
    try {
      isStreamingRef.current = true; // 重置流式传输状态
      if (provider === 'volcano') {
        // 使用火山引擎服务
        const appKey = process.env.VOLCANO_APP_KEY || '';
        const accessKey = process.env.VOLCANO_ACCESS_KEY || '';
        const url = process.env.VOLCANO_API_URL || 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';
        
        if (!appKey || !accessKey) {
          throw new Error('火山引擎 API Key 未配置，请在环境变量中设置 VOLCANO_APP_KEY 和 VOLCANO_ACCESS_KEY');
        }
        
        setStatus('connecting');
        const volcanoService = new VolcanoEngineService(appKey, accessKey, url);
        volcanoServiceRef.current = volcanoService;
        
        // 创建音频元素并播放音频文件
        const audioUrl = URL.createObjectURL(audioFile);
        const audioElement = new Audio(audioUrl);
        audioElementRef.current = audioElement;
        
        // 监听音频播放进度，更新当前时间
        audioElement.addEventListener('timeupdate', () => {
          setCurrentTime(audioElement.currentTime);
        });
        
        // 音频播放结束时的处理
        audioElement.addEventListener('ended', () => {
          setStatus('completed');
          triggerDeepAnalysis(true);
          URL.revokeObjectURL(audioUrl);
        });
        
        // 音频播放错误处理
        audioElement.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setStatus('completed');
          URL.revokeObjectURL(audioUrl);
        });
        
        setStatus('streaming');
        
        // 开始播放音频
        const playPromise = audioElement.play().catch((err) => {
          console.error('Failed to play audio:', err);
        });
        
        // 同时开始语音识别（不等待完成，因为识别可能比播放快）
        const transcriptionPromise = volcanoService.transcribeAudioFile(
          audioFile,
          (transcripts) => {
            handleVolcanoTranscript(transcripts);
            // 使用音频播放时间作为当前时间
            if (audioElement) {
              setCurrentTime(audioElement.currentTime);
            }
          },
          (error) => {
            console.error('Volcano engine error:', error);
            setStatus('completed');
            isProcessingRef.current = false;
            // 停止音频播放
            if (audioElement) {
              audioElement.pause();
              URL.revokeObjectURL(audioUrl);
            }
          }
        );
        
        // 等待音频播放完成和识别完成（哪个先完成都可以）
        await Promise.all([
          playPromise.then(() => {
            return new Promise<void>((resolve) => {
              if (audioElement.ended) {
                resolve();
              } else {
                audioElement.addEventListener('ended', () => resolve(), { once: true });
              }
            });
          }),
          transcriptionPromise
        ]);
        
        setStatus('completed');
        triggerDeepAnalysis(true);
        URL.revokeObjectURL(audioUrl);
        
      } else {
        // 使用 Gemini 服务（原有逻辑）
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const arrayBuffer = await audioFile.arrayBuffer();
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              setStatus('streaming');
              streamAudio(audioBuffer, sessionPromise);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.inputTranscription) {
                const rawText = message.serverContent.inputTranscription.text;
                currentTextBuffer.current += rawText;
                
                setTranscription(prev => {
                  let cleanText = rawText;
                  
                  // 采用更强力的标签匹配格式 [医生] [患者]
                  const doctorMatch = rawText.match(/\[医生\]/i) || rawText.match(/医生[:：]/);
                  const patientMatch = rawText.match(/\[患者\]/i) || rawText.match(/患者[:：]/);

                  if (doctorMatch) {
                    activeRoleRef.current = 'Doctor';
                    cleanText = cleanText.replace(/\[医生\]/gi, '').replace(/医生[:：]/g, '');
                  } else if (patientMatch) {
                    activeRoleRef.current = 'Patient';
                    cleanText = cleanText.replace(/\[患者\]/gi, '').replace(/患者[:：]/g, '');
                  }

                  // 移除可能存在的繁体/乱码过滤（简单启发式：只保留中文、常用标点和数字）
                  // 避免模型在听不清时胡乱输出外语
                  cleanText = cleanText.replace(/[^\u4e00-\u9fa5\u3000-\u303f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff600-9a-zA-Z\s,.;:!?]/g, '');

                  if (!cleanText.trim() && !doctorMatch && !patientMatch) {
                    return prev;
                  }

                  const last = prev[prev.length - 1];
                  if (last && last.role === activeRoleRef.current) {
                    const newEntries = [...prev];
                    newEntries[newEntries.length - 1] = { 
                      ...last, 
                      text: last.text + cleanText 
                    };
                    return newEntries;
                  } else {
                    return [...prev, { role: activeRoleRef.current, text: cleanText }];
                  }
                });
              }

              if (message.serverContent?.turnComplete) {
                triggerDeepAnalysis();
              }
            },
            onerror: (e) => console.error("Live API Error:", e),
            onclose: () => {
              isStreamingRef.current = false; // 停止流式传输
              setStatus('completed');
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            systemInstruction: `
              # 身份定义
              你是一个极致专业的医疗对话实时转录系统。用户是中国医生和患者。

              # 核心指令：强制语言
              1. 必须且只能输出【简体中文】。严禁输出繁体中文、英文、丹麦语或任何其他外国语言。
              2. 如果音频模糊或有口音，请根据上下文理解并转录为合法的简体中文词汇，严禁直译音标为外语单词。

              # 核心指令：说话人区分
              你必须根据语境（提问者通常是医生，回答病情者通常是患者）实时区分说话人：
              - 如果判断是医生在说话，必须在文本最前方加上标签：[医生]
              - 如果判断是患者在说话，必须在文本最前方加上标签：[患者]
              - 每一段转录的开头都必须带有标签，除非是同一人连续说话的片段。

              # 示例输出
              [医生]你好，最近哪里不舒服？
              [患者]医生您好，我最近老是觉得心口闷，喘不上气。
              [医生]这种情况持续多长时间了？
              [患者]大概有两周了。
            `,
          }
        });

        sessionPromiseRef.current = sessionPromise;
      }
    } catch (err) {
      console.error("Failed to start live processing:", err);
      onClose();
    }
  };

  const streamAudio = (buffer: AudioBuffer, sessionPromise: Promise<any>) => {
    const ctx = audioCtxRef.current!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const processor = ctx.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(ctx.destination);
    source.connect(ctx.destination);

    processor.onaudioprocess = (e) => {
      if (!isStreamingRef.current) return; // 如果已停止流式传输，直接返回
      
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);
      sessionPromise.then((session) => {
        // 检查 session 是否存在且 WebSocket 连接正常
        try {
          if (session && typeof session.sendRealtimeInput === 'function') {
            session.sendRealtimeInput({ media: pcmBlob });
          }
        } catch (error) {
          // WebSocket 已关闭，停止流式传输
          isStreamingRef.current = false;
        }
      }).catch(() => {
        isStreamingRef.current = false;
      });
      setCurrentTime(ctx.currentTime);
    };

    source.start(0);
    sourceRef.current = source;
    source.onended = () => {
      setStatus('completed');
      triggerDeepAnalysis(true);
      sessionPromise.then(s => { try { s.close(); } catch(e) {} });
    };
  };

  // 计算文本相似度（简单的关键词匹配方法）
  const calculateSimilarity = (text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1;
    
    // 提取关键词（中文字符和数字）
    const extractKeywords = (text: string): Set<string> => {
      const keywords = new Set<string>();
      // 提取2-4字的中文词组
      const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
      chineseWords.forEach(word => keywords.add(word));
      // 提取单个中文字符
      const chars = text.match(/[\u4e00-\u9fa5]/g) || [];
      chars.forEach(char => keywords.add(char));
      return keywords;
    };
    
    const keywords1 = extractKeywords(text1);
    const keywords2 = extractKeywords(text2);
    
    if (keywords1.size === 0 && keywords2.size === 0) return 1;
    if (keywords1.size === 0 || keywords2.size === 0) return 0;
    
    // 计算交集和并集
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    // Jaccard 相似度
    return intersection.size / union.size;
  };
  
  // 使用AI判断是否需要更新总结（基于全文上下文）
  const shouldUpdateSummaryWithAI = async (
    oldSummary: StructuredDiagnosis | null,
    newSummary: StructuredDiagnosis,
    fullContext: string
  ): Promise<boolean> => {
    if (!oldSummary) return true; // 如果没有旧总结，直接更新
    
    try {
      const gemini = new GeminiService('gemini-3-flash-preview');
      const shouldUpdate = await gemini.shouldUpdateSummary(oldSummary, newSummary, fullContext);
      return shouldUpdate;
    } catch (e) {
      // 如果AI判断失败，使用简单的文本相似度作为后备方案
      console.warn("AI update decision failed, using fallback:", e);
      return false; // 保守策略：AI判断失败时不更新
    }
  };
  
  // 比较两个脚本是否相似（更严格的判断）
  const isScriptSimilar = (old: RecommendationScript | null, new_: RecommendationScript): boolean => {
    if (!old) return false;
    
    const problemSimilarity = calculateSimilarity(old.healthProblem, new_.healthProblem);
    const solutionSimilarity = calculateSimilarity(old.possibleSolution, new_.possibleSolution);
    const pitchSimilarity = calculateSimilarity(old.productPitch, new_.productPitch);
    
    // 计算平均相似度
    const avgSimilarity = (problemSimilarity + solutionSimilarity + pitchSimilarity) / 3;
    
    // 更严格的判断：
    // 1. 平均相似度>0.5（降低阈值，因为模板化后相似度会更高）
    // 2. 至少两个部分相似度>0.5
    // 3. 或者平均相似度>0.6（即使只有一个部分相似度高）
    const highSimilarityCount = [problemSimilarity, solutionSimilarity, pitchSimilarity].filter(s => s > 0.5).length;
    
    const isSimilar = (avgSimilarity > 0.5 && highSimilarityCount >= 2) || avgSimilarity > 0.6;
    
    if (!isSimilar) {
      console.log('📝 话术相似度详情:', {
        健康问题: problemSimilarity.toFixed(3),
        解决方案: solutionSimilarity.toFixed(3),
        产品推荐: pitchSimilarity.toFixed(3),
        平均相似度: avgSimilarity.toFixed(3),
        高相似度部分数: highSimilarityCount,
        判断结果: '不相似，需要更新'
      });
    } else {
      console.log('📝 话术相似度详情:', {
        健康问题: problemSimilarity.toFixed(3),
        解决方案: solutionSimilarity.toFixed(3),
        产品推荐: pitchSimilarity.toFixed(3),
        平均相似度: avgSimilarity.toFixed(3),
        高相似度部分数: highSimilarityCount,
        判断结果: '相似，保持不变'
      });
    }
    
    return isSimilar;
  };
  
  // 判断健康状况是否有重大变化
  const hasSignificantHealthChange = (oldDiagnosis: StructuredDiagnosis | null, newDiagnosis: StructuredDiagnosis): boolean => {
    console.log('🔍 [健康状况变化判断] ==========================================');
    if (!oldDiagnosis) {
      console.log('🔍 [健康状况变化判断] 无旧诊断，认为有变化');
      return true; // 如果没有旧诊断，认为有变化
    }
    
    // 1. 检查健康问题是否有重大变化
    const oldProblems = oldDiagnosis.healthProblems.join('、');
    const newProblems = newDiagnosis.healthProblems.join('、');
    
    console.log('🔍 [健康状况变化判断] 健康问题:');
    console.log('  旧:', oldProblems || '无');
    console.log('  新:', newProblems || '无');
    
    // 如果健康问题完全不同，认为有重大变化
    const problemsSimilarity = calculateSimilarity(oldProblems, newProblems);
    console.log('🔍 [健康状况变化判断] 健康问题相似度:', problemsSimilarity.toFixed(3));
    
    if (problemsSimilarity < 0.6) {
      console.log('🔍 [健康状况变化判断] ✅ 健康问题相似度低 (<0.6)，认为有重大变化');
      return true;
    }
    
    // 2. 检查是否有新的严重症状
    const oldProblemSet = new Set(oldDiagnosis.healthProblems);
    const newProblemSet = new Set(newDiagnosis.healthProblems);
    const newProblemsList = newDiagnosis.healthProblems.filter(p => !oldProblemSet.has(p));
    const lostProblemsList = oldDiagnosis.healthProblems.filter(p => !newProblemSet.has(p));
    
    // 如果有新的具体症状（不是"信息不足"），认为有重大变化
    if (newProblemsList.length > 0 && newProblemsList.some(p => !p.includes('信息不足') && !p.includes('待补充'))) {
      console.log('📊 发现新的具体症状，认为有重大变化');
      return true;
    }
    
    // 如果丢失了具体症状，也认为有重大变化
    if (lostProblemsList.length > 0 && lostProblemsList.some(p => !p.includes('信息不足') && !p.includes('待补充'))) {
      console.log('📊 丢失了具体症状，认为有重大变化');
      return true;
    }
    
    // 3. 检查风险点是否有重大变化（更智能的判断）
    const oldRisks = oldDiagnosis.riskPoints.join('、');
    const newRisks = newDiagnosis.riskPoints.join('、');
    
    // 提取风险点的核心关键词（去除修饰词）
    const extractRiskKeywords = (risks: string): Set<string> => {
      const keywords = new Set<string>();
      // 提取关键风险词：天气、饮食、生冷、硬质、冷饮、冰棍、牛奶等
      const riskKeywords = ['天气', '炎热', '寒冷', '饮食', '生冷', '硬质', '冷饮', '冰棍', '牛奶', '奶制品', '环境', '受凉'];
      riskKeywords.forEach(keyword => {
        if (risks.includes(keyword)) {
          keywords.add(keyword);
        }
      });
      return keywords;
    };
    
    const oldRiskKeywords = extractRiskKeywords(oldRisks);
    const newRiskKeywords = extractRiskKeywords(newRisks);
    
    console.log('📊 [风险点判断] 旧风险点:', oldRisks || '无');
    console.log('📊 [风险点判断] 新风险点:', newRisks || '无');
    console.log('📊 [风险点判断] 旧关键词:', Array.from(oldRiskKeywords));
    console.log('📊 [风险点判断] 新关键词:', Array.from(newRiskKeywords));
    
    // 如果核心关键词完全不同，认为有重大变化
    if (oldRiskKeywords.size > 0 && newRiskKeywords.size > 0) {
      const keywordIntersection = new Set([...oldRiskKeywords].filter(x => newRiskKeywords.has(x)));
      const keywordUnion = new Set([...oldRiskKeywords, ...newRiskKeywords]);
      const keywordSimilarity = keywordUnion.size > 0 ? keywordIntersection.size / keywordUnion.size : 0;
      
      console.log('📊 [风险点判断] 关键词相似度:', keywordSimilarity.toFixed(3));
      
      // 如果核心关键词相似度很低（<0.3），认为有重大变化
      if (keywordSimilarity < 0.3) {
        console.log('📊 [风险点判断] 核心关键词相似度低 (<0.3)，认为有重大变化');
        return true;
      }
    }
    
    // 如果风险点文本相似度很低（<0.4），且核心关键词也不相似，认为有重大变化
    const risksSimilarity = calculateSimilarity(oldRisks, newRisks);
    console.log('📊 [风险点判断] 文本相似度:', risksSimilarity.toFixed(3));
    
    if (risksSimilarity < 0.4) {
      console.log('📊 [风险点判断] 文本相似度低 (<0.4)，认为有重大变化');
      return true;
    }
    
    console.log('📊 [风险点判断] 风险点无重大变化');
    
    console.log('📊 健康状况无重大变化');
    return false;
  };
  
  // 基于稳定的诊断总结生成产品推荐和话术
  const generateProductAndScript = async (diagnosis: StructuredDiagnosis) => {
    console.log('🎯 [智能方案生成] ==========================================');
    console.log('📋 基于诊断总结生成产品推荐和话术');
    console.log('📋 诊断总结 - 健康问题:', diagnosis.healthProblems);
    console.log('📋 诊断总结 - 风险点:', diagnosis.riskPoints);
    console.log('📋 诊断总结 - 总结:', diagnosis.suggestionSummary);
    
    try {
      const gemini = new GeminiService('gemini-3-flash-preview');
      
      // 基于诊断总结生成产品推荐和话术
      console.log('🤖 调用AI生成产品推荐和话术...');
      const response = await gemini.generateProductAndScript(diagnosis, MOCK_PRODUCTS);
      
      console.log('✅ AI返回结果:');
      console.log('  推荐产品ID:', response.recommendedProductId);
      console.log('  话术 - 健康问题:', response.draftScript.healthProblem);
      console.log('  话术 - 解决方案:', response.draftScript.possibleSolution);
      console.log('  话术 - 产品推荐:', response.draftScript.productPitch);
      
      const lastAnalysis = lastAnalysisRef.current;
      
      // 更新产品
      console.log('📦 [产品更新判断]');
      console.log('  旧产品ID:', lastAnalysis.productId || '无');
      console.log('  新产品ID:', response.recommendedProductId);
      
      // 如果产品ID为"none"或无效，保持原产品不变
      if (response.recommendedProductId && response.recommendedProductId !== 'none' && response.recommendedProductId !== lastAnalysis.productId) {
        const product = MOCK_PRODUCTS.find(p => p.id === response.recommendedProductId);
        if (product) {
          console.log('✅ 产品ID变化，更新产品:', product.name);
          setRecommendedProduct(product);
          lastAnalysis.productId = response.recommendedProductId;
        } else {
          console.warn('⚠️  产品ID不存在:', response.recommendedProductId, '，保持原产品');
        }
      } else if (response.recommendedProductId === 'none') {
        console.log('⏸️  AI返回产品ID为"none"，保持原产品不变');
      } else {
        console.log('⏸️  产品ID无变化，保持原产品');
      }
      
      // 更新话术（更严格的判断）
      console.log('📝 [话术更新判断] ==========================================');
      if (lastAnalysis.script) {
        console.log('📝 [话术更新判断] 旧话术:');
        console.log('  健康问题:', lastAnalysis.script.healthProblem);
        console.log('  解决方案:', lastAnalysis.script.possibleSolution);
        console.log('  产品推荐:', lastAnalysis.script.productPitch);
      } else {
        console.log('📝 [话术更新判断] 旧话术: 无');
      }
      console.log('📝 [话术更新判断] 新话术:');
      console.log('  健康问题:', response.draftScript.healthProblem);
      console.log('  解决方案:', response.draftScript.possibleSolution);
      console.log('  产品推荐:', response.draftScript.productPitch);
      
      // 如果没有旧话术，直接更新
      if (!lastAnalysis.script) {
        console.log('📝 [话术更新判断] ✅ 首次生成话术，直接更新');
        setDraftScript(response.draftScript);
        lastAnalysis.script = response.draftScript;
      } else {
        // 检查话术是否相似
        const isSimilar = isScriptSimilar(lastAnalysis.script, response.draftScript);
        
        if (!isSimilar) {
          // 话术不相似，但需要进一步检查是否真的需要更新
          // 即使健康状况有重大变化，如果新话术质量不如旧话术，也不应该更新
          console.log('📝 [话术更新判断] ⚠️  话术不相似，但需要进一步检查...');
          
          // 检查新话术是否比旧话术更完整、更准确
          const oldProblemLength = lastAnalysis.script.healthProblem.length;
          const newProblemLength = response.draftScript.healthProblem.length;
          const oldSolutionLength = lastAnalysis.script.possibleSolution.length;
          const newSolutionLength = response.draftScript.possibleSolution.length;
          
          console.log('📝 [话术更新判断] 话术长度对比:');
          console.log('  健康问题: 旧', oldProblemLength, '字符 vs 新', newProblemLength, '字符');
          console.log('  解决方案: 旧', oldSolutionLength, '字符 vs 新', newSolutionLength, '字符');
          
          // 如果新话术明显更短或更不完整，可能不应该更新
          const isNewScriptBetter = (newProblemLength >= oldProblemLength * 0.8 && 
                                     newSolutionLength >= oldSolutionLength * 0.8) ||
                                    (newProblemLength > oldProblemLength && newSolutionLength > oldSolutionLength);
          
          if (isNewScriptBetter) {
            console.log('📝 [话术更新判断] ✅ 新话术质量更好，更新话术');
            setDraftScript(response.draftScript);
            lastAnalysis.script = response.draftScript;
          } else {
            console.log('📝 [话术更新判断] ⏸️  新话术质量不如旧话术，保持旧话术不变');
          }
        } else {
          console.log('📝 [话术更新判断] ⏸️  话术相似，保持不变');
        }
      }
      console.log('📝 [话术更新判断] ==========================================');
      
      console.log('🎯 [智能方案生成] ==========================================');
    } catch (e) {
      console.error('❌ [智能方案生成] 生成产品推荐和话术失败:', e);
      console.log('🎯 [智能方案生成] ==========================================');
    }
  };

  const triggerDeepAnalysis = async (isFinal = false) => {
    const currentFullText = currentTextBuffer.current.trim();
    
    // 检查是否有足够的内容进行分析（至少15个字符，降低阈值以更快触发）
    if (currentFullText.length < 15 && !isFinal) return;
    
    // 检查内容是否变化（避免重复分析相同内容）
    if (currentFullText === lastAnalysisText.current && !isFinal) return;
    
    // 降低变化阈值：只要内容有变化就分析（实时更新）
    const textDiff = currentFullText.length - lastAnalysisText.current.length;
    // 移除小变化限制，让分析更频繁触发
    
    // 如果正在同步，跳过（避免并发调用）
    if (isSyncing) {
      // 如果正在同步，但这是最终分析，等待一下再试
      if (isFinal) {
        setTimeout(() => triggerDeepAnalysis(true), 500);
      }
      return;
    }
    
    lastAnalysisText.current = currentFullText;
    setIsSyncing(true);
    
    try {
      const gemini = new GeminiService('gemini-3-flash-preview');
      const analysis = await gemini.getRealtimeAnalysis(currentFullText, MOCK_PRODUCTS);
      
      // 比较新旧结果，只在有实质性变化时更新
      const lastAnalysis = lastAnalysisRef.current;
      
      // 记录日志：旧总结
      console.log('📊 [总结更新判断] ==========================================');
      console.log('📝 当前对话文本长度:', currentFullText.length, '字符');
      console.log('📝 当前对话文本（前200字符）:', currentFullText.substring(0, 200));
      if (lastAnalysis.diagnosis) {
        console.log('🔵 旧总结 - 健康问题:', lastAnalysis.diagnosis.healthProblems);
        console.log('🔵 旧总结 - 风险点:', lastAnalysis.diagnosis.riskPoints);
        console.log('🔵 旧总结 - 总结:', lastAnalysis.diagnosis.suggestionSummary);
      } else {
        console.log('🔵 旧总结: 无');
      }
      console.log('🟢 新总结 - 健康问题:', analysis.diagnosis.healthProblems);
      console.log('🟢 新总结 - 风险点:', analysis.diagnosis.riskPoints);
      console.log('🟢 新总结 - 总结:', analysis.diagnosis.suggestionSummary);
      
      // 使用AI判断是否需要更新总结（基于全文上下文）
      const shouldUpdate = await shouldUpdateSummaryWithAI(
        lastAnalysis.diagnosis,
        analysis.diagnosis,
        currentFullText
      );
      
      console.log('🤖 AI判断结果:', shouldUpdate ? '✅ 需要更新' : '❌ 不需要更新');
      console.log('📊 [总结更新判断] ==========================================');
      
      // 更新诊断（如果AI判断需要更新）
      if (shouldUpdate) {
        console.log('✅ 执行更新：总结已更新为新内容');
        const oldDiagnosis = lastAnalysis.diagnosis;
        setDiagnosis(analysis.diagnosis);
        lastAnalysis.diagnosis = analysis.diagnosis;
        
        // 诊断总结更新后，检查健康状况是否有重大变化
        const hasSignificantChange = hasSignificantHealthChange(oldDiagnosis, analysis.diagnosis);
        
        if (hasSignificantChange) {
          // 有重大变化，基于新的稳定总结重新生成产品推荐和话术
          console.log('🔄 健康状况有重大变化，基于新总结生成产品推荐和话术...');
          console.log('📋 变化详情:');
          console.log('  旧健康问题:', oldDiagnosis?.healthProblems || '无');
          console.log('  新健康问题:', analysis.diagnosis.healthProblems);
          console.log('  旧风险点:', oldDiagnosis?.riskPoints || '无');
          console.log('  新风险点:', analysis.diagnosis.riskPoints);
          await generateProductAndScript(analysis.diagnosis);
        } else {
          console.log('⏸️  健康状况无重大变化，保持产品和话术不变');
          // 即使健康状况无重大变化，如果当前没有话术，也需要生成初始话术
          if (!lastAnalysisRef.current.script) {
            console.log('🔄 虽然健康状况无重大变化，但当前没有话术，生成初始话术...');
            await generateProductAndScript(analysis.diagnosis);
          }
        }
      } else {
        console.log('⏸️  跳过更新：保持旧总结不变');
        // 如果总结没有更新，产品和话术也不应该变化
        console.log('⏸️  健康状况无重大变化，保持产品和话术不变');
      }
      
      // 如果是第一次分析（没有旧诊断），生成初始的产品推荐和话术
      if (!lastAnalysis.diagnosis && analysis.diagnosis) {
        console.log('🔄 首次分析，生成初始产品推荐和话术...');
        await generateProductAndScript(analysis.diagnosis);
      }
    } catch (e) {
      // 输出错误以便调试
      console.warn("Analysis failed:", e);
      // 如果是最终分析失败，尝试重试一次
      if (isFinal && currentFullText.length > 0) {
        setTimeout(() => {
          if (!isSyncing) {
            triggerDeepAnalysis(true);
          }
        }, 1000);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // 清理之前的连接
    const cleanup = () => {
      isProcessingRef.current = false;
      isStreamingRef.current = false;
      
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(s => { 
          try { s.close(); } catch(e) {} 
        }).catch(() => {});
        sessionPromiseRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
      if (volcanoServiceRef.current) {
        volcanoServiceRef.current.close();
        volcanoServiceRef.current = null;
      }
    };
    
    cleanup();
    
    // 重置状态
    isProcessingRef.current = false;
    isStreamingRef.current = true;
    processedTranscriptsRef.current.clear(); // 清空已处理的转录记录
    currentTextBuffer.current = ''; // 清空文本缓冲区
    lastAnalysisText.current = ''; // 重置分析文本
    
    // 启动新的处理
    if (isMounted) {
      startLiveProcessing();
    }
    
    return () => {
      isMounted = false;
      // 清理防抖定时器
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleFinish = () => {
    if (diagnosis && recommendedProduct && draftScript) {
      onFinish(currentTextBuffer.current, diagnosis, recommendedProduct, draftScript);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 lg:p-6 backdrop-blur-2xl">
      <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-12 gap-6 h-[90vh]">
        
        {/* 左侧：实时转录监控 */}
        <div className="lg:col-span-4 bg-slate-900 rounded-[3rem] border border-white/10 p-8 flex flex-col shadow-2xl relative overflow-hidden">
          <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${status === 'streaming' ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {status === 'connecting' ? '建立 API 连接...' : `语音流推流中 (${provider === 'gemini' ? 'Gemini' : '火山引擎'})`}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500">{currentTime.toFixed(1)}s</div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2 mb-6">
            {transcription.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-1 bg-white/5 rounded-full mb-2 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-progress"></div>
                </div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">等待 Live API 实时转录...</p>
              </div>
            )}
            {transcription.map((t, i) => (
              <div key={i} className={`animate-in slide-in-from-bottom-2 duration-500 flex flex-col ${t.role === 'Doctor' ? 'items-end text-right' : 'items-start text-left'}`}>
                <div className={`flex items-center gap-2 mb-1.5 ${t.role === 'Doctor' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-2 h-2 rounded-full ${t.role === 'Doctor' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {t.role === 'Doctor' ? '医生 (DOCTOR)' : '患者 (PATIENT)'}
                  </span>
                </div>
                <p className={`p-5 rounded-3xl text-[13px] leading-relaxed border shadow-xl max-w-[95%] ${
                  t.role === 'Doctor' 
                    ? 'bg-blue-600/15 text-blue-100 border-blue-500/30' 
                    : 'bg-slate-800/80 text-slate-200 border-white/5'
                }`}>
                  {t.text || "..."}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <div className="h-12 bg-white/5 rounded-2xl flex items-center px-4 gap-2 border border-white/5 shadow-inner">
               {[...Array(20)].map((_, i) => (
                 <div key={i} className={`flex-1 bg-blue-500/40 rounded-full ${status === 'streaming' ? 'wave-bar' : 'h-1'}`} style={{ animationDelay: `${i * 0.05}s` }}></div>
               ))}
            </div>
            <button onClick={onClose} className="w-full mt-4 py-3 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">中止问诊任务</button>
          </div>
        </div>

        {/* 右侧：语义分析层 */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
          
          <div className="bg-slate-900/40 rounded-[3rem] border border-white/5 p-10 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">01 临床特征提取 (简体)</h4>
              {isSyncing && <div className="flex items-center gap-1.5"><div className="w-1 h-1 bg-blue-500 rounded-full animate-ping"></div><span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">AI 分析中</span></div>}
            </div>
            
            <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <section className="space-y-4">
                <p className="text-white text-[10px] font-black uppercase tracking-widest opacity-30">健康问题</p>
                <div className="flex flex-wrap gap-2">
                  {diagnosis?.healthProblems.map((p, i) => (
                    <span key={i} className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-2xl text-[11px] font-bold border border-blue-500/20 animate-in zoom-in">{p}</span>
                  )) || <div className="h-8 w-32 bg-white/5 rounded-xl animate-pulse"></div>}
                </div>
              </section>

              <section className="space-y-4">
                <p className="text-white text-[10px] font-black uppercase tracking-widest opacity-30">高危风险点</p>
                <div className="flex flex-wrap gap-2">
                  {diagnosis?.riskPoints.map((r, i) => (
                    <span key={i} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-2xl text-[11px] font-bold border border-red-500/20 animate-in zoom-in">{r}</span>
                  )) || <div className="h-8 w-24 bg-white/5 rounded-xl animate-pulse"></div>}
                </div>
              </section>

              <div className="mt-4 p-6 bg-blue-600/5 rounded-[2rem] border border-blue-500/10">
                <p className="text-slate-400 text-[11px] leading-relaxed italic">
                  {diagnosis?.suggestionSummary || "正在实时提取语音特征并生成摘要..."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 overflow-hidden">
            <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 p-8">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">02 智能方案匹配</h4>
              {recommendedProduct ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[2rem] animate-in slide-in-from-top-4">
                  <span className="text-[9px] font-black text-emerald-500 uppercase px-2 py-0.5 bg-emerald-500/10 rounded-md tracking-tighter">{recommendedProduct.department}</span>
                  <h5 className="text-white font-bold text-base mt-2">{recommendedProduct.name}</h5>
                </div>
              ) : <div className="h-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10 flex items-center justify-center text-slate-700 text-[10px] uppercase font-bold tracking-widest">寻找最佳匹配方案...</div>}
            </div>

            <div className="bg-slate-900/60 rounded-[2.5rem] border border-blue-500/20 p-8 flex-1 flex flex-col shadow-2xl shadow-blue-500/5 overflow-hidden">
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">03 数字人实时话术</h4>
              <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
                {draftScript ? (
                  <div className="space-y-6 animate-in fade-in duration-700">
                    <div className="space-y-2">
                      <p className="text-blue-500/50 text-[9px] font-black uppercase">病情理解</p>
                      <p className="text-slate-200 text-xs leading-relaxed font-medium">“{draftScript.healthProblem}”</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-emerald-500/50 text-[9px] font-black uppercase">针对性方案</p>
                      <p className="text-slate-200 text-xs leading-relaxed font-medium">“{draftScript.possibleSolution}”</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-indigo-500/50 text-[9px] font-black uppercase">数字人话术</p>
                      <p className="text-slate-200 text-xs leading-relaxed font-bold italic border-l-2 border-indigo-500/30 pl-3">“{draftScript.productPitch}”</p>
                    </div>
                  </div>
                ) : <div className="h-full flex items-center justify-center text-slate-700 text-[10px] uppercase font-bold text-center px-10 leading-loose tracking-widest">基于对话流动态生成脚本...</div>}
              </div>
              
              {status === 'completed' && (
                <button onClick={handleFinish} className="mt-8 w-full py-5 bg-white text-slate-950 font-black rounded-[1.5rem] text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                  确认并发送推荐报告
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default SimulationMode;
