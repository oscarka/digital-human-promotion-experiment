
import React, { useState, useRef, useEffect } from 'react';
import { ExperimentRecord, Product, StructuredDiagnosis, RecommendationScript, SpeechRecognitionProvider, CallInfo, WebSocketMessage } from './types';
import { MOCK_PRODUCTS, MODELS, SPEECH_RECOGNITION_PROVIDERS } from './constants';
import { GeminiService } from './services/geminiService';
import SimulationMode from './components/SimulationMode';
import LiveConsultant from './components/LiveConsultant';
import Login from './components/Login';
import CallStartNotification from './components/CallStartNotification';
import { isAuthenticated, getCurrentDoctor, logout } from './services/authService';
import { WebSocketClient } from './services/websocketClient';
import { getApiUrl } from './services/config';

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center space-y-4 max-w-xs text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-medium text-slate-700">{message}</p>
    </div>
  </div>
);

const SuccessModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
    <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center space-y-6 max-w-sm text-center">
      <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">推荐已送达</h3>
      <p className="text-slate-500 text-sm">患者已在手机端实时查收您的健康建议方案。</p>
      <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors shadow-xl">返回工作台</button>
    </div>
  </div>
);

const App: React.FC = () => {
  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState(getCurrentDoctor());
  
  // WebSocket客户端
  const wsClientRef = useRef<WebSocketClient | null>(null);
  
  // 通话相关
  const [pendingCall, setPendingCall] = useState<CallInfo | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  
  // UI状态
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value);
  const [selectedProvider, setSelectedProvider] = useState<SpeechRecognitionProvider>('volcano');
  const [activeStep, setActiveStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // 文件上传模式
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 结果数据
  const [notes, setNotes] = useState('');
  const [structuredData, setStructuredData] = useState<StructuredDiagnosis | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedScript, setGeneratedScript] = useState<RecommendationScript | null>(null);
  
  // 初始化：检查登录状态
  useEffect(() => {
    const doctor = getCurrentDoctor();
    if (doctor) {
      setIsLoggedIn(true);
      setCurrentDoctor(doctor);
    }
  }, []);

  // WebSocket连接管理
  useEffect(() => {
    if (isLoggedIn && currentDoctor) {
      // 创建WebSocket客户端
      const client = new WebSocketClient(currentDoctor.doctor_id);
      wsClientRef.current = client;

      // 连接WebSocket
      client.connect().catch(err => {
        console.error('WebSocket连接失败:', err);
      });

      // 监听通话开始
      client.on('call_started', (message: WebSocketMessage) => {
        console.log('📞 收到通话开始通知:', message);
        if (message.callId && message.doctorId) {
          setPendingCall({
            callId: message.callId,
            doctorId: message.doctorId,
            patientId: message.patientId,
            patientName: message.patientName,
            startTime: message.timestamp || new Date().toISOString()
          });
        }
      });

      // 监听通话结束
      client.on('call_ended', (message: WebSocketMessage) => {
        console.log('📞 通话结束:', message);
        if (message.callId === activeCallId) {
          setActiveCallId(null);
          setShowSimulation(false);
        }
      });

      // 清理函数
      return () => {
        client.disconnect();
      };
    }
  }, [isLoggedIn, currentDoctor, activeCallId]);

  // 登录成功回调
  const handleLoginSuccess = () => {
    const doctor = getCurrentDoctor();
    if (doctor) {
      setIsLoggedIn(true);
      setCurrentDoctor(doctor);
    }
  };

  // 处理登出
  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setCurrentDoctor(null);
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
  };

  // 开始分析通话
  const handleStartAnalysis = () => {
    if (pendingCall && currentDoctor) {
      // 记录：医生接起解析流程
      fetch(getApiUrl('/api/records/log'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'analysis_started',
          doctor_id: currentDoctor.doctor_id,
          doctor_name: currentDoctor.doctor_name,
          call_id: pendingCall.callId,
          patient_id: pendingCall.patientId,
          patient_name: pendingCall.patientName
        })
      }).catch(err => console.error('记录失败:', err));
      
      setActiveCallId(pendingCall.callId);
      setPendingCall(null);
      // 这里需要启动SimulationMode，但数据源是WebSocket推流
      // 暂时先显示SimulationMode，后续需要修改它支持WebSocket数据源
      setShowSimulation(true);
    }
  };

  // 模拟推流（用于本地测试）
  const handleMockStream = async () => {
    if (!selectedFile || !currentDoctor) return;

    setIsLoading(true);
    setLoadingMsg('正在模拟推流...');

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('doctor_id', currentDoctor.doctor_id);

      const response = await fetch(getApiUrl('/api/telephone/mock-stream'), {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 模拟推流已启动:', result);
        // 清除加载状态，等待WebSocket通知（call_started）
        setIsLoading(false);
        // WebSocket通知会触发 pendingCall，显示通话开始通知弹窗
      } else {
        alert('模拟推流失败: ' + result.message);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('模拟推流错误:', error);
      alert('模拟推流失败，请检查后端服务是否运行');
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    // 不立即进入SimulationMode，让用户选择是直接识别还是模拟推流
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 直接使用文件进行识别（原有功能）
  const handleDirectFileAnalysis = () => {
    if (selectedFile) {
      setShowSimulation(true);
    }
  };

  const handleFinish = (finalNotes: string, diag: StructuredDiagnosis, prod: Product, script: RecommendationScript) => {
    setNotes(finalNotes);
    setStructuredData(diag);
    setSelectedProduct(prod);
    setGeneratedScript(script);
    setShowSimulation(false);
    setActiveStep(3);
    
    // 记录：推荐产品（当分析完成时）
    if (currentDoctor && prod) {
      fetch(getApiUrl('/api/records/log'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'product_recommended',
          doctor_id: currentDoctor.doctor_id,
          doctor_name: currentDoctor.doctor_name,
          call_id: activeCallId || `file_${Date.now()}`,
          product_id: prod.id,
          product_name: prod.name,
          diagnosis: diag
        })
      }).catch(err => console.error('记录失败:', err));
    }
  };

  // 如果未登录，显示登录页面
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen pb-20 bg-white font-sans tracking-tight selection:bg-blue-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20">DH</div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter">DIGITAL HUMAN LAB</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Medical Logic Platform v2.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {currentDoctor && (
            <div className="text-sm font-bold text-slate-600">
              {currentDoctor.doctor_name}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            登出
          </button>
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <span className="text-[9px] font-bold text-slate-500 px-2 uppercase tracking-wider">语音识别</span>
            {SPEECH_RECOGNITION_PROVIDERS.map(p => (
              <button 
                key={p.value} 
                onClick={() => setSelectedProvider(p.value)} 
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${selectedProvider === p.value ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                title={p.description}
              >
                {p.label}
              </button>
            ))}
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <span className="text-[9px] font-bold text-slate-500 px-2 uppercase tracking-wider">AI模型</span>
          {MODELS.map(m => (
            <button key={m.value} onClick={() => setSelectedModel(m.value)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${selectedModel === m.value ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              {m.label.split(' ')[2]}
            </button>
          ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-between mb-20 relative max-w-3xl mx-auto">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -translate-y-1/2 -z-10"></div>
          {[1, 2, 3].map(step => (
            <div key={step} className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-lg transition-all duration-700 ${activeStep >= step ? 'bg-slate-900 text-white shadow-2xl scale-110' : 'bg-white text-slate-200 border-2 border-slate-100'}`}>{step}</div>
          ))}
        </div>

        {activeStep === 1 && (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-6 duration-1000">
            {/* 核心功能：语音流上传 */}
            <div className="bg-slate-900 rounded-[4rem] p-12 text-white flex flex-col justify-between min-h-[420px] shadow-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-8 border border-white/10">
                   <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={1.5} /></svg>
                </div>
                <h3 className="text-3xl font-black mb-4 tracking-tighter">语音流实验室</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-xs">
                  上传真实通话录音，AI 将通过 API 建立实时语音推流，模拟数字人医生的全链条思考过程。
                </p>
                <div className="flex flex-col gap-4">
                <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-blue-500 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl shadow-blue-600/30"
                  >
                    {selectedFile ? `已选择: ${selectedFile.name}` : '选择音频文件'}
                  </button>
                  
                  {selectedFile && (
                    <div className="flex gap-4">
                      <button 
                        onClick={handleDirectFileAnalysis}
                        className="flex-1 px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-blue-500 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl shadow-blue-600/30"
                      >
                        上传文件识别
                      </button>
                      <button 
                        onClick={handleMockStream}
                        className="flex-1 px-10 py-5 bg-green-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-green-500 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl shadow-green-600/30"
                      >
                        模拟推流测试
                </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative z-10 text-[10px] font-bold text-slate-500 flex items-center gap-3">
                <div className="flex gap-1">
                   <div className="w-1 h-3 bg-blue-500/50 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                   <div className="w-1 h-5 bg-blue-500/50 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                   <div className="w-1 h-3 bg-blue-500/50 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                LIVE STREAMING TECHNOLOGY
              </div>
            </div>
          </div>
        )}

        {activeStep === 3 && generatedScript && (
          <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-700">
            <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-3xl space-y-12">
              <div className="space-y-10">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] opacity-50">识别到的健康背景</p>
                  <p className="text-2xl text-slate-900 font-medium leading-snug italic">“{generatedScript.healthProblem}”</p>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] opacity-50">针对性解决方案</p>
                  <p className="text-2xl text-slate-900 font-medium leading-snug italic">“{generatedScript.possibleSolution}”</p>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] opacity-50">推荐话术草案</p>
                  <p className="text-2xl text-slate-900 font-black leading-snug italic text-indigo-900">“{generatedScript.productPitch}”</p>
                </div>
              </div>
              
              <div className="pt-12 border-t border-slate-50 flex justify-between items-center">
                <button onClick={() => setActiveStep(1)} className="text-slate-400 font-bold hover:text-slate-900 transition-colors">重新测试</button>
                <div className="flex gap-4">
                  <button onClick={() => {
                    // 记录：发送短信
                    if (currentDoctor && activeCallId && selectedProduct && generatedScript) {
                      fetch(getApiUrl('/api/records/log'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          event: 'sms_sent',
                          doctor_id: currentDoctor.doctor_id,
                          doctor_name: currentDoctor.doctor_name,
                          call_id: activeCallId,
                          product_id: selectedProduct.id,
                          product_name: selectedProduct.name,
                          script: generatedScript
                        })
                      }).catch(err => console.error('记录失败:', err));
                    }
                    
                    // 停止所有解析
                    setShowSimulation(false);
                    setActiveCallId(null);
                    // 显示成功提示
                    setShowSuccess(true);
                  }} className="px-14 py-5 bg-slate-900 text-white rounded-2xl font-black shadow-2xl hover:bg-black transition-all">确认并发送结果</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showSimulation && selectedFile && (
        <SimulationMode 
          audioFile={selectedFile} 
          provider={selectedProvider}
          onFinish={handleFinish} 
          onClose={() => setShowSimulation(false)} 
        />
      )}
      {isLoading && <LoadingOverlay message={loadingMsg} />}
      {showSuccess && <SuccessModal onClose={() => { 
        setShowSuccess(false); 
        setActiveStep(1);
        // 确保清理所有状态
        setShowSimulation(false);
        setActiveCallId(null);
        setSelectedFile(null);
      }} />}
      {pendingCall && (
        <CallStartNotification
          callInfo={pendingCall}
          onStartAnalysis={handleStartAnalysis}
          onDismiss={() => setPendingCall(null)}
        />
      )}
    </div>
  );
};

export default App;
