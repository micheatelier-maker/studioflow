import React, { useState, useMemo, useEffect } from 'react';
import { Project, WorkshopLog, ProjectStatus, ScheduleItem, ProjectPhase } from '../types';

interface ProjectCardProps {
  project: Project;
  logs: WorkshopLog[];
  schedule: ScheduleItem[];
  onArchive: (id: string) => void;
  onEdit: (project: Project) => void;
  onViewLedger: (project: Project) => void;
  onNewLog: (project: Project) => void;
  onUpdatePhases: (id: string, phases: ProjectPhase[]) => void;
  onToggleLock: (id: string) => void;
}

/**
 * Helper to generate tonal variations for phases based on base color and index.
 * Handles both Hex and HSL formats.
 */
const getTonalVariation = (color: string, index: number, type: 'bg' | 'border' | 'text') => {
  let h = 25, s = 70, l = 50; // Default orange-ish fallback

  if (color.startsWith('hsl')) {
    const matches = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (matches) {
      h = parseInt(matches[1]);
      s = parseInt(matches[2]);
      l = parseInt(matches[3]);
    }
  } else if (color.startsWith('#')) {
    // Simple hex to HSL approximation for common use cases
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h = Math.round(h * 60);
      s = Math.round(s * 100);
      l = Math.round(l * 100);
    }
  }

  // Generate deterministic variations based on index
  const lightnessAdj = (index * 7) % 25; 
  const saturationAdj = (index * 4) % 15;
  
  const finalL = Math.max(15, Math.min(85, index % 2 === 0 ? l + lightnessAdj : l - lightnessAdj));
  const finalS = Math.max(30, Math.min(100, s - saturationAdj));

  if (type === 'bg') return `hsl(${h}, ${finalS}%, ${finalL}%, 0.22)`;
  if (type === 'border') return `hsl(${h}, ${finalS}%, ${finalL}%, 0.6)`;
  
  // Ensure text contrast: If L is high, text should be dark version of color, else light.
  const textL = finalL > 65 ? 25 : 95;
  return `hsl(${h}, ${finalS}%, ${textL}%)`;
};

const GanttChart: React.FC<{ 
  phases: ProjectPhase[]; 
  projectCreated: string; 
  projectColor: string; 
  onTogglePhase: (id: string) => void 
}> = ({ phases, projectCreated, projectColor, onTogglePhase }) => {
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

  const phasesArray = Array.isArray(phases) ? phases : [];
  if (phasesArray.length === 0) return <p className="text-stone-600 text-xs italic ml-1">No phases established yet.</p>;

  const startTimes = phasesArray.map(p => p.startDate ? new Date(p.startDate).getTime() : null).filter(Boolean) as number[];
  const endTimes = phasesArray.map(p => p.endDate ? new Date(p.endDate).getTime() : null).filter(Boolean) as number[];

  const anchorTime = new Date(projectCreated).getTime();
  const minTime = startTimes.length > 0 ? Math.min(...startTimes) : anchorTime;
  const maxTime = endTimes.length > 0 ? Math.max(...endTimes) : Math.max(minTime + (1000 * 60 * 60 * 24 * 30), Date.now());
  
  const totalSpan = Math.max(maxTime - minTime, 1);

  const handleBarTap = (e: React.MouseEvent, phaseId: string) => {
    e.stopPropagation();
    setActivePhaseId(prev => prev === phaseId ? null : phaseId);
  };

  const formatDate = (dateStr: string | number | null) => {
    if (!dateStr) return 'TBA';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'TBA';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-4 pt-2" onClick={() => setActivePhaseId(null)}>
      <div className="relative w-full space-y-4">
        {phasesArray.map((phase, index) => {
          const phaseStart = phase.startDate ? new Date(phase.startDate).getTime() : minTime;
          const phaseEnd = phase.endDate ? new Date(phase.endDate).getTime() : (phase.startDate ? phaseStart + (1000 * 60 * 60 * 24 * 7) : maxTime);
          
          const left = ((phaseStart - minTime) / totalSpan) * 100;
          const width = ((phaseEnd - phaseStart) / totalSpan) * 100;

          const bg = getTonalVariation(projectColor, index, 'bg');
          const border = getTonalVariation(projectColor, index, 'border');
          const text = getTonalVariation(projectColor, index, 'text');
          const isBubbleOpen = activePhaseId === phase.id;

          return (
            <div key={phase.id} className="relative flex items-center">
              <div className="flex-1 relative h-8">
                <div 
                  onClick={(e) => handleBarTap(e, phase.id)}
                  className={`absolute h-full rounded-lg border flex items-center px-3 transition-all duration-500 cursor-pointer active:scale-[0.98] ${phase.is_complete ? 'opacity-40 grayscale' : ''} ${isBubbleOpen ? 'ring-2 ring-white/20' : ''}`}
                  style={{ 
                    left: `${Math.max(0, left)}%`, 
                    width: `${Math.max(12, width)}%`,
                    backgroundColor: bg,
                    borderColor: border
                  }}
                >
                  <span className={`text-[8px] font-black uppercase whitespace-nowrap ${phase.is_complete ? 'line-through' : ''}`} style={{ color: text }}>
                    {phase.title}
                  </span>
                </div>

                {/* Information Bubble (Below Phase) */}
                {isBubbleOpen && (
                  <div 
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-300 pointer-events-none"
                    style={{ left: `${Math.max(6, left + width / 2)}%` }}
                  >
                    <div className="relative bg-stone-900 border border-stone-800 p-3 rounded-2xl shadow-2xl min-w-[140px]">
                      {/* Bubble Arrow */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 border-t border-l border-stone-800 rotate-45"></div>
                      
                      <div className="space-y-1.5 relative z-10">
                        <span className="block text-[7px] font-black uppercase text-stone-600 tracking-widest">Phase Detail</span>
                        <p className="text-stone-100 text-[10px] font-bold leading-tight">{phase.title}</p>
                        <div className="flex flex-col space-y-0.5 pt-1">
                          <span className="text-[8px] text-stone-500 font-medium">Start: {formatDate(phase.startDate)}</span>
                          <span className="text-[8px] text-stone-500 font-medium">End: {formatDate(phase.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onTogglePhase(phase.id); }}
                className={`ml-4 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${phase.is_complete ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-stone-700 bg-stone-900 text-transparent hover:border-stone-500'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          );
        })}
        <div className="pt-2 flex justify-between items-center text-[7px] font-black text-stone-700 uppercase tracking-widest border-t border-stone-800/30">
          <span>{formatDate(minTime)}</span>
          <div className="h-1 w-1 rounded-full bg-stone-800"></div>
          <span>{formatDate(maxTime)}</span>
        </div>
      </div>
    </div>
  );
};

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  logs, 
  schedule, 
  onArchive, 
  onEdit, 
  onViewLedger, 
  onNewLog,
  onUpdatePhases,
  onToggleLock
}) => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveInput, setArchiveInput] = useState('');
  const [overduePhase, setOverduePhase] = useState<ProjectPhase | null>(null);
  const [expandedRippleId, setExpandedRippleId] = useState<string | null>(null);
  
  useEffect(() => {
    const now = new Date();
    const phases = Array.isArray(project.phases) ? project.phases : [];
    const overdue = phases.find(p => p.endDate && new Date(p.endDate) < now && !p.is_complete);
    if (overdue) {
      setOverduePhase(overdue);
    } else {
      setOverduePhase(null);
    }
  }, [project.phases]);

  const projectLogs = useMemo(() => {
    return logs.filter(l => l.project_id === project.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, project.id]);

  const recentSessions = useMemo(() => projectLogs.slice(0, 3), [projectLogs]);

  const projectSchedule = useMemo(() => {
    return schedule.filter(s => s.project_id === project.id && new Date(s.date) >= new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [schedule, project.id]);

  const progressPercentage = useMemo(() => {
    const phases = Array.isArray(project.phases) ? project.phases : [];
    if (!phases.length) return 0;
    const completed = phases.filter(p => p.is_complete).length;
    return Math.round((completed / phases.length) * 100);
  }, [project.phases]);

  const getStatusColorClass = (status: ProjectStatus) => {
    switch(status) {
      case 'Active': return 'text-emerald-400';
      case 'Exploring': return 'text-purple-400';
      case 'Stalled': return 'text-rose-400';
      case 'Paused': return 'text-stone-400';
      case 'Complete': return 'text-amber-400';
      default: return 'text-orange-400';
    }
  };

  const formatTotalTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const handleArchiveSubmit = () => {
    if (archiveInput === 'ARCHIVE') {
      onArchive(project.id);
    } else {
      alert("Please type ARCHIVE in all caps to confirm.");
    }
  };

  const handleTogglePhase = (phaseId: string) => {
    if (project.is_locked) return;
    const phases = Array.isArray(project.phases) ? project.phases : [];
    const updatedPhases = phases.map(p => 
      p.id === phaseId ? { ...p, is_complete: !p.is_complete } : p
    );
    onUpdatePhases(project.id, updatedPhases);
  };

  const handleRemindTomorrow = () => {
    if (!overduePhase) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const phases = Array.isArray(project.phases) ? project.phases : [];
    const updatedPhases = phases.map(p => 
      p.id === overduePhase.id ? { ...p, endDate: tomorrow.toISOString().split('T')[0] } : p
    );
    onUpdatePhases(project.id, updatedPhases);
    setOverduePhase(null);
  };

  const handleMoveToNextPhase = () => {
    if (!overduePhase || project.is_locked) return;
    const phases = Array.isArray(project.phases) ? project.phases : [];
    const updatedPhases = phases.map(p => 
      p.id === overduePhase.id ? { ...p, is_complete: true } : p
    );
    onUpdatePhases(project.id, updatedPhases);
    setOverduePhase(null);
  };

  return (
    <div className={`bg-[#1a1715] rounded-b-[2.5rem] rounded-tr-none border border-stone-800/50 transition-all duration-500 overflow-hidden handcrafted-shadow relative`}>
      {/* Overdue Phase Notification */}
      {overduePhase && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="bg-[#1a1715] border border-orange-900/40 rounded-[2.5rem] p-8 max-w-sm w-full handcrafted-shadow space-y-6">
            <div className="flex items-center space-x-3 text-orange-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h4 className="text-lg font-black uppercase tracking-widest">Phase Overdue</h4>
            </div>
            <p className="text-stone-400 text-sm font-medium">
              The phase <span className="text-orange-500 font-bold">"{overduePhase.title}"</span> was scheduled to end on {new Date(overduePhase.endDate!).toLocaleDateString()}.
            </p>
            <div className="flex flex-col space-y-3 pt-2">
              <button onClick={handleMoveToNextPhase} className="w-full py-4 bg-orange-800 text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-950/40">Mark Complete</button>
              <button onClick={handleRemindTomorrow} className="w-full py-4 bg-stone-900 text-stone-400 rounded-[2.5rem] border border-stone-800 font-black text-[10px] uppercase tracking-widest">Remind Me Tomorrow</button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Overlay */}
      {isArchiving && (
        <div className="absolute inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in zoom-in-95 duration-500">
           <div className="space-y-8 w-full max-w-xs text-center">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-stone-100 tracking-tight">Confirm Vaulting</h3>
                <p className="text-stone-500 text-xs italic">Type <span className="text-orange-500 font-black font-mono">ARCHIVE</span> to move this project to the Vault.</p>
              </div>
              <input 
                autoFocus
                value={archiveInput}
                onChange={(e) => setArchiveInput(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-6 py-4 text-center text-stone-100 text-sm font-bold tracking-widest outline-none focus:border-orange-800 transition-all"
                placeholder="---"
              />
              <div className="flex space-x-3">
                 <button onClick={() => setIsArchiving(false)} className="flex-1 py-4 bg-stone-900 text-stone-500 font-black uppercase text-[10px] rounded-2xl border border-stone-800">Cancel</button>
                 <button onClick={handleArchiveSubmit} className="flex-[2] py-4 bg-orange-800 text-stone-100 font-black uppercase text-[10px] rounded-2xl border border-orange-700 shadow-xl shadow-orange-950/40">Archive Now</button>
              </div>
           </div>
        </div>
      )}

      <div className="p-8 space-y-10">
        {/* Project Header - Always Full Width */}
        <header className="flex justify-between items-start relative">
          <div className="space-y-2 flex-1">
             <div className="flex items-center space-x-3">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 bg-orange-950/20 px-3 py-1 rounded-lg border border-orange-900/20">{project.category}</span>
               <div className="flex items-center space-x-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusColorClass(project.status).replace('text-', 'bg-')}`}></div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${getStatusColorClass(project.status)}`}>{project.status}</span>
               </div>
               {project.is_locked && (
                 <div className="flex items-center space-x-1.5 text-stone-600">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <span className="text-[7px] font-black uppercase tracking-[0.3em]">Locked</span>
                 </div>
               )}
             </div>
             <h3 className="text-4xl font-black text-stone-100 tracking-tighter leading-none">{project.name}</h3>
             <p className="text-orange-600 text-sm font-black uppercase tracking-widest">{formatTotalTime(project.total_minutes)} Invested</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => onToggleLock(project.id)}
              className={`p-2.5 rounded-xl border transition-all duration-300 ${project.is_locked ? 'bg-orange-950/20 border-orange-900/30 text-orange-500' : 'bg-stone-900/50 border-stone-800 text-stone-600 hover:text-stone-400'}`}
              title={project.is_locked ? "Unlock Arc" : "Lock Arc"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                {project.is_locked ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4m0 0a2 2 0 100 4m0-4v4m-11 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2z" />
                )}
              </svg>
            </button>
            <button 
              onClick={() => project.is_locked ? null : onEdit(project)}
              disabled={project.is_locked}
              className={`p-2.5 rounded-xl border transition-all duration-300 ${project.is_locked ? 'bg-stone-900/20 border-stone-900/20 text-stone-800 cursor-not-allowed' : 'bg-stone-900/50 border-stone-800 text-stone-500 hover:text-orange-500 active:scale-90'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start space-y-10 lg:space-y-0">
          {/* Left Column: Vision & Progress */}
          <div className="space-y-10">
            {/* Project Intent Section (Locked Style) */}
            <div className="space-y-3">
              <label className="text-stone-600 text-[9px] font-black uppercase tracking-[0.3em]">Project Intent</label>
              <p className="text-stone-400 text-sm leading-relaxed italic font-medium">"{project.description}"</p>
            </div>

            {/* Project Arc Progress Section (Locked Style) */}
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <label className="text-stone-600 text-[9px] font-black uppercase tracking-[0.3em]">Project Phases</label>
                  <span className="text-orange-500 text-[11px] font-black tabular-nums">{progressPercentage}%</span>
               </div>
               <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden border border-stone-800/50">
                  <div 
                    className="h-full bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.4)] transition-all duration-1000"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
               </div>
               <GanttChart 
                 phases={project.phases} 
                 projectCreated={project.created_at} 
                 projectColor={project.color || '#ea580c'} 
                 onTogglePhase={handleTogglePhase}
               />
            </div>
          </div>

          {/* Right Column: Activity & Resources */}
          <div className="space-y-10">
            {/* Studio Ripples (Expandable Session Cards) */}
            {recentSessions.length > 0 && (
              <div className="space-y-6">
                <div className="flex justify-between items-end px-1">
                  <label className="text-stone-600 text-[9px] font-black uppercase tracking-[0.3em]">Studio Ripples</label>
                  <span className="text-stone-700 text-[8px] font-black uppercase tracking-widest">Recent Activity</span>
                </div>
                <div className="space-y-4">
                   {recentSessions.map((log) => {
                     const isExpanded = expandedRippleId === log.id;
                     const notableItemPreview = log.wins || log.challenges || log.summary || "Deep flow state";
                     const mainTitle = log.summary || log.how_it_went || log.wins || "Studio Session";

                     return (
                       <button 
                        key={log.id} 
                        onClick={() => setExpandedRippleId(isExpanded ? null : log.id)}
                        className={`w-full bg-stone-900/30 border rounded-[2.2rem] p-6 transition-all duration-500 text-left flex flex-col group active:scale-[0.99] ${isExpanded ? 'border-orange-900/40 ring-1 ring-orange-900/20' : 'border-stone-800/20 hover:border-orange-900/30'}`}
                       >
                          <div className="space-y-1 w-full relative">
                             <span className="text-stone-600 text-[7px] font-black uppercase tracking-[0.3em] block mb-1">
                               {project.name}
                             </span>
                             
                             <div className="flex justify-between items-start">
                               <h4 className="text-stone-200 font-bold text-sm tracking-tight leading-tight group-hover:text-orange-400 transition-colors pr-4 line-clamp-1">
                                 {mainTitle}
                               </h4>
                               <div className="flex flex-col items-end space-y-0.5 flex-shrink-0">
                                 <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest tabular-nums whitespace-nowrap">
                                   {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                 </span>
                                 <span className="text-[8px] text-stone-600 font-black tabular-nums">
                                   {log.actual_duration_minutes || log.duration_minutes || 0} min
                                 </span>
                               </div>
                             </div>

                             {!isExpanded && (
                               <div className="mt-3 flex items-start space-x-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                 <div className="w-1 h-3 rounded-full bg-orange-600/60 mt-0.5 flex-shrink-0"></div>
                                 <p className="text-stone-400 text-[10px] font-medium italic line-clamp-1 opacity-90 pr-2">
                                   {notableItemPreview}
                                 </p>
                               </div>
                             )}
                          </div>

                          {isExpanded && (
                            <div className="mt-5 pt-5 border-t border-stone-800/40 space-y-4 animate-in slide-in-from-top-2 duration-300 w-full">
                               {log.how_it_went && (
                                 <div>
                                   <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest block mb-1">Summary</span>
                                   <p className="text-stone-400 text-[11px] leading-relaxed italic">{log.how_it_went}</p>
                                 </div>
                               )}
                               {log.wins && (
                                 <div>
                                   <span className="text-[8px] font-black uppercase text-orange-600 tracking-widest block mb-1">Highlights</span>
                                   <p className="text-stone-200 text-[11px] leading-relaxed font-bold">{log.wins}</p>
                                 </div>
                               )}
                               {log.challenges && (
                                 <div>
                                   <span className="text-[8px] font-black uppercase text-rose-600 tracking-widest block mb-1">Challenges</span>
                                   <p className="text-stone-400 text-[11px] leading-relaxed">{log.challenges}</p>
                                 </div>
                               )}
                            </div>
                          )}
                       </button>
                     );
                   })}
                </div>
              </div>
            )}

            {/* Thread Commitments (Upcoming Commitments) */}
            {projectSchedule.length > 0 && (
              <div className="space-y-4">
                 <label className="text-stone-600 text-[9px] font-black uppercase tracking-[0.3em]">Thread Commitments</label>
                 <div className="space-y-2">
                    {projectSchedule.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-orange-950/10 p-4 rounded-2xl border border-orange-900/20">
                         <div className="flex items-center space-x-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                            <span className="text-stone-200 text-xs font-bold">{item.title}</span>
                         </div>
                         <span className="text-[9px] font-black text-orange-700 uppercase tracking-widest">{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* Studio Kit Section (Locked Style) */}
            <div className="space-y-4">
              <label className="text-stone-600 text-[9px] font-black uppercase tracking-[0.3em]">Studio Kit</label>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(project.tools_and_materials) ? project.tools_and_materials : []).map((tool, i) => (
                  <span key={i} className="bg-stone-900/60 text-stone-500 text-[9px] font-black px-3 py-1.5 rounded-lg border border-stone-800/60 uppercase tracking-tighter">
                    {tool}
                  </span>
                ))}
                {(!Array.isArray(project.tools_and_materials) || project.tools_and_materials.length === 0) && <span className="text-stone-700 text-xs italic">No materials specified.</span>}
              </div>
            </div>

            {/* Archive Action */}
            <div className="pt-2 flex justify-start">
               <button 
                onClick={() => setIsArchiving(true)}
                className="text-stone-700 hover:text-rose-900 font-black text-[9px] uppercase tracking-widest transition-colors flex items-center space-x-2"
               >
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 <span>Vault this project arc</span>
               </button>
            </div>

            {/* Footer Actions */}
            <footer className="pt-4 flex flex-col space-y-3">
               <button 
                onClick={() => onNewLog(project)}
                className="w-full bg-orange-800 py-5 rounded-[2.5rem] border border-orange-700 text-stone-100 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-orange-950/40"
               >
                 Log Session
               </button>
               <button 
                onClick={() => onViewLedger(project)}
                className="w-full bg-stone-900 py-5 rounded-[2.5rem] border border-stone-800 text-stone-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
               >
                 Session Ledger
               </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;