import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArtistProfile as ArtistProfileType, Project, WorkshopLog } from '../types';
import { RainbowPicker } from './RainbowPicker';
import { useStore } from '../store/useStore';

interface ArtistProfileProps {
  profile: ArtistProfileType;
  projects: Project[];
  logs: WorkshopLog[];
  onUpdate: (profile: Partial<ArtistProfileType>) => void;
  onUnarchive: (id: string) => void;
}

const DISCIPLINES = [
  { group: "Visual Arts", options: ["Abstract Impressionism", "Neo-Surrealism", "Figurative Oil Painting", "Risograph Printmaking", "Street Muralist", "Conceptual Photography"] },
  { group: "Sonic Arts", options: ["Music Production", "Modular Synthesis", "Spatial Audio Design", "Foley & Sound Design", "Cyber-Folk Composition", "Experimental Ambient"] },
  { group: "Healing & Wellness", options: ["Acupuncturist", "Holistic Nutritionist", "Reiki Practitioner", "Sound Healer", "Ayurvedic Consultant", "Somatic Therapist", "Transpersonal Guide"] },
  { group: "Botanical & Nature", options: ["Botanist", "Ethnobotanist", "Floral Designer", "Permaculture Designer", "Horticulturalist", "Mycology Research", "Biophilic Designer"] },
  { group: "Craft & Material", options: ["Studio Ceramics", "Clay & Fabric Dolls", "Jewelry Design", "Kinetic Metalwork", "Woodworking & Joinery", "Glassblowing", "Bio-Material Research"] },
  { group: "Digital & Future", options: ["Generative AI Art", "Creative Coding", "VR World-building", "Voxel Architecture", "Interactive Installation", "3D Digital Sculpting"] },
  { group: "Textiles & Fashion", options: ["Sustainable Textile Design", "Structural Weaving", "Avant-Garde Tailoring", "Bio-Looming", "Experimental Dyeing"] },
  { group: "Interdisciplinary", options: ["Performance Art", "Social Practice", "Interactive Architecture", "Biomimicry Design", "Found Object Assemblage"] }
];

const CreativeDNA: React.FC<{ 
  disciplineColor: string; 
  styleColor: string; 
  disciplineText: string;
  projects: Project[];
}> = ({ disciplineColor, styleColor, disciplineText, projects }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const seed = disciplineText.length > 0 ? disciplineText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 100;
    const speed = 0.002 + (seed % 50) / 20000;
    
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    window.addEventListener('resize', resize);
    resize();

    const amplitude = (canvas.height / 2) * 0.4 + (seed % 10);

    const activeProjects = projects.filter(p => !p.is_archived);
    const projectParticles = activeProjects.flatMap((project) => {
      const count = 25 + Math.min(Math.floor(project.total_minutes / 200), 50);
      return Array.from({ length: count }, () => ({
        projectId: project.id,
        color: project.color || '#ffffff',
        angle: Math.random() * Math.PI * 2,
        orbitRadiusX: 15 + Math.random() * 100,
        orbitRadiusY: (canvas.height / 12) + Math.random() * (canvas.height / 1.5),
        orbitSpeed: (0.001 + Math.random() * 0.012) * (Math.random() > 0.5 ? 1 : -1),
        yOffset: (Math.random() - 0.5) * (canvas.height * 0.9),
        size: 0.5 + Math.random() * 2.2,
        opacity: 0.05 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2
      }));
    });

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerY = canvas.height / 2;

      const spacing = 14;
      const dots = Math.ceil(canvas.width / spacing) + 1;
      
      ctx.lineWidth = 1.2;
      for (let i = 0; i < dots; i++) {
        const x = i * spacing;
        const angle = frame * speed + (x * 0.028);
        
        const y1 = centerY + Math.sin(angle) * amplitude;
        const z1 = Math.cos(angle);
        const y2 = centerY + Math.sin(angle + Math.PI) * amplitude;
        const z2 = Math.cos(angle + Math.PI);

        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.04 + (Math.abs(z1) * 0.04);
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();

        ctx.fillStyle = disciplineColor;
        ctx.globalAlpha = 0.2 + (z1 + 1) * 0.3;
        const s1 = 1.5 + (z1 + 1) * 2;
        ctx.beginPath();
        ctx.arc(x, y1, s1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = styleColor;
        ctx.globalAlpha = 0.2 + (z2 + 1) * 0.3;
        const s2 = 1.5 + (z2 + 1) * 2;
        ctx.beginPath();
        ctx.arc(x, y2, s2, 0, Math.PI * 2);
        ctx.fill();
      }

      projectParticles.forEach(p => {
        p.angle += p.orbitSpeed;
        const pIdx = projects.findIndex(proj => proj.id === p.projectId);
        const targetX = (pIdx / Math.max(1, projects.length - 1)) * canvas.width;
        
        const x = targetX + Math.cos(p.angle) * p.orbitRadiusX;
        const waveY = Math.sin(frame * 0.01 + p.phase) * 10;
        const y = centerY + Math.sin(p.angle) * p.orbitRadiusY + p.yOffset + waveY;
        
        const wrapX = ((x % canvas.width) + canvas.width) % canvas.width;

        ctx.fillStyle = p.color;
        const flicker = 0.7 + Math.sin(frame * 0.04 + p.phase) * 0.3;
        ctx.globalAlpha = p.opacity * flicker;
        ctx.beginPath();
        ctx.arc(wrapX, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        if (Math.abs(y - centerY) < (canvas.height / 6)) {
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = 0.03 * flicker;
            ctx.beginPath();
            ctx.moveTo(wrapX, y);
            ctx.lineTo(wrapX, centerY);
            ctx.stroke();
        }
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [disciplineColor, styleColor, disciplineText, projects]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

const ArtistProfile: React.FC<ArtistProfileProps> = ({ profile, projects, logs, onUpdate, onUnarchive }) => {
  const { signOut, deleteAccount } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeColorTab, setActiveColorTab] = useState<'discipline' | 'style'>('discipline');
  const [localProfile, setLocalProfile] = useState(profile);
  const [expandedRippleId, setExpandedRippleId] = useState<string | null>(null);
  const [newThreadInput, setNewThreadInput] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (error) {
      console.error("Deletion failed:", error);
      alert("Account deletion failed. You may need to log in again to perform this sensitive action.");
    }
  };

  const handleImageClick = () => {
    if (isEditing) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalProfile(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onUpdate(localProfile);
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addProjectThread = () => {
    if (newThreadInput.trim()) {
      const currentProjects = Array.isArray(localProfile.upcomingProjects) ? localProfile.upcomingProjects : [];
      setLocalProfile(prev => ({
        ...prev,
        upcomingProjects: [...currentProjects, newThreadInput.trim()]
      }));
      setNewThreadInput('');
    }
  };

  const removeProjectThread = (index: number) => {
    const currentProjects = Array.isArray(localProfile.upcomingProjects) ? localProfile.upcomingProjects : [];
    setLocalProfile(prev => ({
      ...prev,
      upcomingProjects: currentProjects.filter((_, i) => i !== index)
    }));
  };

  const addMilestone = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const currentDeadlines = Array.isArray(localProfile.deadlines) ? localProfile.deadlines : [];
    setLocalProfile(prev => ({
      ...prev,
      deadlines: [...currentDeadlines, { 
        id, 
        title: 'New Studio Goal', 
        date: new Date().toISOString().split('T')[0] 
      }]
    }));
  };

  const removeMilestone = (id: string) => {
    const currentDeadlines = Array.isArray(localProfile.deadlines) ? localProfile.deadlines : [];
    setLocalProfile(prev => ({
      ...prev,
      deadlines: currentDeadlines.filter(item => item.id !== id)
    }));
  };

  const updateMilestone = (id: string, updates: Partial<{ title: string; date: string }>) => {
    const currentDeadlines = Array.isArray(localProfile.deadlines) ? localProfile.deadlines : [];
    setLocalProfile(prev => ({
      ...prev,
      deadlines: currentDeadlines.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const inputClasses = "w-full bg-[#1a1715]/50 border border-stone-800/60 rounded-2xl px-5 py-4 text-stone-100 placeholder:text-stone-700 focus:border-orange-900 focus:ring-1 focus:ring-orange-900/30 outline-none transition-all duration-300 font-medium text-sm backdrop-blur-md";
  const labelClasses = "block text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 ml-1";

  const loveTags = localProfile.loves.split(',').map(t => t.trim()).filter(Boolean);
  const inspirationTags = localProfile.inspirations.split(',').map(t => t.trim()).filter(Boolean);
  
  const archivedProjects = (projects || []).filter(p => p.is_archived);
  const allTools = Array.from(new Set((projects || []).flatMap(p => p.tools_and_materials || [])));

  const recentProfileLogs = useMemo(() => {
    return [...(logs || [])]
      .filter(l => l.type === 'session')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [logs]);

  return (
    <div className="pt-8 pb-48 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-16 px-1">
        {/* Left Column: Identity */}
        <div className="lg:col-span-3 space-y-8">
          <section className="relative flex flex-col items-center pt-4 pb-0">
            <button 
              onClick={() => { setIsEditing(!isEditing); if (isEditing) handleSave(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="absolute top-0 right-0 z-50 flex items-center justify-center bg-stone-900/40 border border-stone-800/60 rounded-full w-10 h-10 active:scale-95 transition-all text-stone-400 hover:text-stone-100"
              aria-label={isEditing ? "Cancel editing" : "Edit profile"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                {isEditing ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                )}
              </svg>
            </button>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-900/5 blur-[80px] rounded-full -z-10"></div>
            
            <div 
              onClick={handleImageClick}
              className={`group relative w-44 h-44 cursor-pointer transition-all duration-700 z-10 ${isEditing ? 'scale-105' : 'hover:scale-102'}`}
            >
              <div className="absolute -inset-2 rounded-[3.5rem] border border-orange-900/20 opacity-50"></div>
              <div className={`absolute -inset-4 rounded-[4rem] border border-orange-900/10 opacity-30 ${isEditing ? 'animate-pulse' : ''}`}></div>
              
              <div className="w-full h-full rounded-[3.2rem] overflow-hidden border-2 border-stone-800 handcrafted-shadow bg-stone-900 relative">
                {localProfile.profileImage ? (
                  <img src={localProfile.profileImage} alt="Artist" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-700 bg-stone-950">
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

            <div className="mt-8 text-center space-y-2 w-full z-10">
              {isEditing ? (
                <div className="space-y-3 w-full">
                  <input value={localProfile.stageName} onChange={(e) => setLocalProfile(p => ({ ...p, stageName: e.target.value }))} className={inputClasses + " text-center text-xl font-black"} placeholder="Stage Name" />
                  <input value={localProfile.realName} onChange={(e) => setLocalProfile(p => ({ ...p, realName: e.target.value }))} className={inputClasses + " text-center text-[10px] uppercase tracking-widest text-stone-500"} placeholder="Real Name" />
                </div>
              ) : (
                <>
                  <h2 className="text-4xl font-black tracking-tighter text-stone-100">{profile.stageName}<span className="text-orange-600">.</span></h2>
                  <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">{profile.realName}</p>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Center Column: DNA & Tools */}
        <div className="lg:col-span-5 space-y-12">
          <section className="space-y-6">
            <div className="h-48 relative overflow-hidden opacity-80 lg:rounded-[2rem] lg:bg-stone-900/30 lg:border lg:border-stone-800/20 -mx-6 lg:mx-0 -mt-2 lg:mt-0">
              <CreativeDNA 
                  disciplineColor={isEditing ? localProfile.disciplineColor : profile.disciplineColor} 
                  styleColor={isEditing ? localProfile.styleColor : profile.styleColor}
                  disciplineText={isEditing ? localProfile.discipline : profile.discipline}
                  projects={projects}
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <h3 className="text-xl font-black tracking-tight text-stone-100 uppercase tracking-widest">Creative DNA</h3>
              <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest">Core Aesthetic</span>
            </div>

            {isEditing && (
              <div className="bg-[#1a1715] rounded-[2.5rem] p-6 border border-stone-800/50 shadow-2xl space-y-6">
                <div className="flex p-1 bg-stone-900/60 rounded-2xl border border-stone-800/40">
                  <button onClick={() => setActiveColorTab('discipline')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeColorTab === 'discipline' ? 'bg-stone-800 text-orange-500' : 'text-stone-600'}`}>Discipline</button>
                  <button onClick={() => setActiveColorTab('style')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeColorTab === 'style' ? 'bg-stone-800 text-orange-500' : 'text-stone-600'}`}>Style</button>
                </div>
                <div className="pt-2">
                  <RainbowPicker label={activeColorTab === 'discipline' ? "DisciplineSpectrum" : "Style Spectrum"} color={activeColorTab === 'discipline' ? localProfile.disciplineColor : localProfile.styleColor} onChange={(c) => setLocalProfile(p => activeColorTab === 'discipline' ? ({ ...p, disciplineColor: c }) : ({ ...p, styleColor: c }))} />
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="bg-[#1a1715] rounded-[2.5rem] p-6 border border-stone-800/50 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isEditing ? localProfile.disciplineColor : profile.disciplineColor }}></div>
                  <label className={labelClasses + " mb-0"}>Studio Discipline</label>
                </div>
                {isEditing ? (
                  <select value={localProfile.discipline} onChange={(e) => setLocalProfile(p => ({ ...p, discipline: e.target.value }))} className={inputClasses}>
                    {DISCIPLINES.map(g => (<optgroup key={g.group} label={g.group}>{g.options.map(o => <option key={o} value={o}>{o}</option>)}</optgroup>))}
                  </select>
                ) : <p className="text-stone-100 font-bold text-2xl tracking-tight">{profile.discipline}</p>}
              </div>

              <div className="bg-[#1a1715] rounded-[2.5rem] p-6 border border-stone-800/50 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isEditing ? localProfile.styleColor : profile.styleColor }}></div>
                  <label className={labelClasses + " mb-0"}>Studio Style</label>
                </div>
                {isEditing ? <textarea value={localProfile.style} onChange={(e) => setLocalProfile(p => ({ ...p, style: e.target.value }))} className={inputClasses + " h-20"} /> : <p className="text-stone-300 text-lg font-medium italic">"{profile.style}"</p>}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xl font-black tracking-tight text-stone-100 uppercase tracking-widest">Resources & Tools</h3>
            </div>
            <div className="bg-[#1a1715] rounded-[2.5rem] p-8 border border-stone-800/50 shadow-2xl">
               <div className="flex flex-wrap gap-2">
                  {allTools.map((tool, i) => <span key={i} className="bg-stone-900 text-orange-500 text-[10px] font-black px-4 py-2.5 rounded-xl border border-orange-900/20">{tool}</span>)}
                  {allTools.length === 0 && <p className="text-stone-600 text-xs italic">Your kit is empty.</p>}
               </div>
            </div>
          </section>
        </div>

        {/* Right Column: Ripples & Interests */}
        <div className="lg:col-span-4 space-y-12">

          <section className="space-y-6">
            <h3 className="text-xl font-black tracking-tight text-stone-100 uppercase tracking-widest">Studio Ripples</h3>
            <div className="space-y-4">
              {recentProfileLogs.length > 0 ? recentProfileLogs.map(log => (
                <button key={log.id} onClick={() => setExpandedRippleId(expandedRippleId === log.id ? null : log.id)} className="w-full bg-[#1a1715] rounded-[2rem] p-6 border border-stone-800/50 text-left transition-all">
                  <div className="space-y-1">
                    <span className="text-orange-500 text-[10px] font-black uppercase">{log.project_name}</span>
                    <p className="text-stone-100 font-bold text-base leading-tight">{log.wins || log.summary || "Session"}</p>
                  </div>
                  {expandedRippleId === log.id && <div className="mt-4 pt-4 border-t border-stone-800/40 text-stone-400 text-xs italic">{log.how_it_went}</div>}
                </button>
              )) : <div className="bg-stone-900/10 border-2 border-dashed border-stone-800/40 rounded-[2rem] p-8 text-center text-stone-600 italic text-xs">No activity yet.</div>}
            </div>
          </section>

          <section className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.3em]">Current Obsessions</h3>
              {isEditing ? <textarea value={localProfile.loves} onChange={(e) => setLocalProfile(p => ({ ...p, loves: e.target.value }))} className={inputClasses + " h-32"} /> : (
                <div className="flex flex-wrap gap-2">{loveTags.map((tag, i) => <span key={i} className="bg-orange-950/20 text-orange-400 text-[10px] font-black px-4 py-2 rounded-xl">{tag}</span>)}</div>
              )}
            </div>
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.3em]">Deep Influences</h3>
              {isEditing ? <textarea value={localProfile.inspirations} onChange={(e) => setLocalProfile(p => ({ ...p, inspirations: e.target.value }))} className={inputClasses + " h-32"} /> : (
                <div className="flex flex-wrap gap-2">{inspirationTags.map((tag, i) => <span key={i} className="bg-indigo-950/20 text-indigo-400 text-[10px] font-black px-4 py-2 rounded-xl">{tag}</span>)}</div>
              )}
            </div>
          </section>
        </div>
      </div>

        {/* Studio Roadmap */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-black tracking-tight text-stone-100 uppercase tracking-widest">Studio Roadmap</h3>
            <div className="flex space-x-1">
              <div className="w-1 h-1 rounded-full bg-stone-800"></div>
              <div className="w-1 h-1 rounded-full bg-stone-800"></div>
              <div className="w-1 h-1 rounded-full bg-orange-600"></div>
            </div>
          </div>

          <div className="bg-[#1a1715] rounded-[2.5rem] border border-stone-800/50 overflow-hidden shadow-2xl">
            <div className="p-8 space-y-10">
              <div className="bg-stone-900/40 p-5 rounded-2xl border border-stone-800/40">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-[9px] font-black uppercase text-stone-500 tracking-widest">Vision Archive</span>
                </div>
                <p className="text-stone-500 text-[10px] leading-relaxed italic font-medium">
                  The Roadmap is a manually curated space for high-level creative vision. Project Threads and Milestones represent your long-term intentions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <label className={labelClasses + " mb-0"}>Project Threads</label>
                      <p className="text-[9px] text-stone-600 font-bold ml-1">
                        Broad creative paths or future project seeds.
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        <input value={newThreadInput} onChange={(e) => setNewThreadInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProjectThread()} placeholder="Add thread..." className={inputClasses + " flex-1"} />
                        <button onClick={addProjectThread} className="bg-orange-800 px-4 rounded-xl text-white">+</button>
                      </div>
                      <div className="space-y-2">
                        {(Array.isArray(localProfile.upcomingProjects) ? localProfile.upcomingProjects : []).map((proj, i) => (
                          <div key={i} className="flex items-center justify-between bg-stone-900/40 p-3 rounded-2xl border border-stone-800/40">
                            <span className="text-stone-100 font-bold text-sm">{proj}</span>
                            <button onClick={() => removeProjectThread(i)} className="text-rose-500">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(Array.isArray(profile.upcomingProjects) ? profile.upcomingProjects : []).map((proj, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center border border-stone-800 text-[10px] text-stone-600">{i + 1}</div>
                          <p className="text-stone-300 font-bold">{proj}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <label className={labelClasses + " mb-0"}>Studio Milestones</label>
                      <p className="text-[9px] text-stone-600 font-bold ml-1">Target dates for goals.</p>
                    </div>
                    {isEditing && <button onClick={addMilestone} className="text-[9px] font-black uppercase text-orange-500">+ Target</button>}
                  </div>
                  <div className="space-y-4">
                    {(Array.isArray(isEditing ? localProfile.deadlines : profile.deadlines) ? (isEditing ? localProfile.deadlines : profile.deadlines) : []).map(d => (
                      <div key={d.id} className="flex items-center space-x-4 bg-stone-900/40 p-4 rounded-2xl border border-stone-800/30">
                        <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                        <div className="flex-1">
                          <p className="text-stone-100 font-bold text-sm tracking-tight">{d.title}</p>
                          <span className="text-stone-500 font-mono text-[9px] tracking-widest">{new Date(d.date).toLocaleDateString()}</span>
                        </div>
                        {isEditing && <button onClick={() => removeMilestone(d.id)} className="text-stone-700">×</button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isEditing && (
           <div className="pt-8 space-y-4 pb-12">
             <div className="text-center opacity-40">
               <button 
                 onClick={handleSignOut}
                 className="text-[10px] font-black uppercase text-stone-700 hover:text-stone-500 tracking-[0.3em] transition-colors pb-1 border-b border-stone-800/40"
               >
                 Studio Switch / Sign Out
               </button>
             </div>
             
             {!showConfirmDelete ? (
               <div className="text-center opacity-20">
                 <button 
                   onClick={() => setShowConfirmDelete(true)}
                   className="text-[8px] font-black uppercase text-rose-900 hover:text-rose-500 tracking-[0.3em] transition-colors"
                 >
                   Clear Workshop Presence
                 </button>
               </div>
             ) : (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="bg-rose-950/10 border border-rose-900/20 rounded-[2.5rem] p-8 space-y-6 max-w-sm mx-auto"
               >
                 <div className="space-y-2">
                   <h4 className="text-rose-500 font-black uppercase tracking-widest text-[10px]">Permanent Exit</h4>
                   <p className="text-stone-500 text-[10px] leading-relaxed">
                     This will permanently delete your creative profile, all projects, and logs. This action cannot be reversed.
                   </p>
                 </div>
                 <div className="flex space-x-3">
                   <button 
                     onClick={() => setShowConfirmDelete(false)}
                     className="flex-1 py-3 bg-stone-900 text-stone-400 font-bold text-[10px] uppercase tracking-widest rounded-xl border border-stone-800"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleDeleteAccount}
                     className="flex-1 py-3 bg-rose-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl border border-rose-800"
                   >
                     Delete All
                   </button>
                 </div>
               </motion.div>
             )}
           </div>
        )}

      {/* Floating Sticky Save Button - Appears only when editing */}
      {isEditing && (
        <div className="fixed bottom-[110px] left-0 right-0 px-8 z-[100] lg:sticky lg:bottom-12 lg:-mt-6 lg:mb-12 lg:px-1 lg:z-50 animate-in slide-in-from-bottom duration-1000">
          <button 
            onClick={handleSave}
            className="w-full py-5 rounded-[2.2rem] font-black text-xs uppercase tracking-[0.3em] bg-orange-800 border border-orange-700 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] lg:shadow-[0_20px_40px_rgba(154,52,18,0.2)] backdrop-blur-md flex items-center justify-center space-x-3 active:scale-[0.97] transition-all duration-500 shadow-orange-950/40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Save Profile</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ArtistProfile;
