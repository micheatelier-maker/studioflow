
import React, { useState, useEffect, useRef } from 'react';
import { Project, WorkshopLog, LogType } from '../types';
import { extractLogFromAudio, summarizeSeed } from '../services/gemini';

interface FlowSessionProps {
  projects: Project[];
  onSessionComplete: (log: Partial<WorkshopLog>) => void;
  isFlowActive: boolean;
  setIsFlowActive: (active: boolean) => void;
  tickets: number;
  onConsumeTickets: (minutes: number) => void;
}

const FlowSession: React.FC<FlowSessionProps> = ({ 
  projects, 
  onSessionComplete, 
  isFlowActive, 
  setIsFlowActive,
  tickets,
  onConsumeTickets
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [targetDuration, setTargetDuration] = useState(20);
  const [focusMultiplier, setFocusMultiplier] = useState(1.0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [seeds, setSeeds] = useState<{ id: string; text: string; time: number }[]>([]);
  const [isTimerRevealed, setIsTimerRevealed] = useState(false);
  const [sessionType, setSessionType] = useState<LogType>('session');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const blobAnimationFrameRef = useRef<number | null>(null);
  const seedsEndRef = useRef<HTMLDivElement>(null);
  const secondsRef = useRef(seconds);
  const isMicEnabledRef = useRef(isMicEnabled);
  const isPausedRef = useRef(isPaused);

  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { isMicEnabledRef.current = isMicEnabled; }, [isMicEnabled]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const displaySeeds = seeds.slice(-3);

  useEffect(() => {
    if (isFlowActive && !isPaused) {
      // Reveal everything bright for the first 3 seconds
      setIsTimerRevealed(true);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = setTimeout(() => {
        setIsTimerRevealed(false);
      }, 3000);

      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
        if (seconds > 0 && seconds % 60 === 0) {
          setFocusMultiplier(m => Math.min(m + 0.1, 5.0));
        }
      }, 1000);
      
      if (isMicEnabled) {
        startAudioCapture();
      }
      startBlobAnimation();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioCapture();
      if (blobAnimationFrameRef.current) cancelAnimationFrame(blobAnimationFrameRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioCapture();
      if (blobAnimationFrameRef.current) cancelAnimationFrame(blobAnimationFrameRef.current);
    };
  }, [isFlowActive, isPaused]);

  // Handle live mic toggling
  useEffect(() => {
    if (isFlowActive) {
      if (isMicEnabled) {
        startAudioCapture();
      } else {
        stopAudioCapture();
      }
    }
  }, [isMicEnabled]);

  useEffect(() => {
    seedsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [seeds]);

  const handleScreenTap = () => {
    if (!isFlowActive) return;
    setIsTimerRevealed(true);
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = setTimeout(() => {
      setIsTimerRevealed(false);
    }, 4000);
  };

  const startBlobAnimation = () => {
    if (!blobCanvasRef.current) return;
    const canvas = blobCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const blobs = Array.from({ length: 6 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 200 + 150,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      color: ['#4c1d95', '#701a75', '#9d174d', '#881337', '#be123c'][Math.floor(Math.random() * 5)]
    }));

    const render = () => {
      blobAnimationFrameRef.current = requestAnimationFrame(render);
      ctx.fillStyle = '#0f0d0c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach(blob => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        const grad = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
        grad.addColorStop(0, blob.color);
        grad.addColorStop(0.6, blob.color + '44'); // Subtle alpha
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    render();
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      drawWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && isMicEnabledRef.current) {
          audioChunksRef.current.push(event.data);
          
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
                  { id: Math.random().toString(36).substr(2, 9), text: seedText, time: secondsRef.current }
                ]);
              }
            } catch (e) {
              console.error("Seed failed", e);
            }
          };
        }
      };

      mediaRecorder.start(5000); // 5s chunks for seeds
    } catch (err) {
      console.error("Audio capture failed", err);
      alert("Microphone access is needed for the Studio Ear feature.");
      setIsMicEnabled(false);
    }
  };

  const stopAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!isFlowActive || !isMicEnabled) return;
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        ctx.fillStyle = `rgba(168, 85, 247, ${0.4 + (dataArray[i] / 255) * 0.6})`;
        ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);
        x += barWidth + 2;
      }
    };
    render();
  };

  const handleEndFlow = async () => {
    // Don't deactivate flow yet, just pause it so we can return if cancelled
    setIsPaused(true);
    setIsProcessing(true);
    
    const finalMinutes = Math.ceil(seconds / 60);

    if (isMicEnabled) {
      onConsumeTickets(finalMinutes);
    }

    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';

    try {
      if (audioChunksRef.current.length > 0) {
        const reader = new FileReader();
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];
            const result = await extractLogFromAudio(base64Audio, mimeType, sessionType);
            onSessionComplete({
              ...result,
              project_id: selectedProjectId || result.project_id || '',
              duration_minutes: targetDuration,
              actual_duration_minutes: finalMinutes
            });
          } catch (err: any) {
            console.error("Failed to process flow session", err);
            if (err.message?.includes("API_KEY_ISSUE")) {
              setError(err.message.replace("API_KEY_ISSUE: ", ""));
            } else {
              onSessionComplete({
                type: sessionType,
                project_id: selectedProjectId,
                duration_minutes: targetDuration,
                actual_duration_minutes: finalMinutes,
                date: new Date().toISOString(),
                raw_transcript: '[Transcription Failed]'
              } as any);
            }
          } finally {
            setIsProcessing(false);
          }
        };
      } else {
        onSessionComplete({
          type: sessionType,
          project_id: selectedProjectId,
          duration_minutes: targetDuration,
          actual_duration_minutes: finalMinutes,
          date: new Date().toISOString()
        } as any);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Outer Failed to process flow session", err);
      setIsProcessing(false);
      setIsFlowActive(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const ticketsBeingUsed = isMicEnabled ? Math.ceil((seconds + 1) / (5 * 60)) : 0;

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-[#0f0d0c] z-[250] flex flex-col items-center justify-center p-10 space-y-8 animate-in fade-in duration-700">
        <div className="relative">
          <div className="w-32 h-32 border-[8px] border-purple-900/20 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-purple-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-stone-100 tracking-tight">Harvesting Flow</h2>
          <p className="text-stone-500 text-sm italic font-medium max-w-xs mx-auto">
            Gemini is distilling your session's rambling brilliance into a concrete archive.
          </p>
        </div>
      </div>
    );
  }

  const getStartTitle = () => {
    switch(sessionType) {
      case 'idea': return "New Idea";
      case 'brainstorm': return "Brainstorming";
      default: return "Deep Work";
    }
  };

  const getStartDescription = () => {
    switch(sessionType) {
      case 'idea': return "The mind is fertile. Start the clock and let the new seed take root.";
      case 'brainstorm': return "Expansion mode. No bad ideas, just divergent paths and potential pivots.";
      default: return "Zero distraction. The clock starts, the world fades. Speak only if a seed is worth planting.";
    }
  };

  if (!isFlowActive && seconds === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 px-1 pt-12">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 bg-purple-950/20 rounded-[2rem] border border-purple-900/30 mb-2">
            {sessionType === 'idea' ? (
              <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            ) : sessionType === 'brainstorm' ? (
              <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 00-1 1v1a2 2 0 11-4 0v-1a1 1 0 00-1-1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
            ) : (
              <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-stone-100">{getStartTitle()}</h1>
          <p className="text-stone-500 text-xs max-w-xs mx-auto italic font-medium leading-relaxed px-4">
            {getStartDescription()}
          </p>
        </div>

        <div className="w-full max-w-sm space-y-6 px-4">
          <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-stone-600 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Current Focus</label>
                <div className="relative">
                <select 
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-[#1a1715] border border-stone-800/60 rounded-3xl px-6 py-5 text-stone-100 appearance-none outline-none focus:border-purple-900 transition-all font-bold"
                >
                    <option value="">A New Seed...</option>
                    {projects.filter(p => !p.is_archived).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-stone-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-stone-600 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Session Length (Minutes)</label>
                <div className="flex items-center space-x-4">
                  <input 
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value))}
                    className="flex-1 accent-purple-600 h-1.5 bg-stone-900 rounded-full"
                  />
                  <div className="bg-[#1a1715] border border-stone-800/60 rounded-2xl px-4 py-2 min-w-[80px] text-center">
                    <input 
                      type="number"
                      value={targetDuration}
                      onChange={(e) => setTargetDuration(parseInt(e.target.value) || 0)}
                      className="bg-transparent text-stone-100 font-bold text-sm w-full text-center outline-none"
                    />
                  </div>
                </div>
            </div>

            <button 
                onClick={() => setIsMicEnabled(!isMicEnabled)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-3xl border transition-all duration-300 ${isMicEnabled ? 'bg-purple-900/10 border-purple-800/40' : 'bg-stone-900/40 border-stone-800'}`}
            >
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${isMicEnabled ? 'bg-purple-800 text-white' : 'bg-stone-800 text-stone-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <span className={`text-xs font-black uppercase tracking-widest block ${isMicEnabled ? 'text-purple-400' : 'text-stone-500'}`}>
                            Studio Ear
                        </span>
                        <span className="text-[9px] text-stone-600 font-bold">Record and harvest thought seeds</span>
                    </div>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${isMicEnabled ? 'bg-purple-600' : 'bg-stone-800'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMicEnabled ? 'left-5' : 'left-1'}`}></div>
                </div>
            </button>
          </div>

          <button 
            onClick={() => {
              setError(null);
              setIsFlowActive(true);
            }}
            className="w-full bg-purple-800 py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] text-stone-100 border border-purple-700 shadow-2xl shadow-purple-950/50 active:scale-95 transition-all"
          >
            Enter Flow State
          </button>
          
          {error && (
            <div className="mt-4 bg-rose-950/20 border border-rose-900/50 p-4 rounded-2xl flex items-start space-x-3 animate-in fade-in zoom-in-95 duration-300">
               <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="text-rose-200 text-[10px] font-medium leading-relaxed uppercase tracking-wide">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleScreenTap}
      className="h-screen flex flex-col justify-between py-8 px-1 relative overflow-hidden animate-in fade-in duration-1000 cursor-pointer safe-area-top safe-area-bottom"
    >
      {/* Goopy Background Canvas */}
      <canvas 
        ref={blobCanvasRef} 
        className="absolute inset-0 pointer-events-none z-0"
        style={{ filter: 'blur(45px) contrast(160%) brightness(0.9)' }}
      />
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[80%] bg-purple-900/10 blur-[150px] rounded-full pointer-events-none"></div>

      <header className={`flex flex-col items-center space-y-1 z-10 transition-opacity duration-1000 ${isTimerRevealed ? 'opacity-100' : 'opacity-20'}`}>
        <span className="bg-purple-950/70 text-purple-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-purple-800/30 animate-pulse backdrop-blur-xl">
          In Flow Session
        </span>
        <h2 className="text-stone-300 font-bold tracking-tight drop-shadow-2xl text-sm">
          {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name : 'Untitled Project'}
        </h2>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center space-y-6 z-10 overflow-hidden pointer-events-none">
        <div className="relative flex flex-col items-center">
          {/* Faded/Glass Timer Effect */}
          <div 
            className={`text-7xl font-black text-stone-100 tracking-tighter tabular-nums drop-shadow-[0_0_45px_rgba(147,51,234,0.5)] transition-all duration-700 select-none ${isTimerRevealed ? 'opacity-100 scale-100' : 'opacity-[0.03] blur-sm scale-110'}`}
          >
            {formatTime(seconds)}
          </div>
          <div className={`w-64 h-64 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-900/20 transition-all duration-1000 pointer-events-none ${isMicEnabled && !isPaused ? 'animate-pulse scale-110 bg-purple-900/5' : 'scale-90'}`}></div>
        </div>

        {/* Live Thought Seeds Section - Speech Bubbles */}
        <div className={`w-full max-h-[30vh] overflow-hidden px-6 space-y-3 transition-opacity duration-1000 ${isTimerRevealed ? 'opacity-100' : 'opacity-40'}`}>
          {isMicEnabled && seeds.length === 0 && (
            <div className="text-center py-4">
              <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest animate-pulse italic">
                Listening for insights...
              </p>
            </div>
          )}
          {displaySeeds.map((seed, idx) => (
            <div 
              key={seed.id} 
              className={`flex items-start space-x-3 bg-stone-900/80 backdrop-blur-2xl px-4 py-3 rounded-2xl border border-stone-800/40 animate-in slide-in-from-bottom-2 fade-in duration-500 shadow-2xl max-w-[85%] ${idx % 2 === 0 ? 'mr-auto rounded-bl-none' : 'ml-auto rounded-br-none'}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(147,51,234,1)]"></div>
              <p className="text-stone-100 text-xs font-bold tracking-tight leading-snug">{seed.text}</p>
            </div>
          ))}
        </div>

        <div className="w-full flex flex-col items-center">
          <div className="h-12 flex items-center justify-center w-full">
            {isMicEnabled && !isPaused ? (
                <canvas ref={canvasRef} width={300} height={40} className="w-full max-w-xs opacity-60" />
            ) : (
                <div className="w-16 h-0.5 bg-stone-800/40 rounded-full"></div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 z-10 flex flex-col items-center space-y-4 px-4">
         <p className={`text-stone-400 text-[9px] italic text-center px-8 font-medium leading-relaxed drop-shadow-xl transition-opacity duration-1000 ${isTimerRevealed ? 'opacity-100' : 'opacity-0'}`}>
            "The best work is done when you stop thinking about the work."
         </p>
         <div className="w-full flex space-x-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused(!isPaused);
              }}
              className={`flex-1 bg-stone-900/90 backdrop-blur-xl py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] border border-stone-800/60 active:scale-95 transition-all duration-1000 shadow-[0_15px_30px_rgba(0,0,0,0.5)] ${isTimerRevealed ? 'opacity-100' : 'opacity-20'} ${isPaused ? 'text-emerald-500' : 'text-stone-400'}`}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleEndFlow();
              }}
              className={`flex-[2] bg-stone-900/90 backdrop-blur-xl py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] text-rose-500 border border-stone-800/60 active:scale-95 transition-all duration-1000 shadow-[0_15px_30px_rgba(0,0,0,0.5)] ${isTimerRevealed ? 'opacity-100' : 'opacity-20'}`}
            >
              Stop & Log
            </button>
         </div>
        <button 
            onClick={(e) => {
                e.stopPropagation();
                setIsMicEnabled(!isMicEnabled);
            }}
            className={`flex items-center space-x-2 px-5 py-2 rounded-full border transition-all duration-300 ${isMicEnabled ? 'bg-purple-900/40 border-purple-800/50 text-purple-300' : 'bg-stone-900/80 border-stone-800 text-stone-500'} ${isTimerRevealed ? 'opacity-100' : 'opacity-20'}`}
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                {isMicEnabled ? 'Studio Ear Active' : 'Enable Studio Ear'}
            </span>
        </button>
      </div>
    </div>
  );
};

export default FlowSession;
