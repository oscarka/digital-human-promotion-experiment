import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/config';

interface Record {
  event: string;
  timestamp: string;
  doctor_id?: string;
  doctor_name?: string;
  call_id?: string;
  patient_id?: string;
  patient_name?: string;
  product_id?: string;
  product_name?: string;
  [key: string]: any;
}

interface QueryResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  records: Record[];
}

const RecordsQuery: React.FC = () => {
  const [filters, setFilters] = useState({
    event: '',
    doctor_id: '',
    call_id: '',
    start_date: '',
    end_date: '',
    page: 1,
    pageSize: 50
  });
  
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  // 加载统计信息
  const loadStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.doctor_id) params.append('doctor_id', filters.doctor_id);
      
      const response = await fetch(getApiUrl(`/api/records/statistics?${params}`));
      const data = await response.json();
      setStatistics(data || { total: 0, byEvent: {}, byDoctor: {}, byDate: {} });
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  // 查询记录
  const handleQuery = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.event) params.append('event', filters.event);
      if (filters.doctor_id) params.append('doctor_id', filters.doctor_id);
      if (filters.call_id) params.append('call_id', filters.call_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      params.append('page', filters.page.toString());
      params.append('pageSize', filters.pageSize.toString());
      
      const response = await fetch(getApiUrl(`/api/records/query?${params}`));
      const data = await response.json();
      setResult(data || { total: 0, page: 1, pageSize: 50, totalPages: 0, records: [] });
    } catch (error) {
      console.error('查询失败:', error);
      alert('查询失败，请检查后端服务是否运行');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
    handleQuery();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getEventLabel = (event: string) => {
    const labels: Record<string, string> = {
      'analysis_started': '接起解析',
      'product_recommended': '推荐产品',
      'sms_sent': '发送短信'
    };
    return labels[event] || event;
  };

  const getEventColor = (event: string) => {
    const colors: Record<string, string> = {
      'analysis_started': 'bg-blue-100 text-blue-800',
      'product_recommended': 'bg-green-100 text-green-800',
      'sms_sent': 'bg-purple-100 text-purple-800'
    };
    return colors[event] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-8">📊 活动记录查询</h1>
          
          {/* 统计信息 */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 rounded-2xl p-6">
                <div className="text-sm font-bold text-blue-600 mb-2">总记录数</div>
                <div className="text-3xl font-black text-blue-900">{statistics.total}</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-6">
                <div className="text-sm font-bold text-green-600 mb-2">接起解析</div>
                <div className="text-3xl font-black text-green-900">{statistics.byEvent?.analysis_started || 0}</div>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-6">
                <div className="text-sm font-bold text-emerald-600 mb-2">推荐产品</div>
                <div className="text-3xl font-black text-emerald-900">{statistics.byEvent?.product_recommended || 0}</div>
              </div>
              <div className="bg-purple-50 rounded-2xl p-6">
                <div className="text-sm font-bold text-purple-600 mb-2">发送短信</div>
                <div className="text-3xl font-black text-purple-900">{statistics.byEvent?.sms_sent || 0}</div>
              </div>
            </div>
          )}
          
          {/* 筛选条件 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">事件类型</label>
              <select
                value={filters.event}
                onChange={(e) => setFilters({ ...filters, event: e.target.value, page: 1 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="">全部</option>
                <option value="analysis_started">接起解析</option>
                <option value="product_recommended">推荐产品</option>
                <option value="sms_sent">发送短信</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">医生ID</label>
              <input
                type="text"
                value={filters.doctor_id}
                onChange={(e) => setFilters({ ...filters, doctor_id: e.target.value, page: 1 })}
                placeholder="输入医生ID"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">通话ID</label>
              <input
                type="text"
                value={filters.call_id}
                onChange={(e) => setFilters({ ...filters, call_id: e.target.value, page: 1 })}
                placeholder="输入通话ID"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">开始日期</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">结束日期</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleQuery}
                disabled={loading}
                className="w-full px-6 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {loading ? '查询中...' : '查询'}
              </button>
            </div>
          </div>
        </div>
        
        {/* 查询结果 */}
        {result && (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                查询结果
                {result.total > 0 && (
                  <span className="text-lg font-normal text-slate-500 ml-2">
                    (共 {result.total} 条记录)
                  </span>
                )}
              </h2>
              
              {result.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                    disabled={filters.page === 1}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="text-sm font-bold text-slate-600">
                    第 {result.page} / {result.totalPages} 页
                  </span>
                  <button
                    onClick={() => setFilters({ ...filters, page: Math.min(result.totalPages, filters.page + 1) })}
                    disabled={filters.page === result.totalPages}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
            
            {!result.records || result.records.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                暂无记录
              </div>
            ) : (
              <div className="space-y-4">
                {result.records.map((record, index) => (
                  <div key={index} className="border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${getEventColor(record.event)}`}>
                          {getEventLabel(record.event)}
                        </span>
                        <span className="text-sm font-bold text-slate-600">
                          {formatTimestamp(record.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {record.doctor_id && (
                        <div>
                          <span className="text-slate-500 font-bold">医生:</span>
                          <span className="ml-2 text-slate-900">{record.doctor_name || record.doctor_id}</span>
                        </div>
                      )}
                      {record.call_id && (
                        <div>
                          <span className="text-slate-500 font-bold">通话ID:</span>
                          <span className="ml-2 text-slate-900 font-mono text-xs">{record.call_id}</span>
                        </div>
                      )}
                      {record.patient_name && (
                        <div>
                          <span className="text-slate-500 font-bold">患者:</span>
                          <span className="ml-2 text-slate-900">{record.patient_name}</span>
                        </div>
                      )}
                      {record.product_name && (
                        <div>
                          <span className="text-slate-500 font-bold">产品:</span>
                          <span className="ml-2 text-slate-900">{record.product_name}</span>
                        </div>
                      )}
                    </div>
                    
                    {record.script && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-500 mb-2">推荐话术:</div>
                        <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                          {record.script.productPitch}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordsQuery;
