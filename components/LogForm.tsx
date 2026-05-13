
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WorkshopLog, Project, Stage, LogType } from '../types';
import { processDeepDiveResponse, reprocessTranscript } from '../services/gemini';

interface LogFormProps {
  initialData: Partial<WorkshopLog>;
  projects: Project[];
  onSave: (data: Omit<WorkshopLog, 'id'>) => void;
  onCancel: () => void;
  isFreshSession?: boolean; 
  latestEnergyLevel?: number; // Added prop for latest energy level
  startWithDeepDive?: boolean; // New prop to start directly in deep dive mode
}

export const DEEP_DIVE_QUESTIONS = [
  { key: 'how_it_went', label: 'The Flow', question: 'How did the session go? Describe the rhythm and energy.' },
  { key: 'wins', label: 'Highlight', question: 'What was the single best moment or "high light" of today?' },
  { key: 'challenges', label: 'Lowlight', question: 'Was there a "low light" or a specific frustration today?' },
  { key: 'general_thoughts', label: 'Reflections', question: 'Any other general thoughts or tangential ideas floating around?' },
  { key: 'energy_level', label: 'Battery', question: 'On a scale of 1 to 5, how full is your creative battery now?', type: 'number' },
  { key: 'next_steps', label: 'Tomorrow', question: 'What is the very first thing you need to touch when you return?' },
];

const LogForm: React.FC<LogFormProps> = ({ initialData, projects, onSave, onCancel, isFreshSession = true, latestEnergyLevel, startWithDeepDive = false }) => {
  const type: LogType = initialData.type || 'session';
  const initialProjectId = initialData.project_id || 
    projects.find(p => p.name.toLowerCase() === initialData.project_name?.toLowerCase())?.id || '';
  const initialProjectName = initialData.project_name || 
    projects.find(p => p.id === initialProjectId)?.name || '';

  const [formData, setFormData] = useState({
    type,
    project_id: initialProjectId,
    project_name: initialProjectName,
    project_description: '',
    date: initialData.date || new Date().toISOString().split('T')[0],
    duration_minutes: initialData.duration_minutes || 0,
    actual_duration_minutes: initialData.actual_duration_minutes || 0,
    materials_used: initialData.materials_used || [],
    stage: initialData.stage || 'ideation' as Stage,
    summary: initialData.summary || '',
    how_it_went: initialData.how_it_went || '',
    general_thoughts: initialData.general_thoughts || '',
    problem: initialData.problem || '',
    solution: initialData.solution || '',
    post_hook: initialData.post_hook || '',
    post_caption: initialData.post_caption || '',
    post_body: initialData.post_body || '',
    challenges: initialData.challenges || '',
    wins: initialData.wins || '',
    mood: initialData.mood || '',
    energy_level: initialData.energy_level || latestEnergyLevel || 0, // Fallback to latest energy level
    next_steps: initialData.next_steps || '',
    raw_transcript: initialData.raw_transcript || '',
    audio_base64: initialData.audio_base64 || null,
  });

  const [isDiggingDeeper, setIsDiggingDeeper] = useState(startWithDeepDive);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingStep, setIsProcessingStep] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentQuestion = DEEP_DIVE_QUESTIONS[currentStepIdx];
  
  const isManualEntry = formData.raw_transcript === '[Manual Entry]';

  const missingFields = useMemo(() => {
    const missing = [];
    if (!formData.project_name && !formData.project_id) missing.push("Project Name");
    if (type === 'session' && !formData.how_it_went) missing.push("Flow Status");
    if (type === 'session' && !formData.wins) missing.push("Highlight");
    if (type === 'session' && !formData.challenges) missing.push("Lowlight");
    return missing;
  }, [formData, type]);

  const handleSave = () => {
    onSave({ ...formData } as any);
  };

  const startStepRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        setIsProcessingStep(true);
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const refined = await processDeepDiveResponse({ base64, minType: mimeType }, currentQuestion.question);
          updateStepData(refined);
        };
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) { alert("Mic required for deep dive."); }
  };

  const stopStepRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const updateStepData = (value: string) => {
    const key = currentQuestion.key;
    setFormData(prev => ({
      ...prev,
      [key]: currentQuestion.type === 'number' ? parseInt(value) || 0 : value
    }));
    setManualInput('');
    setIsProcessingStep(false);
    setIsKeyboardMode(false);
    if (currentStepIdx < DEEP_DIVE_QUESTIONS.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      setIsDiggingDeeper(false);
    }
  };

  const handleManualSubmit = async () => {
    setIsProcessingStep(true);
    const refined = await processDeepDiveResponse(manualInput, currentQuestion.question);
    updateStepData(refined);
  };

  const handleReprocess = async () => {
    if (!formData.raw_transcript || formData.raw_transcript === '[Manual Entry]') return;
    
    setIsReprocessing(true);
    try {
      const refinedData = await reprocessTranscript(formData.raw_transcript, type);
      
      // Merge refined data into formData, ignoring nulls
      setFormData(prev => {
        const next = { ...prev };
        Object.entries(refinedData).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            // @ts-ignore
            next[key] = value;
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Reprocess failed:", error);
      alert("Failed to reprocess transcript. Please try again.");
    } finally {
      setIsReprocessing(false);
    }
  };

  const skipStep = () => {
    if (currentStepIdx < DEEP_DIVE_QUESTIONS.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      setIsDiggingDeeper(false);
    }
  };

  const inputClasses = "w-full bg-[#1a1715] border border-stone-800/60 rounded-3xl px-6 py-5 text-stone-100 placeholder:text-stone-700 focus:border-orange-900 outline-none transition-all duration-300 font-bold shadow-inner";
  const labelClasses = "block text-stone-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4 ml-1";

  if (isDiggingDeeper) {
    return (
      <div className="fixed inset-0 bg-[#0f0d0c] z-[200] flex flex-col safe-area-top safe-area-bottom overflow-hidden">
        <header className="px-8 py-6 flex items-center justify-between">
          <div className="flex space-x-1.5">
            {DEEP_DIVE_QUESTIONS.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-700 ${i <= currentStepIdx ? 'w-8 bg-orange-600' : 'w-4 bg-stone-800'}`}
              ></div>
            ))}
          </div>
          <button onClick={() => setIsDiggingDeeper(false)} className="text-stone-600 text-[10px] font-black uppercase tracking-widest hover:text-stone-400">Exit Deep Dive</button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-10 space-y-12">
          {isProcessingStep ? (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
               <div className="w-16 h-16 border-4 border-orange-900/30 border-t-orange-600 rounded-full animate-spin mx-auto"></div>
               <p className="text-stone-500 text-xs italic font-medium">Distilling your answer...</p>
            </div>
          ) : (
            <div className="w-full space-y-10 animate-in slide-in-from-bottom-8 duration-700">
              <div className="text-center space-y-3">
                <span className="text-orange-600 text-[10px] font-black uppercase tracking-[0.4em] mb-2 inline-block">
                  Step {currentStepIdx + 1}: {currentQuestion.label}
                </span>
                <h2 className="text-3xl font-black text-stone-100 tracking-tighter leading-tight px-2">
                  {currentQuestion.question}
                </h2>
              </div>

              <div className="flex flex-col items-center space-y-10">
                {isKeyboardMode ? (
                  <div className="w-full space-y-4 animate-in zoom-in-95 duration-500">
                    <textarea 
                      autoFocus
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className={inputClasses + " h-32 resize-none"}
                      placeholder="Type your thought..."
                    />
                    <div className="flex space-x-3">
                      <button onClick={() => setIsKeyboardMode(false)} className="flex-1 py-4 bg-stone-900 text-stone-500 font-black uppercase text-[10px] rounded-2xl border border-stone-800">Back</button>
                      <button onClick={handleManualSubmit} disabled={!manualInput.trim()} className="flex-[2] py-4 bg-orange-800 text-stone-100 font-black uppercase text-[10px] rounded-2xl border border-orange-700 shadow-xl shadow-orange-950/40">Submit Answer</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      {isRecording && <div className="absolute inset-0 w-44 h-44 bg-orange-700/20 rounded-full animate-ping"></div>}
                      <button 
                        onClick={isRecording ? stopStepRecording : startStepRecording}
                        className={`w-40 h-40 rounded-[3.5rem] flex items-center justify-center transition-all duration-500 shadow-2xl relative z-10 border-4 ${isRecording ? 'bg-rose-900 border-rose-800 animate-pulse' : 'bg-orange-800 border-orange-700 active:scale-90'}`}
                      >
                        {isRecording ? (
                          <div className="w-12 h-12 bg-white rounded-xl"></div>
                        ) : (
                          <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => setIsKeyboardMode(true)}
                      className="flex items-center space-x-3 text-stone-600 hover:text-stone-300 transition-colors py-2 border-b border-stone-800/40"
                    >
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Use Keyboard Instead</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="p-8 pb-12 flex justify-center">
          <button onClick={skipStep} className="text-stone-700 font-black uppercase tracking-[0.3em] text-[9px] hover:text-stone-500 transition-colors">Skip Question</button>
        </footer>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0f0d0c] z-[110] flex flex-col safe-area-top safe-area-bottom overflow-y-auto no-scrollbar">
      <header className="px-8 py-6 flex items-center justify-between border-b border-stone-800/30 sticky top-0 bg-[#0f0d0c]/80 backdrop-blur-3xl z-50">
        <button onClick={onCancel} className="text-stone-600 font-bold text-sm tracking-tighter px-2">Discard</button>
        <h2 className="font-black text-lg tracking-tighter uppercase">Review Log</h2>
        <button onClick={handleSave} className="text-stone-100 font-black text-[10px] uppercase tracking-[0.25em] bg-orange-800 px-6 py-2.5 rounded-2xl border border-orange-700 shadow-2xl shadow-orange-950/40 active:scale-95 transition-transform">Save</button>
      </header>

      <div className="px-8 py-12 space-y-12 pb-40">
        
        {!isManualEntry && missingFields.length > 0 && !isDiggingDeeper && (
          <div className="bg-orange-950/20 border border-orange-900/30 p-6 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <h4 className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Incomplete Log</h4>
               </div>
               <button 
                onClick={handleReprocess}
                disabled={isReprocessing}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border transition-all duration-300 ${isReprocessing ? 'bg-orange-900/20 border-orange-800/40 text-orange-400 animate-pulse' : 'bg-orange-900/40 border-orange-800 text-orange-100 hover:bg-orange-800 active:scale-95'}`}
              >
                {isReprocessing ? (
                  <div className="w-2 h-2 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                )}
                <span className="text-[8px] font-black uppercase tracking-widest">Reprocess</span>
              </button>
             </div>
             <p className="text-stone-400 text-xs font-medium italic">Gemini missed some details: {missingFields.join(', ')}.</p>
          </div>
        )}

        {(type === 'session' || type === 'brainstorm') && !isDiggingDeeper && (
          <>
            {isFreshSession ? (
              <div className="bg-orange-950/10 border border-orange-900/30 p-8 rounded-[3rem] space-y-6 handcrafted-shadow animate-in slide-in-from-top duration-1000">
                 <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-900/40 rounded-2xl flex items-center justify-center border border-orange-800/30">
                       <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Deep Dive Available</h4>
                      <p className="text-stone-300 font-bold text-base tracking-tight leading-tight mt-1">Shall we dig deeper into this session?</p>
                    </div>
                 </div>
                 <p className="text-stone-500 text-xs italic leading-relaxed font-medium">Capture how it felt, your highlights, lowlights, and tangential reflections.</p>
                 <button 
                  onClick={() => setIsDiggingDeeper(true)}
                  className="w-full py-4 bg-orange-800 text-stone-100 font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl border border-orange-700 shadow-xl shadow-orange-950/30 active:scale-95 transition-all"
                 >
                   Dig Deeper Now
                 </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button 
                  onClick={() => setIsDiggingDeeper(true)}
                  className="w-full flex items-center justify-between p-6 bg-orange-950/10 border border-orange-900/20 rounded-3xl active:scale-95 transition-all text-left group"
                >
                  <div className="space-y-1">
                    <h4 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-orange-400">Deep Dive Available</h4>
                    <p className="text-stone-500 text-xs italic font-medium">{DEEP_DIVE_QUESTIONS[0].question}</p>
                  </div>
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </>
        )}

        <section className="space-y-8">
          <div>
            <label className={labelClasses}>Project Context</label>
            <div className="relative">
              <select 
                value={formData.project_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const name = projects.find(p => p.id === id)?.name || '';
                  setFormData(prev => ({ ...prev, project_id: id, project_name: name }));
                }}
                className={inputClasses + " appearance-none pr-12"}
              >
                <option value="">Select Exploration...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-stone-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {(type === 'session' || type === 'brainstorm') && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}>Goal (m)</label>
                <input 
                  type="number" 
                  value={formData.duration_minutes} 
                  onChange={(e) => setFormData(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))} 
                  className={inputClasses} 
                />
              </div>
              <div>
                <label className={labelClasses}>Actual (m)</label>
                <input 
                  type="number" 
                  value={formData.actual_duration_minutes} 
                  onChange={(e) => setFormData(p => ({ ...p, actual_duration_minutes: parseInt(e.target.value) || 0 }))} 
                  className={inputClasses} 
                />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-10">
          {(type === 'session' || type === 'brainstorm') && (
            <>
              <div>
                <label className={labelClasses}>Current Studio Phase</label>
                <div className="flex flex-wrap gap-2">
                  {(['ideation', 'experimenting', 'production', 'finished'] as Stage[]).map(s => (
                    <button 
                      key={s} 
                      onClick={() => setFormData(p => ({ ...p, stage: s }))}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${formData.stage === s ? 'bg-orange-900/40 border-orange-800 text-orange-400' : 'bg-stone-900/40 border-stone-800 text-stone-600'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClasses}>Summary / Findings</label>
                <textarea value={formData.how_it_went} onChange={(e) => setFormData(p => ({ ...p, how_it_went: e.target.value }))} className={inputClasses + " h-28 resize-none"} placeholder="Rhythm and findings..." />
              </div>

              <div>
                <label className={labelClasses}>Session Highlight</label>
                <textarea value={formData.wins} onChange={(e) => setFormData(p => ({ ...p, wins: e.target.value }))} className={inputClasses + " h-28 resize-none border-orange-900/30"} placeholder="Best moment..." />
              </div>

              <div>
                <label className={labelClasses}>Lowlight / Block</label>
                <textarea value={formData.challenges} onChange={(e) => setFormData(p => ({ ...p, challenges: e.target.value }))} className={inputClasses + " h-28 resize-none border-rose-900/30"} placeholder="What failed or felt off..." />
              </div>

              <div>
                <label className={labelClasses}>General Thoughts</label>
                <textarea value={formData.general_thoughts} onChange={(e) => setFormData(p => ({ ...p, general_thoughts: e.target.value }))} className={inputClasses + " h-28 resize-none"} placeholder="Other reflections..." />
              </div>
            </>
          )}

          {type === 'idea' && (
            <div>
              <label className={labelClasses}>Inspiration Summary</label>
              <textarea value={formData.summary} onChange={(e) => setFormData(p => ({ ...p, summary: e.target.value }))} className={inputClasses + " h-40 resize-none"} />
            </div>
          )}

          <div>
             <label className={labelClasses}>Studio Battery (1-5)</label>
             <div className="flex justify-between items-center bg-stone-900/40 p-4 rounded-3xl border border-stone-800/40">
                {[1, 2, 3, 4, 5].map(lvl => (
                  <button 
                    key={lvl} 
                    onClick={() => setFormData(prev => ({ ...prev, energy_level: lvl }))}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all duration-500 ${formData.energy_level === lvl ? 'bg-orange-800 text-stone-100 shadow-2xl scale-110' : 'text-stone-700 hover:text-stone-400'}`}
                  >
                    {lvl}
                  </button>
                ))}
             </div>
          </div>

          {formData.next_steps && (
            <div>
              <label className={labelClasses}>Immediate Future</label>
              <textarea value={formData.next_steps} onChange={(e) => setFormData(p => ({ ...p, next_steps: e.target.value }))} className={inputClasses + " h-28 resize-none"} />
            </div>
          )}
        </section>

        <section className="pt-12 border-t border-stone-800/40">
           <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <label className={labelClasses + " mb-0"}>Raw Artifact</label>
                {!isManualEntry && (
                  <button 
                    onClick={handleReprocess}
                    disabled={isReprocessing}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border transition-all duration-300 ${isReprocessing ? 'bg-orange-900/20 border-orange-800/40 text-orange-400 animate-pulse' : 'bg-stone-900/40 border-stone-800 text-stone-500 hover:text-orange-500 hover:border-orange-900/40 active:scale-95'}`}
                  >
                    {isReprocessing ? (
                      <>
                        <div className="w-2 h-2 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                        <span className="text-[8px] font-black uppercase tracking-widest">Reprocessing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <span className="text-[8px] font-black uppercase tracking-widest">Reprocess with AI</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {formData.audio_base64 && (
                <div className="flex items-center space-x-2 text-emerald-500 bg-emerald-950/20 px-3 py-1 rounded-full border border-emerald-900/20 animate-in fade-in duration-700">
                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                   <span className="text-[8px] font-black uppercase tracking-widest">Voice Memo Saved</span>
                </div>
              )}
           </div>
           <p className="text-stone-500 text-[10px] leading-relaxed italic font-medium px-1">"{formData.raw_transcript}"</p>
        </section>
      </div>
    </div>
  );
};

export default LogForm;
