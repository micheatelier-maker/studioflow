import React, { useMemo, useState, useEffect, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { AppState, Project, WorkshopLog, ScheduleItem, BlockStrategy } from '../types';
import BlockRemoverSession from './BlockRemoverSession';
import { DEEP_DIVE_QUESTIONS } from './LogForm';

interface DashboardProps {
  state: AppState;
  onLogClick: () => void;
  onTextLogClick: () => void;
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
  onAddTickets
}) => {
  const [isEnergyExpanded, setIsEnergyExpanded] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(state.energyHistory[0]?.level || 3);
  const [previousLevel, setPreviousLevel] = useState(selectedLevel);
  const [energyNote, setEnergyNote] = useState('');
  const [showCommitmentInfo, setShowCommitmentInfo] = useState(false);
  
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
  const recentLogs = state.logs.filter(l => l.type === 'session').slice(0, 3); // Changed from 4 to 3
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
    onEnergyUpdate(selectedLevel, energyNote);
    setEnergyNote('');
    setIsEnergyExpanded(false);
  };

  const handleLevelSelect = (lvl: number) => {
    setPreviousLevel(selectedLevel);
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

  return (
    <div className="space-y-8 lg:space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000 no-scrollbar overflow-x-hidden relative">
      {/* Global Warm Glow Background Overlay */}
      <div className={`fixed inset-0 bg-rose-950/20 transition-opacity duration-1000 pointer-events-none z-0 ${isWarmGlow ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* Deploy Confirmation Modal */}
      {deployConfirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-md" onClick={() => setDeployConfirmation(null)}></div>
          <div className="bg-[#1a1715] border border-orange-900/30 rounded-[3rem] p-10 max-w-sm w-full space-y-8 shadow-2xl relative animate-in zoom-in-95 duration-500">
            <div className="space-y-3 text-center">
              <h3 className="text-orange-500 text-2xl font-black uppercase tracking-tighter italic">Confirm Deployment</h3>
              <p className="text-stone-400 text-sm font-medium leading-relaxed italic">
                Are you ready to commit to the <span className="text-stone-100 font-bold">"{deployConfirmation.name}"</span> protocol?
              </p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setDeployConfirmation(null)}
                className="flex-1 py-4 bg-stone-900 text-stone-500 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl border border-stone-800 active:scale-95 transition-all"
              >
                Hold
              </button>
              <button 
                onClick={confirmDeploy}
                className="flex-[2] py-4 bg-orange-700 text-stone-100 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-xl shadow-orange-950/40 border border-orange-600 active:scale-95 transition-all"
              >
                Go Live
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
          onComplete={(reflection, reflectionType) => {
            if (onAddProtocolLog) {
              onAddProtocolLog({
                id: Date.now().toString(),
                date: new Date().toISOString(),
                strategyName: activeSession.name,
                duration: activeSession.duration,
                reflection,
                reflectionType
              });
            }
            setActiveSession(null);
          }}
        />
      )}

      <div className="space-y-8">
        {/* Command Center Header */}
        <header className="flex justify-between items-center lg:bg-[#14110f]/40 lg:backdrop-blur-md px-1 lg:p-8 lg:rounded-[2rem] lg:border lg:border-stone-800/30 lg:shadow-2xl relative z-10 pt-6 lg:pt-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-stone-600 text-[10px] font-black uppercase tracking-[0.4em] ml-1">Command Center</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse lg:block hidden"></div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-stone-50">
              {state.artistProfile.stageName}<span className="text-orange-600">.</span>
            </h1>
            <div className="flex items-center space-x-3 pt-2 lg:pt-3">
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 hidden sm:inline-block">Vitals</span>
                  <svg className={`w-3 h-3 text-stone-600 transition-transform duration-500 ${isEnergyExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
               </button>
            </div>
          </div>
          <button 
            onClick={onProfileClick}
            aria-label="View Artist Profile"
            className="w-14 h-14 lg:w-20 lg:h-20 rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden border-2 border-stone-800/50 shadow-2xl relative active:scale-95 transition-transform group"
          >
            {state.artistProfile.profileImage ? (
              <img src={state.artistProfile.profileImage} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-stone-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-stone-600 group-hover:text-stone-500 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
            )}
            <div className="absolute inset-0 ring-2 ring-inset ring-stone-900 group-hover:ring-orange-500/30 transition-all pointer-events-none rounded-[2rem] lg:rounded-[2.5rem]"></div>
          </button>
        </header>

        {/* Inline Energy Control Panel */}
        {isEnergyExpanded && (
          <section className="bg-[#1a1715] border border-orange-900/20 rounded-[2.5rem] p-8 space-y-8 animate-in slide-in-from-top-4 duration-500 handcrafted-shadow max-h-[85vh] overflow-hidden flex flex-col relative z-[60]">
            {/* ... (energy content same) ... */}
          </section>
        )}
      </div>

      {/* Grid Content Layout for Desktop */}
      <div className={`flex flex-col lg:grid gap-12 lg:gap-10 ${
        activeProjects.length > 0 
          ? 'lg:grid-cols-2 xl:grid-cols-3' 
          : 'lg:grid-cols-2'
      }`}>
        
        {/* Commitments Column */}
        <section className="space-y-6 flex flex-col h-full">
          <div className="flex items-end justify-between px-1">
            <div className="flex items-center space-x-3">
              <div className="w-1.5 h-6 bg-orange-600 rounded-full"></div>
              <h2 className="text-[10px] text-stone-100 font-black uppercase tracking-[0.3em]">Upcoming Commitments</h2>
            </div>
            <button 
              onClick={onScheduleClick} 
              className="text-stone-600 text-[9px] font-black uppercase tracking-widest hover:text-orange-500 transition-colors"
            >
              Full Ledger
            </button>
          </div>
          
          <div className="lg:bg-[#14110f]/30 lg:border lg:border-stone-800/30 lg:rounded-[2.5rem] lg:p-4 flex-1">
            <div className="flex flex-row lg:flex-col space-x-4 lg:space-x-0 lg:space-y-3 overflow-x-auto lg:overflow-x-visible no-scrollbar pb-4 lg:pb-0 px-1 lg:px-0">
              {upcomingSchedule.map((item) => {
                const now = new Date();
                const commitmentDate = new Date(item.date);
                const diffTime = commitmentDate.getTime() - now.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                let bgClass = "bg-[#1a1715] border-stone-800/40";
                let textClass = "text-stone-100";
                let isUrgent = diffDays <= 1.5;
                
                if (isUrgent) {
                  bgClass = "bg-orange-900/20 border-orange-500 shadow-[0_10px_30px_rgba(234,88,12,0.15)]";
                  textClass = "text-orange-50";
                }

                return (
                  <button 
                    key={item.id} 
                    onClick={() => onCommitmentClick(item)}
                    className={`${bgClass} flex-shrink-0 w-64 lg:w-full border p-4 rounded-3xl flex items-center space-x-4 shadow-xl active:scale-[0.98] transition-all text-left group`}
                  >
                    <div className="bg-stone-900/60 p-2.5 rounded-xl text-orange-500 border border-stone-800">
                      {getScheduleTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`${textClass} font-bold text-xs tracking-tight line-clamp-1`}>{item.title}</h4>
                      <p className="text-stone-600 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-stone-800 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                );
              })}
              {upcomingSchedule.length === 0 && (
                <div className="py-20 text-center space-y-3 opacity-40 w-full">
                   <div className="w-10 h-10 border border-stone-800 rounded-xl flex items-center justify-center mx-auto"><CalendarIcon className="w-4 h-4" /></div>
                   <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">No threads pending</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Prime Thread Column */}
        {primeThread && (
          <section className="space-y-6 flex flex-col h-full">
             <div className="flex justify-between items-end px-1">
               <div className="flex items-center space-x-3">
                 <div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                 <h2 className="text-[10px] text-stone-100 font-black uppercase tracking-[0.3em]">Prime Thread</h2>
               </div>
               <span className="text-orange-600 text-[8px] font-black uppercase tracking-widest animate-pulse">Live</span>
             </div>
             
             <div className="space-y-6 flex-1">
                <button 
                  onClick={() => onNewLogFromProject(primeThread)}
                  className="w-full bg-[#1a1715] border border-orange-900/20 rounded-[3rem] p-8 lg:p-10 handcrafted-shadow relative overflow-hidden group active:scale-[0.99] transition-all text-left"
                >
                  <div className="relative z-10 space-y-4">
                    <span className="text-orange-500 text-[9px] font-black uppercase tracking-[0.2em] bg-orange-950/20 px-4 py-1.5 rounded-full border border-orange-900/20">
                      {primeThread.category}
                    </span>
                    <h3 className="text-stone-50 font-black text-2xl lg:text-3xl leading-none tracking-tight">
                      {primeThread.name}
                    </h3>
                    <div className="flex items-center space-x-3 pt-2">
                       <div className="bg-orange-800 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                       </div>
                       <span className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Add Log</span>
                    </div>
                  </div>
                </button>

                {/* Prime Thread Recent Ripple */}
                {primeThreadLog && (
                  <div className="bg-stone-900/20 border border-stone-800/30 rounded-[2.5rem] p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-stone-800/50 pb-3">
                      <h4 className="text-[9px] text-stone-500 font-black uppercase tracking-[0.3em]">Latest Ripple</h4>
                      <span className="text-stone-600 text-[8px] font-black tabular-nums">
                        {new Date(primeThreadLog.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                       <h4 className="text-stone-200 font-bold text-xs tracking-tight leading-tight">
                         {primeThreadLog.summary || primeThreadLog.how_it_went || "Studio Session"}
                       </h4>
                       <p className="text-stone-500 text-[10px] leading-relaxed italic line-clamp-3">
                         {primeThreadLog.wins || primeThreadLog.challenges || "Deep flow state captured."}
                       </p>
                    </div>

                    <button 
                      onClick={() => onDeepDiveClick?.(primeThreadLog)}
                      className="w-full flex items-center justify-between p-3 bg-stone-900/60 rounded-2xl border border-stone-800/50 hover:border-orange-500/30 transition-all group"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 group-hover:text-orange-500 transition-colors">Dig Deeper</span>
                      <svg className="w-3 h-3 text-stone-700 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
             </div>
          </section>
        )}

        {/* Block Recovery Lab Column */}
        <section 
          ref={labRef}
          className={`space-y-6 flex flex-col h-full lg:p-8 lg:rounded-[3rem] lg:border lg:shadow-[0_0_50px_rgba(153,27,27,0.05)] relative transition-all duration-1000 ${isWarmGlow ? 'lg:bg-gradient-to-br lg:from-orange-900/40 lg:to-[#0f0d0c] lg:border-orange-600/30 lg:translate-y-[-4px]' : 'lg:bg-[#14110f]/30 lg:border-stone-800/30'}`}
        >
          <div className="flex justify-between items-center relative z-10 px-1">
            <div className="flex items-center space-x-3">
              <div className={`w-1.5 h-6 rounded-full transition-colors duration-700 ${isWarmGlow ? 'bg-orange-500' : 'bg-rose-600'}`}></div>
              <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-700 ${isWarmGlow ? 'text-orange-500' : 'text-stone-100'}`}>Recovery Lab</h2>
            </div>
            <button 
              onClick={() => setShowLabInfo(true)}
              className="text-stone-600 hover:text-orange-500 transition-colors active:scale-90"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex bg-stone-900/50 p-1 rounded-xl border border-stone-800/40">
              <button 
                onClick={() => setActiveLabTab('protocols')}
                className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeLabTab === 'protocols' ? 'bg-orange-800 text-stone-100 shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}
              >
                Protocols
              </button>
              <button 
                onClick={() => setActiveLabTab('history')}
                className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeLabTab === 'history' ? 'bg-orange-800 text-stone-100 shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}
              >
                History
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 pt-2">
            {activeLabTab === 'protocols' ? (
              <div className="grid grid-cols-1 gap-3">
                {state.blockStrategies.filter(s => !favoritesOnly || s.is_favorite).slice(0, 4).map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleDeploy(s)}
                    className="group bg-stone-900/40 border border-stone-800/40 p-4 rounded-3xl text-left hover:border-orange-500/30 transition-all active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-stone-200 font-bold text-xs tracking-tight group-hover:text-orange-400 transition-colors">{s.name}</h4>
                      <span className="text-[8px] font-black text-stone-600 tabular-nums">{s.duration}m</span>
                    </div>
                    <p className="text-stone-500 text-[10px] leading-tight line-clamp-1 italic">{s.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {state.protocolLogs.slice(0, 4).map(log => (
                  <div key={log.id} className="bg-stone-900/40 border border-stone-800/40 p-4 rounded-3xl flex justify-between items-center">
                    <div className="min-w-0">
                      <h4 className="text-stone-200 font-bold text-xs truncate">{log.strategyName}</h4>
                      <p className="text-stone-600 text-[8px] font-black uppercase tracking-widest">{new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div className="bg-orange-950/20 px-2 py-1 rounded-lg border border-orange-900/20 text-orange-600 text-[8px] font-black uppercase tracking-widest">{log.duration}m</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setActiveLabTab(activeLabTab === 'protocols' ? 'history' : 'protocols')}
            className="w-full py-4 bg-stone-900/50 text-stone-500 font-black uppercase text-[9px] tracking-[0.2em] rounded-2xl border border-stone-800/40 active:scale-95 transition-all relative z-10"
          >
            {activeLabTab === 'protocols' ? 'View Full Lab' : 'View Protocols'}
          </button>
        </section>

        {/* Energy and Outward Glow Effect for Recovery Lab */}
        <div className="relative">
          {/* Outward Glow Effect */}
          <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.2)_0%,transparent_70%)] transition-all duration-1000 pointer-events-none ${isWarmGlow ? 'opacity-100 scale-110' : 'opacity-0 scale-50'}`}></div>
          
          {isWarmGlow && (
            <div className="absolute inset-0 bg-orange-600/5 blur-[100px] rounded-[3rem] animate-pulse pointer-events-none"></div>
          )}
        </div>
      </div>

      {/* Global Modals & Overlays */}
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
        <div className="fixed inset-0 bg-[#0f0d0c]/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#1a1715] border border-orange-900/40 rounded-[2.5rem] p-8 space-y-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-500">
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
        </div>
      )}

      {showCommitmentInfo && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowCommitmentInfo(false)}>
          <div className="bg-[#1a1715] border border-orange-900/30 rounded-[3rem] p-10 max-w-sm w-full space-y-8 shadow-2xl animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
             <div className="space-y-3">
               <h3 className="text-orange-500 text-2xl font-black uppercase tracking-tighter italic">Commitment Ledger</h3>
               <p className="text-stone-400 text-sm font-medium leading-relaxed italic">
                 Your active creative threads and upcoming deadlines. Stay accountable to your process.
               </p>
             </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-2xl border border-stone-800">
                   <span className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Next 7 Days</span>
                   <span className="text-orange-500 font-black text-xl">{upcomingCount}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-2xl border border-stone-800">
                   <span className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Active Projects</span>
                   <span className="text-stone-100 font-black text-xl">{activeProjects.length}</span>
                </div>
             </div>
             <button 
               onClick={() => setShowCommitmentInfo(false)}
               className="w-full py-4 bg-stone-900 text-stone-100 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl border border-stone-800 active:scale-95 transition-all"
             >
               Dismiss
             </button>
          </div>
        </div>
      )}

      {/* Weekly Stats & AI Tokens View */}
      <section className="space-y-8 pt-8 lg:border-t lg:border-stone-800/30 px-1 lg:px-0">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
          <div className="bg-stone-900/20 border border-stone-800/20 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-2">
            <span className="text-orange-500 text-3xl font-black tabular-nums">
              {Math.floor(totalMinutesThisWeek / 60)}<span className="text-lg">h</span> {totalMinutesThisWeek % 60}<span className="text-lg">m</span>
            </span>
            <span className="text-stone-600 text-[9px] font-black uppercase tracking-[0.2em] text-center leading-tight">Studio Time (7d)</span>
          </div>
          
          <div className="bg-stone-900/20 border border-stone-800/20 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-2">
            <span className="text-stone-200 text-3xl font-black tabular-nums">{activeProjects.length}</span>
            <span className="text-stone-600 text-[9px] font-black uppercase tracking-[0.2em] text-center leading-tight">Active Threads</span>
          </div>

          <div className="bg-[#1a1715] border border-orange-900/20 rounded-[2rem] p-6 flex flex-col items-center justify-center space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 blur-[40px] rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="flex items-center space-x-3 relative z-10">
              <span className="text-orange-500 text-3xl font-black tabular-nums">{state.tickets.totalUsed}</span>
              <div className="w-1.5 h-6 bg-orange-600/30 rounded-full"></div>
              <div className="text-left">
                <span className="text-stone-600 text-[9px] font-black uppercase tracking-widest block">AI Capacity</span>
                <span className="text-stone-100 text-[10px] font-bold">Tokens Flowing</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default Dashboard;
