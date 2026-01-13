import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取医生账号配置
function loadDoctors() {
  try {
    const configPath = join(__dirname, '../../config/doctors.json');
    const configContent = readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (e) {
    console.error('❌ 无法读取医生账号配置:', e.message);
    return [];
  }
}

export function setupAuthRoutes(app) {
  // 登录接口
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名和密码不能为空' 
      });
    }

    const doctors = loadDoctors();
    const doctor = doctors.find(d => 
      d.username === username && d.password === password
    );

    if (!doctor) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误' 
      });
    }

    // 登录成功，返回医生信息（不返回密码）
    res.json({
      success: true,
      doctor_id: doctor.doctor_id,
      doctor_name: doctor.doctor_name,
      message: '登录成功'
    });
  });

  // 验证医生ID接口（用于验证doctor_id是否有效）
  app.get('/api/auth/verify/:doctorId', (req, res) => {
    const { doctorId } = req.params;
    const doctors = loadDoctors();
    const doctor = doctors.find(d => d.doctor_id === doctorId);

    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: '医生ID不存在' 
      });
    }

    res.json({
      success: true,
      doctor_id: doctor.doctor_id,
      doctor_name: doctor.doctor_name
    });
  });
}
