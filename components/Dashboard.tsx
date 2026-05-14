import React, { useMemo, useState, useEffect, useRef } from 'react';
import { HelpCircle, Calendar as CalendarIcon, Clock, ChevronRight, Heart, Mic } from 'lucide-react';
import { AppState, Project, WorkshopLog, ScheduleItem, BlockStrategy } from '../types';
import BlockRemoverSession from './BlockRemoverSession';
import Calendar from './Calendar';
import GanttChart from './GanttChart';
import { DEEP_DIVE_QUESTIONS } from './LogForm';

interface DashboardProps {
  state: AppState;
  onLogClick: () => void;
  onDigDeeperClick: () => void;
  onNewProjectClick: () => void;
  onNewLogFromProject: (project: Project) => void;
  onScheduleClick: () => void;
  onCommitmentClick: (item: ScheduleItem) => void;
  onProfileClick: () => void;
  onEnergyUpdate: (level: number, note: string) => void;
  onAddBlockStrategy?: (name: string, description: string, duration: number) => void;
  onUpdateBlockStrategy?: (id: string, updates: Partial<BlockStrategy>) => void;
  onRemoveBlockStrategy?: (id: string) => void;
  onAddProtocolLog?: (log: any) => void;
  onDeepDiveClick?: (log: WorkshopLog) => void;
  onAddTickets?: (count: number) => void;
  onNewCommitmentClick?: (date?: string | null) => void;
}

/**
 * Isolated helper to calculate suitability based on energy and time.
 */
const getStrategySuitability = (strategy: BlockStrategy, energy: number, hour: number) => {
  const s = strategy.name.toLowerCase();
  let score = 0;
  let reason = "General Reset";

  // Energy Logic
  if (energy <= 2) {
    if (s.includes('48 hours') || s.includes('away') || s.includes('disconnect')) { score += 15; reason = "Rest Priority"; }
    if (s.includes('object') || s.includes('talk') || s.includes('duck')) { score += 10; reason = "Low Energy Reset"; }
  } else if (energy >= 4) {
    if (s.includes('walk') || s.includes('clean')) { score += 15; reason = "Movement Match"; }
  }

  // Time Logic
  if (hour >= 21 || hour < 5) { // Night
    if (s.includes('48 hours') || s.includes('away') || s.includes('disconnect')) { score += 20; reason = "Sleep Hygiene"; }
    if (s.includes('walk')) score -= 10; 
  } else if (hour >= 5 && hour < 11) { // Morning
    if (s.includes('walk') || s.includes('clean')) { score += 10; reason = "Morning Spark"; }
  }

  return { score, reason };
};

const Dashboard: React.FC<DashboardProps> = ({ 
  state, 
  onLogClick, 
  onDigDeeperClick,
  onNewProjectClick,
  onNewLogFromProject,
  onScheduleClick,
  onCommitmentClick,
  onProfileClick,
  onEnergyUpdate,
  onAddBlockStrategy,
  onUpdateBlockStrategy,
  onRemoveBlockStrategy,
  onAddProtocolLog,
  onDeepDiveClick,
  onAddTickets,
  onNewCommitmentClick
}) => {
  const [isEnergyExpanded, setIsEnergyExpanded] = useState(false);
  const initialEnergyLevel = state.energyHistory && state.energyHistory.length > 0 ? state.energyHistory[0].level : 3;
  const [selectedLevelState, setSelectedLevel] = useState(initialEnergyLevel);
  const [previousLevel, setPreviousLevel] = useState(selectedLevelState);
  const [energyNote, setEnergyNote] = useState('');
  const [showCommitmentInfo, setShowCommitmentInfo] = useState(false);

  useEffect(() => {
    if (state.energyHistory && state.energyHistory.length > 0) {
      setSelectedLevel(state.energyHistory[0].level);
    }
  }, [state.energyHistory]);
  
  // Strategy Form State
  const [isAddingStrategy, setIsAddingStrategy] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);
  const [strategyInput, setStrategyInput] = useState({ name: '', description: '', duration: 5 });
  
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [expandedRippleId, setExpandedRippleId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<{ name: string; duration: number } | null>(null);
  const [showLabInfo, setShowLabInfo] = useState(false);
  const [deployConfirmation, setDeployConfirmation] = useState<BlockStrategy | null>(null);
  const [activeLabTab, setActiveLabTab] = useState<'protocols' | 'history'>('protocols');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isWarmGlow, setIsWarmGlow] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [dashboardSelectedDate, setDashboardSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);

  const labRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!labRef.current) return;
      const rect = labRef.current.getBoundingClientRect();
      // If the top of the lab is within 150px of the top of the viewport
      if (rect.top < 200 && rect.bottom > 100) {
        setIsWarmGlow(true);
      } else {
        setIsWarmGlow(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeProjects = state.projects.filter(p => !p.is_archived);
  const recentLogs = state.logs.filter(l => l.type === 'session').slice(0, 1);
  const currentEnergy = state.energyHistory[0]?.level || 0;
  const recentEnergyHistory = useMemo(() => state.energyHistory.slice(0, 3), [state.energyHistory]);

  const totalMinutesThisWeek = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return state.logs
      .filter(l => new Date(l.date) >= sevenDaysAgo)
      .reduce((acc, l) => acc + (l.actual_duration_minutes || l.duration_minutes || 0), 0);
  }, [state.logs]);

  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);
    
    return state.schedule.filter(s => {
      const d = new Date(s.date);
      return d >= today && d <= nextWeek;
    }).length;
  }, [state.schedule]);
  
  const primeThread = useMemo(() => {
    if (activeProjects.length === 0) return null;
    return [...activeProjects].sort((a, b) => b.total_minutes - a.total_minutes)[0];
  }, [activeProjects]);

  const upcomingSchedule = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    return [...state.schedule]
      .filter(s => {
        const d = new Date(s.date);
        return d >= today && d <= nextWeek;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [state.schedule]);

  // One Prime Recommendation Logic (rotates every 4 hours)
  const primeRecommendation = useMemo(() => {
    if (state.blockStrategies.length === 0) return null;
    const hour = new Date().getHours();
    const timeBlock = Math.floor(hour / 4); 
    
    const scored = state.blockStrategies
      .map((s, index) => {
        const suitability = getStrategySuitability(s, currentEnergy, hour);
        const rotationBias = (index === timeBlock % state.blockStrategies.length) ? 10 : 0;
        
        return {
          strategy: s,
          ...suitability,
          finalScore: suitability.score + rotationBias
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);

    return scored[0]; 
  }, [state.blockStrategies, currentEnergy]);

  const primeThreadLog = useMemo(() => {
    if (!primeThread) return null;
    return state.logs
      .filter(l => l.project_id === primeThread.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [state.logs, primeThread]);

  const randomDeepDiveQuestion = useMemo(() => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return DEEP_DIVE_QUESTIONS[dayOfYear % DEEP_DIVE_QUESTIONS.length];
  }, []);

  const handleSaveEnergy = () => {
    onEnergyUpdate(selectedLevelState, energyNote);
    setEnergyNote('');
    setIsEnergyExpanded(false);
  };

  const handleLevelSelect = (lvl: number) => {
    setPreviousLevel(selectedLevelState);
    setSelectedLevel(lvl);
  };

  const handleStrategySubmit = () => {
    if (strategyInput.name.trim()) {
      if (editingStrategyId && onUpdateBlockStrategy) {
        onUpdateBlockStrategy(editingStrategyId, strategyInput);
      } else if (onAddBlockStrategy) {
        onAddBlockStrategy(strategyInput.name, strategyInput.description, strategyInput.duration);
      }
      resetStrategyForm();
    }
  };

  const resetStrategyForm = () => {
    setStrategyInput({ name: '', description: '', duration: 5 });
    setEditingStrategyId(null);
    setIsAddingStrategy(false);
  };

  const handleEditStrategy = (s: BlockStrategy) => {
    setStrategyInput({ name: s.name, description: s.description, duration: s.duration });
    setEditingStrategyId(s.id);
    setIsAddingStrategy(true);
  };

  const getScheduleTypeIcon = (type: string) => {
    switch(type) {
      case 'deadline': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'session': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
      default: return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    }
  };

  const getEnergyDescriptor = (lvl: number) => {
    switch(lvl) {
      case 0: return "Depleted";
      case 1: return "Spark";
      case 2: return "Glow";
      case 3: return "Flow";
      case 4: return "Blaze";
      case 5: return "On Fire";
      default: return "Flow";
    }
  };

  const handleDeploy = (strategy: BlockStrategy) => {
    setDeployConfirmation(strategy);
  };

  const confirmDeploy = () => {
    if (deployConfirmation) {
      setActiveSession({ name: deployConfirmation.name, duration: deployConfirmation.duration });
      setDeployConfirmation(null);
    }
  };

  const inputClasses = "w-full bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 text-stone-100 placeholder:text-stone-700 outline-none focus:border-orange-900 transition-all font-medium text-sm";
  const labelClasses = "block text-stone-600 text-[10px] font-black uppercase tracking-[0.2em] mb-2 ml-1";

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + offset, 1);
    setCurrentCalendarDate(newDate);
  };

  const groupedSchedule = useMemo(() => {
    const deadlines = (state.artistProfile && Array.isArray(state.artistProfile.deadlines)) ? state.artistProfile.deadlines : [];
    const profileMetaItems: ScheduleItem[] = deadlines.map(d => ({
      id: `prof-${d.id}`,
      title: d.title,
      date: d.date,
      type: 'milestone',
      reminder_set: false,
      notes: 'Studio Target set from Profile'
    }));

    const merged = [...state.schedule, ...profileMetaItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return merged.reduce((groups, item) => {
      const date = item.date.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    }, {} as Record<string, ScheduleItem[]>);
  }, [state.schedule, state.artistProfile.deadlines]);

  const renderRecentSessions = () => (
    <section className="space-y-8">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em]">Latest Ripples</h2>
        <span className="text-stone-700 text-[8px] font-black uppercase tracking-widest">Recent Focus</span>
      </div>
      
      <div className="space-y-6">
        {Array.isArray(recentLogs) && recentLogs.length > 0 ? (
          recentLogs.map((log) => (
            <div key={log.id} className="space-y-6 relative">
              <div className="relative">
                {/* Connection line to Dig Deeper card */}
                <div className="absolute left-10 top-full w-px h-6 bg-gradient-to-b from-orange-900/60 to-orange-900/10 z-0"></div>
                
                <div 
                  onClick={() => setExpandedRippleId(expandedRippleId === log.id ? null : log.id)}
                  className={`w-full bg-[#1a1715]/40 border rounded-[2.5rem] p-7 transition-all duration-500 text-left flex flex-col group cursor-pointer active:scale-[0.99] relative z-10 ${expandedRippleId === log.id ? 'border-orange-900/40 ring-1 ring-orange-900/20 shadow-2xl shadow-orange-950/20' : 'border-stone-800/20 hover:border-orange-900/30'}`}
                >
                  <div className="space-y-2 w-full relative">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-stone-600 font-black uppercase tracking-[0.2em] mb-1">
                          {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @ {new Date(log.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <h4 className="text-stone-200 font-bold text-base tracking-tight leading-tight group-hover:text-orange-400 transition-colors pr-4 line-clamp-1">
                          {log.summary || log.how_it_went || log.wins || "Studio Session"}
                        </h4>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className="text-[8px] text-stone-600 font-black tabular-nums flex-shrink-0">
                          {(() => {
                            const mins = log.actual_duration_minutes || log.duration_minutes || 0;
                            const h = Math.floor(mins / 60);
                            const m = mins % 60;
                            return h > 0 ? `${h}h ${m}m` : `${m}m`;
                          })()}
                        </span>
                      </div>
                    </div>
                    
                    {expandedRippleId !== log.id && (
                      <div className="mt-4 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="flex items-center space-x-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-orange-600/60 flex-shrink-0 animate-pulse"></div>
                           <p className="text-stone-500 text-[10px] font-medium italic opacity-90 pr-2 line-clamp-1">
                             {log.wins || log.summary || "Deep creative flow recorded."}
                           </p>
                        </div>
                        <span className="text-[8px] text-orange-900 font-black uppercase tracking-widest whitespace-nowrap">View Log</span>
                      </div>
                    )}
                  </div>

                  { expandedRippleId === log.id && (
                    <div className="mt-6 pt-6 border-t border-stone-800/40 space-y-5 animate-in slide-in-from-top-2 duration-300 w-full">
                      <div className="grid grid-cols-2 gap-6">
                        {log.wins && (
                          <div>
                            <span className="text-[8px] font-black uppercase text-orange-600 tracking-widest block mb-1.5">Highlights</span>
                            <p className="text-stone-200 text-[11px] leading-relaxed font-bold">{log.wins}</p>
                          </div>
                        )}
                        {log.challenges && (
                          <div>
                            <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest block mb-1.5">Low Lights</span>
                            <p className="text-stone-400 text-[11px] leading-relaxed italic">{log.challenges}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {log.next_steps && (
                          <div>
                            <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest block mb-1.5">Next Steps</span>
                            <p className="text-stone-400 text-[11px] leading-relaxed">{log.next_steps}</p>
                          </div>
                        )}
                        {log.project_name && (
                          <div>
                            <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest block mb-1.5">Project</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 rounded-full bg-orange-600"></div>
                              <p className="text-stone-300 text-[10px] font-black uppercase tracking-wider">{log.project_name}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeepDiveClick?.(log); }}
                        className="w-full py-3 bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl border border-stone-800/60 transition-all text-center"
                      >
                        Open Full Log Entry
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Dig Deeper Question Card - Nested to connect to log */}
              <div 
                onClick={() => onDigDeeperClick()}
                className="bg-orange-950/10 border border-orange-900/20 rounded-[2.5rem] p-8 space-y-6 active:scale-[0.99] transition-all cursor-pointer group hover:bg-orange-950/20 relative z-10"
              >
                <div className="space-y-1">
                   <span className="text-orange-500 text-[8px] font-black uppercase tracking-[0.3em]">Dig Deeper</span>
                   <h3 className="text-stone-100 text-lg font-black tracking-tight leading-tight group-hover:text-orange-400 transition-colors">
                     {randomDeepDiveQuestion?.question}
                   </h3>
                </div>
                <div className="flex items-center space-x-3 text-stone-600 group-hover:text-stone-400">
                   <div className="p-2 bg-stone-900/40 rounded-xl">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                   </div>
                   <span className="text-[9px] font-black uppercase tracking-widest">Write Reflection</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-4">
            <div className="py-12 text-center border-2 border-dashed border-stone-900/40 rounded-[2.5rem] bg-stone-900/10 space-y-4">
              <p className="text-stone-700 text-[9px] uppercase font-black tracking-[0.3em]">No creative ripples detected</p>
              <button 
                onClick={onLogClick}
                className="px-8 py-3 bg-orange-900/20 border border-orange-900/20 rounded-full text-orange-500 text-[9px] font-black uppercase tracking-widest hover:bg-orange-900 transition-all"
              >
                Start Your First Session
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const renderPrimeThread = () => primeThread && (
    <section className="space-y-4">
       <div className="flex justify-between items-end px-1">
         <h2 className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em]">Prime Thread</h2>
         <span className="text-orange-600 text-[8px] font-black uppercase tracking-widest">Focus Target</span>
       </div>
       <div className="bg-[#1a1715] border border-orange-900/20 rounded-[3rem] p-8 handcrafted-shadow space-y-6">
         <div className="flex justify-between items-start">
           <div className="space-y-1">
             <span className="text-orange-500 text-[9px] font-black uppercase tracking-widest">{primeThread.category}</span>
             <h3 className="text-stone-100 font-extrabold text-2xl leading-none">{primeThread.name}</h3>
           </div>
           <button onClick={() => onNewLogFromProject(primeThread)} className="p-3 bg-orange-950/20 rounded-2xl border border-orange-900/20 text-orange-500 hover:bg-orange-800 hover:text-white transition-all">
             <Clock className="w-5 h-5" />
           </button>
         </div>
         <div className="pt-2 border-t border-stone-800/20">
           <div className="flex justify-between items-center mb-3">
             <span className="text-[7px] font-black uppercase text-stone-600 tracking-[0.2em]">Arc Timeline</span>
             <span className="text-[9px] font-black text-orange-600 tabular-nums">
               {Math.round(((Array.isArray(primeThread.phases) ? primeThread.phases : []).filter(p => p.is_complete).length || 0) / (Math.max(1, (Array.isArray(primeThread.phases) ? primeThread.phases : []).length)) * 100)}%
             </span>
           </div>
           <GanttChart 
             phases={primeThread.phases || []} 
             projectCreated={primeThread.created_at} 
             projectColor={primeThread.color || '#ea580c'}
             compact={true}
           />
         </div>
         <button 
           onClick={() => onNewLogFromProject(primeThread)}
           className="w-full py-4 bg-orange-800/10 border border-orange-900/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-orange-500 hover:bg-orange-800 hover:text-white transition-all"
         >
           Start Session
         </button>
       </div>
    </section>
  );

  const renderSelectedDateCommitments = () => {
    if (!dashboardSelectedDate) return null;
    
    const commitments = groupedSchedule[dashboardSelectedDate] || [];
    const isToday = dashboardSelectedDate === new Date().toISOString().split('T')[0];
    const dateLabel = isToday 
      ? "Today's Commitments" 
      : `${new Date(dashboardSelectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} Commitments`;

    return (
      <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em]">{dateLabel}</h2>
          {commitments.length > 0 && (
            <span className="text-orange-600 text-[8px] font-black uppercase tracking-widest">
              {commitments.length} {commitments.length === 1 ? 'Target' : 'Targets'}
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          {Array.isArray(commitments) && commitments.map((item) => (
            <button 
              key={item.id} 
              onClick={() => onCommitmentClick(item)}
              className="w-full bg-[#1a1715]/40 border border-stone-800/20 rounded-[2.5rem] p-6 text-left flex items-center justify-between group hover:border-orange-900/30 transition-all active:scale-[0.98] handcrafted-shadow"
            >
              <div className="flex items-center space-x-5">
                <div className="bg-stone-900/80 p-3 rounded-2xl text-orange-500 border border-stone-800/40 group-hover:scale-110 transition-transform">
                  {getScheduleTypeIcon(item.type)}
                </div>
                <div>
                  <h4 className="text-stone-100 font-bold text-xs group-hover:text-orange-400 transition-colors uppercase tracking-tight line-clamp-1">{item.title}</h4>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-stone-600 text-[8px] font-black uppercase tracking-widest">{item.type}</span>
                    {item.reminder_set && (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-1 h-1 rounded-full bg-orange-600 animate-pulse"></div>
                          <span className="text-[7px] text-orange-900 font-black uppercase tracking-tighter">Alert On</span>
                        </div>
                        {item.reminder_config && (
                          <span className="text-[7px] text-stone-700 font-black uppercase tracking-tighter opacity-60">
                            {item.reminder_config.type === 'advance' 
                              ? (typeof item.reminder_config.advance_value === 'string' ? item.reminder_config.advance_value : String(item.reminder_config.advance_value || ''))
                              : `${new Date(item.reminder_config.specific_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @ ${item.reminder_config.specific_time}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-800 group-hover:text-orange-500 transition-colors translate-x-0 group-hover:translate-x-1 duration-300" />
            </button>
          ))}
          {commitments.length === 0 && (
            <div className="py-12 text-center border-2 border-dashed border-stone-900/20 rounded-[2.5rem] bg-stone-900/5">
              <p className="text-stone-700 text-[9px] uppercase font-black tracking-[0.3em] italic">Open flow for this date</p>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderCommitments = () => (
    <section className="space-y-6">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em]">Upcoming Commitments</h2>
        <button 
          onClick={onScheduleClick} 
          className="text-stone-600 text-[9px] font-black uppercase tracking-widest hover:text-orange-500 transition-colors"
        >
          Full Ledger
        </button>
      </div>
      
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar space-x-3 pb-4 px-1 lg:grid lg:grid-cols-3 lg:gap-3 lg:pb-0">
        {Array.isArray(upcomingSchedule) && upcomingSchedule.map((item) => {
          const now = new Date();
          const commitmentDate = new Date(item.date);
          const diffTime = commitmentDate.getTime() - now.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          
          let bgClass = "bg-[#1a1715] border-stone-800/40";
          let textClass = "text-stone-100";
          let iconBgClass = "bg-stone-900 text-orange-500 border-stone-800";
          let subTextClass = "text-stone-600";
          let iconColorClass = "text-orange-500";
          
          if (diffDays <= 1.5) {
            bgClass = "bg-orange-900/20 border-orange-500 shadow-[0_10px_30px_rgba(234,88,12,0.15)]";
            textClass = "text-orange-50";
            iconBgClass = "bg-orange-500/20 text-orange-400 border-orange-500/20";
            subTextClass = "text-orange-400/70";
            iconColorClass = "text-orange-400";
          } else if (diffDays <= 3) {
            bgClass = "bg-gradient-to-br from-orange-900/30 to-[#0f0d0c] border-orange-500/50 shadow-[0_10px_30px_rgba(234,88,12,0.1)]";
            textClass = "text-orange-50";
            iconBgClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
            subTextClass = "text-orange-400/60";
            iconColorClass = "text-orange-400";
          }

          return (
            <button 
              key={item.id} 
              onClick={() => onCommitmentClick(item)}
              className={`${bgClass} border p-3 rounded-[1.5rem] flex flex-col justify-between shadow-xl active:scale-[0.98] transition-all text-left flex-shrink-0 w-[130px] aspect-square snap-center lg:w-full lg:aspect-auto lg:p-4`}
            >
              <div className="space-y-2 lg:flex lg:items-center lg:space-x-4 lg:space-y-0 lg:w-full">
                <div className="flex justify-between items-start lg:block lg:flex-shrink-0">
                  <div className={`${iconBgClass} p-1.5 rounded-lg transition-colors`}>
                    <div className={iconColorClass}>
                      {getScheduleTypeIcon(item.type)}
                    </div>
                  </div>
                </div>
                <div className="lg:flex-1 lg:min-w-0 font-medium">
                  <h4 className={`${textClass} font-bold text-[10px] lg:text-xs tracking-tight leading-tight mb-0.5 transition-colors line-clamp-2`}>{item.title}</h4>
                  <p className={`${subTextClass} text-[7px] font-black uppercase tracking-widest`}>
                    {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="hidden lg:block">
                   <ChevronRight className="w-4 h-4 text-stone-700 group-hover:text-orange-500 transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-6 pt-10 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000 no-scrollbar overflow-x-hidden relative">
      {/* Global Warm Glow Background Overlay */}
      <div className={`fixed inset-0 bg-rose-950/20 transition-opacity duration-1000 pointer-events-none z-0 ${isWarmGlow ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* Deploy Confirmation Modal */}
      {deployConfirmation && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#1a1715] border border-orange-900/30 rounded-[3rem] p-10 max-w-sm w-full space-y-8 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping"></div>
                <h3 className="text-orange-500 text-xl font-black uppercase tracking-tighter">Confirm Protocol</h3>
              </div>
              <div className="space-y-4">
                <p className="text-stone-100 text-2xl font-black tracking-tight leading-tight">
                  {deployConfirmation.name}
                </p>
                <p className="text-stone-400 text-sm leading-relaxed font-medium italic">
                  "{deployConfirmation.description}"
                </p>
                <div className="flex items-center space-x-3 bg-stone-900/60 w-fit px-4 py-2 rounded-full border border-stone-800/40">
                   <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <span className="text-stone-300 text-[10px] font-black tracking-widest uppercase">{deployConfirmation.duration}m Focus Required</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <button 
                onClick={confirmDeploy}
                className="w-full py-5 bg-orange-800 text-stone-100 font-black uppercase text-xs tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-orange-950/60 border border-orange-700 active:scale-95 transition-all"
              >
                Yes, Deploy Now
              </button>
              <button 
                onClick={() => setDeployConfirmation(null)}
                className="w-full py-4 bg-stone-900/50 text-stone-500 font-black uppercase text-[10px] tracking-[0.3em] rounded-[1.5rem] border border-stone-800/50 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Remover Session Overlay */}
      {activeSession && (
        <BlockRemoverSession 
          name={activeSession.name} 
          durationMinutes={activeSession.duration} 
          onCancel={() => setActiveSession(null)}
          onComplete={(reflection?: string, reflectionType?: 'voice' | 'text') => {
            if (onAddProtocolLog && activeSession) {
              const strategy = state.blockStrategies.find(s => s.name === activeSession.name);
              onAddProtocolLog({
                strategyId: strategy?.id || 'unknown',
                strategyName: activeSession.name,
                date: new Date().toISOString(),
                duration: activeSession.duration,
                reflection,
                reflectionType
              });
            }
            setActiveSession(null);
          }}
        />
      )}

      <div className="space-y-1">
        {/* Command Center Header */}
        <header className="px-1 flex justify-between items-start relative">
          <div className="space-y-1">
            <span className="text-stone-600 text-[10px] font-black uppercase tracking-[0.4em] ml-1">Command Center</span>
            <h1 className="text-4xl font-black tracking-tighter text-stone-50">
              {state.artistProfile.stageName}<span className="text-orange-600">.</span>
            </h1>
            <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsEnergyExpanded(!isEnergyExpanded)}
                  aria-label="Toggle Energy and Studio Vitals"
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-full border backdrop-blur-md active:scale-95 transition-all ${isEnergyExpanded ? 'bg-orange-950/40 border-orange-700/40' : 'bg-stone-900/40 border-stone-800/40'}`}
                >
                  <div className="flex space-x-1.5">
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <svg 
                        key={lvl} 
                        className={`w-4 h-4 transition-all duration-700 ${lvl <= currentEnergy ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-stone-800 fill-stone-900'}`} 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.99 7.99 0 01-2.343 5.657z" />
                      </svg>
                    ))}
                  </div>
                  <svg className={`w-3 h-3 text-stone-600 transition-transform duration-500 ${isEnergyExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
               </button>
            </div>
          </div>
          
          <button 
            onClick={onProfileClick}
            aria-label="View Artist Profile"
            className="w-14 h-14 rounded-3xl overflow-hidden border-2 border-stone-800/50 shadow-2xl relative active:scale-95 transition-transform group"
          >
            {state.artistProfile.profileImage ? (
              <img src={state.artistProfile.profileImage} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <div className="w-full h-full bg-stone-900 flex items-center justify-center text-stone-600">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
            )}
          </button>

          {/* Inline Energy Control Panel - FIXED POPUP BUG FOR DESKTOP */}
          {isEnergyExpanded && (
            <section className="absolute top-24 left-0 right-0 sm:right-auto sm:w-[400px] bg-[#1a1715] border border-orange-900/40 rounded-[2.5rem] p-8 space-y-8 animate-in slide-in-from-top-4 duration-500 handcrafted-shadow max-h-[85vh] overflow-hidden flex flex-col z-[200]">
              <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-8 pb-32">
                <div className="flex justify-between items-center px-1">
                  <div className="space-y-0.5">
                    <h4 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Studio Vitals</h4>
                    <p className="text-stone-600 text-[9px] font-bold">Tune into your creative world</p>
                  </div>
                  <button 
                    onClick={() => setIsEnergyExpanded(false)}
                    className="bg-stone-900/80 p-2.5 rounded-2xl border border-stone-800 text-stone-500 active:scale-90 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em]">Creative Energy</h4>
                    <span className={`text-orange-600 text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${selectedLevelState === 5 ? 'animate-pulse scale-110' : ''}`}>
                      {getEnergyDescriptor(selectedLevelState)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-stone-900/60 p-5 rounded-[2rem] border border-stone-800/40">
                      {[0, 1, 2, 3, 4, 5].map(lvl => {
                        const isLit = selectedLevelState >= lvl && lvl > 0;
                        const isCurrent = selectedLevelState === lvl;

                        return (
                          <button 
                            key={lvl} 
                            onClick={() => handleLevelSelect(lvl)}
                            className={`relative flex items-center justify-center transition-all duration-500 ${isCurrent ? 'scale-125' : 'opacity-40 hover:opacity-100'} ${lvl === 0 ? 'w-8 h-8' : 'w-10 h-10'}`}
                          >
                            <div className="relative">
                              {isCurrent && (
                                <div className={`absolute inset-0 blur-md rounded-full animate-pulse ${lvl === 0 ? 'bg-stone-500/10' : 'bg-orange-500/20'}`}></div>
                              )}
                              <svg 
                                className={`transition-all duration-500 ${lvl === 0 ? 'w-4 h-4' : 'w-6 h-6'} ${isLit || (lvl === 0 && isCurrent) ? (lvl === 0 ? 'text-stone-500 fill-stone-600' : 'text-orange-500 fill-orange-500') : 'text-stone-800 fill-stone-900'}`} 
                                viewBox="0 0 24 24" 
                                stroke="currentColor" 
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.99 7.99 0 0120 13a7.99 7.99 0 01-2.343 5.657z" />
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Current Vibe</label>
                  <textarea 
                    value={energyNote}
                    onChange={(e) => setEnergyNote(e.target.value)}
                    placeholder="How does the fire feel?"
                    className="w-full bg-stone-900/40 border border-stone-800/60 rounded-3xl px-6 py-4 text-stone-100 placeholder:text-stone-700 outline-none focus:border-orange-900/40 transition-all font-medium text-sm h-24 resize-none shadow-inner"
                  />
                </div>

                {/* RECENT HISTORY SECTION */}
                <div className="space-y-4 pt-4">
                  <label className="text-stone-600 text-[9px] font-black uppercase tracking-[0.3em] ml-1">Recent Shifts</label>
                  <div className="space-y-2">
                    {recentEnergyHistory.map((item) => (
                      <div key={item.id} className="bg-stone-900/30 border border-stone-800/40 rounded-2xl p-4 flex items-center justify-between group transition-colors hover:bg-stone-900/50">
                        <div className="flex items-center space-x-3">
                          <div className="flex -space-x-1.5">
                            {[1, 2, 3, 4, 5].map(l => (
                              <div key={l} className={`w-1.5 h-3 rounded-full ${l <= item.level ? 'bg-orange-600' : 'bg-stone-800 opacity-30'}`}></div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-[8px] text-stone-600 font-black uppercase tracking-widest">
                                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-[8px] text-stone-700 font-black tabular-nums">
                                {new Date(item.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-stone-100 text-[11px] font-bold italic pr-2">
                              {item.note || "No notes."}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-4 pt-10 bg-gradient-to-t from-[#1a1715] to-transparent z-[70] mt-auto">
                <button 
                    onClick={handleSaveEnergy}
                    className="w-full py-4 bg-stone-100 text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-[1.8rem] active:scale-95 transition-all shadow-xl"
                >
                    Save Check-In
                </button>
              </div>
            </section>
          )}
        </header>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-10 lg:items-start">
        {/* LEFT COLUMN: Commitments + Recent Sessions + Prime Thread */}
        <div className="lg:col-span-2 space-y-12">
          {renderCommitments()}
          {renderRecentSessions()}
          {renderPrimeThread()}
        </div>

        {/* RIGHT COLUMN: Calendar + Selected Date Commitments */}
        <div className="hidden lg:block lg:col-span-1 space-y-10 lg:mt-0">
          <div className="space-y-10">
             <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h2 className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em]">Commitments Calendar</h2>
                  <button 
                    onClick={() => onNewCommitmentClick?.(dashboardSelectedDate)}
                    className="text-stone-600 hover:text-orange-500 transition-colors active:scale-95 p-1"
                    title="Add Commitment"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <Calendar 
                    currentCalendarDate={currentCalendarDate} 
                    onMonthChange={changeMonth} 
                    selectedDate={dashboardSelectedDate} 
                    onDateSelect={setDashboardSelectedDate} 
                    groupedSchedule={groupedSchedule} 
                />
             </div>
             {renderSelectedDateCommitments()}
          </div>
        </div>
      </div>

      {/* Thick Separator */}
      <div className="py-8 flex items-center justify-center lg:py-12">
        <div className="w-12 h-px bg-stone-800/40"></div>
        <div className="w-2 h-2 rounded-full bg-stone-800/20 mx-4"></div>
        <div className="w-12 h-px bg-stone-800/40"></div>
      </div>

      {/* Block Recovery Lab - UNIQUE UI */}
      <section 
        ref={labRef}
        className={`space-y-4 p-6 lg:p-10 rounded-[3rem] border shadow-[0_0_50px_rgba(153,27,27,0.05)] relative transition-all duration-1000 ${isWarmGlow ? 'bg-gradient-to-br from-orange-900/40 to-[#0f0d0c] border-orange-600/30 lg:-translate-y-2' : 'bg-gradient-to-br from-[#1a1715] to-[#0f0d0c] border-rose-900/20'}`}
      >
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.2)_0%,transparent_70%)] transition-all duration-1000 pointer-events-none ${isWarmGlow ? 'opacity-100 scale-110' : 'opacity-0 scale-50'}`}></div>
        
        <div className="flex flex-col space-y-6 px-1 relative z-10 mb-12">
          <div className="flex justify-between items-center">
            <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-700 ${isWarmGlow ? 'text-orange-500' : 'text-rose-600'}`}>Block Recovery Lab</h2>
            <button onClick={() => setShowLabInfo(true)} className="text-stone-600 hover:text-orange-500 transition-colors active:scale-90"><HelpCircle className="w-4 h-4" /></button>
          </div>
          
          <div className="flex bg-stone-900/50 p-1 rounded-xl border border-stone-800/40 w-fit">
            <button 
              onClick={() => setActiveLabTab('protocols')}
              className={`px-6 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeLabTab === 'protocols' ? 'bg-orange-800 text-stone-100 shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}
            >
              Protocols
            </button>
            <button 
              onClick={() => setActiveLabTab('history')}
              className={`px-6 py-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeLabTab === 'history' ? 'bg-orange-800 text-stone-100 shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}
            >
              History
            </button>
          </div>
        </div>

        {/* 2-Column Layout for Lab Content on Desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-10 relative z-10">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center space-x-2 px-1">
              <div className="w-1 h-1 rounded-full bg-orange-600 animate-pulse"></div>
              <h3 className="text-[9px] text-stone-600 font-black uppercase tracking-widest">Try this ONE</h3>
            </div>
            {activeLabTab === 'protocols' && primeRecommendation ? (
              <div 
                onClick={() => setExpandedBlockId(expandedBlockId === primeRecommendation.strategy.id ? null : primeRecommendation.strategy.id)}
                className={`w-full bg-[#1a1715]/40 border border-orange-900/40 rounded-[2.5rem] p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden transition-all duration-500 text-left cursor-pointer active:scale-[0.99] ${expandedBlockId === primeRecommendation.strategy.id ? 'border-orange-900/60 ring-1 ring-orange-900/30' : ''}`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-[60px] rounded-full"></div>
                <div className="space-y-4 relative z-10">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-950/40 px-3 py-1 rounded-lg border border-orange-900/20">{primeRecommendation.reason}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateBlockStrategy?.(primeRecommendation.strategy.id, { is_favorite: !primeRecommendation.strategy.is_favorite });
                          }}
                          className={`transition-all duration-300 p-1.5 rounded-lg border ${primeRecommendation.strategy.is_favorite ? 'bg-orange-950/40 border-orange-900/40 text-orange-500 scale-110' : 'bg-stone-900/40 border-stone-800 text-stone-600 hover:text-stone-400'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${primeRecommendation.strategy.is_favorite ? 'fill-orange-500' : ''}`} />
                        </button>
                      </div>
                   </div>
                   <h3 className="text-stone-50 font-black text-2xl leading-tight tracking-tight">{primeRecommendation.strategy.name}</h3>
                   <p className="text-stone-400 text-xs leading-relaxed italic font-medium line-clamp-3">{primeRecommendation.strategy.description}</p>
                   <button 
                      onClick={(e) => { e.stopPropagation(); handleDeploy(primeRecommendation.strategy); }}
                      className="w-full py-4 bg-orange-800 text-stone-100 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl border border-orange-700 active:scale-95 transition-all"
                    >
                      Deploy Protocol
                    </button>
                </div>
              </div>
            ) : (
              <div className="bg-stone-900/20 border border-stone-800/40 rounded-[2.5rem] p-10 text-center italic text-stone-600 text-xs">
                Select protocols tab to see recommendations
              </div>
            )}
          </div>

          <div className="lg:col-span-12 space-y-6 mt-10 lg:mt-0">
            <div className="flex justify-between items-end px-1">
              <h3 className="text-[9px] text-stone-600 font-black uppercase tracking-widest">Protocol Library</h3>
              <button 
                onClick={() => setIsAddingStrategy(true)}
                className="text-emerald-600 text-[8px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors"
              >
                + New Protocol
              </button>
            </div>
            
            {activeLabTab === 'protocols' ? (
              <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar snap-x snap-mandatory px-1">
                {(Array.isArray(state.blockStrategies) ? state.blockStrategies : []).map((s, i) => (
                  <div 
                    key={s.id} 
                    className="flex-shrink-0 w-[280px] sm:w-[320px] bg-[#1a1715]/40 border border-stone-800/40 rounded-[2.5rem] p-7 flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden transition-all duration-300 snap-center group hover:border-orange-900/30"
                  >
                     <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center">
                           <div className="flex items-center space-x-2">
                             <span className="text-[8px] font-black text-stone-700 uppercase tracking-widest">{s.duration}m Protocol</span>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 onUpdateBlockStrategy?.(s.id, { is_favorite: !s.is_favorite });
                               }}
                               className={`transition-all duration-300 p-1 rounded-md ${s.is_favorite ? 'text-orange-500 scale-110' : 'text-stone-800 hover:text-stone-600 hover:scale-105'}`}
                             >
                               <Heart className={`w-3 h-3 ${s.is_favorite ? 'fill-orange-500' : ''}`} />
                             </button>
                           </div>
                           {s.is_custom && (
                             <div className="flex items-center space-x-2">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleEditStrategy(s); }}
                                 className="text-stone-800 hover:text-stone-400 transition-colors"
                               >
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                               </button>
                               {onRemoveBlockStrategy && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); onRemoveBlockStrategy(s.id); }}
                                   className="text-stone-900 hover:text-rose-900 transition-colors"
                                 >
                                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                 </button>
                               )}
                             </div>
                           )}
                        </div>
                        <h4 className="text-stone-100 font-bold text-sm tracking-tight group-hover:text-orange-400 transition-colors uppercase pr-4">{s.name}</h4>
                        <p className="text-stone-500 text-[10px] leading-relaxed italic font-medium line-clamp-2 min-h-[30px]">{s.description}</p>
                        <button 
                          onClick={() => handleDeploy(s)}
                          className="w-full py-4 bg-stone-900/50 text-stone-500 font-black uppercase text-[9px] tracking-[0.3em] rounded-2xl border border-stone-800 group-hover:bg-orange-800 group-hover:text-stone-100 group-hover:border-orange-700 transition-all active:scale-95 shadow-lg"
                        >
                          Deploy Protocol
                        </button>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8 max-h-[400px] overflow-y-auto no-scrollbar pr-2 font-medium">
                {/* Favorites Section */}
                <div className="space-y-3">
                  <h4 className="text-[9px] text-stone-600 font-black uppercase tracking-widest px-1">Favourite Protocols</h4>
                  <div className="flex flex-col gap-2">
                    {state.blockStrategies.filter(s => s.is_favorite).length > 0 ? (
                      (Array.isArray(state.blockStrategies) ? state.blockStrategies.filter(s => s.is_favorite) : []).map(s => (
                        <div key={s.id} className="bg-orange-900/10 border border-orange-900/20 p-4 rounded-2xl flex justify-between items-center group hover:border-orange-900/40 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-900/20 rounded-xl">
                              <Heart className="w-3 h-3 text-orange-500 fill-orange-500" />
                            </div>
                            <div>
                              <h4 className="text-stone-100 font-bold text-[11px] uppercase tracking-tight">{s.name}</h4>
                              <p className="text-[8px] text-stone-600 font-black uppercase">{s.duration}m duration</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeploy(s)}
                            className="px-4 py-2 bg-orange-800/10 text-orange-500 font-black uppercase text-[8px] tracking-widest rounded-xl border border-orange-800/20 hover:bg-orange-800 hover:text-stone-100 transition-all active:scale-95"
                          >
                            Deploy
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-stone-800 text-[9px] italic px-1">No favourites yet</p>
                    )}
                  </div>
                </div>

                {/* History Section */}
                <div className="space-y-3">
                  <h4 className="text-[9px] text-stone-600 font-black uppercase tracking-widest px-1">Recent Activity</h4>
                  <div className="space-y-2">
                    {(Array.isArray(state.protocolLogs) ? state.protocolLogs : []).slice(0, 10).map(log => (
                      <div key={log.id} className="bg-stone-900/40 border border-stone-800/40 p-4 rounded-2xl flex justify-between items-center">
                        <div>
                          <h4 className="text-stone-100 font-bold text-[11px]">{log.strategyName}</h4>
                          <span className="text-[8px] text-stone-600 font-black uppercase">{new Date(log.date).toLocaleDateString()}</span>
                        </div>
                        <span className="text-orange-600 text-[9px] font-black tabular-nums">{log.duration}m</span>
                      </div>
                    ))}
                    {state.protocolLogs.length === 0 && <p className="text-stone-800 text-[9px] italic px-1">No history yet</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

        {showLabInfo && (
          <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#1a1715] border border-rose-900/30 rounded-[3rem] p-8 max-w-sm w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="space-y-2">
                <h3 className="text-rose-500 text-xl font-black uppercase tracking-tighter">The Recovery Lab</h3>
                <p className="text-stone-400 text-sm leading-relaxed font-medium">
                  Creative blocks are often physiological. The Recovery Lab provides evidence-based protocols to reset your nervous system, break demand avoidance, and trigger diffuse-mode thinking.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-stone-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Bilateral Stimulation</span>
                </div>
                <div className="flex items-center space-x-3 text-stone-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Cognitive Offloading</span>
                </div>
                <div className="flex items-center space-x-3 text-stone-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Sensory Grounding</span>
                </div>
              </div>
              <button 
                onClick={() => setShowLabInfo(false)}
                className="w-full py-4 bg-stone-900 text-stone-100 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl border border-stone-800 active:scale-95 transition-all"
              >
                Return to Lab
              </button>
            </div>
          </div>
        )}

        {isAddingStrategy && (
          <div className="bg-[#1a1715] border border-orange-900/40 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4 duration-500 mx-1 shadow-2xl relative z-50">
             <div className="space-y-1">
               <h4 className="text-stone-100 text-xs font-black uppercase tracking-widest">{editingStrategyId ? 'Edit Protocol' : 'Define New Protocol'}</h4>
               <p className="text-stone-600 text-[9px] font-bold">What works for you when you're stuck?</p>
             </div>
             <div className="space-y-4">
                <div>
                   <label className={labelClasses}>Strategy Name</label>
                   <input 
                      autoFocus
                      value={strategyInput.name}
                      onChange={(e) => setStrategyInput({...strategyInput, name: e.target.value})}
                      placeholder="e.g. Listen to one album"
                      className={inputClasses}
                   />
                </div>
                <div>
                   <label className={labelClasses}>Recovery Description (Why it works)</label>
                   <textarea 
                      value={strategyInput.description}
                      onChange={(e) => setStrategyInput({...strategyInput, description: e.target.value})}
                      placeholder="e.g. Breaks the cycle of overthinking through auditory focus."
                      className={inputClasses + " h-24 resize-none"}
                   />
                </div>
                <div>
                   <label className={labelClasses}>Duration (minutes)</label>
                   <div className="flex items-center space-x-4">
                      <input 
                        type="range"
                        min="2"
                        max="60"
                        step="1"
                        value={strategyInput.duration}
                        onChange={(e) => setStrategyInput({...strategyInput, duration: parseInt(e.target.value)})}
                        className="flex-1 accent-orange-700 h-1.5 bg-stone-900 rounded-full"
                      />
                      <span className="text-orange-500 font-black text-xs w-8">{strategyInput.duration}m</span>
                   </div>
                </div>
             </div>
             <div className="flex space-x-3 pt-4">
                <button 
                  onClick={resetStrategyForm}
                  className="flex-1 py-4 bg-stone-900 text-stone-600 font-black uppercase text-[10px] rounded-2xl border border-stone-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleStrategySubmit}
                  disabled={!strategyInput.name.trim()}
                  className="flex-[2] py-4 bg-orange-800 text-white rounded-2xl font-black text-[10px] uppercase border border-orange-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {editingStrategyId ? 'Update Protocol' : 'Set Protocol'}
                </button>
             </div>
          </div>
        )}

      {/* Weekly Views Section - MOVED TO BOTTOM */}
      <section className="space-y-2 pt-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 flex flex-col items-center justify-center space-y-0.5">
              <span className="text-orange-500 text-lg font-black tabular-nums">
                {Math.floor(totalMinutesThisWeek / 60)}h {totalMinutesThisWeek % 60}m
              </span>
              <span className="text-stone-600 text-[7px] font-black uppercase tracking-widest text-center leading-tight">Studio Time</span>
          </div>
          <div className="p-2 flex flex-col items-center justify-center space-y-0.5">
              <span className="text-stone-200 text-lg font-black tabular-nums">{activeProjects.length}</span>
              <span className="text-stone-600 text-[7px] font-black uppercase tracking-widest text-center leading-tight">Active Projects</span>
          </div>
          <button 
            onClick={() => setShowCommitmentInfo(true)}
            aria-label="View Commitment Information"
            className="p-2 flex flex-col items-center justify-center space-y-0.5 active:scale-95 transition-transform"
          >
              <span className="text-stone-200 text-lg font-black tabular-nums">{upcomingCount}</span>
              <span className="text-stone-600 text-[7px] font-black uppercase tracking-widest text-center leading-tight">Commitments</span>
          </button>
        </div>

      </section>
    </div>
  );
};

export default Dashboard;