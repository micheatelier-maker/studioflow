import React, { useState, useRef } from 'react';
import { motion, Reorder } from 'motion/react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SessionLogger from './components/SessionLogger';
import LogForm from './components/LogForm';
import ProjectCard from './components/ProjectCard';
import ArtistProfile from './components/ArtistProfile';
import ProjectCreateForm from './components/ProjectCreateForm';
import FlowSession from './components/FlowSession';
import ProjectLedger from './components/ProjectLedger';
import Vault from './components/Vault';
import SchedulePage from './components/SchedulePage';
import PasswordGate from './components/PasswordGate';
import { useStore } from './store/useStore';
import { WorkshopLog, LogType, Project, ProjectStatus, ScheduleItem, ProjectPhase } from './types';

const App: React.FC = () => {
  const { state, addLog, updateLog, addProject, updateProject, updateProjectPhases, archiveProject, unarchiveProject, deleteProject, updateProfile, addScheduleItem, updateScheduleItem, removeScheduleItem, toggleReminder, addEnergyCheckIn, addBlockStrategy, updateBlockStrategy, removeBlockStrategy, addProtocolLog, reorderProjects, consumeTickets, addTickets } = useStore();
  const [activeTab, setActiveTab] = useState<'home' | 'projects' | 'commitments' | 'flow' | 'artist'>('home');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedLedgerProject, setSelectedLedgerProject] = useState<Project | null>(null);
  const [activeLogType, setActiveLogType] = useState<LogType | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<WorkshopLog> | null>(null);
  const [isDeepDiveMode, setIsDeepDiveMode] = useState(false);
  const [preSelectedProject, setPreSelectedProject] = useState<Project | null>(null);
  const [isFlowRunning, setIsFlowRunning] = useState(false);
  const [isFreshLog, setIsFreshLog] = useState(false);
  const [focusedScheduleDate, setFocusedScheduleDate] = useState<string | null>(null);
  const [focusedScheduleItemId, setFocusedScheduleItemId] = useState<string | null>(null);
  const [activeProjectInView, setActiveProjectInView] = useState<string | null>(null);

  const schedulePageRef = useRef<{ openAddForm: () => void } | null>(null);

  const activeProjects = state.projects.filter(p => !p.is_archived);
  
  if (activeTab === 'projects' && !activeProjectInView && activeProjects.length > 0) {
    setActiveProjectInView(activeProjects[0].id);
  }

  const handleLogComplete = (data: Partial<WorkshopLog>) => {
    setIsFreshLog(true);
    setExtractedData(data);
    setActiveLogType(null);
  };

  const handleManualEntry = (type: LogType, projectId?: string) => {
    setIsFreshLog(false);
    setExtractedData({ type, date: new Date().toISOString().split('T')[0], project_id: projectId === 'new' ? '' : projectId || '', raw_transcript: '[Manual Entry]' });
    setActiveLogType(null);
  };

  const handleSaveLog = (fullLog: Omit<WorkshopLog, 'id'>) => {
    if (isDeepDiveMode && extractedData?.id) {
      updateLog(extractedData.id, fullLog);
    } else {
      addLog(fullLog as any);
    }
    setExtractedData(null);
    setIsDeepDiveMode(false);
    setIsFlowRunning(false); // Ensure flow is stopped when log is saved
    setActiveTab('home');
  };

  const handleDeepDiveClick = (log: WorkshopLog) => {
    setIsFreshLog(false);
    setIsDeepDiveMode(true);
    setExtractedData(log);
  };

  const handleNewLogFromProject = (project: Project) => {
    setPreSelectedProject(project);
    setShowTypePicker(true);
  };

  const handleCommitmentClick = (item: ScheduleItem) => {
    setFocusedScheduleDate(item.date.split('T')[0]);
    setFocusedScheduleItemId(item.id);
    setActiveTab('commitments');
  };

  const latestEnergyLevel = state.energyHistory[0]?.level;

  const currentActiveProject = activeProjects.find(p => p.id === activeProjectInView);

  return (
    <PasswordGate>
      <div className="bg-[#0f0d0c] min-h-screen text-stone-100 selection:bg-orange-900/40">
        <Layout 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogClick={() => setShowTypePicker(true)}
          hideNav={isFlowRunning}
        >
          {activeTab === 'home' && (
            <Dashboard 
              state={state} 
              onLogClick={() => setShowTypePicker(true)} 
              onTextLogClick={() => handleManualEntry('session')}
              onNewProjectClick={() => setShowProjectForm(true)}
              onNewLogFromProject={handleNewLogFromProject}
              onScheduleClick={() => { setFocusedScheduleDate(null); setActiveTab('commitments'); }}
              onCommitmentClick={handleCommitmentClick}
              onProfileClick={() => setActiveTab('artist')}
              onEnergyUpdate={addEnergyCheckIn}
              onAddBlockStrategy={addBlockStrategy}
              onUpdateBlockStrategy={updateBlockStrategy}
              onRemoveBlockStrategy={removeBlockStrategy}
              onAddProtocolLog={addProtocolLog}
              onDeepDiveClick={handleDeepDiveClick}
              onAddTickets={addTickets}
            />
          )}
          
          {activeTab === 'projects' && (
            <div className="pt-10 space-y-8 animate-in slide-in-from-right duration-500">
               <div className="flex justify-between items-end px-1">
                <div>
                  <h1 className="text-4xl font-black tracking-tighter">Projects</h1>
                  <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 ml-1 opacity-60">Archive rotation</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setShowVault(true)} className="bg-stone-900 w-12 h-12 rounded-2xl flex items-center justify-center border border-stone-800 shadow-lg active:scale-90 transition-transform">
                    <svg className="w-6 h-6 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                  <button onClick={() => setShowProjectForm(true)} className="bg-stone-900 w-12 h-12 rounded-2xl flex items-center justify-center border border-stone-800 shadow-lg active:scale-90 transition-transform">
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>

              <div className="relative mt-8">
                 <Reorder.Group 
                   axis="x" 
                   values={activeProjects} 
                   onReorder={reorderProjects}
                   className="flex overflow-x-auto no-scrollbar space-x-2 px-1 pb-1"
                 >
                   {activeProjects.map((project) => (
                     <Reorder.Item 
                       key={project.id}
                       value={project}
                       className="relative"
                     >
                       <button 
                         onClick={() => setActiveProjectInView(project.id)}
                         className={`relative px-6 py-4 rounded-t-[1.8rem] border-t border-l border-r transition-all duration-300 min-w-[120px] max-w-[160px] truncate font-black text-[10px] uppercase tracking-widest ${activeProjectInView === project.id ? 'bg-[#1a1715] border-stone-800/60 text-stone-100 z-10 -mb-[1px]' : 'bg-stone-900/30 border-stone-800/30 text-stone-600 hover:bg-stone-900/60'}`}
                       >
                         <span className="relative z-10">{project.name}</span>
                         {activeProjectInView === project.id && (
                           <motion.div 
                             layoutId="activeTabUnderline"
                             className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full z-20"
                             style={{ backgroundColor: project.color }}
                           />
                         )}
                       </button>
                     </Reorder.Item>
                   ))}
                 </Reorder.Group>

                 <div className="relative z-0">
                    {activeProjects.map(project => (
                      activeProjectInView === project.id && (
                        editingProject?.id === project.id ? (
                          <ProjectCreateForm 
                            key={project.id}
                            title="Edit Project" 
                            initialData={editingProject} 
                            isInline={true}
                            onSave={(name, description, status, category, tools, isArchived, color, phases) => { 
                              updateProject(editingProject.id, { name, description, status, category, tools_and_materials: tools, is_archived: isArchived, color, phases }); 
                              setEditingProject(null); 
                            }} 
                            onCancel={() => setEditingProject(null)} 
                          />
                        ) : (
                          <ProjectCard 
                            key={project.id} 
                            project={project} 
                            logs={state.logs} 
                            schedule={state.schedule} 
                            onArchive={archiveProject} 
                            onEdit={setEditingProject} 
                            onViewLedger={setSelectedLedgerProject} 
                            onNewLog={handleNewLogFromProject}
                            onUpdatePhases={updateProjectPhases}
                          />
                        )
                      )
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'commitments' && (
            <div className="pt-10 space-y-8 animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-end px-1">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">Commitments</h1>
                  <p className="text-stone-500 text-sm mt-1 italic font-medium">Mapping studio intentions.</p>
                </div>
                <button onClick={() => schedulePageRef.current?.openAddForm()} className="bg-stone-900 w-12 h-12 rounded-2xl flex items-center justify-center border border-stone-800 shadow-lg active:scale-90 transition-transform">
                  <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
              <SchedulePage 
                ref={schedulePageRef} 
                state={state} 
                onAddItem={addScheduleItem} 
                onUpdateItem={updateScheduleItem} 
                onRemoveItem={removeScheduleItem} 
                onToggleReminder={toggleReminder} 
                initialSelectedDate={focusedScheduleDate}
                initialFocusedItemId={focusedScheduleItemId}
              />
            </div>
          )}

          {activeTab === 'flow' && (
            <FlowSession 
              projects={state.projects} 
              onSessionComplete={handleLogComplete} 
              isFlowActive={isFlowRunning} 
              setIsFlowActive={setIsFlowRunning} 
              tickets={state.tickets.remaining}
              onConsumeTickets={consumeTickets}
            />
          )}

          {activeTab === 'artist' && (
            <ArtistProfile 
              profile={state.artistProfile} 
              projects={state.projects} 
              logs={state.logs} 
              onUpdate={updateProfile} 
              onUnarchive={unarchiveProject} 
            />
          )}
        </Layout>

        {showProjectForm && <ProjectCreateForm title="New Project" onSave={(name, description, status, category, tools, isArchived, color, phases) => { addProject(name, description, status, category, tools, isArchived, color); setShowProjectForm(false); }} onCancel={() => setShowProjectForm(false)} />}
        {showVault && (
          <Vault 
            projects={state.projects} 
            logs={state.logs} 
            onUnarchive={unarchiveProject} 
            onDeleteForever={deleteProject}
            onClose={() => setShowVault(false)} 
          />
        )}
        {selectedLedgerProject && <ProjectLedger project={selectedLedgerProject} logs={state.logs} onClose={() => setSelectedLedgerProject(null)} />}

        {showTypePicker && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-[150] flex items-end safe-area-bottom">
            <div className="bg-[#14110f] w-full rounded-t-[3rem] p-8 pb-14 space-y-6 animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] border-t border-stone-800/40">
              <h2 className="text-2xl font-bold text-stone-100 text-center">{preSelectedProject ? `Log for ${preSelectedProject.name}` : "Studio Log"}</h2>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => { setActiveLogType('session'); setShowTypePicker(false); }} className="w-full flex items-center space-x-5 p-4 bg-stone-900/40 rounded-3xl border border-stone-800/40 active:scale-[0.98] transition-all duration-200">
                  <div className="bg-orange-800 p-3 rounded-2xl shadow-lg shadow-orange-950/30"><svg className="w-5 h-5 text-stone-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                  <div className="text-left">
                    <h3 className="font-bold text-base text-stone-100">Studio Session</h3>
                    <p className="text-stone-500 text-[10px] font-medium uppercase tracking-tighter">Timed creative deep work. Enable or disable Studio Ear as needed.</p>
                  </div>
                </button>
                
                <button onClick={() => { setActiveLogType('idea'); setShowTypePicker(false); }} className="w-full flex items-center space-x-5 p-4 bg-stone-900/40 rounded-3xl border border-stone-800/40 active:scale-[0.98] transition-all duration-200">
                  <div className="bg-amber-600 p-3 rounded-2xl shadow-lg shadow-amber-950/30"><svg className="w-5 h-5 text-stone-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
                  <div className="text-left"><h3 className="font-bold text-base text-stone-100">New Idea Rambles</h3><p className="text-stone-500 text-[10px] font-medium uppercase tracking-tighter">Plant a new thought seed</p></div>
                </button>

                <button onClick={() => { setActiveLogType('brainstorm'); setShowTypePicker(false); }} className="w-full flex items-center space-x-5 p-4 bg-stone-900/40 rounded-3xl border border-stone-800/40 active:scale-[0.98] transition-all duration-200">
                  <div className="bg-indigo-700 p-3 rounded-2xl shadow-lg shadow-indigo-950/30"><svg className="w-5 h-5 text-stone-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 00-1 1v1a2 2 0 11-4 0v-1a1 1 0 00-1-1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg></div>
                  <div className="text-left"><h3 className="font-bold text-base text-stone-100">Brainstorming Session</h3><p className="text-stone-500 text-[10px] font-medium uppercase tracking-tighter">Expand and refine existing or new threads</p></div>
                </button>
              </div>
              <button onClick={() => { setShowTypePicker(false); setPreSelectedProject(null); }} className="w-full py-2 text-stone-600 font-black uppercase tracking-[0.25em] text-[10px]">Close Picker</button>
            </div>
          </div>
        )}

        {activeLogType && (
          <SessionLogger 
            type={activeLogType} 
            projects={state.projects} 
            initialProjectId={preSelectedProject?.id} 
            onComplete={handleLogComplete} 
            onManualEntry={handleManualEntry} 
            onCancel={() => setActiveLogType(null)} 
            tickets={state.tickets.remaining}
            onConsumeTickets={consumeTickets}
          />
        )}
        {extractedData && (
          <LogForm 
            initialData={extractedData} 
            projects={state.projects} 
            onSave={handleSaveLog} 
            onCancel={() => { setExtractedData(null); setIsDeepDiveMode(false); }} 
            isFreshSession={isFreshLog} 
            latestEnergyLevel={latestEnergyLevel} 
            startWithDeepDive={isDeepDiveMode}
          />
        )}
      </div>
    </PasswordGate>
  );
};

export default App;