
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData, createBlob } from '../services/audioUtils';
import { TranscriptionEntry } from '../types';

interface LiveConsultantProps {
  onClose: (finalTranscription: string) => void;
}

const LiveConsultant: React.FC<LiveConsultantProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<TranscriptionEntry[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef({ user: '', model: '' });

  const startSession = async () => {
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState('granted');

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Critical: Resume contexts on user interaction
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();
      
      audioContextRef.current = { input: inputCtx, output: outputCtx };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => {
                if (s) s.sendRealtimeInput({ media: createBlob(inputData) });
              }).catch(err => console.error("Stream send error:", err));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioBase64 && audioContextRef.current) {
              const { output: ctx } = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioBase64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              transcriptRef.current.user += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              transcriptRef.current.model += message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const newEntries: TranscriptionEntry[] = [];
              if (transcriptRef.current.user.trim()) {
                newEntries.push({ role: 'user', text: transcriptRef.current.user.trim() });
              }
              if (transcriptRef.current.model.trim()) {
                newEntries.push({ role: 'model', text: transcriptRef.current.model.trim() });
              }
              
              if (newEntries.length > 0) {
                setEntries(prev => [...prev, ...newEntries]);
              }
              transcriptRef.current = { user: '', model: '' };
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live session error:", e);
            setError('The AI session encountered an error. Please check your connection.');
          },
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are a professional medical intake assistant. Help the doctor summarize patient information. Be concise and empathetic. Encourage the doctor to speak clearly.',
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Session start error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setError('Microphone permission was dismissed or denied. Please enable it in your browser settings to use voice consultation.');
      } else {
        setError('Failed to initialize voice session. Please try again.');
      }
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsActive(false);
  };

  useEffect(() => {
    // We don't auto-start here to ensure it's a direct consequence of user click
    // But since the parent component setShowLive(true) is already a user click, we can start.
    startSession();
    return () => stopSession();
  }, []);

  const handleFinish = () => {
    const fullText = entries.map(e => `${e.role === 'user' ? 'Doctor' : 'Assistant'}: ${e.text}`).join('\n');
    onClose(fullText);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <div className="max-w-xl w-full flex flex-col h-full">
        <header className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <h2 className="text-xl font-bold tracking-tight">Consultation Assistant</h2>
          </div>
          <button onClick={() => onClose('')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
          <div className="relative mb-12 shrink-0">
            <div className={`absolute inset-0 bg-blue-500 rounded-full opacity-20 ${isActive ? 'pulse-ring' : ''}`}></div>
            <div className={`absolute inset-0 bg-blue-500 rounded-full opacity-10 ${isActive ? 'pulse-ring' : ''}`} style={{animationDelay: '0.4s'}}></div>
            <div className={`w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full shadow-2xl shadow-blue-500/50 flex items-center justify-center relative z-10 transition-transform ${isActive ? 'scale-105' : 'scale-100 grayscale'}`}>
              <svg className={`w-16 h-16 text-white ${isActive ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>

          <div className="w-full bg-white/5 rounded-2xl p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar border border-white/10">
            {!isActive && !error && permissionState === 'prompt' && <p className="text-center text-slate-400 italic">Initializing microphone...</p>}
            {error && (
              <div className="text-center space-y-4">
                <p className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20">{error}</p>
                {permissionState === 'denied' && (
                  <button onClick={startSession} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all">
                    Retry Permission
                  </button>
                )}
              </div>
            )}
            {entries.length === 0 && isActive && <p className="text-center text-slate-400 italic">"I'm ready. You can start describing the case..."</p>}
            {entries.map((e, i) => (
              <div key={i} className={`flex flex-col ${e.role === 'user' ? 'items-end' : 'items-start animate-in fade-in slide-in-from-left-2 duration-300'}`}>
                <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">{e.role === 'user' ? 'Doctor' : 'Assistant'}</span>
                <p className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[85%] ${e.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
                  {e.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-8 flex justify-center gap-4 shrink-0">
          <button 
            onClick={handleFinish}
            disabled={!isActive && entries.length === 0}
            className="px-10 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-lg hover:bg-slate-100 transition-all transform active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            End & Export Notes
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LiveConsultant;
