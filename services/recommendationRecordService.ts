// 医生确认推荐记录服务
// 用于保存医生确认的推荐记录，作为后续训练材料

import { DoctorConfirmRecord, ProductRecommendation, StructuredDiagnosis } from '../types';

// 内存存储（实际项目中应该保存到后端）
const records: DoctorConfirmRecord[] = [];

/**
 * 保存医生确认记录
 */
export function saveConfirmRecord(
  diagnosis: StructuredDiagnosis,
  aiRecommendations: ProductRecommendation[],
  confirmedProducts: ProductRecommendation[],
  doctorId?: string,
  callId?: string
): DoctorConfirmRecord {
  const record: DoctorConfirmRecord = {
    id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    diagnosisSummary: `健康问题: ${diagnosis.healthProblems.join('、')}; 风险点: ${diagnosis.riskPoints.join('、')}; 总结: ${diagnosis.suggestionSummary}`,
    aiRecommendations,
    confirmedProducts,
    wasModified: !areRecommendationsEqual(aiRecommendations, confirmedProducts),
    doctorId,
    callId
  };
  
  records.push(record);
  
  // 打印日志
  console.log('📝 [推荐记录] 保存成功');
  console.log('  记录ID:', record.id);
  console.log('  诊断摘要:', record.diagnosisSummary.substring(0, 100) + '...');
  console.log('  AI 推荐:', aiRecommendations.map(r => r.productName).join(', '));
  console.log('  医生确认:', confirmedProducts.map(r => r.productName).join(', '));
  console.log('  是否修改:', record.wasModified ? '是' : '否');
  
  // 保存到 localStorage（浏览器环境）
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existingRecords = JSON.parse(localStorage.getItem('recommendation_records') || '[]');
      existingRecords.push(record);
      localStorage.setItem('recommendation_records', JSON.stringify(existingRecords));
    }
  } catch (e) {
    console.warn('保存到 localStorage 失败:', e);
  }
  
  return record;
}

/**
 * 获取所有记录
 */
export function getAllRecords(): DoctorConfirmRecord[] {
  // 尝试从 localStorage 读取
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedRecords = JSON.parse(localStorage.getItem('recommendation_records') || '[]');
      return storedRecords;
    }
  } catch (e) {
    console.warn('从 localStorage 读取失败:', e);
  }
  return records;
}

/**
 * 获取统计信息
 */
export function getRecordStats() {
  const allRecords = getAllRecords();
  const totalRecords = allRecords.length;
  const modifiedRecords = allRecords.filter(r => r.wasModified).length;
  const directConfirmRate = totalRecords > 0 
    ? ((totalRecords - modifiedRecords) / totalRecords * 100).toFixed(1) 
    : '0';
  
  return {
    totalRecords,
    modifiedRecords,
    directConfirmRecords: totalRecords - modifiedRecords,
    directConfirmRate: `${directConfirmRate}%`
  };
}

/**
 * 比较两个推荐列表是否相同
 */
function areRecommendationsEqual(
  list1: ProductRecommendation[], 
  list2: ProductRecommendation[]
): boolean {
  if (list1.length !== list2.length) return false;
  
  const ids1 = list1.map(r => r.productId).sort();
  const ids2 = list2.map(r => r.productId).sort();
  
  return ids1.every((id, i) => id === ids2[i]);
}

/**
 * 导出记录为 JSON（用于训练）
 */
export function exportRecordsAsJSON(): string {
  return JSON.stringify(getAllRecords(), null, 2);
}
