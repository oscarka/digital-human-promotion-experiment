import { LoginResponse, Doctor } from '../types';
import { getApiUrl } from './config';

// 从localStorage获取当前医生信息
export function getCurrentDoctor(): Doctor | null {
  const doctorId = localStorage.getItem('doctor_id');
  const doctorName = localStorage.getItem('doctor_name');
  
  if (doctorId && doctorName) {
    return { doctor_id: doctorId, doctor_name: doctorName };
  }
  
  return null;
}

// 检查是否已登录
export function isAuthenticated(): boolean {
  return getCurrentDoctor() !== null;
}

// 登录
export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
          const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data: LoginResponse = await response.json();

    if (data.success && data.doctor_id && data.doctor_name) {
      // 保存登录信息到localStorage
      localStorage.setItem('doctor_id', data.doctor_id);
      localStorage.setItem('doctor_name', data.doctor_name);
    }

    return data;
  } catch (error) {
    console.error('登录错误:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '登录失败，请检查网络连接',
    };
  }
}

// 登出
export function logout(): void {
  localStorage.removeItem('doctor_id');
  localStorage.removeItem('doctor_name');
}
