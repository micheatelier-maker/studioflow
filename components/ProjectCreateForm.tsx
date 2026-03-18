
import React, { useState, useRef, useEffect } from 'react';
import { Project, ProjectStatus, ProjectPhase } from '../types';
import { refineNarrativeFromAudio } from '../services/gemini';
import { RainbowPicker } from './RainbowPicker';

const PRESET_COLORS = [
  '#ea580c', // orange-600
  '#4f46e5', // indigo-600
  '#16a34a', // green-600
  '#dc2626', // red-600
  '#9333ea', // purple-600
  '#2563eb', // blue-600
  '#db2777', // pink-600
  '#ca8a04', // yellow-600
  '#0891b2', // cyan-600
  '#44403c', // stone-700
];

interface ProjectCreateFormProps {
  onSave: (name: string, description: string, status: ProjectStatus, category: string, tools: string[], isArchived: boolean, color: string, phases: ProjectPhase[]) => void;
  onCancel: () => void;
  initialData?: Project;
  title?: string;
  isInline?: boolean;
}

const ProjectCreateForm: React.FC<ProjectCreateFormProps> = ({ 
  onSave, 
  onCancel, 
  initialData,
  title = "New Project",
  isInline = false
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<ProjectStatus>(initialData?.status || 'Active');
  const [category, setCategory] = useState(initialData?.category || '');
  const [tools, setTools] = useState<string[]>(initialData?.tools_and_materials || []);
  const [color, setColor] = useState(initialData?.color || PRESET_COLORS[0]);
  const [phases, setPhases] = useState<ProjectPhase[]>(initialData?.phases || []);
  const [newTool, setNewTool] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const refinedNarrative = await refineNarrativeFromAudio(base64Audio, 'audio/webm', description);
            setDescription(refinedNarrative);
            setIsProcessing(false);
          };
        } catch (err) {
          console.error("Narrative refinement failed", err);
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      alert("Microphone access is needed to use voice narrative.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const addTool = () => {
    if (newTool.trim() && !tools.includes(newTool.trim())) {
      setTools([...tools, newTool.trim()]);
      setNewTool('');
    }
  };

  const removeTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const addPhase = () => {
    setPhases(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      title: 'New Phase', 
      startDate: new Date().toISOString().split('T')[0], 
      endDate: null,
      is_complete: false
    }]);
  };

  const removePhase = (id: string) => {
    setPhases(prev => prev.filter(p => p.id !== id));
  };

  const updatePhase = (id: string, updates: Partial<ProjectPhase>) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleSaveActive = () => {
    if (name.trim()) {
      onSave(name, description, status, category, tools, false, color, phases);
    }
  };

  const handleSaveArchived = () => {
    if (name.trim()) {
      onSave(name, description, status, category, tools, true, color, phases);
    }
  };

  const inputClasses = "w-full bg-[#1a1715] border border-stone-800/60 rounded-2xl px-5 py-4 text-stone-100 placeholder:text-stone-700 focus:border-orange-900 focus:ring-1 focus:ring-orange-900/30 outline-none transition-all duration-300 font-medium";
  const labelClasses = "block text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2.5 ml-1";

  const containerClasses = isInline 
    ? "bg-[#14110f] w-full rounded-[3rem] p-8 pb-32 space-y-8 shadow-2xl border border-stone-800/40 relative"
    : "fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[160] flex items-end safe-area-bottom";

  const innerClasses = isInline
    ? "space-y-8"
    : "bg-[#14110f] w-full rounded-t-[3rem] p-8 pb-14 space-y-8 animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] border-t border-stone-800/40 max-h-[90vh] overflow-y-auto no-scrollbar relative";

  return (
    <div className={containerClasses}>
      <div className={innerClasses}>
        {isProcessing && (
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm z-[180] flex flex-col items-center justify-center p-10 space-y-6 rounded-t-[3rem]">
            <div className="w-16 h-16 border-4 border-orange-900/30 border-t-orange-600 rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-stone-100 tracking-tight">Distilling Project</h3>
              <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest mt-2 animate-pulse">Gemini is polishing your vision</p>
            </div>
          </div>
        )}

        {!isInline && <div className="flex justify-center mb-2"><div className="w-16 h-1.5 bg-stone-800 rounded-full"></div></div>}
        
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-stone-100 tracking-tight uppercase tracking-widest">{title}</h2>
          <p className="text-stone-500 text-sm italic font-medium">Refine the project details of your creative seed.</p>
        </div>

        <div className="space-y-6">
          {/* Studio Status at the top */}
          <div>
            <label className={labelClasses}>Studio Status</label>
            <div className="relative">
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className={inputClasses + " appearance-none pr-12 bg-orange-950/10 border-orange-900/30 text-orange-400 font-bold"}
              >
                <option value="Active">Active</option>
                <option value="Exploring">Exploring</option>
                <option value="Stalled">Stalled</option>
                <option value="Paused">Paused</option>
                <option value="Complete">Complete</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-orange-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Project Name</label>
              <input 
                type="text"
                autoFocus={!initialData && !isInline}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kinetic Sculptures"
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Project Medium / Discipline</label>
              <input 
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Clay & Fabric Dolls"
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Project Visualization Color</label>
            <div className="p-6 bg-[#1a1715] rounded-[2.5rem] border border-stone-800/60 shadow-inner">
              <RainbowPicker 
                label="Spectrum Selector" 
                color={color} 
                onChange={setColor} 
              />
            </div>
          </div>

          <div>
             <label className={labelClasses}>Resources & Tools</label>
             <div className="flex space-x-2 mb-3">
                <input 
                  type="text"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTool()}
                  placeholder="Add material or tool..."
                  className={inputClasses + " flex-1"}
                />
                <button 
                  onClick={addTool}
                  className="bg-orange-800 px-5 rounded-2xl border border-orange-700 active:scale-95 transition-all text-white font-black"
                >
                  +
                </button>
             </div>
             <div className="flex flex-wrap gap-2">
                {tools.map((tool, i) => (
                  <span key={i} className="bg-stone-900 text-stone-400 text-[10px] font-black px-3 py-2 rounded-xl border border-stone-800 flex items-center space-x-2">
                    <span>{tool}</span>
                    <button onClick={() => removeTool(i)} className="text-stone-600 hover:text-rose-500">×</button>
                  </span>
                ))}
                {tools.length === 0 && <p className="text-stone-700 text-[10px] font-medium italic ml-1">No tools listed.</p>}
             </div>
          </div>

          {/* PROJECT PHASES Section */}
          <div className="space-y-4 pt-4 border-t border-stone-800/40">
            <label className={labelClasses}>PROJECT PHASES</label>
            <div className="space-y-4">
              {phases.map((phase) => (
                <div key={phase.id} className="bg-stone-900/40 p-5 rounded-3xl border border-stone-800/60 space-y-4 relative">
                  <button 
                    onClick={() => removePhase(phase.id)} 
                    className="absolute top-4 right-4 text-stone-700 hover:text-rose-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div>
                    <label className="text-[8px] font-black uppercase text-stone-600 mb-1 block">Phase Name</label>
                    <input 
                      value={phase.title} 
                      onChange={e => updatePhase(phase.id, { title: e.target.value })} 
                      className="w-full bg-stone-950/50 border border-stone-800/40 rounded-xl px-4 py-2 text-stone-200 text-sm focus:outline-none focus:border-orange-900/60"
                      placeholder="e.g. Prototype, Production"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black uppercase text-stone-600 mb-1 block">Start Date</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={phase.startDate || ''} 
                          onChange={e => updatePhase(phase.id, { startDate: e.target.value || null })} 
                          className="w-full bg-stone-950/50 border border-stone-800/40 rounded-xl px-4 py-2 text-stone-200 text-xs focus:outline-none opacity-0 absolute inset-0 z-10"
                        />
                        <div className="w-full bg-stone-950/50 border border-stone-800/40 rounded-xl px-4 py-2 text-stone-200 text-xs flex items-center justify-between">
                          <span>{formatDateDisplay(phase.startDate)}</span>
                          <svg className="w-3 h-3 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-stone-600 mb-1 block">End Date (Optional)</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={phase.endDate || ''} 
                          onChange={e => updatePhase(phase.id, { endDate: e.target.value || null })} 
                          className="w-full bg-stone-950/50 border border-stone-800/40 rounded-xl px-4 py-2 text-stone-200 text-xs focus:outline-none opacity-0 absolute inset-0 z-10"
                        />
                        <div className="w-full bg-stone-950/50 border border-stone-800/40 rounded-xl px-4 py-2 text-stone-200 text-xs flex items-center justify-between">
                          <span>{formatDateDisplay(phase.endDate)}</span>
                          <svg className="w-3 h-3 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={addPhase} 
                className="w-full py-4 border-2 border-dashed border-stone-800/60 rounded-3xl text-stone-500 font-black text-[10px] uppercase tracking-widest hover:border-orange-900/40 hover:text-stone-400 transition-all"
              >
                + Add Studio Phase
              </button>
            </div>
          </div>

          <div className="relative pt-4 border-t border-stone-800/40">
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Project & Goals</label>
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all duration-300 ${isRecording ? 'bg-rose-900/40 border-rose-800 text-rose-300 animate-pulse' : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-orange-400'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isRecording ? formatTime(recordingTime) : 'Voice Edit'}
                </span>
              </button>
            </div>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isRecording ? "Listening to your thoughts..." : "What are you chasing with this project?"}
              className={`${inputClasses} h-32 resize-none ${isRecording ? 'opacity-50 ring-2 ring-rose-900/30' : ''}`}
              readOnly={isRecording}
            />
          </div>
        </div>

        {!isInline && (
          <div className="flex flex-col space-y-4 pt-6">
            <button 
              disabled={!name.trim() || isRecording}
              onClick={handleSaveActive}
              className={`w-full py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg ${name.trim() && !isRecording ? 'bg-orange-800 text-stone-100 border border-orange-700 shadow-orange-950/40 active:scale-95' : 'bg-stone-900 text-stone-700 border border-stone-800 cursor-not-allowed'}`}
            >
              Save Project
            </button>
            
            <button 
              disabled={!name.trim() || isRecording}
              onClick={handleSaveArchived}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border ${name.trim() && !isRecording ? 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700 active:scale-95' : 'bg-stone-900 text-stone-700 border border-stone-800 cursor-not-allowed'}`}
            >
              Archive
            </button>

            <button 
              onClick={onCancel} 
              className="w-full py-3 text-stone-600 font-black uppercase tracking-[0.2em] text-[10px] active:text-stone-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {isInline && (
        <div className="fixed bottom-[110px] left-0 right-0 px-8 z-[100] animate-in slide-in-from-bottom duration-700">
          <div className="flex space-x-3">
            <button 
              onClick={onCancel}
              className="flex-1 py-5 rounded-[2.2rem] font-black text-xs uppercase tracking-[0.3em] bg-stone-900 border border-stone-800 text-stone-500 shadow-2xl backdrop-blur-md active:scale-[0.97] transition-all duration-500"
            >
              Cancel
            </button>
            <button 
              disabled={!name.trim() || isRecording}
              onClick={handleSaveActive}
              className={`flex-[2] py-5 rounded-[2.2rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center justify-center space-x-3 active:scale-[0.97] transition-all duration-500 ${name.trim() && !isRecording ? 'bg-orange-800 border border-orange-700 text-white shadow-orange-950/40' : 'bg-stone-900 text-stone-700 border border-stone-800 opacity-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCreateForm;
