
import React, { useState } from 'react';
import { Project, WorkshopLog, LogType } from '../types';

interface ProjectLedgerProps {
  project: Project;
  logs: WorkshopLog[];
  onClose: () => void;
}

const ProjectLedger: React.FC<ProjectLedgerProps> = ({ project, logs, onClose }) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  const projectLogs = [...logs]
    .filter(l => l.project_id === project.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTypeStyle = (type: LogType) => {
    switch(type) {
      case 'idea': return 'bg-amber-900/30 text-amber-300 border-amber-800/30';
      case 'problem': return 'bg-rose-950/40 text-rose-300 border-rose-900/30';
      case 'post': return 'bg-indigo-950/40 text-indigo-300 border-indigo-900/30';
      default: return 'bg-orange-950/40 text-orange-400 border-orange-900/30';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const handleDownloadAudio = (log: WorkshopLog) => {
    if (!log.audio_base64) return;
    const link = document.createElement('a');
    link.href = `data:audio/webm;base64,${log.audio_base64}`;
    link.download = `Studio_Log_${log.project_name}_${new Date(log.date).toISOString().split('T')[0]}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-[#0f0d0c] z-[220] flex flex-col animate-in slide-in-from-right duration-500">
      <header className="px-6 py-8 border-b border-stone-800/40 safe-area-top flex justify-between items-center bg-[#0f0d0c]/80 backdrop-blur-xl sticky top-0">
        <div className="flex flex-col">
          <span className="text-[10px] text-stone-600 font-black uppercase tracking-[0.2em] mb-1">Project Session Log</span>
          <h2 className="text-2xl font-black text-stone-100 tracking-tight">Session Ledger</h2>
        </div>
        <button 
          onClick={onClose}
          className="bg-stone-900 p-3 rounded-2xl border border-stone-800 text-stone-400 active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 pb-20 no-scrollbar">
        <div className="mb-8 px-2">
            <h3 className="text-stone-400 text-sm font-bold tracking-tight">{project.name} Project Arc</h3>
        </div>

        {projectLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-stone-900/50 rounded-full flex items-center justify-center border border-dashed border-stone-800">
              <svg className="w-8 h-8 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-stone-600 text-sm font-medium italic">The Session Ledger is currently silent.<br/>Start a flow session to record your progress.</p>
          </div>
        ) : (
          projectLogs.map((log, idx) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div 
                key={log.id} 
                className="relative pl-8 border-l border-stone-800/60 pb-10 last:pb-0"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`absolute -left-1.5 top-0 w-3 h-3 rounded-full transition-all duration-500 ${isExpanded ? 'bg-orange-500 scale-125 shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'bg-orange-600 shadow-[0_0_10px_rgba(194,65,12,0.4)]'}`}></div>
                
                <div 
                  onClick={() => toggleExpand(log.id)}
                  className={`bg-[#1a1715] rounded-[2rem] border transition-all duration-500 cursor-pointer shadow-xl ${isExpanded ? 'border-orange-900/40 ring-1 ring-orange-900/20' : 'border-stone-800/40'}`}
                >
                  <div className="p-6 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest border ${getTypeStyle(log.type)}`}>
                          {log.type}
                        </span>
                        <span className="text-stone-500 text-[10px] font-bold uppercase tabular-nums">
                          {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {(log.wins || log.how_it_went) && !isExpanded && (
                        <p className="text-stone-400 text-xs italic line-clamp-1 mt-1 pr-6 font-medium">"{log.wins || log.how_it_went}"</p>
                      )}
                    </div>
                    <svg 
                      className={`w-5 h-5 text-stone-700 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-orange-600' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className={`transition-all duration-500 ease-in-out overflow-hidden px-6 ${isExpanded ? 'max-h-[1600px] pb-8 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pt-4 border-t border-stone-800/40 space-y-8">
                      
                      {/* Audio Artifact Download */}
                      {log.audio_base64 && (
                        <div className="bg-stone-900/50 p-5 rounded-3xl border border-stone-800/60 flex items-center justify-between group/audio">
                           <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-orange-950/30 rounded-2xl flex items-center justify-center border border-orange-900/20">
                                 <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                              </div>
                              <div className="space-y-0.5">
                                 <h4 className="text-[10px] text-stone-500 font-black uppercase tracking-widest">Audio Artifact</h4>
                                 <p className="text-stone-300 text-xs font-bold">Original Voice Memo</p>
                              </div>
                           </div>
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleDownloadAudio(log); }}
                            className="bg-stone-800 p-3 rounded-2xl border border-stone-700 text-orange-500 hover:bg-orange-900/20 active:scale-95 transition-all shadow-lg"
                           >
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                           </button>
                        </div>
                      )}

                      {/* Simplified Notes Section */}
                      <div className="space-y-6">
                        <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-orange-900/20 pb-2">Simplified Notes</h3>
                        
                        {log.how_it_went && (
                          <div className="space-y-1.5">
                            <h4 className="text-[10px] text-stone-600 font-black uppercase tracking-widest">Flow Status</h4>
                            <p className="text-stone-300 text-sm leading-relaxed">{log.how_it_went}</p>
                          </div>
                        )}

                        {log.wins && (
                          <div className="space-y-1.5">
                            <h4 className="text-[10px] text-orange-600 font-black uppercase tracking-widest">Highlight</h4>
                            <p className="text-stone-100 text-sm leading-relaxed font-bold italic">"{log.wins}"</p>
                          </div>
                        )}

                        {log.challenges && (
                          <div className="space-y-1.5">
                            <h4 className="text-[10px] text-rose-600 font-black uppercase tracking-widest">Lowlight</h4>
                            <p className="text-stone-400 text-sm leading-relaxed italic">"{log.challenges}"</p>
                          </div>
                        )}

                        {log.general_thoughts && (
                          <div className="space-y-1.5">
                            <h4 className="text-[10px] text-indigo-400/70 font-black uppercase tracking-widest">Tangential Reflections</h4>
                            <p className="text-stone-400 text-sm leading-relaxed font-medium">{log.general_thoughts}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-stone-900/50 p-4 rounded-2xl border border-stone-800/40">
                             <span className="block text-[8px] text-stone-600 uppercase font-black mb-1">Session Duration</span>
                             <span className="text-xs font-bold text-stone-300 tabular-nums">
                               {(() => {
                                 const mins = log.actual_duration_minutes || log.duration_minutes || 0;
                                 const h = Math.floor(mins / 60);
                                 const m = mins % 60;
                                 return h > 0 ? `${h}h ${m}m` : `${m}m`;
                               })()}
                             </span>
                          </div>
                          {log.energy_level && (
                            <div className="bg-stone-900/50 p-4 rounded-2xl border border-stone-800/40">
                              <span className="block text-[8px] text-stone-600 uppercase font-black mb-1">Creative Battery</span>
                              <div className="flex space-x-1 mt-1">
                                {[1, 2, 3, 4, 5].map(lvl => (
                                  <div key={lvl} className={`h-1.5 flex-1 rounded-full ${lvl <= (log.energy_level || 0) ? 'bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.4)]' : 'bg-stone-800'}`}></div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {log.next_steps && (
                          <div className="bg-orange-950/10 border border-orange-900/20 p-5 rounded-2xl">
                            <h4 className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-1.5">Immediate Next Step</h4>
                            <p className="text-stone-200 text-sm font-bold">{log.next_steps}</p>
                          </div>
                        )}
                      </div>

                      {/* Manuscript Section (Full Transcript) */}
                      <div className="space-y-4 pt-4 border-t border-stone-800/40">
                         <h3 className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-stone-800/20 pb-2">Manuscript</h3>
                         {log.raw_transcript && log.raw_transcript !== '[Historical Log Entry]' ? (
                           <div className="bg-stone-900/30 p-5 rounded-3xl border border-stone-800/40">
                             <p className="text-stone-400 text-[13px] leading-relaxed italic">
                               "{log.raw_transcript}"
                             </p>
                           </div>
                         ) : (
                           <p className="text-stone-600 text-xs italic font-medium px-1">No full transcript recorded for this session.</p>
                         )}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-6 bg-stone-900/50 border-t border-stone-800/40 safe-area-bottom">
        <button 
          onClick={onClose}
          className="w-full py-4 bg-stone-100 text-[#0f0d0c] rounded-2xl font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all shadow-xl"
        >
          Return to Project
        </button>
      </div>
    </div>
  );
};

export default ProjectLedger;
