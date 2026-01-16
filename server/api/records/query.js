import { queryRecords, getStatistics, recordEvent } from '../../services/recordService.js';

export function setupRecordRoutes(app) {
  // 记录事件接口（供前端调用）
  app.post('/api/records/log', async (req, res) => {
    try {
      const { event, ...data } = req.body;
      
      if (!event) {
        return res.status(400).json({ 
          success: false, 
          message: '缺少 event 字段' 
        });
      }
      
      await recordEvent(event, data);
      res.json({ success: true, message: '记录成功' });
    } catch (error) {
      console.error('❌ 记录事件失败:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });

  // 查询记录接口
  app.get('/api/records/query', async (req, res) => {
    try {
      const filters = {
        event: req.query.event,
        doctor_id: req.query.doctor_id,
        call_id: req.query.call_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 50
      };
      
      const result = await queryRecords(filters);
      res.json(result);
    } catch (error) {
      console.error('❌ 查询记录失败:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });

  // 获取统计信息接口
  app.get('/api/records/statistics', async (req, res) => {
    try {
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        doctor_id: req.query.doctor_id
      };
      
      const stats = await getStatistics(filters);
      res.json(stats);
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });

  console.log('✅ 记录查询服务已启动');
}
