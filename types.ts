
export enum Department {
  RESPIRATORY = 'Respiratory',
  GYNECOLOGY = 'Gynecology',
  DIGESTIVE = 'Digestive',
  CARDIOVASCULAR = 'Cardiovascular'
}

export interface Product {
  id: string;
  name: string;
  department: Department;
  targetAudience: string;
  valuePoints: string[];
  serviceType: 'Once' | 'Recurring' | 'Follow-up';
  description: string;
  priceRange?: string;
  link: string;
}

export interface StructuredDiagnosis {
  healthProblems: string[];
  riskPoints: string[];
  suggestionSummary: string;
}

export interface RecommendationScript {
  healthProblem: string;
  possibleSolution: string;
  productPitch: string;
}

export interface RealtimeAnalysis {
  diagnosis: StructuredDiagnosis;
}

export interface ExperimentRecord {
  id: string;
  timestamp: string;
  doctorNotes: string;
  structuredData: StructuredDiagnosis;
  matchedProductId: string;
  script: RecommendationScript;
  status: 'Draft' | 'Sent' | 'Converted';
}

export interface TranscriptionEntry {
  role: 'user' | 'model';
  text: string;
}

// 语音识别服务类型
export type SpeechRecognitionProvider = 'gemini' | 'volcano';

export interface SpeechRecognitionConfig {
  provider: SpeechRecognitionProvider;
  model?: string;
  // 火山引擎配置
  volcanoAppKey?: string;
  volcanoAccessKey?: string;
  volcanoUrl?: string;
}

// 医生信息
export interface Doctor {
  doctor_id: string;
  doctor_name: string;
}

// 登录响应
export interface LoginResponse {
  success: boolean;
  doctor_id?: string;
  doctor_name?: string;
  message?: string;
}

// 通话信息
export interface CallInfo {
  callId: string;
  doctorId: string;
  patientId?: string;
  patientName?: string;
  startTime: string;
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: 'registered' | 'call_started' | 'call_ended' | 'audio_data' | 'stream_error' | 'error' | 'pong';
  callId?: string;
  doctorId?: string;
  patientId?: string;
  patientName?: string;
  timestamp?: string;
  audioData?: string; // base64编码的音频数据
  error?: string;
  message?: string;
}
