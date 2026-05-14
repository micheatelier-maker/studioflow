
import React, { useState, useRef, useEffect } from 'react';
import { extractLogFromAudio, summarizeSeed } from '../services/gemini';
import { WorkshopLog, Project, LogType } from '../types';

interface SessionLoggerProps {
  type: LogType;
  projects: Project[];
  onComplete: (log: Partial<WorkshopLog>) => void;
  onManualEntry: (type: LogType, projectId?: string) => void;
  onCancel: () => void;
  contextPrompt?: string; 
  initialProjectId?: string;
  tickets: number;
  onConsumeTickets: (minutes: number) => void;
}

const SessionLogger: React.FC<SessionLoggerProps> = ({ 
  type, 
  projects, 
  onComplete, 
  onManualEntry,
  onCancel, 
  contextPrompt, 
  initialProjectId,
  tickets,
  onConsumeTickets
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTimerOnlyMode, setIsTimerOnlyMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [seeds, setSeeds] = useState<{ id: string; text: string; time: number }[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(isPaused);
  const isMicEnabledRef = useRef(isMicEnabled);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isMicEnabledRef.current = isMicEnabled; }, [isMicEnabled]);

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && isMicEnabledRef.current) {
          audioChunksRef.current.push(event.data);
          
          // Live harvesting for speech bubbles
          const blob = event.data;
          const reader = new FileReader();
          const currentMimeType = mediaRecorder.mimeType || 'audio/webm';
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
              const seedText = await summarizeSeed(base64, currentMimeType);
              if (seedText) {
                setSeeds(prev => [
                  ...prev, 
                  { id: Math.random().toString(36).substr(2, 9), text: seedText, time: recordingTime }
                ]);
              }
            } catch (e) { console.error("Seed failed", e); }
          };
        }
      };

      mediaRecorder.start(10000); // 10s chunks
    } catch (err) {
      setError("Mic access denied. Continuing in silent mode.");
      setIsMicEnabled(false);
    }
  };

  const stopAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (isRecording) {
      if (isMicEnabled) {
        startAudioCapture();
      } else {
        stopAudioCapture();
      }
    }
    return () => stopAudioCapture();
  }, [isMicEnabled, isRecording]);

  useEffect(() => {
    if (mediaRecorderRef.current) {
      if (isPaused && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      } else if (!isPaused && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
    }
  }, [isPaused]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const displaySeeds = seeds.slice(-3);

  const startRecording = async () => {
    setError(null);
    setRecordingTime(0);
    setIsPaused(false);
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const finalSeconds = recordingTime;
    const finalMinutes = Math.max(1, Math.ceil(finalSeconds / 60));

    if (isMicEnabled && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsProcessing(true);
      onConsumeTickets(finalMinutes);
      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      
      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          onComplete({
            type,
            project_id: selectedProjectId === 'new' ? '' : selectedProjectId || '',
            actual_duration_minutes: finalMinutes,
            date: new Date().toISOString(),
            raw_transcript: '[Mic was active but no audio captured]',
            materials_used: []
          });
          setIsProcessing(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              const result = await extractLogFromAudio(base64Audio, mimeType, type);
              onComplete({ 
                ...result, 
                project_id: selectedProjectId || result.project_id || '',
                actual_duration_minutes: finalMinutes,
                audio_base64: null // Discard as per user request
              });
            } catch (err: any) {
              console.error("Gemini Extraction Error:", err);
              if (err.message?.includes("API_KEY_ISSUE")) {
                setError(err.message.replace("API_KEY_ISSUE: ", ""));
              } else {
                setError("Studio Ear failed to transcribe. Saving manual fallback.");
                onComplete({
                  type,
                  project_id: selectedProjectId === 'new' ? '' : selectedProjectId || '',
                  actual_duration_minutes: finalMinutes,
                  date: new Date().toISOString(),
                  raw_transcript: '[Transcription Failed]',
                  materials_used: []
                });
              }
            } finally {
              setIsProcessing(false);
            }
          };
        } catch (err) {
          setError("Failed to process thoughts.");
          setIsProcessing(false);
          onCancel();
        }
      };
      mediaRecorderRef.current.stop();
    } else {
      // Silent session completion
      onComplete({
        type,
        project_id: selectedProjectId === 'new' ? '' : selectedProjectId || '',
        actual_duration_minutes: finalMinutes,
        date: new Date().toISOString(),
        raw_transcript: isMicEnabled ? '[Recording attempted but failed]' : '[Silent Focus Session]',
        materials_used: []
      });
    }
    
    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const ticketsBeingUsed = isMicEnabled ? Math.ceil((recordingTime + 1) / (5 * 60)) : 0;
  const remainingTicketsAfterUsage = tickets - ticketsBeingUsed;

  const getInstructions = () => {
    if (!isMicEnabled) return "Deep work mode active. Capture your thoughts manually when finished.";
    if (contextPrompt) return contextPrompt;
    switch(type) {
      case 'idea': return "The mind is fertile. Tell me about this new seed.";
      case 'brainstorm': return "Let's expand. Throw out every 'what-if' and potential pivot.";
      case 'problem': return "Every hurdle is a chance to pivot. What's the block?";
      case 'post': return "Word vomit your post idea. I'll summarize it and find the hooks.";
      default: return "Describe the session. The rhythm, the clay, the breakthroughs.";
    }
  };

  const getTitle = () => {
    if (contextPrompt) return "Fill Missing Info";
    switch(type) {
      case 'idea': return "New Idea Ramble";
      case 'brainstorm': return "Brainstorming";
      case 'problem': return "Solve Problem";
      case 'post': return "Social Draft";
      default: return "Studio Session";
    }
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-[#0f0d0c] z-[200] flex flex-col items-center justify-center p-10 space-y-8 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-28 h-28 border-[6px] border-orange-900/30 border-t-orange-700 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-10 h-10 bg-orange-700 rounded-2xl animate-pulse"></div>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-stone-100 tracking-tight">Updating Context</h2>
          <p className="text-stone-500 text-sm italic font-medium">Merging your new words into the flow...</p>
        </div>
      </div>
    );
  }

  const showProjectPicker = !selectedProjectId;

  if (showProjectPicker) {
    return (
      <div className="fixed inset-0 bg-[#0f0d0c] z-[200] flex flex-col pt-24 pb-16 px-8 safe-area-top safe-area-bottom overflow-y-auto">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-stone-100 tracking-tight uppercase">Select Focus</h2>
            <p className="text-stone-500 text-sm italic font-medium">Which project are we logging today?</p>
          </div>

          <div className="bg-stone-900/40 p-6 rounded-[2rem] border border-stone-800/60 space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                   <div className={`p-2 rounded-xl ${isMicEnabled ? 'bg-orange-800 text-white' : 'bg-stone-800 text-stone-600'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                   </div>
                   <div>
                      <span className="text-stone-100 text-xs font-black uppercase tracking-widest block">Studio Ear</span>
                      <span className="text-[9px] text-stone-500 font-bold uppercase">Voice-First Logs</span>
                   </div>
                </div>
                <button 
                  onClick={() => setIsMicEnabled(!isMicEnabled)}
                  className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${isMicEnabled ? 'bg-orange-600' : 'bg-stone-700'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 ${isMicEnabled ? 'left-6' : 'left-1'}`} />
                </button>
             </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setSelectedProjectId('new')}
              className="w-full p-6 bg-orange-900/20 border border-orange-800/40 rounded-[2.5rem] text-left active:scale-[0.98] transition-all"
            >
              <h3 className="font-black text-orange-500 text-lg uppercase tracking-tight">A New Seed...</h3>
              <p className="text-stone-500 text-[10px] font-black uppercase mt-1">Start a fresh log</p>
            </button>

            {projects.filter(p => !p.is_archived).map(project => (
              <button 
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className="w-full p-6 bg-stone-900/40 border border-stone-800/60 rounded-[2.5rem] text-left active:scale-[0.98] transition-all"
              >
                <h3 className="font-bold text-stone-100 text-lg tracking-tight">{project.name}</h3>
                <p className="text-stone-500 text-[10px] font-black uppercase mt-1">{project.category || 'General'}</p>
              </button>
            ))}
          </div>

          <button 
            onClick={onCancel}
            className="w-full py-4 text-stone-600 font-black uppercase tracking-[0.2em] text-[10px]"
          >
            Cancel Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0f0d0c] z-[200] flex flex-col pt-12 pb-8 px-8 safe-area-top safe-area-bottom h-screen overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 overflow-hidden">
        <div className="text-center space-y-2 shrink-0">
          <h2 className="text-2xl font-bold tracking-tight text-stone-50">
            {isRecording ? (isMicEnabled ? "Listening..." : "Deep Working...") : getTitle()}
          </h2>
          {selectedProjectId && selectedProjectId !== 'new' && !isRecording && (
            <div className="bg-stone-900/50 px-4 py-1 rounded-full border border-stone-800 inline-block">
              <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </span>
            </div>
          )}
          <p className="text-stone-500 text-xs leading-relaxed px-6 italic font-medium">
            {isRecording ? getInstructions() : "Speak freely. No notes, just flow."}
          </p>
        </div>

        {error && (
          <div className="mx-8 bg-rose-950/20 border border-rose-900/50 p-4 rounded-2xl flex items-start space-x-3 animate-in fade-in zoom-in-95 duration-300">
             <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p className="text-rose-200 text-xs font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Speech Bubbles for SessionLogger */}
        {isRecording && (
          <div className="w-full max-h-[25vh] overflow-hidden space-y-3 px-2">
            {displaySeeds.map((seed, idx) => (
              <div 
                key={seed.id} 
                className={`flex items-start space-x-2 bg-stone-900/80 backdrop-blur-xl px-4 py-3 rounded-2xl border border-stone-800/40 animate-in slide-in-from-bottom-2 fade-in duration-500 shadow-2xl max-w-[90%] ${idx % 2 === 0 ? 'mr-auto rounded-bl-none' : 'ml-auto rounded-br-none'}`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(234,88,12,1)]"></div>
                <p className="text-stone-100 text-[11px] font-bold tracking-tight leading-snug">{seed.text}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col items-center space-y-6 shrink-0 relative z-50 pointer-events-auto">
          <div className="relative flex items-center justify-center">
            {isRecording && !isPaused && (
              <>
                <div className={`absolute inset-0 w-56 h-56 rounded-full animate-ping duration-[3000ms] pointer-events-none ${isMicEnabled ? 'bg-orange-700/10' : 'bg-stone-800/10'}`}></div>
                <div className={`absolute inset-0 w-48 h-48 rounded-full animate-pulse duration-[2000ms] pointer-events-none ${isMicEnabled ? 'bg-orange-700/20' : 'bg-stone-800/20'}`}></div>
              </>
            )}
            <div className="relative z-10 flex flex-col items-center">
              {isRecording ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className={`text-5xl font-mono font-bold tracking-[0.1em] drop-shadow-md transition-colors ${isMicEnabled ? 'text-orange-400' : 'text-stone-600'}`}>
                    {formatTime(recordingTime)}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={startRecording}
                  className="w-32 h-32 rounded-[2.5rem] bg-orange-800 border-4 border-orange-700 flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                >
                  <svg className="w-12 h-12 text-stone-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {isRecording ? (
            <div className="w-full flex flex-col items-center space-y-4 pointer-events-auto">
              <div className="flex space-x-3 w-full max-w-xs">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(!isPaused);
                  }}
                  className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${isPaused ? 'bg-emerald-950/20 border-emerald-900 text-emerald-500' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    stopRecording();
                  }}
                  className="flex-[2] py-4 bg-stone-900 border border-stone-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-rose-500"
                >
                  Stop & Log
                </button>
              </div>
              <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMicEnabled(!isMicEnabled);
                  }}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-full border transition-all duration-300 ${isMicEnabled ? 'bg-orange-950/40 border-orange-900/50 text-orange-400' : 'bg-stone-900/80 border-stone-800 text-stone-500'}`}
              >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                      {isMicEnabled ? 'Studio Ear Active' : 'Enable Studio Ear'}
                  </span>
              </button>
            </div>
          ) : (
            <div className="w-full space-y-3 max-w-xs pointer-events-auto">
              <button 
                onClick={() => onManualEntry(type, selectedProjectId || undefined)}
                className="w-full px-6 py-4 bg-stone-900/60 border border-stone-800/60 rounded-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all group"
              >
                <svg className="w-4 h-4 text-stone-500 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 group-hover:text-stone-200 transition-colors">Manual Override</span>
              </button>

              {(type === 'session' || type === 'idea' || type === 'brainstorm') && (
                <button 
                  onClick={() => {
                    setIsTimerOnlyMode(true);
                    setIsMicEnabled(false); // Default to off for "timer only"
                    startRecording();
                  }}
                  className="w-full px-6 py-4 bg-orange-900/10 border border-orange-800/30 rounded-2xl flex items-center justify-center space-x-3 active:scale-95 transition-all group"
                >
                  <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 group-hover:text-orange-300 transition-colors">Use Timer Only</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {!isRecording && (
        <button 
          onClick={onCancel}
          className="w-full py-2 text-stone-600 font-bold hover:text-stone-300 transition-colors uppercase tracking-[0.2em] text-[9px] shrink-0"
        >
          Nevermind
        </button>
      )}
    </div>
  );
};

export default SessionLogger;
