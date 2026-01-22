
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

// 新的产品推荐结果（支持多产品）
export interface ProductRecommendation {
  productId: string;
  productName: string;
  category: string;
  reason: string;           // 推荐理由
  confidence: number;       // 置信度 0-100
}

export interface AIRecommendationResult {
  diseaseType: string;              // 识别的疾病类型
  diseaseConfidence: number;        // 疾病识别置信度
  analysis: string;                 // 症状分析
  recommendations: ProductRecommendation[];  // 推荐的产品列表
}

// 医生确认记录
export interface DoctorConfirmRecord {
  id: string;
  timestamp: string;
  diagnosisSummary: string;         // 诊断摘要
  aiRecommendations: ProductRecommendation[];  // AI 原始推荐
  confirmedProducts: ProductRecommendation[];  // 医生确认的产品
  wasModified: boolean;             // 医生是否修改了推荐
  doctorId?: string;
  callId?: string;
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
