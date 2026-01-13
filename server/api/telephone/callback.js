// wsManager 将通过参数传入，避免循环依赖
let wsManagerInstance = null;

export function setWsManager(manager) {
  wsManagerInstance = manager;
}

export function setupTelephoneRoutes(app) {
  // 回调接收接口
  app.post('/api/telephone/callback', (req, res) => {
    const { event, call_id, doctor_id, patient_id, patient_name, timestamp } = req.body;

    console.log('📞 收到服务商回调:', { event, call_id, doctor_id });

    if (!event || !call_id || !doctor_id) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要字段: event, call_id, doctor_id' 
      });
    }

    // 通知对应医生的客户端
    const message = {
      type: event, // 'call_started' 或 'call_ended'
      callId: call_id,
      doctorId: doctor_id,
      patientId: patient_id,
      patientName: patient_name,
      timestamp: timestamp || new Date().toISOString()
    };

    if (!wsManagerInstance) {
      console.error('❌ WebSocket管理器未初始化');
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
    
    const sent = wsManagerInstance.sendToDoctor(doctor_id, message);

    if (sent) {
      console.log(`✅ 已通知医生 ${doctor_id}: ${event}`);
    } else {
      console.warn(`⚠️  医生 ${doctor_id} 未在线，无法通知`);
    }

    res.json({ 
      success: true, 
      message: '回调已处理',
      doctor_online: sent
    });
  });
}
