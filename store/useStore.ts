import { useState, useEffect } from 'react';
import { AppState, Project, WorkshopLog, ArtistProfile, ProjectStatus, ProjectInsight, ScheduleItem, EnergyCheckIn, ProjectPhase, BlockStrategy, ProtocolLog } from '../types';

const STORAGE_KEY = 'workshop_flow_state_v8'; // Bumped version for new schema

const initialEnergy: EnergyCheckIn[] = [];

const initialSchedule: ScheduleItem[] = [];

const initialProjects: Project[] = [];

const initialLogs: WorkshopLog[] = [];

const initialStrategies: BlockStrategy[] = [
  { id: 'st1', name: "The 10-Minute Walk", description: "Bilateral stimulation through physical movement resets diffuse mode thinking.", duration: 10, is_custom: false, energy_required: 3, simplicity: 5 },
  { id: 'st2', name: "Rubber Ducking", description: "Verbalizing the block to an inanimate object offloads working memory and triggers self-correction.", duration: 5, is_custom: false, energy_required: 2, simplicity: 5 },
  { id: 'st3', name: "The 48-Hour Disconnect", description: "A total symbolic exit from the studio to break demand avoidance loops and refresh perspective.", duration: 2880, is_custom: false, energy_required: 1, simplicity: 2 },
  { id: 'st4', name: "Oblique Constraints", description: "Apply a random, challenging constraint (e.g., 'Discard an axiom' or 'Work at a different speed').", duration: 5, is_custom: false, energy_required: 4, simplicity: 3 },
  { id: 'st5', name: "The 5-Minute Mess", description: "Set a timer and purposely do the work as badly as possible to lower the stakes of perfectionism.", duration: 5, is_custom: false, energy_required: 3, simplicity: 4 },
  { id: 'st6', name: "Sensory Shift", description: "Engage a non-dominant sense. Smell a strong scent, touch ice, or listen to white noise.", duration: 5, is_custom: false, energy_required: 2, simplicity: 5 },
  { id: 'st7', name: "Micro-Clean", description: "Organize exactly one tool drawer or surface corner. External order can lead to internal clarity.", duration: 8, is_custom: false, energy_required: 3, simplicity: 4 },
  { id: 'st8', name: "Reverse Engineering", description: "Start from the intended final result and work your way backward to the current hurdle.", duration: 10, is_custom: false, energy_required: 4, simplicity: 2 },
  { id: 'st9', name: "Sonic Wash", description: "Listen to a single track of complex ambient or field recordings with eyes closed to reset auditory focus.", duration: 7, is_custom: false, energy_required: 1, simplicity: 5 },
  { id: 'st10', name: "Chaos Draft", description: "Produce a rapid-fire version of your current task with zero editing. Quantity over quality to break paralysis.", duration: 6, is_custom: false, energy_required: 5, simplicity: 3 },
  { id: 'st11', name: "Studio Archeology", description: "Look through discarded versions or early sketches of this project to find the original spark.", duration: 15, is_custom: false, energy_required: 2, simplicity: 3 },
  { id: 'st12', name: "Body Scan & Unclench", description: "Locate and release physical tension in the jaw, shoulders, and hands that often mirrors creative tension.", duration: 3, is_custom: false, energy_required: 1, simplicity: 5 },
  { id: 'st13', name: "Material Dialogue", description: "Simply handle your materials or tools without the intent to build. Reset your tactile connection to the craft.", duration: 10, is_custom: false, energy_required: 2, simplicity: 4 },
  { id: 'st14', name: "Reference Audit", description: "Revisit one of your primary influences. Watch their process or view their work to remember 'why'.", duration: 12, is_custom: false, energy_required: 2, simplicity: 4 },
  { id: 'st15', name: "The 2-Minute Sprint", description: "Work on the hardest part for exactly 120 seconds. Anyone can do 2 minutes.", duration: 2, is_custom: false, energy_required: 4, simplicity: 5 },
  { id: 'st16', name: "Analog Pivot", description: "Switch to paper, clay, or physical sketching if you're stuck on digital. Change the medium.", duration: 15, is_custom: false, energy_required: 3, simplicity: 3 },
  { id: 'st17', name: "Exquisite Corpse", description: "Take a random element from a different project and force it into the current one.", duration: 10, is_custom: false, energy_required: 4, simplicity: 2 },
  { id: 'st18', name: "The 'What If' List", description: "Write 10 'What if...' statements about your project without judging them.", duration: 8, is_custom: false, energy_required: 3, simplicity: 4 }
];

const initialState: AppState = {
  projects: initialProjects,
  logs: initialLogs,
  schedule: initialSchedule,
  energyHistory: initialEnergy,
  blockStrategies: initialStrategies,
  protocolLogs: [],
  artistProfile: {
    stageName: 'New Artist',
    realName: '',
    discipline: 'Modular Synthesis',
    disciplineColor: '#ea580c', 
    style: 'Organic-Digital Hybridism',
    styleColor: '#4f46e5', 
    loves: '',
    inspirations: '',
    obsessions: '',
    profileImage: null,
    upcomingProjects: [],
    deadlines: [],
    isOnboarded: true,
  },
  tickets: {
    remaining: 3,
    totalUsed: 0,
    lastResetDate: new Date().toISOString().split('T')[0]
  },
  user: { email: 'creative@example.com', isAuthenticated: true }
};

export const useStore = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return initialState;
      
      const parsed = JSON.parse(saved);
      // Basic validation: ensure it has the expected top-level keys
      if (parsed && typeof parsed === 'object' && 'projects' in parsed) {
        return parsed;
      }
      return initialState;
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      return initialState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addEnergyCheckIn = (level: number, note: string) => {
    const checkIn: EnergyCheckIn = {
      id: Math.random().toString(36).substr(2, 9),
      level,
      note,
      date: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      energyHistory: [checkIn, ...prev.energyHistory].slice(0, 50)
    }));
  };

  const addBlockStrategy = (name: string, description: string, duration: number, energy_required: number = 3, simplicity: number = 3) => {
    const strategy: BlockStrategy = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      description: description.trim(),
      duration: duration || 5,
      is_custom: true,
      energy_required,
      simplicity
    };
    setState(prev => ({
      ...prev,
      blockStrategies: [...prev.blockStrategies, strategy]
    }));
  };

  const updateBlockStrategy = (id: string, updates: Partial<BlockStrategy>) => {
    setState(prev => ({
      ...prev,
      blockStrategies: prev.blockStrategies.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const removeBlockStrategy = (id: string) => {
    setState(prev => ({
      ...prev,
      blockStrategies: prev.blockStrategies.filter(s => s.id !== id)
    }));
  };

  const addProject = (name: string, description: string, status: ProjectStatus, category: string, tools: string[], isArchived: boolean, color: string) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name, description, category, status,
      created_at: new Date().toISOString(),
      is_archived: isArchived,
      total_minutes: 0,
      tools_and_materials: tools,
      technical_notes: [],
      milestones: [],
      accumulated_insights: [],
      unresolved_hurdles: [],
      mood_history: [],
      color: color || '#ea580c',
      phases: [
        { id: Math.random().toString(36).substr(2, 9), title: 'Beginning', startDate: new Date().toISOString(), endDate: null, is_complete: false }
      ]
    };
    setState(prev => ({ ...prev, projects: [newProject, ...prev.projects] }));
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const updateProjectPhases = (id: string, phases: ProjectPhase[]) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, phases } : p)
    }));
  };

  const addLog = (log: Omit<WorkshopLog, 'id'>) => {
    const finalLog: WorkshopLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    const duration = log.actual_duration_minutes || log.duration_minutes || 0;
    
    setState(prev => ({ 
      ...prev, 
      logs: [finalLog, ...prev.logs],
      projects: prev.projects.map(p => 
        p.id === log.project_id 
          ? { ...p, total_minutes: p.total_minutes + duration } 
          : p
      )
    }));
  };

  const updateLog = (id: string, updates: Partial<WorkshopLog>) => {
    setState(prev => {
      const oldLog = prev.logs.find(l => l.id === id);
      if (!oldLog) return prev;

      const newLogs = prev.logs.map(l => l.id === id ? { ...l, ...updates } : l);
      
      // If duration changed, update project total_minutes
      let newProjects = prev.projects;
      const oldDuration = oldLog.actual_duration_minutes || oldLog.duration_minutes || 0;
      const newDuration = updates.actual_duration_minutes !== undefined ? updates.actual_duration_minutes : 
                          (updates.duration_minutes !== undefined ? updates.duration_minutes : oldDuration);
      
      if (oldDuration !== newDuration) {
        newProjects = prev.projects.map(p => 
          p.id === oldLog.project_id 
            ? { ...p, total_minutes: p.total_minutes - oldDuration + newDuration } 
            : p
        );
      }

      return { ...prev, logs: newLogs, projects: newProjects };
    });
  };

  const archiveProject = (id: string) => {
    setState(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, is_archived: true } : p) }));
  };

  const unarchiveProject = (id: string) => {
    setState(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, is_archived: false } : p) }));
  };

  const deleteProject = (id: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
      logs: prev.logs.filter(l => l.project_id !== id)
    }));
  };

  const updateProfile = (profile: Partial<ArtistProfile>) => {
    setState(prev => ({ ...prev, artistProfile: { ...prev.artistProfile, ...profile } }));
  };

  const addScheduleItem = (item: Omit<ScheduleItem, 'id'>) => {
    setState(prev => ({ ...prev, schedule: [...prev.schedule, { ...item, id: Math.random().toString(36).substr(2, 9) }] }));
  };

  const updateScheduleItem = (id: string, updates: Partial<ScheduleItem>) => {
    setState(prev => ({
      ...prev,
      schedule: prev.schedule.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const removeScheduleItem = (id: string) => {
    setState(prev => ({ ...prev, schedule: prev.schedule.filter(s => s.id !== id) }));
  };

  const toggleReminder = (id: string) => {
    setState(prev => ({ ...prev, schedule: prev.schedule.map(s => s.id === id ? { ...s, reminder_set: !s.reminder_set } : s) }));
  };

  const addProtocolLog = (log: Omit<ProtocolLog, 'id'>) => {
    const finalLog: ProtocolLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    setState(prev => ({ 
      ...prev, 
      protocolLogs: [finalLog, ...prev.protocolLogs]
    }));
  };

  const reorderProjects = (newProjects: Project[]) => {
    setState(prev => {
      // Keep archived projects at the end or wherever they were, but update the order of active ones
      const archived = prev.projects.filter(p => p.is_archived);
      return { ...prev, projects: [...newProjects, ...archived] };
    });
  };

  const consumeTickets = (amount: number = 1) => {
    setState(prev => ({
      ...prev,
      tickets: {
        ...prev.tickets,
        remaining: Math.max(0, prev.tickets.remaining - amount),
        totalUsed: prev.tickets.totalUsed + amount
      }
    }));
  };

  const addTickets = (amount: number = 1) => {
    setState(prev => ({
      ...prev,
      tickets: {
        ...prev.tickets,
        remaining: prev.tickets.remaining + amount
      }
    }));
  };

  return { 
    state, addEnergyCheckIn, addBlockStrategy, updateBlockStrategy, removeBlockStrategy, addProject, updateProject, updateProjectPhases, addLog, updateLog, reorderProjects,
    archiveProject, unarchiveProject, deleteProject, updateProfile, addScheduleItem, 
    updateScheduleItem, removeScheduleItem, toggleReminder, addProtocolLog, consumeTickets, addTickets
  };
};