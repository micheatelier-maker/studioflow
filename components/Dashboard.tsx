import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AppState, Project, WorkshopLog, ScheduleItem, BlockStrategy } from '../types';
import BlockRemoverSession from './BlockRemoverSession';
import TicketDisplay from './TicketDisplay';
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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isWarmGlow, setIsWarmGlow] = useState(false);
  const [deployConfirmation, setDeployConfirmation] = useState<BlockStrategy | null>(null);
  const [showProtocolHistory, setShowProtocolHistory] = useState(false);

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
    <div className="space-y-6 pt-0 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000 no-scrollbar overflow-x-hidden relative">
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
        <header className="px-1 flex justify-between items-start">
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
               <TicketDisplay remaining={state.tickets.remaining} />
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
        </header>

        {/* Inline Energy Control Panel */}
        {isEnergyExpanded && (
          <section className="bg-[#1a1715] border border-orange-900/20 rounded-[2.5rem] p-8 space-y-8 animate-in slide-in-from-top-4 duration-500 handcrafted-shadow max-h-[85vh] overflow-hidden flex flex-col relative z-[60]">
            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-8 pb-32">
              <div className="flex justify-between items-center px-1">
                <div className="space-y-0.5">
                  <h4 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Studio Vitals</h4>
                  <p className="text-stone-600 text-[9px] font-bold">Tune into your creative world .. what are you feeling</p>
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
                  <span className={`text-orange-600 text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${selectedLevel === 5 ? 'animate-pulse scale-110' : ''}`}>
                    {getEnergyDescriptor(selectedLevel)}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-stone-900/60 p-5 rounded-[2rem] border border-stone-800/40">
                    {[0, 1, 2, 3, 4, 5].map(lvl => {
                      const isIncreasing = selectedLevel > previousLevel;
                      const delay = isIncreasing ? (lvl * 50) : ((5 - lvl) * 50);
                      const isLit = selectedLevel >= lvl && lvl > 0;
                      const isCurrent = selectedLevel === lvl;

                      return (
                        <button 
                          key={lvl} 
                          onClick={() => handleLevelSelect(lvl)}
                          className={`relative flex items-center justify-center transition-all duration-500 ${isCurrent ? 'scale-125' : 'opacity-40 hover:opacity-100'} ${lvl === 0 ? 'w-8 h-8' : 'w-10 h-10'}`}
                          style={{ transitionDelay: `${delay}ms` }}
                        >
                          <div className="relative">
                            {isCurrent && (
                              <div className={`absolute inset-0 blur-md rounded-full animate-pulse ${lvl === 0 ? 'bg-stone-500/10' : 'bg-orange-500/20'}`}></div>
                            )}
                            <svg 
                              className={`transition-all duration-500 ${lvl === 0 ? 'w-4 h-4' : 'w-6 h-6'} ${isLit || (lvl === 0 && isCurrent) ? (lvl === 0 ? 'text-stone-500 fill-stone-600' : 'text-orange-500 fill-orange-500') : 'text-stone-800 fill-stone-900'} ${isLit && selectedLevel === 5 ? 'animate-pulse' : ''}`} 
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

              <TicketDisplay remaining={state.tickets.remaining} variant="full" />
              
              {state.tickets.remaining === 0 && (
                <div className="bg-orange-950/20 border border-orange-900/30 p-6 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <h4 className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Out of Tickets</h4>
                  </div>
                  <p className="text-stone-400 text-xs font-medium italic">Upgrade to Pro to unlock unlimited studio ear time, or top up your tickets below.</p>
                  <button 
                    onClick={() => onAddTickets?.(5)}
                    className="w-full py-3 bg-orange-900/40 border border-orange-800/40 rounded-2xl text-orange-100 font-black uppercase text-[10px] tracking-widest hover:bg-orange-800 transition-all active:scale-95"
                  >
                    Buy 5 Tickets ($2.99)
                  </button>
                </div>
              )}

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
                        <div className="space-y-0.5">
                          <p className="text-stone-100 text-[11px] font-bold italic pr-2">
                            {item.note || "No notes provided."}
                          </p>
                          <span className="text-[8px] text-stone-600 font-black uppercase tracking-widest">
                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="text-stone-700 text-[9px] font-black uppercase">{getEnergyDescriptor(item.level)}</div>
                    </div>
                  ))}
                  {recentEnergyHistory.length === 0 && (
                    <p className="text-stone-700 text-[10px] italic ml-1">No recorded history yet.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 p-8 pt-10 bg-gradient-to-t from-[#0f0d0c] via-[#0f0d0c]/95 to-transparent z-[70]">
              <button 
                  onClick={handleSaveEnergy}
                  className="w-full py-5 bg-stone-100 text-black font-black uppercase text-xs tracking-[0.3em] rounded-[1.8rem] active:scale-95 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-stone-200/20 backdrop-blur-md"
              >
                  Save Check-In
              </button>
            </div>
          </section>
        )}

      </div>

      {/* Commitments */}
      <section className="space-y-6">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em]">Upcoming Commitments</h2>
          <button 
            onClick={onScheduleClick} 
            aria-label="View Full Commitment Ledger"
            className="text-stone-600 text-[9px] font-black uppercase tracking-widest hover:text-orange-500 transition-colors"
          >
            Full Ledger
          </button>
        </div>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar space-x-3 pb-4 px-1">
          {upcomingSchedule.map((item) => {
            const now = new Date();
            const commitmentDate = new Date(item.date);
            const diffTime = commitmentDate.getTime() - now.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            let bgClass = "bg-[#1a1715] border-stone-800/40";
            let textClass = "text-stone-100";
            let iconBgClass = "bg-stone-900 text-orange-500 border-stone-800";
            let subTextClass = "text-stone-600";
            let iconColorClass = "text-orange-500";
            let isUrgent = diffDays <= 1.5; // A bit more than 1 day to be safe with "tomorrow"
            
            if (diffDays <= 1.5) {
              // Urgent: Translucent orange background with bright orange outline
              bgClass = "bg-orange-900/20 border-orange-500 shadow-[0_10px_30px_rgba(234,88,12,0.15)]";
              textClass = "text-orange-50";
              iconBgClass = "bg-orange-500/20 text-orange-400 border-orange-500/20";
              subTextClass = "text-orange-400/70";
              iconColorClass = "text-orange-400";
            } else if (diffDays <= 3) {
              // Soon: Muted orange transparent gradient (previous urgent style)
              bgClass = "bg-gradient-to-br from-orange-900/30 to-[#0f0d0c] border-orange-500/50 shadow-[0_10px_30px_rgba(234,88,12,0.1)]";
              textClass = "text-orange-50";
              iconBgClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
              subTextClass = "text-orange-400/60";
              iconColorClass = "text-orange-400";
            } else if (diffDays <= 7) {
              // This week: Darker with subtle orange
              bgClass = "bg-stone-900/60 border-stone-800/40";
              textClass = "text-stone-300";
              iconBgClass = "bg-stone-800/40 text-orange-700 border-stone-800/40";
              subTextClass = "text-stone-600";
              iconColorClass = "text-orange-700";
            }

            return (
              <button 
                key={item.id} 
                onClick={() => onCommitmentClick(item)}
                className={`${bgClass} border p-3 rounded-[1.5rem] flex flex-col justify-between shadow-xl active:scale-[0.98] transition-all text-left group flex-shrink-0 w-[130px] aspect-square snap-center`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className={`${iconBgClass} p-1.5 rounded-lg transition-colors`}>
                      <div className={iconColorClass}>
                        {getScheduleTypeIcon(item.type)}
                      </div>
                    </div>
                    <svg className={`w-2.5 h-2.5 ${isUrgent ? 'text-orange-500/40' : 'text-stone-800'} group-hover:text-orange-400 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7-7" /></svg>
                  </div>
                  <div>
                    <h4 className={`${textClass} font-bold text-[10px] tracking-tight leading-tight mb-0.5 transition-colors line-clamp-2`}>{item.title}</h4>
                    <p className={`${subTextClass} text-[7px] font-black uppercase tracking-widest`}>
                      {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                {item.notes && (
                  <p className={`${subTextClass} text-[8px] italic line-clamp-2 leading-tight mt-1`}>
                    {item.notes}
                  </p>
                )}
              </button>
            );
          })}
          {upcomingSchedule.length === 0 && (
            <p className="text-stone-600 text-xs italic text-center py-6 w-full">No threads pending.</p>
          )}
        </div>
      </section>

      {/* Prime Thread Quick Actions */}
      {primeThread && (
        <section className="space-y-4">
           <div className="flex justify-between items-end px-1">
             <h2 className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em]">Prime Thread</h2>
             <span className="text-orange-600 text-[8px] font-black uppercase tracking-widest">Active Rotation</span>
           </div>
           <button 
             onClick={() => onNewLogFromProject(primeThread)}
             className="w-full bg-[#1a1715] border border-orange-900/20 rounded-[3rem] p-10 handcrafted-shadow relative overflow-hidden group active:scale-[0.99] transition-all text-left"
           >
             <div className="relative z-10 space-y-5">
               <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] bg-orange-950/20 px-4 py-1.5 rounded-full border border-orange-900/20">
                 {primeThread.category}
               </span>
               <h3 className="text-stone-50 font-black text-4xl leading-none tracking-tight">
                 {primeThread.name}
               </h3>
               <div className="flex items-center space-x-3 pt-3">
                 <div className="bg-orange-800 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                 </div>
                 <span className="text-stone-400 text-[11px] font-black uppercase tracking-widest">Start another session</span>
               </div>
             </div>
          </button>

          {/* Prime Thread Recent Ripple */}
          {primeThreadLog && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-end px-1">
                <h4 className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em]">Latest Ripple</h4>
                <span className="text-stone-700 text-[8px] font-black uppercase tracking-widest">
                  {new Date(primeThreadLog.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <button 
                onClick={() => setExpandedRippleId(expandedRippleId === primeThreadLog.id ? null : primeThreadLog.id)}
                className={`w-full bg-stone-900/30 border rounded-[2.2rem] p-6 transition-all duration-500 text-left flex flex-col group active:scale-[0.99] ${expandedRippleId === primeThreadLog.id ? 'border-orange-900/40 ring-1 ring-orange-900/20' : 'border-stone-800/20 hover:border-orange-900/30'}`}
              >
                <div className="space-y-1 w-full relative">
                  <div className="flex justify-between items-start">
                    <h4 className="text-stone-200 font-bold text-sm tracking-tight leading-tight group-hover:text-orange-400 transition-colors pr-4 line-clamp-1">
                      {primeThreadLog.summary || primeThreadLog.how_it_went || primeThreadLog.wins || "Studio Session"}
                    </h4>
                    <span className="text-[8px] text-stone-600 font-black tabular-nums flex-shrink-0">
                      {(() => {
                        const mins = primeThreadLog.actual_duration_minutes || primeThreadLog.duration_minutes || 0;
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return h > 0 ? `${h}h ${m}m` : `${m}m`;
                      })()}
                    </span>
                  </div>
                  
                  {expandedRippleId !== primeThreadLog.id && (
                    <div className="mt-3 flex items-start space-x-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="w-1 h-3 rounded-full bg-orange-600/60 mt-0.5 flex-shrink-0"></div>
                      <p className="text-stone-400 text-[10px] font-medium italic line-clamp-1 opacity-90 pr-2">
                        {primeThreadLog.wins || primeThreadLog.challenges || primeThreadLog.summary || "Deep flow state"}
                      </p>
                    </div>
                  )}
                </div>

                {expandedRippleId === primeThreadLog.id && (
                  <div className="mt-5 pt-5 border-t border-stone-800/40 space-y-4 animate-in slide-in-from-top-2 duration-300 w-full">
                    {primeThreadLog.how_it_went && (
                      <div>
                        <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest block mb-1">Summary</span>
                        <p className="text-stone-400 text-[11px] leading-relaxed italic">{primeThreadLog.how_it_went}</p>
                      </div>
                    )}
                    {primeThreadLog.wins && (
                      <div>
                        <span className="text-[8px] font-black uppercase text-orange-600 tracking-widest block mb-1">Highlights</span>
                        <p className="text-stone-200 text-[11px] leading-relaxed font-bold">{primeThreadLog.wins}</p>
                      </div>
                    )}
                    {primeThreadLog.challenges && (
                      <div>
                        <span className="text-[8px] font-black uppercase text-rose-600 tracking-widest block mb-1">Challenges</span>
                        <p className="text-stone-400 text-[11px] leading-relaxed">{primeThreadLog.challenges}</p>
                      </div>
                    )}
                  </div>
                )}
              </button>
              
              {/* Connection Line */}
              <div className="flex justify-center h-6 relative z-0">
                <div className="w-px h-full bg-orange-500/30"></div>
              </div>
            </div>
          )}

          {/* Dig Deeper Question */}
          {primeThreadLog && (
            <div className="pt-0 relative">
              <div className="bg-orange-950/10 border border-orange-900/20 rounded-[2.5rem] p-8 space-y-4 handcrafted-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 blur-3xl rounded-full"></div>
                <div className="space-y-1 relative z-10">
                  <span className="text-orange-600 text-[9px] font-black uppercase tracking-[0.4em]">Dig Deeper</span>
                  <h4 className="text-stone-100 font-bold text-base tracking-tight leading-tight">
                    {randomDeepDiveQuestion.question}
                  </h4>
                </div>
                <button 
                  onClick={() => onDeepDiveClick?.(primeThreadLog)}
                  className="flex items-center space-x-2 text-stone-500 hover:text-orange-500 transition-colors group/btn"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest">Capture Reflection</span>
                  <svg className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Thick Separator */}
      <div className="py-12 flex items-center justify-center">
        <div className="w-12 h-px bg-stone-800/40"></div>
        <div className="w-2 h-2 rounded-full bg-stone-800/20 mx-4"></div>
        <div className="w-12 h-px bg-stone-800/40"></div>
      </div>

      {/* Block Recovery Lab - UNIQUE UI */}
      <section 
        ref={labRef}
        className={`space-y-4 p-6 rounded-[3rem] border shadow-[0_0_50px_rgba(153,27,27,0.05)] relative transition-all duration-1000 ${isWarmGlow ? 'bg-gradient-to-br from-orange-900/40 to-[#0f0d0c] border-orange-600/30 translate-y-[-4px]' : 'bg-gradient-to-br from-[#1a1715] to-[#0f0d0c] border-rose-900/20'}`}
      >
        {/* Outward Glow Effect */}
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.2)_0%,transparent_70%)] transition-all duration-1000 pointer-events-none ${isWarmGlow ? 'opacity-100 scale-110' : 'opacity-0 scale-50'}`}></div>
        
        {isWarmGlow && (
          <div className="absolute inset-0 bg-orange-600/5 blur-[100px] rounded-[3rem] animate-pulse pointer-events-none"></div>
        )}
        <div className="flex justify-between items-end px-1 relative z-10">
          <div className="space-y-1">
            <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-700 ${isWarmGlow ? 'text-orange-500' : 'text-rose-600'}`}>Block Recovery Lab</h2>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowLabInfo(true)}
                className={`text-[8px] font-black uppercase tracking-widest animate-pulse transition-colors duration-700 ${isWarmGlow ? 'text-orange-400' : 'text-rose-500'}`}
              >
                Emergency Resets
              </button>
              <button 
                onClick={() => setShowProtocolHistory(true)}
                className="text-stone-600 text-[8px] font-black uppercase tracking-widest hover:text-stone-400 transition-colors"
              >
                History
              </button>
              <button 
                onClick={() => setIsAddingStrategy(true)}
                className="text-emerald-600 text-[8px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors"
              >
                + New Protocol
              </button>
            </div>
          </div>
        </div>

        {showProtocolHistory && (
          <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#1a1715] border border-stone-800/30 rounded-[3rem] p-8 max-w-sm w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-500 max-h-[80vh] flex flex-col">
              <div className="space-y-1">
                <h3 className="text-stone-100 text-xl font-black uppercase tracking-tighter">Protocol History</h3>
                <p className="text-stone-600 text-[10px] font-black uppercase tracking-widest">Your recovery journey</p>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
                {state.protocolLogs.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-stone-500 text-xs font-medium italic">No protocols deployed yet.</p>
                  </div>
                ) : (
                  state.protocolLogs.map(log => (
                    <div key={log.id} className="bg-stone-900/40 border border-stone-800/40 p-5 rounded-3xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-stone-600 text-[8px] font-black uppercase tracking-widest">{new Date(log.date).toLocaleDateString()}</span>
                          <h4 className="text-stone-100 font-bold text-sm">{log.strategyName}</h4>
                        </div>
                        <span className="text-orange-600 text-[9px] font-black uppercase tracking-widest">{log.duration}m</span>
                      </div>
                      {log.reflection && (
                        <div className="bg-stone-950/40 p-3 rounded-2xl border border-stone-800/20">
                          <div className="flex items-center space-x-2 mb-1">
                            {log.reflectionType === 'voice' ? (
                              <svg className="w-2.5 h-2.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3z" /></svg>
                            ) : (
                              <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            )}
                            <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest">Reflection</span>
                          </div>
                          <p className="text-stone-400 text-[11px] leading-relaxed italic">{log.reflection}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setShowProtocolHistory(false)}
                className="w-full py-4 bg-stone-900 text-stone-100 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl border border-stone-800 active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}

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

        {primeRecommendation && (
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center px-1">
               <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                  <span className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em]">Try this ONE</span>
               </div>
               <span className="text-[8px] font-black text-stone-700 uppercase tracking-widest">Rotates every 4h</span>
            </div>
            
            <div className="px-1">
              {(() => {
                const s = primeRecommendation.strategy;
                const isExpanded = expandedBlockId === s.id;
                return (
                  <div 
                    onClick={() => setExpandedBlockId(isExpanded ? null : s.id)}
                    className={`w-full bg-[#1a1715] border border-orange-900/40 rounded-[2.5rem] p-10 flex flex-col justify-between space-y-8 shadow-2xl relative overflow-hidden transition-all duration-500 text-left cursor-pointer active:scale-[0.99] ${isExpanded ? 'border-orange-900/60 ring-1 ring-orange-900/30' : ''} ${isWarmGlow ? 'hover:-translate-y-2' : ''}`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 blur-[60px] rounded-full"></div>
                    <div className="space-y-4 relative z-10">
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-950/40 px-3 py-1 rounded-lg border border-orange-900/20">{primeRecommendation.reason}</span>
                          <div className="flex items-center space-x-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                             <span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">Prime Directive</span>
                          </div>
                       </div>
                       <h3 className="text-stone-50 font-black text-3xl leading-tight tracking-tight">{s.name}</h3>
                       
                       {isExpanded && (
                         <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-700">
                            <p className="text-stone-400 text-sm leading-relaxed italic font-medium">{s.description}</p>
                            <div className="flex items-center space-x-3 bg-stone-900/60 w-fit px-4 py-2 rounded-full border border-stone-800/40">
                               <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               <span className="text-stone-300 text-[10px] font-black tracking-widest uppercase">{s.duration}m Focus</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeploy(s); }}
                              className="w-full py-5 bg-orange-800 text-stone-100 font-black uppercase text-xs tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-orange-950/60 border border-orange-700 active:scale-95 transition-all"
                            >
                              Deploy Protocol
                            </button>
                         </div>
                       )}
                    </div>
                    {!isExpanded && (
                       <div className="flex items-center justify-between relative z-10">
                         <div className="flex items-center space-x-2 text-stone-600">
                           <span className="text-[10px] font-black uppercase tracking-widest">Tap for Details</span>
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                         </div>
                         <div className="flex items-center space-x-2 bg-stone-900/60 px-3 py-1 rounded-full border border-stone-800/40">
                           <svg className="w-3 h-3 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           <span className="text-stone-400 text-[9px] font-black tabular-nums">{s.duration}m</span>
                         </div>
                       </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="h-px bg-stone-800/20 mx-6 mt-4"></div>
          </div>
        )}
        
        <div className="flex justify-between items-end px-1 mt-8">
          <div className="space-y-1">
            <h2 className="text-[10px] text-stone-600 font-black uppercase tracking-[0.3em]">Protocol Library</h2>
            <p className="text-stone-800 text-[8px] font-black uppercase tracking-widest">Full Catalog</p>
          </div>
          <button 
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all active:scale-95 ${favoritesOnly ? 'bg-orange-950/40 border-orange-700/40 text-orange-500' : 'bg-stone-900/40 border-stone-800/40 text-stone-600'}`}
          >
            <svg className={`w-3 h-3 ${favoritesOnly ? 'fill-orange-500' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">{favoritesOnly ? 'Favorites' : 'All'}</span>
          </button>
        </div>
        <div className="flex overflow-x-auto no-scrollbar space-x-4 pb-2 px-1">
          {state.blockStrategies
            .filter(s => !favoritesOnly || s.is_favorite)
            .map((s, i) => {
            const isExpanded = expandedBlockId === s.id;

            return (
              <div 
                key={s.id} 
                onClick={() => setExpandedBlockId(isExpanded ? null : s.id)}
                className={`flex-shrink-0 bg-[#1a1715] border border-stone-800/60 rounded-[2rem] p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden transition-all duration-300 text-left cursor-pointer active:scale-[0.98] ${isExpanded ? 'w-80 border-orange-900/40 ring-1 ring-orange-900/20' : 'w-64'} ${isWarmGlow ? 'hover:-translate-y-1' : ''}`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-900/5 blur-2xl rounded-full"></div>
                <div className="space-y-3 relative z-10">
                   <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-stone-700 uppercase tracking-widest">{s.is_custom ? 'Custom Protocol' : `Protocol ${i + 1}`}</span>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            onUpdateBlockStrategy?.(s.id, { is_favorite: !s.is_favorite }); 
                          }}
                          className={`p-1.5 rounded-lg border transition-all ${s.is_favorite ? 'bg-orange-950/40 border-orange-700/40 text-orange-500' : 'bg-stone-900/40 border-stone-800/40 text-stone-700 hover:text-stone-400'}`}
                        >
                          <svg className={`w-3 h-3 ${s.is_favorite ? 'fill-orange-500' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                          </svg>
                        </button>
                        {s.is_custom && !isExpanded && (
                          <div onClick={(e) => { e.stopPropagation(); handleEditStrategy(s); }} className="text-stone-700 hover:text-stone-300 transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </div>
                        )}
                        {s.is_custom && !isExpanded && onRemoveBlockStrategy && (
                          <div onClick={(e) => { e.stopPropagation(); onRemoveBlockStrategy(s.id); }} className="text-stone-800 hover:text-rose-900 transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </div>
                        )}
                      </div>
                   </div>
                   <p className="text-stone-100 font-bold text-sm leading-snug">{s.name}</p>
                   
                   {isExpanded && (
                     <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-500">
                        <p className="text-stone-400 text-[11px] leading-relaxed italic font-medium">
                          {s.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                           <div className="flex items-center space-x-2 bg-stone-900/40 w-fit px-3 py-1 rounded-full border border-stone-800/50">
                              <svg className="w-3 h-3 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <span className="text-stone-300 text-[9px] font-black tracking-widest">{s.duration}m Duration</span>
                           </div>
                           {s.energy_required && (
                             <div className="flex items-center space-x-2 bg-stone-900/40 w-fit px-3 py-1 rounded-full border border-stone-800/50">
                                <span className="text-stone-500 text-[8px] font-black uppercase tracking-widest">Energy</span>
                                <div className="flex space-x-0.5">
                                  {[1, 2, 3, 4, 5].map(lvl => (
                                    <div key={lvl} className={`w-1 h-2 rounded-full ${lvl <= (s.energy_required || 0) ? 'bg-orange-600' : 'bg-stone-800'}`}></div>
                                  ))}
                                </div>
                             </div>
                           )}
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeploy(s); }}
                            className="flex-1 py-4 bg-orange-800 text-stone-100 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl shadow-lg shadow-orange-950/40 border border-orange-700 active:scale-95 transition-all"
                          >
                            Deploy
                          </button>
                          {s.is_custom && (
                             <button 
                              onClick={(e) => { e.stopPropagation(); handleEditStrategy(s); }}
                              className="bg-stone-900 border border-stone-800 px-4 rounded-2xl text-stone-500 active:scale-95 transition-all"
                             >
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             </button>
                          )}
                        </div>
                     </div>
                   )}
                </div>
                
                {!isExpanded && (
                  <div className="flex items-center justify-between relative z-10 w-full">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.4)]"></div>
                      <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest">Expand</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {s.simplicity && (
                        <div className="flex items-center space-x-1">
                          <span className="text-[7px] font-black text-stone-700 uppercase tracking-widest">Simple</span>
                          <div className="flex space-x-0.5">
                            {[1, 2, 3].map(lvl => (
                              <div key={lvl} className={`w-0.5 h-1.5 rounded-full ${lvl <= (s.simplicity || 0) / 1.7 ? 'bg-emerald-600' : 'bg-stone-800'}`}></div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center space-x-1.5 bg-stone-900/60 px-2 py-0.5 rounded-lg border border-stone-800/40">
                        <svg className="w-2.5 h-2.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-stone-400 text-[8px] font-black tabular-nums">{s.duration}m</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
      </section>

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