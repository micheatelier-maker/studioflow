import { useState, useEffect, useCallback } from 'react';
import { AppState, Project, WorkshopLog, ArtistProfile, ProjectStatus, ProjectInsight, ScheduleItem, EnergyCheckIn, ProjectPhase, BlockStrategy, ProtocolLog } from '../types';
import { db, auth } from '../services/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocFromServer,
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as firebaseUpdateProfile,
  deleteUser
} from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

function sanitizeForFirestore(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item));
  }
  
  const sanitized: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      sanitized[key] = sanitizeForFirestore(obj[key]);
    }
  });
  return sanitized;
}

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
    remaining: 10,
    usedMinutesThisWeek: 0,
    totalUsed: 0,
    lastResetDate: new Date().toISOString().split('T')[0]
  },
  user: { email: 'creative@example.com', isAuthenticated: true }
};

export const useStore = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return initialState;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && 'projects' in parsed) {
        return parsed;
      }
      return initialState;
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
      return initialState;
    }
  });

  // Handle Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Weekly Ticket Reset Logic
  useEffect(() => {
    const checkTicketReset = () => {
      const { lastResetDate } = state.tickets;
      if (!lastResetDate) return;

      const now = new Date();
      const lastReset = new Date(lastResetDate);
      
      // Check if 7 days have passed
      const diffTime = Math.abs(now.getTime() - lastReset.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays >= 7) {
        const newResetDate = now.toISOString().split('T')[0];
        const resetTickets = {
          remaining: 10,
          usedMinutesThisWeek: 0,
          totalUsed: 0,
          lastResetDate: newResetDate
        };
        
        setState(prev => ({
          ...prev,
          tickets: resetTickets
        }));

        if (currentUser) {
          updateDoc(doc(db, 'users', currentUser.uid, 'profiles', 'main'), sanitizeForFirestore({
            tickets: resetTickets
          })).catch(err => console.error("Failed to reset tickets in Firestore", err));
        }
      }
    };

    checkTicketReset();
  }, [currentUser, state.tickets.lastResetDate]);

  const signUp = async (name: string, email: string, pass: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await firebaseUpdateProfile(result.user, { displayName: name });
      
      // Initialize profile in Firestore
      const profileDocRef = doc(db, 'users', result.user.uid, 'profiles', 'main');
      await setDoc(profileDocRef, sanitizeForFirestore({
        stageName: name,
        realName: name,
        discipline: 'Modular Synthesis',
        disciplineColor: '#ea580c',
        style: 'Organic-Digital Hybridism',
        styleColor: '#4f46e5',
        loves: '',
        inspirations: '',
        obsessions: '',
        upcomingProjects: [],
        deadlines: [],
        isOnboarded: true,
        tickets: { remaining: 10, totalUsed: 0, lastResetDate: new Date().toISOString().split('T')[0] }
      }), { merge: true });

      return result.user;
    } catch (error) {
      console.error("Sign up failed:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return result.user;
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    try {
      // Cleanup Firestore data first (optional but good practice)
      // Note: Rules might prevent deletion after account is deleted, so do it before
      const userId = auth.currentUser.uid;
      
      // Delete user documents (simplified)
      await deleteDoc(doc(db, 'users', userId, 'profiles', 'main'));
      
      await deleteUser(auth.currentUser);
    } catch (error) {
      console.error("Delete account failed:", error);
      throw error;
    }
  };

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  };

  // Sync state to LocalStorage
  useEffect(() => {
    const saveToLocalStorage = (stateToSave: AppState) => {
      try {
        // Sanitize state: remove large assets that should not be in localStorage
        const sanitizedLogs = stateToSave.logs.map(log => ({
          ...log,
          audio_base64: null // Never store large audio in localStorage
        }));

        const sanitizedState = {
          ...stateToSave,
          logs: sanitizedLogs
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
      } catch (error) {
        console.error("Failed to save state to localStorage (Quota likely exceeded):", error);
        // If quota exceeded, we could try further reduction (e.g. only last 10 logs)
        try {
           const verySanitizedLogs = stateToSave.logs.slice(0, 10).map(log => ({
             ...log,
             audio_base64: null,
             raw_transcript: log.raw_transcript?.length > 1000 ? log.raw_transcript.substring(0, 1000) + '...' : log.raw_transcript
           }));
           const verySanitizedState = { ...stateToSave, logs: verySanitizedLogs };
           localStorage.setItem(STORAGE_KEY, JSON.stringify(verySanitizedState));
        } catch (innerError) {
           console.error("Even minimal state failed to save:", innerError);
        }
      }
    };

    saveToLocalStorage(state);
  }, [state]);

  // Load from Firestore when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;
    const profileDocRef = doc(db, 'users', userId, 'profiles', 'main');

    setIsSyncing(true);

    // Profile listener
    const unsubProfile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setState(prev => ({ 
          ...prev, 
          artistProfile: { 
            ...prev.artistProfile, 
            ...data as ArtistProfile,
            upcomingProjects: Array.isArray((data as any).upcomingProjects) ? (data as any).upcomingProjects : [],
            deadlines: Array.isArray((data as any).deadlines) ? (data as any).deadlines : []
          },
          tickets: data.tickets ? { ...prev.tickets, ...data.tickets } : prev.tickets
        }));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/profiles/main`));

    // Projects listener
    const unsubProjects = onSnapshot(collection(db, 'users', userId, 'projects'), (snap) => {
      const projects: Project[] = [];
      snap.forEach(doc => projects.push(doc.data() as Project));
      setState(prev => ({ ...prev, projects }));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/projects`));

    // Sessions listener (renamed from logs)
    const unsubSessions = onSnapshot(collection(db, 'users', userId, 'sessions'), (snap) => {
      const logs: WorkshopLog[] = [];
      snap.forEach(doc => logs.push(doc.data() as WorkshopLog));
      setState(prev => ({ ...prev, logs }));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/sessions`));

    // CalendarEvents listener (renamed from schedule)
    const unsubCalendar = onSnapshot(collection(db, 'users', userId, 'calendarEvents'), (snap) => {
      const schedule: ScheduleItem[] = [];
      snap.forEach(doc => schedule.push(doc.data() as ScheduleItem));
      setState(prev => ({ ...prev, schedule: schedule }));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/calendarEvents`));

    // Protocols listener
    const unsubProtocols = onSnapshot(collection(db, 'users', userId, 'protocolLogs'), (snap) => {
      const protocolLogs: ProtocolLog[] = [];
      snap.forEach(doc => protocolLogs.push(doc.data() as ProtocolLog));
      setState(prev => ({ ...prev, protocolLogs }));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/protocolLogs`));

    // EnergyHistory listener
    const unsubEnergy = onSnapshot(collection(db, 'users', userId, 'energyHistory'), (snap) => {
      const energyHistory: EnergyCheckIn[] = [];
      snap.forEach(doc => energyHistory.push(doc.data() as EnergyCheckIn));
      // Sort by date descending
      energyHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setState(prev => ({ ...prev, energyHistory }));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/energyHistory`));

    return () => {
      unsubProfile();
      unsubProjects();
      unsubSessions();
      unsubCalendar();
      unsubProtocols();
      unsubEnergy();
    };
  }, [currentUser]);

  const addEnergyCheckIn = async (level: number, note: string) => {
    const checkIn: EnergyCheckIn = {
      id: Math.random().toString(36).substr(2, 9),
      level,
      note,
      date: new Date().toISOString()
    };
    
    if (currentUser) {
      const path = `users/${currentUser.uid}/energyHistory/${checkIn.id}`;
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'energyHistory', checkIn.id), sanitizeForFirestore(checkIn));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({
        ...prev,
        energyHistory: [checkIn, ...prev.energyHistory].slice(0, 50)
      }));
    }
  };

  const addBlockStrategy = async (name: string, description: string, duration: number, energy_required: number = 3, simplicity: number = 3) => {
    const strategy: BlockStrategy = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      description: description.trim(),
      duration: duration || 5,
      is_custom: true,
      energy_required,
      simplicity
    };

    // Only store locally
    setState(prev => ({
      ...prev,
      blockStrategies: [...prev.blockStrategies, strategy]
    }));
  };

  const updateBlockStrategy = async (id: string, updates: Partial<BlockStrategy>) => {
    // Only update locally
    setState(prev => ({
      ...prev,
      blockStrategies: prev.blockStrategies.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const removeBlockStrategy = async (id: string) => {
    // Only update locally
    setState(prev => ({
      ...prev,
      blockStrategies: prev.blockStrategies.filter(s => s.id !== id)
    }));
  };

  const addProject = async (name: string, description: string, status: ProjectStatus, category: string, tools: string[], isArchived: boolean, color: string, phases?: ProjectPhase[], is_locked: boolean = false) => {
    const now = new Date();
    const defaultPhases: ProjectPhase[] = [
      'Ideation',
      'gathering supplies',
      'planning',
      'experimentation',
      'creation',
      'production',
      'completion'
    ].map((title, index) => {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + (index * 14));
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 14);
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        title,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        is_complete: false
      };
    });

    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name, description, category, status,
      created_at: now.toISOString(),
      is_archived: isArchived,
      is_locked,
      total_minutes: 0,
      tools_and_materials: tools,
      technical_notes: [],
      milestones: [],
      accumulated_insights: [],
      unresolved_hurdles: [],
      mood_history: [],
      color: color || '#ea580c',
      phases: phases && phases.length > 0 ? phases : defaultPhases
    };

    if (currentUser) {
      const path = `users/${currentUser.uid}/projects/${newProject.id}`;
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'projects', newProject.id), sanitizeForFirestore(newProject));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({ ...prev, projects: [newProject, ...prev.projects] }));
    }
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/projects/${id}`;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'projects', id), sanitizeForFirestore(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, ...updates } : p)
      }));
    }
  };

  const updateProjectPhases = async (id: string, phases: ProjectPhase[]) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/projects/${id}`;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'projects', id), sanitizeForFirestore({ phases, updatedAt: new Date().toISOString() }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, phases } : p)
      }));
    }
  };

  const toggleProjectLock = async (id: string) => {
    const project = state.projects.find(p => p.id === id);
    if (!project) return;
    
    const newLockState = !project.is_locked;
    
    if (currentUser) {
      const path = `users/${currentUser.uid}/projects/${id}`;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'projects', id), sanitizeForFirestore({ is_locked: newLockState }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, is_locked: newLockState } : p)
      }));
    }
  };

  const addLog = async (log: Omit<WorkshopLog, 'id'> & { save_as_commitment?: boolean }) => {
    const { save_as_commitment, ...logData } = log;
    const finalLog: WorkshopLog = { ...logData, id: Math.random().toString(36).substr(2, 9), audio_base64: null }; // Ensure audio is NEVER saved to sessions
    const duration = log.actual_duration_minutes || log.duration_minutes || 0;
    
    if (currentUser) {
      const userId = currentUser.uid;
      const sessionPath = `users/${userId}/sessions/${finalLog.id}`;
      
      try {
        // Discarding audio_base64 as per user request: "do not save the audio file itself"
        // We still keep the transcript and other metadata.
        
        await setDoc(doc(db, 'users', userId, 'sessions', finalLog.id), sanitizeForFirestore(finalLog));
        
        // Save under project-specific session subcollection
        if (finalLog.project_id) {
          await setDoc(doc(db, 'users', userId, 'projects', finalLog.project_id, 'sessions', finalLog.id), sanitizeForFirestore(finalLog));
        }

        // Auto-save next_steps as a Commitment in Firestore
        if (finalLog.next_steps && finalLog.next_steps.trim() !== '' && finalLog.next_steps.trim().toLowerCase() !== 'none detected.' && save_as_commitment !== false) {
          const commitmentId = Math.random().toString(36).substr(2, 9);
          const dateStr = finalLog.date ? finalLog.date.split('T')[0] : new Date().toISOString().split('T')[0];
          
          const titleText = finalLog.next_steps.length > 50 
            ? `${finalLog.next_steps.substring(0, 47)}...` 
            : finalLog.next_steps;

          const commitment = {
            id: commitmentId,
            title: titleText,
            date: dateStr,
            type: 'session' as any,
            project_id: finalLog.project_id,
            project_name: finalLog.project_name,
            reminder_set: false,
            notes: `Auto-generated from session notes: ${finalLog.next_steps}`
          };
          
          await setDoc(doc(db, 'users', userId, 'calendarEvents', commitmentId), sanitizeForFirestore(commitment));
        }
        
        const projectDoc = await getDoc(doc(db, 'users', userId, 'projects', log.project_id));
        if (projectDoc.exists()) {
          const currentTotal = projectDoc.data().total_minutes || 0;
          await updateDoc(doc(db, 'users', userId, 'projects', log.project_id), sanitizeForFirestore({
            total_minutes: currentTotal + duration,
            updated_at: new Date().toISOString()
          }));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, sessionPath);
      }
    } else {
      setState(prev => ({ 
        ...prev, 
        logs: [finalLog, ...prev.logs],
        projects: prev.projects.map(p => 
          p.id === log.project_id 
            ? { ...p, total_minutes: p.total_minutes + duration } 
            : p
        )
      }));
    }
  };

  const updateLog = async (id: string, updates: Partial<WorkshopLog> & { save_as_commitment?: boolean }) => {
    const { save_as_commitment, ...updateData } = updates;
    if (currentUser) {
      const userId = currentUser.uid;
      const path = `users/${userId}/sessions/${id}`;
      try {
        const logDoc = await getDoc(doc(db, 'users', userId, 'sessions', id));
        if (!logDoc.exists()) return;
        
        const oldLog = logDoc.data() as WorkshopLog;
        await updateDoc(doc(db, 'users', userId, 'sessions', id), sanitizeForFirestore(updateData));
        
        // Also update subcollection
        if (oldLog.project_id) {
          await setDoc(doc(db, 'users', userId, 'projects', oldLog.project_id, 'sessions', id), sanitizeForFirestore({ ...oldLog, ...updateData }), { merge: true });
        }

        // Auto-save updated next_steps as a Commitment in Firestore if they are modified
        if (updateData.next_steps && updateData.next_steps.trim() !== '' && updateData.next_steps.trim().toLowerCase() !== 'none detected.' && save_as_commitment !== false && updateData.next_steps !== oldLog.next_steps) {
          const commitmentId = Math.random().toString(36).substr(2, 9);
          const dateStr = updateData.date ? updateData.date.split('T')[0] : (oldLog.date ? oldLog.date.split('T')[0] : new Date().toISOString().split('T')[0]);
          
          const titleText = updateData.next_steps.length > 50 
            ? `${updateData.next_steps.substring(0, 47)}...` 
            : updateData.next_steps;

          const commitment = {
            id: commitmentId,
            title: titleText,
            date: dateStr,
            type: 'session' as any,
            project_id: updateData.project_id || oldLog.project_id,
            project_name: updateData.project_name || oldLog.project_name,
            reminder_set: false,
            notes: `Auto-generated from session updates: ${updateData.next_steps}`
          };
          
          await setDoc(doc(db, 'users', userId, 'calendarEvents', commitmentId), sanitizeForFirestore(commitment));
        }

        const oldDuration = oldLog.actual_duration_minutes || oldLog.duration_minutes || 0;
        const newDuration = updateData.actual_duration_minutes !== undefined ? updateData.actual_duration_minutes : 
                            (updateData.duration_minutes !== undefined ? updateData.duration_minutes : oldDuration);
        
        if (oldDuration !== newDuration) {
          const projectDoc = await getDoc(doc(db, 'users', userId, 'projects', oldLog.project_id));
          if (projectDoc.exists()) {
            const currentTotal = projectDoc.data().total_minutes || 0;
            await updateDoc(doc(db, 'users', userId, 'projects', oldLog.project_id), sanitizeForFirestore({
              total_minutes: currentTotal - oldDuration + newDuration,
              updated_at: new Date().toISOString()
            }));
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => {
        const oldLog = prev.logs.find(l => l.id === id);
        if (!oldLog) return prev;
        const newLogs = prev.logs.map(l => l.id === id ? { ...l, ...updates } : l);
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
    }
  };

  const archiveProject = async (id: string) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/projects/${id}`;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'projects', id), sanitizeForFirestore({ is_archived: true }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, is_archived: true } : p) }));
    }
  };

  const unarchiveProject = async (id: string) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/projects/${id}`;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'projects', id), sanitizeForFirestore({ is_archived: false }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, is_archived: false } : p) }));
    }
  };

  const deleteProject = async (id: string) => {
    if (currentUser) {
      const userId = currentUser.uid;
      const path = `users/${userId}/projects/${id}`;
      try {
        await deleteDoc(doc(db, 'users', userId, 'projects', id));
        // Also cleanup sessions
        const sessionsSnap = await getDocs(query(collection(db, 'users', userId, 'sessions')));
        sessionsSnap.forEach(async (sessionDoc) => {
          if (sessionDoc.data().project_id === id) {
            await deleteDoc(sessionDoc.ref);
          }
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== id),
        logs: prev.logs.filter(l => l.project_id !== id)
      }));
    }
  };

  const updateProfile = async (profile: Partial<ArtistProfile>) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/profiles/main`;
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'profiles', 'main'), sanitizeForFirestore(profile), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({ ...prev, artistProfile: { ...prev.artistProfile, ...profile } }));
    }
  };

  const addScheduleItem = async (item: Omit<ScheduleItem, 'id'>) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
    if (currentUser) {
      const path = `users/${currentUser.uid}/calendarEvents/${newItem.id}`;
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'calendarEvents', newItem.id), sanitizeForFirestore(newItem));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({ ...prev, schedule: [...prev.schedule, newItem] }));
    }
  };

  const updateScheduleItem = async (id: string, updates: Partial<ScheduleItem>) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/calendarEvents/${id}`;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'calendarEvents', id), sanitizeForFirestore(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({
        ...prev,
        schedule: prev.schedule.map(s => s.id === id ? { ...s, ...updates } : s)
      }));
    }
  };

  const removeScheduleItem = async (id: string) => {
    if (currentUser) {
      const path = `users/${currentUser.uid}/calendarEvents/${id}`;
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'calendarEvents', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setState(prev => ({ ...prev, schedule: prev.schedule.filter(s => s.id !== id) }));
    }
  };

  const toggleReminder = async (id: string, config?: any) => {
    const item = state.schedule.find(s => s.id === id);
    if (!item) return;
    
    const newState = !item.reminder_set;
    const updates: any = { reminder_set: newState };
    if (newState && config) {
      updates.reminder_config = config;
    } else if (!newState) {
      updates.reminder_config = null;
    }
    
    if (currentUser) {
      const path = `users/${currentUser.uid}/calendarEvents/${id}`;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'calendarEvents', id), sanitizeForFirestore(updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({ ...prev, schedule: prev.schedule.map(s => s.id === id ? { ...s, ...updates } : s) }));
    }
  };

  const addProtocolLog = async (log: Omit<ProtocolLog, 'id'>) => {
    const finalLog: ProtocolLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    
    if (currentUser) {
      const path = `users/${currentUser.uid}/protocolLogs/${finalLog.id}`;
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'protocolLogs', finalLog.id), sanitizeForFirestore(finalLog));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      setState(prev => ({ 
        ...prev, 
        protocolLogs: [finalLog, ...prev.protocolLogs]
      }));
    }
  };

  const addRecording = async (recording: { audio_base64: string, related_project_id?: string, duration_seconds?: number, transcript?: string }) => {
    const finalRecording = {
      ...recording,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };

    if (currentUser) {
      const path = `users/${currentUser.uid}/recordings/${finalRecording.id}`;
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'recordings', finalRecording.id), sanitizeForFirestore(finalRecording));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
    // Locally we don't have a recordings array in state, but we could add it.
    // For now, if specified in explicit triggers, we just save to Firestore.
  };

  const reorderProjects = (newProjects: Project[]) => {
    setState(prev => {
      const archived = prev.projects.filter(p => p.is_archived);
      return { ...prev, projects: [...newProjects, ...archived] };
    });
    // Reordering on Firestore is tricky without individual weights. 
    // We'll skip Firestore reordering for now or use a weights field if needed.
    // But since the state is updated locally, and projects are lists, we'll keep it as is.
  };

  const consumeTickets = (minutes: number = 1) => {
    const newUsedMinutes = state.tickets.usedMinutesThisWeek + minutes;
    const oldTicketsUsed = Math.floor(state.tickets.usedMinutesThisWeek / 5);
    const newTicketsUsed = Math.floor(newUsedMinutes / 5);
    
    // If we crossed a 5-minute threshold, we used another ticket.
    // However, user said "total 10 tickets". So total limit = 50 minutes.
    const remaining = Math.max(0, 10 - Math.ceil(newUsedMinutes / 5));

    setState(prev => ({
      ...prev,
      tickets: {
        ...prev.tickets,
        usedMinutesThisWeek: newUsedMinutes,
        remaining: remaining,
        totalUsed: prev.tickets.totalUsed + (newTicketsUsed - oldTicketsUsed)
      }
    }));
    if (currentUser) {
       const path = `users/${currentUser.uid}/profiles/main`;
       updateDoc(doc(db, 'users', currentUser.uid, 'profiles', 'main'), sanitizeForFirestore({
         'tickets.usedMinutesThisWeek': newUsedMinutes,
         'tickets.remaining': remaining,
         'tickets.totalUsed': state.tickets.totalUsed + (newTicketsUsed - oldTicketsUsed)
       })).catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }
  };

  const addTickets = (amount: number = 1) => {
    const newRemaining = state.tickets.remaining + amount;

    setState(prev => ({
      ...prev,
      tickets: {
        ...prev.tickets,
        remaining: newRemaining
      }
    }));
    if (currentUser) {
      const path = `users/${currentUser.uid}/profiles/main`;
      updateDoc(doc(db, 'users', currentUser.uid, 'profiles', 'main'), sanitizeForFirestore({
        'tickets.remaining': newRemaining
      })).catch(err => handleFirestoreError(err, OperationType.WRITE, path));
    }
  };

  return { 
    state, addEnergyCheckIn, addBlockStrategy, updateBlockStrategy, removeBlockStrategy, addProject, updateProject, updateProjectPhases, toggleProjectLock, addLog, updateLog, reorderProjects,
    archiveProject, unarchiveProject, deleteProject, updateProfile, addScheduleItem, 
    updateScheduleItem, removeScheduleItem, toggleReminder, addProtocolLog, consumeTickets, addTickets, addRecording,
    currentUser, isAuthLoading, signIn, signOut, signUp, signInWithEmail, deleteAccount
  };
};
