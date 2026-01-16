
import { GoogleGenAI, Type } from "@google/genai";
import { Product, StructuredDiagnosis, RecommendationScript, RealtimeAnalysis } from "../types";

export interface TimedTranscriptNode {
  startTime: number;
  endTime: number;
  role: 'Doctor' | 'Patient';
  text: string;
}

import { config } from "./config";

export class GeminiService {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(modelName: string) {
    this.ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
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
}
