
import { GoogleGenAI, Type } from "@google/genai";
import { Product, StructuredDiagnosis, RecommendationScript, RealtimeAnalysis, AIRecommendationResult, ProductRecommendation } from "../types";
import { RealProduct, simplifyDisease, PRODUCTS_BY_DISEASE } from "../productData";

export interface TimedTranscriptNode {
  startTime: number; 
  endTime: number;
  role: 'Doctor' | 'Patient';
  text: string;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(modelName: string) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    // 调试：检查 API Key 是否正确加载
    if (!apiKey) {
      console.error('❌ Gemini API Key 未设置！请检查环境变量');
    } else {
      console.log('🔑 Gemini API Key 已加载:', apiKey.substring(0, 20) + '...');
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async transcribeAudioFile(base64Data: string, mimeType: string): Promise<TimedTranscriptNode[]> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: "请将这段医疗音频转录为 JSON 数组。必须严格使用【简体中文】。如果音频有口音，请根据医学背景纠偏为标准简体中文词汇，严禁输出繁体或外语词汇。必须包含精确的时间戳。" }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startTime: { type: Type.NUMBER },
              endTime: { type: Type.NUMBER },
              role: { type: Type.STRING, enum: ['Doctor', 'Patient'] },
              text: { type: Type.STRING }
            },
            required: ["startTime", "endTime", "role", "text"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]');
    } catch (e) {
      throw new Error("Audio transcription failed.");
    }
  }

  async getRealtimeAnalysis(notes: string, availableProducts: Product[]): Promise<RealtimeAnalysis> {
    // 清理对话文本：去除重复片段和无效内容
    const cleanedNotes = this.cleanConversationText(notes);
    
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `你是一个专业的医疗AI助手，负责分析医患对话并提取关键信息。

# 重要原则
1. **严谨性**：只提取明确提到的症状和风险点，不要推测或过度解读
2. **完整性**：如果对话信息不足，健康问题应标记为"信息不足，待补充"，不要强行提取
3. **准确性**：必须使用【简体中文】，严禁输出繁体字
4. **稳定性**：基于实际对话内容，不要因为表达方式不同而产生不同的总结

# 任务清单
1. **提取症状和风险点**：只提取对话中明确提到的内容
2. **生成诊断总结**：基于提取的信息生成专业的诊断总结

# 对话文本
${cleanedNotes}

# 输出要求
- 如果对话信息不足（只有开场白或问候），健康问题应设为"信息不足，待补充"
- 风险点应基于实际提到的内容，不要过度推测
- 总结应准确反映对话内容，不要添加未提及的信息`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: {
              type: Type.OBJECT,
              properties: {
                healthProblems: { type: Type.ARRAY, items: { type: Type.STRING } },
                riskPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestionSummary: { type: Type.STRING }
              },
              required: ["healthProblems", "riskPoints", "suggestionSummary"]
            }
            },
          required: ["diagnosis"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      throw new Error("Realtime analysis failed.");
    }
  }
  
  // 基于稳定的诊断总结生成产品推荐和话术
  async generateProductAndScript(diagnosis: StructuredDiagnosis, availableProducts: Product[]): Promise<{ recommendedProductId: string; draftScript: RecommendationScript }> {
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `你是一个专业的医疗AI助手，负责基于诊断总结推荐合适的医疗产品并生成推荐话术。

# 任务
基于给定的诊断总结，推荐最合适的产品，并生成专业的数字人推荐话术。

# 诊断总结
健康问题：${diagnosis.healthProblems.join('、')}
风险点：${diagnosis.riskPoints.join('、')}
总结：${diagnosis.suggestionSummary}

# 可用产品列表
${JSON.stringify(availableProducts)}

# 话术生成模板（必须严格遵循）
为了确保话术的稳定性和一致性，请按照以下模板生成话术：

## 健康问题描述模板
- 如果健康问题包含具体症状（如"胃部不适"、"腹泻"等），使用："您目前出现了[具体症状]，这反映出[相关系统]可能存在[风险描述]。"
- 如果信息不足，使用："目前收集的健康信息还比较有限，需要进一步了解您的具体情况。"

## 解决方案模板
- 如果风险点明确，使用："建议您[具体建议]，同时通过[科学方法]来[改善目标]。"
- 如果信息不足，使用："建议补充详细的健康状况信息，以便为您提供更精准的健康管理方案。"

## 产品推荐模板
- 标准格式："针对您的[健康需求]，我为您推荐[产品名称]。该[产品类型]提供[核心功能1]和[核心功能2]，通过[核心价值]，帮助您[预期效果]。"
- 必须包含产品名称和核心功能，语言自然流畅，适合数字人语音播报

# 输出要求
1. **产品推荐**：根据健康问题和风险点，选择最匹配的产品ID
2. **话术生成**：
   - healthProblem：严格按照模板生成，保持简洁专业
   - possibleSolution：严格按照模板生成，基于诊断总结
   - productPitch：严格按照模板生成，专业、有说服力，适合数字人使用

# 重要原则
- **稳定性优先**：话术必须遵循模板，确保表达方式一致
- **准确性**：话术必须准确反映诊断总结的内容
- **专业性**：话术必须专业、符合医疗规范
- **自然流畅**：话术要适合数字人语音播报，自然流畅
- **产品匹配**：产品推荐必须与诊断总结高度匹配`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedProductId: { type: Type.STRING },
            draftScript: {
              type: Type.OBJECT,
              properties: {
                healthProblem: { type: Type.STRING },
                possibleSolution: { type: Type.STRING },
                productPitch: { type: Type.STRING }
              },
              required: ["healthProblem", "possibleSolution", "productPitch"]
            }
          },
          required: ["recommendedProductId", "draftScript"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      throw new Error("Product and script generation failed.");
    }
  }

  // 清理对话文本：去除重复片段和无效内容
  // 注意：必须保留角色标记 [医生] 和 [患者]
  private cleanConversationText(text: string): string {
    if (!text) return '';
    
    // 1. 去除重复的短句（如"你好 你好。你好，我是"）
    // 但必须保留角色信息 [医生] 和 [患者]
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 0);
    const uniqueSentences: string[] = [];
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      // 跳过太短的句子（可能是识别错误）
      if (trimmed.length < 3) continue;
      
      // 提取角色信息
      const hasRolePrefix = trimmed.startsWith('[医生]') || trimmed.startsWith('[患者]');
      const rolePrefix = trimmed.startsWith('[医生]') ? '[医生]' : trimmed.startsWith('[患者]') ? '[患者]' : '';
      const textWithoutPrefix = hasRolePrefix ? trimmed.substring(rolePrefix.length) : trimmed;
      
      // 如果文本太短（去除角色前缀后），跳过
      if (textWithoutPrefix.length < 3) continue;
      
      // 使用角色+前15个字符作为唯一标识
      const key = rolePrefix + textWithoutPrefix.substring(0, Math.min(15, textWithoutPrefix.length));
      let isDuplicate = false;
      let existingIndex = -1;
      
      // 检查是否与已有句子重复（必须考虑角色）
      for (let i = 0; i < uniqueSentences.length; i++) {
        const existing = uniqueSentences[i];
        const existingHasRole = existing.startsWith('[医生]') || existing.startsWith('[患者]');
        const existingRolePrefix = existing.startsWith('[医生]') ? '[医生]' : existing.startsWith('[患者]') ? '[患者]' : '';
        const existingTextWithoutPrefix = existingHasRole ? existing.substring(existingRolePrefix.length) : existing;
        
        // 如果角色不同，不是重复
        if (rolePrefix !== existingRolePrefix) {
          continue;
        }
        
        // 如果角色相同，检查文本是否重复
        const existingKey = existingRolePrefix + existingTextWithoutPrefix.substring(0, Math.min(15, existingTextWithoutPrefix.length));
        
        // 如果前15个字符相同，认为是同一句话
        if (key === existingKey) {
          // 如果新句子明显更长（超过20%），用新句子替换
          if (textWithoutPrefix.length > existingTextWithoutPrefix.length * 1.2) {
            existingIndex = i;
            break;
          } else {
            // 否则认为是重复，跳过
            isDuplicate = true;
            break;
          }
        }
        
        // 额外检查：如果句子内容高度相似（包含关系），也认为是重复
        if (textWithoutPrefix.length > 10 && existingTextWithoutPrefix.length > 10) {
          const similarity = this.calculateTextSimilarity(textWithoutPrefix, existingTextWithoutPrefix);
          if (similarity > 0.8) {
            // 如果新句子更长，替换；否则跳过
            if (textWithoutPrefix.length > existingTextWithoutPrefix.length) {
              existingIndex = i;
              break;
            } else {
              isDuplicate = true;
              break;
            }
          }
        }
      }
      
      if (isDuplicate) {
        continue; // 跳过重复句子
      } else if (existingIndex >= 0) {
        // 替换为更完整的版本（保留角色前缀）
        uniqueSentences[existingIndex] = rolePrefix + textWithoutPrefix;
      } else {
        // 新句子，添加（保留角色前缀）
        uniqueSentences.push(trimmed);
      }
    }
    
    return uniqueSentences.join('。') + (uniqueSentences.length > 0 ? '。' : '');
  }
  
  // 计算两个文本的相似度（简单的Jaccard相似度）
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/[\s，。！？、]/).filter(w => w.length > 0));
    const words2 = new Set(text2.split(/[\s，。！？、]/).filter(w => w.length > 0));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // AI判断是否需要更新总结（基于全文上下文）
  async shouldUpdateSummary(
    oldSummary: StructuredDiagnosis | null,
    newSummary: StructuredDiagnosis,
    fullContext: string
  ): Promise<boolean> {
    if (!oldSummary) return true; // 如果没有旧总结，直接更新
    
    // 清理对话文本
    const cleanedContext = this.cleanConversationText(fullContext);
    
    // 先进行严格的逻辑判断，避免不必要的AI调用
    const oldProblems = oldSummary.healthProblems.join('、') || '';
    const newProblems = newSummary.healthProblems.join('、') || '';
    const oldRisks = oldSummary.riskPoints.join('、') || '';
    const newRisks = newSummary.riskPoints.join('、') || '';
    
    // 1. 如果新总结的健康问题是"信息不足，待补充"，而旧总结有具体症状，不应该更新
    if ((newProblems.includes('信息不足') || newProblems.includes('信息不全') || newProblems.includes('待补充')) 
        && oldProblems.length > 0 
        && !oldProblems.includes('信息不足') 
        && !oldProblems.includes('信息不全') 
        && !oldProblems.includes('待补充')) {
      console.log('🚫 逻辑判断：新总结信息不足，旧总结有具体症状，不更新');
      return false;
    }
    
    // 2. 如果旧总结是"信息不足"，新总结有具体症状，应该更新
    if ((oldProblems.includes('信息不足') || oldProblems.includes('信息不全') || oldProblems.includes('待补充'))
        && newProblems.length > 0
        && !newProblems.includes('信息不足')
        && !newProblems.includes('信息不全')
        && !newProblems.includes('待补充')) {
      console.log('✅ 逻辑判断：旧总结信息不足，新总结有具体症状，需要更新');
      return true;
    }
    
    // 3. 如果健康问题数量减少且没有新信息，不更新
    if (oldSummary.healthProblems.length > newSummary.healthProblems.length) {
      const oldSet = new Set(oldSummary.healthProblems);
      const newSet = new Set(newSummary.healthProblems);
      const lostProblems = [...oldSet].filter(p => !newSet.has(p));
      // 如果丢失了具体症状（不是"信息不足"），不更新
      if (lostProblems.length > 0 && lostProblems.some(p => !p.includes('信息不足') && !p.includes('待补充'))) {
        console.log('🚫 逻辑判断：健康问题数量减少且丢失了具体信息，不更新');
        return false;
      }
    }
    
    // 4. 如果健康问题完全相同，检查风险点和总结是否有实质性变化
    if (oldProblems === newProblems && oldProblems.length > 0) {
      // 如果风险点也相同，且总结只是表达方式不同，不更新
      const risksSimilarity = this.calculateTextSimilarity(oldRisks, newRisks);
      const summarySimilarity = this.calculateTextSimilarity(
        oldSummary.suggestionSummary, 
        newSummary.suggestionSummary
      );
      
      // 如果风险点和总结都高度相似（>0.85），认为是相同内容，不更新
      if (risksSimilarity > 0.85 && summarySimilarity > 0.85) {
        console.log('🚫 逻辑判断：健康问题、风险点、总结都高度相似，不更新');
        return false;
      }
    }
    
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `你是一个专业的医疗AI助手，负责判断是否需要更新医疗诊断总结。

# 核心原则
**严谨性优先**：只有当新总结明显更完整、更准确、或包含重要新信息时，才应该更新。如果只是表达方式不同或信息更模糊，不应该更新。

# 重要提示
1. **信息完整性检查**：如果新总结比旧总结信息更少或更模糊，不应该更新
2. **识别错误检测**：如果新总结从具体症状变成"信息不足"或"无明显不适"，这可能是识别错误，不应该更新
3. **实质性变化**：只有真正的医疗信息变化才值得更新，表达方式不同不算

# 判断标准（严格按优先级）
1. **信息完整性**（最重要）：
   - 新总结是否比旧总结更完整？
   - 如果新总结信息更少、更模糊，或从具体变抽象，返回 false
   - 如果新总结从"信息不足"变成有具体症状，返回 true

2. **新信息检查**：
   - 新总结是否包含旧总结中没有的重要医疗信息（新症状、新风险点）？
   - 如果只是重新表述相同信息，返回 false

3. **准确性提升**：
   - 新总结是否更准确地反映了对话内容？
   - 如果新总结偏离了对话内容，返回 false

# 输入数据
## 完整对话上下文（已清理）：
${cleanedContext}

## 旧的诊断总结：
健康问题：${oldSummary.healthProblems.join('、') || '无'}
风险点：${oldSummary.riskPoints.join('、') || '无'}
总结：${oldSummary.suggestionSummary}

## 新的诊断总结：
健康问题：${newSummary.healthProblems.join('、') || '无'}
风险点：${newSummary.riskPoints.join('、') || '无'}
总结：${newSummary.suggestionSummary}

# 输出要求
请严格按照以下逻辑判断：
1. 如果新总结信息更少或更模糊 → 返回 false
2. 如果新总结从具体症状变成"信息不足" → 返回 false（识别错误）
3. 如果新总结从"信息不足"变成具体症状 → 返回 true
4. 如果新总结包含重要新信息 → 返回 true
5. 如果只是表达方式不同但意思相同 → 返回 false

**只返回 true 或 false，不要返回其他内容。**`,
      config: {
        responseMimeType: "text/plain"
      }
    });

    try {
      const result = (response.text || '').trim().toLowerCase();
      console.log('🤖 AI原始返回:', response.text);
      
      // 解析返回结果
      let shouldUpdate = result.includes('true') || result.includes('是') || result.includes('需要') || result.includes('更新');
      
      console.log('🤖 AI解析结果:', shouldUpdate ? 'true' : 'false');
      
      // 详细比较新旧总结的差异
      if (oldSummary) {
        const oldProblemsStr = oldSummary.healthProblems.join('、') || '无';
        const newProblemsStr = newSummary.healthProblems.join('、') || '无';
        const oldRisksStr = oldSummary.riskPoints.join('、') || '无';
        const newRisksStr = newSummary.riskPoints.join('、') || '无';
        
        console.log('📊 详细对比:');
        console.log('  健康问题: 旧[' + oldProblemsStr + '] vs 新[' + newProblemsStr + ']');
        console.log('  风险点: 旧[' + oldRisksStr + '] vs 新[' + newRisksStr + ']');
        console.log('  总结: 旧[' + oldSummary.suggestionSummary.substring(0, 50) + '...] vs 新[' + newSummary.suggestionSummary.substring(0, 50) + '...]');
        
        // 严格的逻辑检查：如果AI判断需要更新，但逻辑上不应该更新，则覆盖AI的判断
        const oldHasSpecific = oldProblemsStr !== '无' && 
                               oldProblemsStr.length > 0 && 
                               !oldProblemsStr.includes('信息不足') && 
                               !oldProblemsStr.includes('信息不全') && 
                               !oldProblemsStr.includes('待补充');
        const newHasSpecific = newProblemsStr !== '无' && 
                               newProblemsStr.length > 0 && 
                               !newProblemsStr.includes('信息不足') && 
                               !newProblemsStr.includes('信息不全') && 
                               !newProblemsStr.includes('待补充');
        
        // 如果旧总结有具体症状，新总结变成"信息不足"，强制不更新
        if (oldHasSpecific && !newHasSpecific) {
          console.warn('🚫 逻辑覆盖：从具体症状变为"信息不足"，强制不更新（可能是识别错误）');
          return false;
        }
        
        // 如果旧总结是"信息不足"，新总结有具体症状，强制更新
        if (!oldHasSpecific && newHasSpecific) {
          console.log('✅ 逻辑覆盖：从"信息不足"变为具体症状，强制更新');
          return true;
        }
        
        // 如果健康问题数量减少且没有新信息，不更新
        if (oldSummary.healthProblems.length > newSummary.healthProblems.length && 
            oldHasSpecific && newHasSpecific) {
          // 检查是否真的丢失了信息
          const oldProblemsSet = new Set(oldSummary.healthProblems);
          const newProblemsSet = new Set(newSummary.healthProblems);
          const lostProblems = [...oldProblemsSet].filter(p => !newProblemsSet.has(p));
          if (lostProblems.length > 0 && lostProblems.some(p => !p.includes('信息不足') && !p.includes('待补充'))) {
            console.warn('🚫 逻辑覆盖：健康问题数量减少且丢失了具体信息，强制不更新');
            return false;
          }
        }
      }
      
      return shouldUpdate;
    } catch (e) {
      // 如果AI判断失败，使用简单的文本相似度作为后备方案
      console.warn("AI update decision failed, using fallback:", e);
      return false; // 保守策略：AI判断失败时不更新
    }
  }

  async structureDoctorNotes(notes: string): Promise<StructuredDiagnosis> {
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `从这些医生笔记中提取健康信息。必须严格使用【简体中文】。严禁使用繁体。\n笔记内容: "${notes}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthProblems: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestionSummary: { type: Type.STRING }
          },
          required: ["healthProblems", "riskPoints", "suggestionSummary"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }

  async generateRecommendationScript(structured: StructuredDiagnosis, product: Product): Promise<RecommendationScript> {
    const prompt = `用【简体中文】生成一段数字人推荐话术。结构：病情理解、解决方案、产品推介。严禁使用繁体字。\n病情数据: ${JSON.stringify(structured)}\n产品数据: ${JSON.stringify(product)}`;
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthProblem: { type: Type.STRING },
            possibleSolution: { type: Type.STRING },
            productPitch: { type: Type.STRING }
          },
          required: ["healthProblem", "possibleSolution", "productPitch"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }

  // ====== 新的 AI 为主的产品推荐方法 ======
  
  /**
   * AI 智能产品推荐（AI 为主方案）
   * @param diagnosis 诊断信息
   * @param candidateProducts 候选产品列表（已通过预筛选）
   * @returns AI 推荐结果
   */
  async getAIProductRecommendation(
    diagnosis: StructuredDiagnosis,
    candidateProducts: RealProduct[]
  ): Promise<AIRecommendationResult> {
    // 构建候选产品的简化描述（减少 token）
    const productDescriptions = candidateProducts.slice(0, 30).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      disease: p.disease,
      matchRule: p.matchRule.substring(0, 200) // 限制长度
    }));

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `你是一个专业的医疗产品推荐助手。请根据患者的症状描述，从候选产品中选择最合适的产品推荐。

# 患者症状
- 健康问题：${diagnosis.healthProblems.join('、') || '暂无明确症状'}
- 风险点：${diagnosis.riskPoints.join('、') || '暂无'}
- 诊断摘要：${diagnosis.suggestionSummary || '信息不足'}

# 候选产品列表
${JSON.stringify(productDescriptions, null, 2)}

# 核心原则（必须严格遵守）
1. **严格匹配**：只推荐与患者当前疾病类型完全匹配的产品
2. **拒绝不匹配**：如果产品的"disease"字段与患者症状不相关，必须拒绝推荐，即使该产品在其他场景下有用
3. **置信度要真实**：如果产品不完全匹配，必须降低置信度（<60%），甚至不推荐（置信度=0）

# 匹配规则示例
- 患者症状：胃痛、腹泻 → 只推荐消化系统相关产品，拒绝呼吸道、妇科等不相关产品
- 患者症状：咳嗽、发热 → 只推荐呼吸道相关产品，拒绝消化系统、妇科等不相关产品
- 患者症状：白带异常 → 只推荐妇科相关产品，拒绝其他系统产品

# 任务
1. 分析患者症状，判断最可能的疾病类型（如：消化系统疾病、呼吸道感染等）
2. **严格检查**：对每个候选产品，检查其"disease"字段是否与患者疾病类型匹配
3. **只推荐匹配产品**：从候选产品中选择 1-5 个与患者疾病类型完全匹配的产品
4. **拒绝不匹配产品**：如果产品不匹配，不要推荐，即使它在其他场景下有用
5. 按优先级排序：快速检测 > 推荐药品 > 商城保健品 > 其他
6. 给出每个产品的推荐理由
7. **真实评估置信度**：如果产品不完全匹配，置信度必须<60%

# 输出要求
- 必须使用简体中文
- 推荐理由要简洁（不超过50字）
- 置信度范围：0-100
- **重要**：如果候选产品中没有匹配的产品，可以返回空数组，不要强行推荐不匹配的产品`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diseaseType: { type: Type.STRING },
            diseaseConfidence: { type: Type.NUMBER },
            analysis: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  productName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["productId", "productName", "category", "reason", "confidence"]
              }
            }
          },
          required: ["diseaseType", "diseaseConfidence", "analysis", "recommendations"]
        }
      }
    });

    try {
      const result = JSON.parse(response.text || '{}');
      
      // 验证并补充产品信息，同时进行二次验证
      if (result.recommendations) {
        // 提取患者症状关键词（用于二次验证）
        const patientSymptoms = (
          diagnosis.healthProblems.join(' ') + ' ' + 
          diagnosis.riskPoints.join(' ') + ' ' + 
          diagnosis.suggestionSummary
        ).toLowerCase();
        
        // 疾病类型关键词映射（用于验证产品是否匹配）
        const diseaseTypeKeywords: Record<string, string[]> = {
          '呼吸道感染': ['感冒', '流感', '咳嗽', '咽痛', '发热', '流涕', '鼻塞', '喉咙', '发烧', '呼吸', '甲流', '病毒', '上呼吸道', '下呼吸道', '支气管', '肺炎', '咽炎'],
          '消化系统疾病': ['胃痛', '腹泻', '便秘', '反酸', '恶心', '消化', '肠胃', '拉肚子', '胃', '胃部', '胃痉挛', '消化不良', '胃肠', '肠道', '腹痛', '腹胀', '食积', '胃酸', '胃黏膜'],
          '妇科炎症': ['白带', '阴道', '月经', '痛经', '妇科', '女性', '妇科炎症', '阴道炎', '宫颈', '盆腔'],
          '高血压及心血管问题': ['高血压', '心悸', '胸闷', '头晕', '血压', '心脏', '心血管', '冠心病', '心律'],
          '皮肤问题': ['湿疹', '过敏', '瘙痒', '皮炎', '皮肤', '皮疹', '荨麻疹']
        };
        
        // 判断患者可能的疾病类型
        const patientDiseaseTypes: string[] = [];
        for (const [disease, keywords] of Object.entries(diseaseTypeKeywords)) {
          if (keywords.some(kw => patientSymptoms.includes(kw))) {
            patientDiseaseTypes.push(disease);
          }
        }
        
        result.recommendations = result.recommendations.map((rec: ProductRecommendation) => {
          const product = candidateProducts.find(p => p.id === rec.productId);
          if (product) {
            // 二次验证：检查产品疾病类型是否与患者症状匹配
            const productDiseaseType = simplifyDisease(product.disease);
            const isMatch = patientDiseaseTypes.length === 0 || patientDiseaseTypes.includes(productDiseaseType);
            
            if (!isMatch && patientDiseaseTypes.length > 0) {
              // 产品不匹配，降低置信度或过滤
              console.warn(`⚠️ 二次验证：产品 "${product.name}" (疾病类型: ${productDiseaseType}) 不匹配患者症状 (${patientDiseaseTypes.join(', ')})，置信度从 ${rec.confidence}% 降至 0%`);
              rec.confidence = 0; // 将置信度设为0，后续会被过滤
            }
            
            return {
              ...rec,
              productName: product.name,
              category: product.category
            };
          }
          return rec;
        })
        // 过滤掉置信度为0的产品（不匹配的产品）
        .filter((rec: ProductRecommendation) => {
          if (rec.confidence === 0) {
            console.log(`🚫 过滤不匹配产品: ${rec.productName} (置信度=0)`);
            return false;
          }
          return rec.productId;
        });
      }
      
      return result as AIRecommendationResult;
    } catch (e) {
      console.error('AI 推荐解析失败:', e);
      throw new Error("AI product recommendation failed.");
    }
  }

  /**
   * 快速预筛选：根据症状关键词筛选候选产品
   * @param diagnosis 诊断信息
   * @param allProducts 所有产品
   * @returns 候选产品列表
   */
  static prefilterProducts(diagnosis: StructuredDiagnosis, allProducts: RealProduct[]): RealProduct[] {
    const symptoms = diagnosis.healthProblems.join(' ') + ' ' + diagnosis.riskPoints.join(' ') + ' ' + diagnosis.suggestionSummary;
    const symptomsLower = symptoms.toLowerCase();
    
    // 扩展的关键词匹配（更全面）
    const diseaseKeywords: Record<string, string[]> = {
      '呼吸道感染': ['感冒', '流感', '咳嗽', '咽痛', '发热', '流涕', '鼻塞', '喉咙', '发烧', '呼吸', '甲流', '病毒', '上呼吸道', '下呼吸道', '支气管', '肺炎', '咽炎'],
      '消化系统疾病': ['胃痛', '腹泻', '便秘', '反酸', '恶心', '消化', '肠胃', '拉肚子', '胃', '胃部', '胃痉挛', '消化不良', '胃肠', '肠道', '腹痛', '腹胀', '食积', '胃酸', '胃黏膜'],
      '妇科炎症': ['白带', '阴道', '月经', '痛经', '妇科', '女性', '妇科炎症', '阴道炎', '宫颈', '盆腔'],
      '高血压及心血管问题': ['高血压', '心悸', '胸闷', '头晕', '血压', '心脏', '心血管', '冠心病', '心律'],
      '皮肤问题': ['湿疹', '过敏', '瘙痒', '皮炎', '皮肤', '皮疹', '荨麻疹']
    };
    
    // 找出匹配的疾病类型（更严格的匹配）
    const matchedDiseases: string[] = [];
    for (const [disease, keywords] of Object.entries(diseaseKeywords)) {
      // 检查症状中是否包含该疾病的关键词
      const hasMatch = keywords.some(kw => symptomsLower.includes(kw));
      if (hasMatch) {
        matchedDiseases.push(disease);
        console.log(`🔍 预筛选：症状匹配到疾病类型 "${disease}" (关键词: ${keywords.filter(kw => symptomsLower.includes(kw)).join(', ')})`);
      }
    }
    
    // 如果没有匹配到任何疾病，返回所有产品（让 AI 判断）
    if (matchedDiseases.length === 0) {
      console.log('🔍 预筛选：未匹配到明确疾病类型，返回全部产品供 AI 判断');
      return allProducts;
    }
    
    // 严格筛选：只返回匹配疾病类型的产品
    const candidates = allProducts.filter(p => {
      const simplified = simplifyDisease(p.disease);
      const isMatch = matchedDiseases.includes(simplified);
      if (!isMatch) {
        console.log(`🚫 预筛选：产品 "${p.name}" (疾病: ${p.disease}) 不匹配当前症状，已过滤`);
      }
      return isMatch;
    });
    
    console.log(`🔍 预筛选：匹配到疾病类型 [${matchedDiseases.join(', ')}]，筛选出 ${candidates.length} 个候选产品（从 ${allProducts.length} 个产品中）`);
    
    // 如果筛选后没有候选产品，返回所有产品让 AI 判断（但会记录警告）
    if (candidates.length === 0) {
      console.warn('⚠️ 预筛选：严格筛选后没有候选产品，返回全部产品供 AI 判断（AI 需要严格匹配）');
      return allProducts;
    }
    
    return candidates;
  }
}
