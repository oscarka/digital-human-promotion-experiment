import React from 'react';
import { CallInfo } from '../types';

interface CallStartNotificationProps {
  callInfo: CallInfo;
  onStartAnalysis: () => void;
  onDismiss: () => void;
}

const CallStartNotification: React.FC<CallStartNotificationProps> = ({
  callInfo,
  onStartAnalysis,
  onDismiss
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">📞 检测到新的通话</h3>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">患者信息</p>
            <p className="text-lg font-bold text-slate-900">
              {callInfo.patientName || '未知患者'}
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">通话时间</p>
            <p className="text-lg font-bold text-slate-900">
              {new Date(callInfo.startTime).toLocaleTimeString('zh-CN')}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onDismiss}
            className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            稍后处理
          </button>
          <button
            onClick={onStartAnalysis}
            className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30"
          >
            开始实时解析
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallStartNotification;
