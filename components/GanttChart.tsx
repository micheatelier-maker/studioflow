
import React, { useState } from 'react';
import { ProjectPhase } from '../types';

/**
 * Helper to generate tonal variations for phases based on base color and index.
 * Handles both Hex and HSL formats.
 */
export const getTonalVariation = (color: string, index: number, type: 'bg' | 'border' | 'text') => {
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

interface GanttChartProps {
  phases: ProjectPhase[];
  projectCreated: string;
  projectColor: string;
  onTogglePhase?: (id: string) => void;
  onUpdatePhase?: (id: string, updates: Partial<ProjectPhase>) => void;
  isLocked?: boolean;
  compact?: boolean;
}

const GanttChart: React.FC<GanttChartProps> = ({ 
  phases, 
  projectCreated, 
  projectColor, 
  onTogglePhase, 
  onUpdatePhase, 
  isLocked,
  compact = false
}) => {
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const phasesArray = Array.isArray(phases) ? phases : [];
  if (phasesArray.length === 0) return <p className="text-stone-600 text-[10px] italic ml-1">No phases established yet.</p>;

  const startTimes = phasesArray.map(p => p.startDate ? new Date(p.startDate).getTime() : null).filter(Boolean) as number[];
  const endTimes = phasesArray.map(p => p.endDate ? new Date(p.endDate).getTime() : null).filter(Boolean) as number[];

  const anchorTime = new Date(projectCreated).getTime();
  const minTime = startTimes.length > 0 ? Math.min(...startTimes) : anchorTime;
  const maxTime = endTimes.length > 0 ? Math.max(...endTimes) : Math.max(minTime + (1000 * 60 * 60 * 24 * 30), Date.now());
  
  const totalSpan = Math.max(maxTime - minTime, 1);

  const handleBarTap = (e: React.MouseEvent, phaseId: string) => {
    e.stopPropagation();
    setActivePhaseId(prev => prev === phaseId ? null : phaseId);
    setEditingPhaseId(null);
  };

  const handleStartEdit = (e: React.MouseEvent, phase: ProjectPhase) => {
    e.stopPropagation();
    if (isLocked || !onUpdatePhase) return;
    setEditingPhaseId(phase.id);
    setEditTitle(phase.title);
  };

  const handleSaveEdit = (e: React.FormEvent, phaseId: string) => {
    e.preventDefault();
    if (editTitle.trim() && onUpdatePhase) {
      onUpdatePhase(phaseId, { title: editTitle.trim() });
    }
    setEditingPhaseId(null);
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

  const formatDateInput = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-4 pt-2'}`} onClick={() => { setActivePhaseId(null); setEditingPhaseId(null); }}>
      <div className="relative w-full space-y-4">
        {phasesArray.map((phase, index) => {
          const phaseStart = phase.startDate ? new Date(phase.startDate).getTime() : minTime;
          const phaseEnd = phase.endDate ? new Date(phase.endDate).getTime() : (phase.startDate ? phaseStart + (1000 * 60 * 60 * 24 * 14) : maxTime);
          
          const left = ((phaseStart - minTime) / totalSpan) * 100;
          const width = ((phaseEnd - phaseStart) / totalSpan) * 100;

          const bg = getTonalVariation(projectColor, index, 'bg');
          const border = getTonalVariation(projectColor, index, 'border');
          const text = getTonalVariation(projectColor, index, 'text');
          const isBubbleOpen = activePhaseId === phase.id;
          const isEditing = editingPhaseId === phase.id;

          return (
            <div key={phase.id} className="relative flex items-center">
              <div className="flex-1 relative h-7">
                <div 
                  onClick={(e) => handleBarTap(e, phase.id)}
                  className={`absolute h-full rounded-lg border flex items-center px-3 transition-all duration-500 cursor-pointer active:scale-[0.98] ${phase.is_complete ? 'opacity-30 grayscale' : ''} ${isBubbleOpen || isEditing ? 'ring-2 ring-white/20' : ''}`}
                  style={{ 
                    left: `${Math.max(0, left)}%`, 
                    width: `${Math.max(12, width)}%`,
                    backgroundColor: bg,
                    borderColor: border
                  }}
                >
                  <span className={`text-[7px] font-black uppercase whitespace-nowrap ${phase.is_complete ? 'line-through' : ''}`} style={{ color: text }}>
                    {typeof phase.title === 'string' ? phase.title : 'Untitled Phase'}
                  </span>
                </div>

                {/* Information Bubble / Editor (Below Phase) */}
                {(isBubbleOpen || isEditing) && (
                  <div 
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-300"
                    style={{ 
                      left: `${Math.max(6, left + width / 2)}%`,
                      pointerEvents: isEditing ? 'auto' : 'none'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative bg-[#1a1715] border border-stone-800 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[180px]">
                      {/* Bubble Arrow */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1715] border-t border-l border-stone-800 rotate-45"></div>
                      
                      <div className="space-y-3 relative z-10 text-left">
                        <div className="flex justify-between items-center">
                          <span className="block text-[7px] font-black uppercase text-stone-600 tracking-widest">Phase Detail</span>
                          {!isEditing && !isLocked && onUpdatePhase && (
                            <button 
                              onClick={(e) => handleStartEdit(e, phase)}
                              className="text-orange-500 hover:text-orange-400 text-[8px] font-black uppercase pointer-events-auto"
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <form onSubmit={(e) => handleSaveEdit(e, phase.id)} className="space-y-3">
                            <input 
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-[10px] font-bold text-stone-100 outline-none focus:border-orange-900"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[6px] font-black uppercase text-stone-500 tracking-widest">Start</label>
                                <input 
                                  type="date"
                                  value={formatDateInput(phase.startDate)}
                                  onChange={(e) => onUpdatePhase?.(phase.id, { startDate: e.target.value })}
                                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-[8px] font-bold text-stone-300 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[6px] font-black uppercase text-stone-500 tracking-widest">End</label>
                                <input 
                                  type="date"
                                  value={formatDateInput(phase.endDate)}
                                  onChange={(e) => onUpdatePhase?.(phase.id, { endDate: e.target.value })}
                                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-[8px] font-bold text-stone-300 outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex space-x-2 pt-1">
                              <button type="button" onClick={() => setEditingPhaseId(null)} className="flex-1 py-1 bg-stone-900 text-stone-500 text-[8px] font-black uppercase rounded-lg border border-stone-800">Cancel</button>
                              <button type="submit" className="flex-1 py-1 bg-orange-800 text-stone-100 text-[8px] font-black uppercase rounded-lg border border-orange-700">Save</button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-stone-100 text-[10px] font-bold leading-tight">{typeof phase.title === 'string' ? phase.title : 'Untitled Phase'}</p>
                            <div className="flex flex-col space-y-0.5 pt-1">
                              <span className="text-[8px] text-stone-500 font-medium whitespace-nowrap">Start: {formatDate(phase.startDate)}</span>
                              <span className="text-[8px] text-stone-500 font-medium whitespace-nowrap">End: {formatDate(phase.endDate)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {onTogglePhase && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); onTogglePhase(phase.id); }}
                  disabled={isLocked}
                  className={`ml-4 w-6 h-6 rounded-md border flex items-center justify-center transition-all ${phase.is_complete ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-stone-800 bg-stone-900 text-transparent hover:border-stone-700'} ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
        <div className="pt-2 flex justify-between items-center text-[7px] font-black text-stone-800 uppercase tracking-widest border-t border-stone-800/30">
          <span>{formatDate(minTime)}</span>
          <div className="h-1 w-1 rounded-full bg-stone-800/50"></div>
          <span>{formatDate(maxTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
