import { readFile, mkdir, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 记录文件路径
const DATA_DIR = join(__dirname, '../data');
const RECORD_FILE = join(DATA_DIR, 'activity_records.jsonl');

// 确保数据目录存在
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// 记录事件（使用JSONL格式，追加写入）
export async function recordEvent(eventType, data) {
  try {
    await ensureDataDir();
    
    const record = {
      event: eventType, // 'analysis_started' | 'product_recommended' | 'sms_sent'
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // 使用JSONL格式（每行一个JSON对象），追加写入
    const line = JSON.stringify(record) + '\n';
    
    // 追加写入文件（appendFile 会自动追加，无需手动打开文件）
    await appendFile(RECORD_FILE, line, 'utf8');
    
    console.log(`📝 已记录事件: ${eventType}`, { doctor_id: data.doctor_id, call_id: data.call_id });
  } catch (error) {
    console.error('❌ 记录事件失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

// 查询记录
export async function queryRecords(filters = {}) {
  try {
    await ensureDataDir();
    
    // 如果文件不存在，返回空结果对象
    if (!existsSync(RECORD_FILE)) {
      return {
        total: 0,
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        totalPages: 0,
        records: []
      };
    }
    
    // 读取文件内容
    const content = await readFile(RECORD_FILE, 'utf-8');
    
    // 如果文件为空，返回空结果对象
    if (!content || !content.trim()) {
      return {
        total: 0,
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        totalPages: 0,
        records: []
      };
    }
    
    // 解析JSONL格式（每行一个JSON对象）
    const lines = content.trim().split('\n').filter(line => line.trim());
    const records = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn('⚠️  解析记录行失败:', line);
        return null;
      }
    }).filter(record => record !== null);
    
    // 应用过滤条件
    let filteredRecords = records;
    
    if (filters.event) {
      filteredRecords = filteredRecords.filter(r => r.event === filters.event);
    }
    
    if (filters.doctor_id) {
      filteredRecords = filteredRecords.filter(r => r.doctor_id === filters.doctor_id);
    }
    
    if (filters.call_id) {
      filteredRecords = filteredRecords.filter(r => r.call_id === filters.call_id);
    }
    
    if (filters.start_date) {
      const startDate = new Date(filters.start_date);
      filteredRecords = filteredRecords.filter(r => new Date(r.timestamp) >= startDate);
    }
    
    if (filters.end_date) {
      const endDate = new Date(filters.end_date);
      endDate.setHours(23, 59, 59, 999); // 包含整天
      filteredRecords = filteredRecords.filter(r => new Date(r.timestamp) <= endDate);
    }
    
    // 按时间倒序排列（最新的在前）
    filteredRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 分页
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      total: filteredRecords.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredRecords.length / pageSize),
      records: filteredRecords.slice(start, end)
    };
  } catch (error) {
    console.error('❌ 查询记录失败:', error);
    throw error;
  }
}

// 获取统计信息
export async function getStatistics(filters = {}) {
  try {
    const result = await queryRecords({ ...filters, page: 1, pageSize: 10000 });
    const records = result?.records || [];
    
    const stats = {
      total: records.length,
      byEvent: {},
      byDoctor: {},
      byDate: {}
    };
    
    records.forEach(record => {
      // 按事件类型统计
      stats.byEvent[record.event] = (stats.byEvent[record.event] || 0) + 1;
      
      // 按医生统计
      if (record.doctor_id) {
        stats.byDoctor[record.doctor_id] = (stats.byDoctor[record.doctor_id] || 0) + 1;
      }
      
      // 按日期统计
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });
    
    return stats;
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error);
    throw error;
  }
}
