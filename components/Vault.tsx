
import React, { useState } from 'react';
import { Project, WorkshopLog } from '../types';

interface VaultProps {
  projects: Project[];
  logs: WorkshopLog[];
  onUnarchive: (id: string) => void;
  onDeleteForever: (id: string) => void;
  onClose: () => void;
}

const Vault: React.FC<VaultProps> = ({ projects, logs, onUnarchive, onDeleteForever, onClose }) => {
  const [expandedVaultId, setExpandedVaultId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

  const archivedProjects = projects.filter(p => p.is_archived);

  const downloadProjectArchive = (project: Project) => {
    const projectLogs = logs.filter(l => l.project_id === project.id);
    const archiveData = {
      exported_at: new Date().toISOString(),
      project_details: project,
      associated_logs: projectLogs
    };

    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '_')}_Studio_Archive.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteConfirm = (project: Project) => {
    if (deleteInput === project.name) {
      onDeleteForever(project.id);
      setDeleteConfirmId(null);
      setDeleteInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f0d0c] z-[200] flex flex-col pt-12 pb-8 px-8 safe-area-top safe-area-bottom h-screen overflow-hidden animate-in slide-in-from-right duration-500">
      <header className="flex justify-between items-center mb-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-stone-100 tracking-tight uppercase">The Vault</h2>
          <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Archived Seeds</p>
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

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-20">
        {archivedProjects.length > 0 ? (
          archivedProjects.map((project) => (
            <div 
              key={project.id}
              className={`bg-[#1a1715] border rounded-[2.5rem] transition-all duration-500 overflow-hidden handcrafted-shadow grayscale hover:grayscale-0 ${expandedVaultId === project.id ? 'border-orange-900/40 ring-1 ring-orange-900/20' : 'border-stone-800/50'}`}
            >
              <div className="relative">
                <button 
                  onClick={() => setExpandedVaultId(expandedVaultId === project.id ? null : project.id)}
                  className="w-full text-left p-8 active:opacity-90 transition-opacity"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-950/20 px-2.5 py-0.5 rounded-lg border border-orange-900/30">
                          {project.category}
                        </span>
                        <span className="text-[9px] text-stone-600 font-bold uppercase tracking-widest">
                          Archived {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-2xl font-black text-stone-100 tracking-tight leading-tight">
                        {project.name}
                      </h4>
                      {expandedVaultId !== project.id && (
                        <p className="text-stone-600 text-xs italic mt-2 line-clamp-1">{project.description}</p>
                      )}
                    </div>
                    <div className={`transition-transform duration-500 ${expandedVaultId === project.id ? 'rotate-180' : ''}`}>
                       <svg className="w-5 h-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </button>
                
              </div>

              {expandedVaultId === project.id && (
                <div className="px-8 pb-8 space-y-8 animate-in fade-in slide-in-from-top duration-500 border-t border-stone-800/40 pt-6">
                   <div className="space-y-2">
                      <h5 className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Original Intent</h5>
                      <p className="text-stone-300 text-sm leading-relaxed italic">"{project.description}"</p>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <h5 className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Kit Profile</h5>
                         <div className="flex flex-wrap gap-1.5">
                            {project.tools_and_materials.map((t, i) => (
                              <span key={i} className="bg-stone-900 border border-stone-800 text-stone-400 text-[8px] px-2 py-1 rounded-md font-bold uppercase">{t}</span>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-2">
                         <h5 className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Breakthroughs</h5>
                         <div className="space-y-1">
                            {project.milestones.slice(0, 2).map((m, i) => (
                              <p key={i} className="text-stone-400 text-[10px]">• {m}</p>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div className="flex flex-col space-y-3">
                     <button 
                      onClick={() => downloadProjectArchive(project)}
                      className="w-full py-4 bg-stone-100 text-[#0f0d0c] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                     >
                       Download Project Data
                     </button>
                     <button 
                      onClick={() => onUnarchive(project.id)}
                      className="w-full py-4 bg-orange-900/30 text-orange-400 rounded-2xl border border-orange-800/30 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-orange-800 hover:text-white transition-all active:scale-95"
                     >
                       Restore to Rotation
                     </button>
                     <button 
                      onClick={() => { setDeleteConfirmId(project.id); setDeleteInput(''); }}
                      className="w-full py-4 bg-rose-950/20 text-rose-500 rounded-2xl border border-rose-900/20 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-900 hover:text-white transition-all active:scale-95 flex items-center justify-center space-x-2"
                     >
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                       </svg>
                       <span>Delete Forever</span>
                     </button>
                   </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-stone-900/30 rounded-[2rem] border border-dashed border-stone-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <p className="text-stone-600 text-sm font-medium italic">The vault is currently empty.<br/>Archived projects will appear here.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[210] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#1a1715] border border-rose-900/30 rounded-[3rem] p-10 max-w-sm w-full space-y-8 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></div>
                <h3 className="text-rose-500 text-xl font-black uppercase tracking-tighter">Delete Forever?</h3>
              </div>
              <p className="text-stone-400 text-sm leading-relaxed font-medium">
                This action is irreversible. To confirm, type the name of the project: <span className="text-stone-100 font-black">"{archivedProjects.find(p => p.id === deleteConfirmId)?.name}"</span>
              </p>
              <input 
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Type project name..."
                className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 text-stone-100 outline-none focus:border-rose-900 transition-all font-bold"
              />
            </div>
            
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => {
                  const project = archivedProjects.find(p => p.id === deleteConfirmId);
                  if (project) handleDeleteConfirm(project);
                }}
                disabled={deleteInput !== archivedProjects.find(p => p.id === deleteConfirmId)?.name}
                className="w-full py-5 bg-rose-800 text-stone-100 font-black uppercase text-xs tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-rose-950/60 border border-rose-700 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
              >
                Delete Forever
              </button>
              <button 
                onClick={() => { setDeleteConfirmId(null); setDeleteInput(''); }}
                className="w-full py-4 bg-stone-900/50 text-stone-500 font-black uppercase text-[10px] tracking-[0.3em] rounded-[1.5rem] border border-stone-800/50 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vault;
