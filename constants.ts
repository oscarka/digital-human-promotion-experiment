
import { Department, Product } from './types';

export const MOCK_PRODUCTS: Product[] = [
  // 呼吸科产品
  {
    id: 'p1',
    name: 'Smart Chronic Cough Management',
    department: Department.RESPIRATORY,
    targetAudience: 'Patients with persistent cough after cold or smokers',
    valuePoints: ['Real-time cough tracking', 'Specialist consultation', 'Personalized recovery plan'],
    serviceType: 'Recurring',
    description: 'A digital health program to help manage and track respiratory health issues.',
    priceRange: '¥199 - ¥599',
    link: 'https://example.com/resp-care'
  },
  {
    id: 'p1-2',
    name: '呼吸健康智慧管理',
    department: Department.RESPIRATORY,
    targetAudience: '有呼吸道症状或慢性呼吸系统疾病的患者',
    valuePoints: ['实时数据追踪', '专家咨询', '个人健康基准建立'],
    serviceType: 'Recurring',
    description: '通过实时数据追踪和专家咨询，帮助建立个人健康基准，从容掌握自身呼吸系统状态。',
    priceRange: '¥299/月',
    link: 'https://example.com/resp-care-premium'
  },
  // 妇科产品
  {
    id: 'p2',
    name: 'Prenatal Wellness Monitoring',
    department: Department.GYNECOLOGY,
    targetAudience: 'Expectant mothers requiring remote monitoring',
    valuePoints: ['Home-based vital tracking', 'Instant doctor feedback', 'Safe exercise guide'],
    serviceType: 'Follow-up',
    description: 'Comprehensive remote care for healthy pregnancy progression.',
    priceRange: '¥999',
    link: 'https://example.com/gyn-care'
  },
  {
    id: 'p2-2',
    name: '女性健康全周期管理',
    department: Department.GYNECOLOGY,
    targetAudience: '关注女性健康的成年女性',
    valuePoints: ['周期健康追踪', '专业妇科咨询', '个性化健康方案'],
    serviceType: 'Recurring',
    description: '提供全周期的女性健康管理服务，包括月经周期追踪、妇科健康咨询和个性化健康建议。',
    priceRange: '¥399/月',
    link: 'https://example.com/gyn-care-premium'
  },
  // 消化科产品
  {
    id: 'p3',
    name: 'Gastro-Pro Premium Subscription',
    department: Department.DIGESTIVE,
    targetAudience: 'Individuals with irregular eating habits or chronic bloating',
    valuePoints: ['Gut microbiome testing', 'Tailored probiotic regimen', 'Dietary tracking app'],
    serviceType: 'Recurring',
    description: 'Focused on optimizing digestive health through science-backed nutrition.',
    priceRange: '¥299/mo',
    link: 'https://example.com/digest-care'
  },
  {
    id: 'p3-2',
    name: '肠胃健康调理方案',
    department: Department.DIGESTIVE,
    targetAudience: '有肠胃不适、消化不良或慢性肠胃疾病的患者',
    valuePoints: ['肠道微生态检测', '定制化益生菌方案', '专业饮食指导'],
    serviceType: 'Recurring',
    description: '通过肠道微生态检测和定制化益生菌方案，配合专业饮食指导，帮助改善消化系统健康。',
    priceRange: '¥499/月',
    link: 'https://example.com/digest-care-premium'
  },
  // 高血压 & 心血管产品
  {
    id: 'p4',
    name: 'Hypertension Guard Pack',
    department: Department.CARDIOVASCULAR,
    targetAudience: 'Seniors or individuals with high blood pressure risks',
    valuePoints: ['Bluetooth BP monitor included', 'Weekly health reports', 'Urgent alert system'],
    serviceType: 'Follow-up',
    description: 'A life-saving ecosystem for cardiovascular risk management.',
    priceRange: '¥1299',
    link: 'https://example.com/cardio-care'
  },
  {
    id: 'p4-2',
    name: '心血管健康守护计划',
    department: Department.CARDIOVASCULAR,
    targetAudience: '有高血压、心脏病风险或心血管疾病史的患者',
    valuePoints: ['24小时血压监测', '心血管风险评估', '紧急预警系统', '专业医生随访'],
    serviceType: 'Recurring',
    description: '提供全面的心血管健康管理服务，包括实时血压监测、风险评估和紧急预警，守护您的心血管健康。',
    priceRange: '¥599/月',
    link: 'https://example.com/cardio-care-premium'
  }
];

export const MODELS = [
  { label: 'Gemini 3 Flash (Fast)', value: 'gemini-3-flash-preview' },
  { label: 'Gemini 3 Pro (Complex)', value: 'gemini-3-pro-preview' }
];

// 语音识别服务配置
export const SPEECH_RECOGNITION_PROVIDERS = [
  { 
    label: 'Google Gemini', 
    value: 'gemini' as const,
    description: '使用 Google Gemini Live API 进行实时语音识别'
  },
  { 
    label: '火山引擎豆包语音', 
    value: 'volcano' as const,
    description: '使用火山引擎豆包语音 API 进行流式识别'
  }
];

// 火山引擎 API 端点选项
export const VOLCANO_API_URLS = [
  { label: '流式识别', value: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel' },
  { label: '异步识别', value: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async' },
  { label: '非流式识别', value: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream' }
];
