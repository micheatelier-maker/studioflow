import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArtistProfile as ArtistProfileType, Project, WorkshopLog } from '../types';
import { RainbowPicker } from './RainbowPicker';

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
  const [isEditing, setIsEditing] = useState(false);
  const [activeColorTab, setActiveColorTab] = useState<'discipline' | 'style'>('discipline');
  const [localProfile, setLocalProfile] = useState(profile);
  const [expandedRippleId, setExpandedRippleId] = useState<string | null>(null);
  const [newThreadInput, setNewThreadInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setLocalProfile(prev => ({
        ...prev,
        upcomingProjects: [...prev.upcomingProjects, newThreadInput.trim()]
      }));
      setNewThreadInput('');
    }
  };

  const removeProjectThread = (index: number) => {
    setLocalProfile(prev => ({
      ...prev,
      upcomingProjects: prev.upcomingProjects.filter((_, i) => i !== index)
    }));
  };

  const addMilestone = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setLocalProfile(prev => ({
      ...prev,
      deadlines: [...prev.deadlines, { 
        id, 
        title: 'New Studio Goal', 
        date: new Date().toISOString().split('T')[0] 
      }]
    }));
  };

  const removeMilestone = (id: string) => {
    setLocalProfile(prev => ({
      ...prev,
      deadlines: prev.deadlines.filter(item => item.id !== id)
    }));
  };

  const updateMilestone = (id: string, updates: Partial<{ title: string; date: string }>) => {
    setLocalProfile(prev => ({
      ...prev,
      deadlines: prev.deadlines.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const inputClasses = "w-full bg-[#1a1715]/50 border border-stone-800/60 rounded-2xl px-5 py-4 text-stone-100 placeholder:text-stone-700 focus:border-orange-900 focus:ring-1 focus:ring-orange-900/30 outline-none transition-all duration-300 font-medium text-sm backdrop-blur-md";
  const labelClasses = "block text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 ml-1";

  const loveTags = localProfile.loves.split(',').map(t => t.trim()).filter(Boolean);
  const inspirationTags = localProfile.inspirations.split(',').map(t => t.trim()).filter(Boolean);
  
  const archivedProjects = projects.filter(p => p.is_archived);
  const allTools = Array.from(new Set(projects.flatMap(p => p.tools_and_materials)));

  const recentProfileLogs = useMemo(() => {
    return [...logs]
      .filter(l => l.type === 'session')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [logs]);

  return (
    <div className="pt-8 pb-48 animate-in fade-in duration-1000">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center pt-8 pb-0">
        {/* Top-Right Edit Button - Icon Only */}
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

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-orange-900/5 blur-[120px] rounded-full -z-10"></div>
        
        <div 
          onClick={handleImageClick}
          className={`group relative w-44 h-44 cursor-pointer transition-all duration-700 z-10 ${isEditing ? 'scale-105' : 'hover:scale-102'}`}
        >
          <div className="absolute -inset-2 rounded-[3.5rem] border border-orange-900/20 opacity-50"></div>
          <div className={`absolute -inset-4 rounded-[4rem] border border-orange-900/10 opacity-30 ${isEditing ? 'animate-pulse' : ''}`}></div>
          
          <div className="w-full h-full rounded-[3.2rem] overflow-hidden border-2 border-stone-800 handcrafted-shadow bg-stone-900 relative">
            {localProfile.profileImage ? (
              <img src={localProfile.profileImage} alt="Artist" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-700 bg-gradient-to-br from-stone-900 to-stone-950">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm transition-opacity">
                <div className="text-center">
                  <svg className="w-6 h-6 text-orange-500 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white">Change Photo</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

        <div className="mt-12 text-center space-y-2 w-full px-4 z-10">
          {isEditing ? (
            <div className="space-y-3 max-w-xs mx-auto">
              <input 
                value={localProfile.stageName}
                onChange={(e) => setLocalProfile(p => ({ ...p, stageName: e.target.value }))}
                className={inputClasses + " text-center text-2xl font-black tracking-tighter"}
                placeholder="Stage Name"
              />
              <input 
                value={localProfile.realName}
                onChange={(e) => setLocalProfile(p => ({ ...p, realName: e.target.value }))}
                className={inputClasses + " text-center text-xs uppercase tracking-widest text-stone-500"}
                placeholder="Real Name"
              />
            </div>
          ) : (
            <>
              <h2 className="text-5xl font-black tracking-tighter text-stone-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                {profile.stageName}<span className="text-orange-600">.</span>
              </h2>
              <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1 opacity-80 drop-shadow-md">
                {profile.realName}
              </p>
            </>
          )}
        </div>
      </section>

      <div className="space-y-16 px-1">
        {/* Creative DNA Section */}
        <section className="space-y-6">
          {/* Animation moved above heading and pulled up slightly */}
          <div className="-mx-6 -mt-4 h-48 relative overflow-hidden opacity-80">
            <CreativeDNA 
                disciplineColor={isEditing ? localProfile.disciplineColor : profile.disciplineColor} 
                styleColor={isEditing ? localProfile.styleColor : profile.styleColor}
                disciplineText={isEditing ? localProfile.discipline : profile.discipline}
                projects={projects}
            />
          </div>

          {isEditing && (
            <div className="bg-[#1a1715] rounded-[2.5rem] p-6 border border-stone-800/50 shadow-2xl space-y-6 animate-in slide-in-from-top duration-500">
              <div className="flex p-1 bg-stone-900/60 rounded-2xl border border-stone-800/40">
                <button 
                  onClick={() => setActiveColorTab('discipline')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeColorTab === 'discipline' ? 'bg-stone-800 text-orange-500 shadow-lg' : 'text-stone-600'}`}
                >
                  Discipline Hue
                </button>
                <button 
                  onClick={() => setActiveColorTab('style')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeColorTab === 'style' ? 'bg-stone-800 text-orange-500 shadow-lg' : 'text-stone-600'}`}
                >
                  Style Hue
                </button>
              </div>

              <div className="pt-2">
                {activeColorTab === 'discipline' ? (
                  <RainbowPicker 
                    label="Discipline Spectrum" 
                    color={localProfile.disciplineColor} 
                    onChange={(c) => setLocalProfile(p => ({ ...p, disciplineColor: c }))} 
                  />
                ) : (
                  <RainbowPicker 
                    label="Style Spectrum" 
                    color={localProfile.styleColor} 
                    onChange={(c) => setLocalProfile(p => ({ ...p, styleColor: c }))} 
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1 pt-2">
            <h3 className="text-xl font-black tracking-tight text-stone-100 uppercase tracking-widest">Creative DNA</h3>
            <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest">Core Aesthetic</span>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1a1715] rounded-[2.5rem] p-6 border border-stone-800/50 shadow-2xl space-y-3 group flex flex-col justify-center min-h-[140px]">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isEditing ? localProfile.disciplineColor : profile.disciplineColor }}></div>
                  <label className={labelClasses + " mb-0"}>Studio Discipline</label>
                </div>
                {isEditing ? (
                  <div className="relative">
                    <select 
                      value={localProfile.discipline}
                      onChange={(e) => setLocalProfile(p => ({ ...p, discipline: e.target.value }))}
                      className={inputClasses + " appearance-none pr-10"}
                    >
                      <option value="" disabled>Select your craft...</option>
                      {DISCIPLINES.map(group => (
                        <optgroup key={group.group} label={group.group}>
                          {group.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="Other">Other Craft...</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-100 font-bold text-2xl group-hover:text-orange-500 transition-colors leading-tight">
                    {profile.discipline}
                  </p>
                )}
              </div>

              <div className="bg-[#1a1715] rounded-[2.5rem] p-6 border border-stone-800/50 shadow-2xl space-y-3 group flex flex-col justify-center min-h-[140px]">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isEditing ? localProfile.styleColor : profile.styleColor }}></div>
                  <label className={labelClasses + " mb-0"}>Studio Style</label>
                </div>
                {isEditing ? (
                  <textarea 
                    value={localProfile.style}
                    onChange={(e) => setLocalProfile(p => ({ ...p, style: e.target.value }))}
                    className={inputClasses + " h-20 resize-none"}
                  />
                ) : (
                  <p className="text-stone-300 text-lg leading-relaxed font-medium italic group-hover:text-stone-100 transition-colors">
                    "{profile.style}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Resources & Tools Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-black tracking-tight text-stone-100 uppercase tracking-widest">Resources & Tools</h3>
            <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest">Kit Archive</span>
          </div>
          <div className="bg-[#1a1715] rounded-[2.5rem] p-8 border border-stone-800/50 shadow-2xl space-y-6">
             <div className="flex flex-wrap gap-2">
                {allTools.map((tool, i) => (
                  <span key={i} className="bg-stone-900 text-orange-500 text-[10px] font-black px-4 py-2.5 rounded-xl border border-orange-900/20 active:scale-95 transition-transform shadow-lg">
                    {tool}
                  </span>
                ))}
                {allTools.length === 0 && (
                  <p className="text-stone-600 text-xs italic font-medium">Your kit is empty. Materials will appear here as you log them in projects.</p>
                )}
             </div>
          </div>
        </section>

        {/* Recent Studio Ripples (3 Max) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-black tracking-tight text-stone-100 uppercase tracking-widest">Studio Ripples</h3>
            <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest">Recent Activity</span>
          </div>
          <div className="space-y-4">
            {recentProfileLogs.length > 0 ? (
              recentProfileLogs.map(log => {
                const isExpanded = expandedRippleId === log.id;
                return (
                  <button 
                    key={log.id} 
                    onClick={() => setExpandedRippleId(isExpanded ? null : log.id)}
                    className={`w-full bg-[#1a1715] rounded-[2rem] p-6 border transition-all duration-500 shadow-xl text-left flex flex-col group ${isExpanded ? 'border-orange-900/30' : 'border-stone-800/50 hover:border-orange-900/30'}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest">{log.project_name}</span>
                          <span className="text-stone-600 text-[9px] font-bold uppercase tracking-widest">• {new Date(log.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-stone-100 font-bold text-base tracking-tight leading-tight line-clamp-1">
                          {log.wins || log.summary || "Deep flow session"}
                        </p>
                      </div>
                      <div className="bg-stone-900/80 px-3 py-1.5 rounded-xl border border-stone-800 text-[9px] font-black text-stone-400 tabular-nums">
                        {log.actual_duration_minutes || log.duration_minutes}m
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-stone-800/40 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {log.how_it_went && (
                          <div>
                            <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest block mb-1">Summary</span>
                            <p className="text-stone-400 text-xs leading-relaxed italic">{log.how_it_went}</p>
                          </div>
                        )}
                        {log.wins && (
                          <div>
                            <span className="text-[8px] font-black uppercase text-orange-600 tracking-widest block mb-1">Highlights</span>
                            <p className="text-stone-200 text-xs leading-relaxed font-bold">{log.wins}</p>
                          </div>
                        )}
                        {log.challenges && (
                          <div>
                            <span className="text-[8px] font-black uppercase text-rose-600 tracking-widest block mb-1">Challenges</span>
                            <p className="text-stone-400 text-xs leading-relaxed">{log.challenges}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="bg-stone-900/10 border-2 border-dashed border-stone-800/40 rounded-[2rem] p-8 text-center">
                <p className="text-stone-600 text-sm font-medium italic">No studio ripples yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Interests & Influences */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.3em] px-1">Current Obsessions</h3>
            {isEditing ? (
              <textarea 
                value={localProfile.loves}
                onChange={(e) => setLocalProfile(p => ({ ...p, loves: e.target.value }))}
                className={inputClasses + " h-32 resize-none"}
                placeholder="Comma separated loves..."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {loveTags.map((tag, i) => (
                  <span key={i} className="bg-orange-950/20 text-orange-400 text-[10px] font-black px-4 py-2 rounded-xl border border-orange-900/20 active:scale-95 transition-transform">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-stone-600 uppercase tracking-[0.3em] px-1">Deep Influences</h3>
            {isEditing ? (
              <textarea 
                value={localProfile.inspirations}
                onChange={(e) => setLocalProfile(p => ({ ...p, inspirations: e.target.value }))}
                className={inputClasses + " h-32 resize-none"}
                placeholder="Comma separated inspirations..."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {inspirationTags.map((tag, i) => (
                  <span key={i} className="bg-indigo-950/20 text-indigo-400 text-[10px] font-black px-4 py-2 rounded-xl border border-indigo-900/20 active:scale-95 transition-transform">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

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

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <label className={labelClasses + " mb-0"}>Project Threads</label>
                    <p className="text-[9px] text-stone-600 font-bold ml-1">
                      Broad creative paths, themes, or future project seeds.
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <input 
                        value={newThreadInput}
                        onChange={(e) => setNewThreadInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addProjectThread()}
                        placeholder="Add a thread..."
                        className={inputClasses + " flex-1"}
                      />
                      <button 
                        onClick={addProjectThread}
                        className="bg-orange-800 px-4 rounded-xl border border-orange-700 active:scale-95 transition-all text-white font-black"
                      >
                        +
                      </button>
                    </div>
                    <div className="space-y-2">
                      {localProfile.upcomingProjects.map((proj, i) => (
                        <div key={i} className="flex items-center justify-between bg-stone-900/40 p-3 rounded-2xl border border-stone-800/40">
                          <span className="text-stone-100 font-bold text-sm">{proj}</span>
                          <button onClick={() => removeProjectThread(i)} className="text-stone-600 hover:text-rose-500 p-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.upcomingProjects.map((proj, i) => (
                      <div key={i} className="flex items-center space-x-4 group cursor-default">
                        <div className="w-10 h-10 bg-stone-900 rounded-2xl flex items-center justify-center border border-stone-800 text-stone-600 group-hover:border-orange-900 transition-colors">
                          <span className="text-[10px] font-black">{i + 1}</span>
                        </div>
                        <p className="text-stone-300 font-bold group-hover:text-stone-50 transition-colors">{proj}</p>
                      </div>
                    ))}
                    {profile.upcomingProjects.length === 0 && <p className="text-stone-700 text-xs italic ml-1">No threads recorded.</p>}
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-10 border-t border-stone-800/40">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <label className={labelClasses + " mb-0"}>Studio Milestones</label>
                    <p className="text-[9px] text-stone-600 font-bold ml-1">
                      Target dates for submissions, exhibitions, or production goals.
                    </p>
                  </div>
                  {isEditing && (
                    <button 
                      onClick={addMilestone}
                      className="text-[9px] font-black uppercase text-orange-500 bg-orange-950/20 px-3 py-1.5 rounded-xl border border-orange-900/30 active:scale-95 transition-all"
                    >
                      + Add Target
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {(isEditing ? localProfile.deadlines : profile.deadlines).map((d) => (
                    <div key={d.id} className="relative flex items-center group">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-600 z-10"></div>
                      <div className="absolute left-[3px] top-0 bottom-0 w-[2px] bg-stone-800 group-last:bottom-1/2"></div>
                      
                      <div className="flex-1 ml-8 bg-stone-900/40 p-5 rounded-2xl border border-stone-800/30 flex justify-between items-center group-hover:bg-stone-900 transition-colors">
                        {isEditing ? (
                          <div className="flex flex-col space-y-3 w-full pr-4">
                            <input 
                              value={d.title}
                              onChange={(e) => updateMilestone(d.id, { title: e.target.value })}
                              className="bg-transparent border-none text-stone-100 font-bold text-sm focus:outline-none w-full border-b border-stone-800 focus:border-orange-900/50 pb-1"
                              placeholder="Milestone Title"
                            />
                            <input 
                              type="date"
                              value={d.date}
                              onChange={(e) => updateMilestone(d.id, { date: e.target.value })}
                              className="bg-orange-950/20 text-orange-500 font-mono text-[9px] px-3 py-1 rounded-full border border-orange-900/30 uppercase tracking-widest focus:outline-none w-fit"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="text-stone-100 font-bold text-sm">{d.title}</p>
                            <span className="text-stone-500 font-mono text-[10px] tracking-widest bg-stone-800 px-3 py-1 rounded-full">
                              {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        )}
                        
                        {isEditing && (
                          <button 
                            onClick={() => removeMilestone(d.id)}
                            className="text-stone-700 hover:text-rose-500 transition-colors p-2"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!isEditing ? profile.deadlines.length === 0 : localProfile.deadlines.length === 0) && (
                    <p className="text-stone-700 text-xs italic ml-8 py-2">No studio targets set.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isEditing && (
           <div className="pt-8 text-center pb-12 opacity-40">
             <button className="text-[10px] font-black uppercase text-stone-700 hover:text-stone-500 tracking-[0.3em] transition-colors pb-1 border-b border-stone-800/40">
               Studio Switch / Sign Out
             </button>
           </div>
        )}
      </div>

      {/* Floating Sticky Save Button - Appears only when editing */}
      {isEditing && (
        <div className="fixed bottom-[110px] left-0 right-0 px-8 z-[100] animate-in slide-in-from-bottom duration-700">
          <button 
            onClick={handleSave}
            className="w-full py-5 rounded-[2.2rem] font-black text-xs uppercase tracking-[0.3em] bg-orange-800 border border-orange-700 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center justify-center space-x-3 active:scale-[0.97] transition-all duration-500 shadow-orange-950/40"
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