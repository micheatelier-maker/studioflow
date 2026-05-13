export type Stage = "ideation" | "experimenting" | "production" | "finished" | null;
export type LogType = "session" | "idea" | "brainstorm" | "problem" | "post";
export type ProjectStatus = "Active" | "Exploring" | "Stalled" | "Paused" | "Complete";
export type ScheduleType = "deadline" | "session" | "event" | "milestone";

export interface EnergyCheckIn {
  id: string;
  level: number;
  note: string;
  date: string;
}

export interface WorkshopLog {
  id: string;
  type: LogType;
  project_id: string;
  project_name: string;
  date: string;
  duration_minutes?: number | null;
  actual_duration_minutes?: number | null;
  stage?: Stage;
  summary?: string | null;
  how_it_went?: string | null;
  general_thoughts?: string | null;
  problem?: string | null;
  solution?: string | null;
  post_caption?: string | null;
  post_hook?: string | null;
  post_body?: string | null;
  materials_used: string[];
  challenges?: string | null;
  wins?: string | null;
  mood?: string | null;
  energy_level?: number | null;
  next_steps?: string | null;
  raw_transcript: string;
  audio_base64?: string | null; // For downloading voice memos
  audio_recording_id?: string | null;
}

export interface ProjectInsight {
  id: string;
  text: string;
  date: string;
  type: 'technical' | 'conceptual' | 'aesthetic';
}

export interface ProjectPhase {
  id: string;
  title: string;
  startDate: string | null; // null means TBA
  endDate: string | null;   // null means TBA
  is_complete: boolean;     // Added property
}

export interface ScheduleItem {
  id: string;
  title: string;
  date: string;
  type: ScheduleType;
  project_id?: string;
  project_name?: string;
  reminder_set: boolean;
  notes?: string;
  reminder_config?: {
    type: 'advance' | 'specific';
    advance_value?: string;
    specific_date?: string;
    specific_time?: string;
  };
}

export interface BlockStrategy {
  id: string;
  name: string;
  description: string;
  duration: number;
  is_custom: boolean;
  is_favorite?: boolean;
  energy_required?: number; // 1-5
  simplicity?: number;      // 1-5
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ProjectStatus;
  created_at: string;
  updated_at?: string;
  is_archived: boolean;
  total_minutes: number;
  tools_and_materials: string[];
  technical_notes: string[];
  milestones: string[];
  accumulated_insights: ProjectInsight[];
  unresolved_hurdles: string[];
  mood_history: { date: string, level: number }[];
  phases: ProjectPhase[];
  color: string;
  is_locked?: boolean;
}

export interface ArtistProfile {
  stageName: string;
  realName: string;
  discipline: string;
  disciplineColor: string;
  style: string;
  styleColor: string;
  loves: string;
  inspirations: string;
  obsessions: string;
  profileImage: string | null;
  upcomingProjects: string[];
  // Added deadlines to handle studio meta-goals within the profile
  deadlines: { id: string; title: string; date: string }[];
  isOnboarded: boolean;
}

export interface ProtocolLog {
  id: string;
  strategyId: string;
  strategyName: string;
  date: string;
  duration: number;
  reflection?: string;
  reflectionType?: 'voice' | 'text';
}

export interface AppState {
  projects: Project[];
  logs: WorkshopLog[];
  schedule: ScheduleItem[];
  energyHistory: EnergyCheckIn[];
  blockStrategies: BlockStrategy[]; 
  protocolLogs: ProtocolLog[];
  artistProfile: ArtistProfile;
  tickets: {
    remaining: number;
    usedMinutesThisWeek: number;
    totalUsed: number;
    lastResetDate: string;
  };
  user: {
    email: string;
    isAuthenticated: boolean;
  } | null;
}