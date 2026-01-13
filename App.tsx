
import React, { useState, useRef } from 'react';
import { ExperimentRecord, Product, StructuredDiagnosis, RecommendationScript, SpeechRecognitionProvider } from './types';
import { MOCK_PRODUCTS, MODELS, SPEECH_RECOGNITION_PROVIDERS } from './constants';
import { GeminiService } from './services/geminiService';
import SimulationMode from './components/SimulationMode';
import LiveConsultant from './components/LiveConsultant';

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
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value);
  const [selectedProvider, setSelectedProvider] = useState<SpeechRecognitionProvider>('gemini');
  const [activeStep, setActiveStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState('');
  const [structuredData, setStructuredData] = useState<StructuredDiagnosis | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedScript, setGeneratedScript] = useState<RecommendationScript | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setShowSimulation(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFinish = (finalNotes: string, diag: StructuredDiagnosis, prod: Product, script: RecommendationScript) => {
    setNotes(finalNotes);
    setStructuredData(diag);
    setSelectedProduct(prod);
    setGeneratedScript(script);
    setShowSimulation(false);
    setActiveStep(3);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-6 duration-1000">
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
                <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-blue-500 hover:scale-[1.03] active:scale-95 transition-all shadow-2xl shadow-blue-600/30">
                  开启实时流识别
                </button>
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

            {/* 辅助功能：文本笔记 */}
            <div className="bg-slate-50 rounded-[4rem] p-12 border border-slate-100 flex flex-col min-h-[420px]">
              <h3 className="text-xl font-black text-slate-900 mb-6">问诊文本补录</h3>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="或在此粘贴已整理的文本摘要..." className="flex-1 w-full bg-white rounded-3xl p-8 text-sm outline-none border border-slate-100 focus:border-blue-200 transition-all resize-none shadow-inner" />
              <button onClick={() => {}} className="mt-8 w-full py-5 bg-white text-slate-400 border border-slate-100 rounded-[1.5rem] font-black text-xs hover:text-slate-900 transition-colors">静态文本解析</button>
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
                  <button onClick={() => setShowSuccess(true)} className="px-14 py-5 bg-slate-900 text-white rounded-2xl font-black shadow-2xl hover:bg-black transition-all">确认并发送结果</button>
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
      {showSuccess && <SuccessModal onClose={() => { setShowSuccess(false); setActiveStep(1); }} />}
    </div>
  );
};

export default App;
