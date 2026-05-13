
import React, { useState, useMemo, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { AppState, ScheduleItem, ScheduleType, Project } from '../types';
import Calendar from './Calendar';

interface SchedulePageProps {
  state: AppState;
  onAddItem: (item: Omit<ScheduleItem, 'id'>) => void;
  onUpdateItem: (id: string, updates: Partial<ScheduleItem>) => void;
  onRemoveItem: (id: string) => void;
  onToggleReminder: (id: string, config?: any) => void;
  initialSelectedDate?: string | null;
  initialFocusedItemId?: string | null;
  autoOpenAddForm?: boolean;
  onFormOpened?: () => void;
}

export interface SchedulePageRef {
  openAddForm: () => void;
}

const ReminderPopup: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialDate?: string;
}> = ({ isOpen, onClose, onSave, initialDate }) => {
  const [type, setType] = useState<'advance' | 'specific'>('advance');
  const [advanceValue, setAdvanceValue] = useState('10m');
  const [specificDate, setSpecificDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [specificTime, setSpecificTime] = useState('09:00');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-950/90 z-[400] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1a1715] border border-stone-800 shadow-2xl rounded-[2.5rem] w-full max-w-sm p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-black text-stone-100 uppercase tracking-tight">Set Reminder</h2>
          <p className="text-stone-600 text-[10px] font-black uppercase tracking-widest mt-1">Don't miss a beat</p>
        </div>

        <div className="flex bg-stone-900/50 p-1 rounded-2xl border border-stone-800">
          <button 
            type="button"
            onClick={() => setType('advance')}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'advance' ? 'bg-orange-800 text-stone-100 shadow-lg' : 'text-stone-500 hover:text-stone-400'}`}
          >
            Advance
          </button>
          <button 
            type="button"
            onClick={() => setType('specific')}
            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'specific' ? 'bg-orange-800 text-stone-100 shadow-lg' : 'text-stone-500 hover:text-stone-400'}`}
          >
            Specific Time
          </button>
        </div>

        {type === 'advance' ? (
          <div className="space-y-4">
            <label className="block text-stone-600 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Time in Advance</label>
            <select 
              value={advanceValue} 
              onChange={e => setAdvanceValue(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 text-stone-100 outline-none focus:border-orange-900 transition-all text-sm appearance-none"
            >
              <option value="10m">10 Minutes Before</option>
              <option value="30m">30 Minutes Before</option>
              <option value="1h">1 Hour Before</option>
              <option value="2h">2 Hours Before</option>
              <option value="1d">1 Day Before</option>
            </select>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-600 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Date</label>
                <input 
                  type="date" 
                  value={specificDate}
                  onChange={e => setSpecificDate(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-4 py-4 text-stone-100 text-[10px] uppercase font-bold outline-none" 
                />
              </div>
              <div>
                <label className="block text-stone-600 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Time</label>
                <input 
                  type="time" 
                  value={specificTime}
                  onChange={e => setSpecificTime(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-4 py-4 text-stone-100 text-[10px] uppercase font-bold outline-none" 
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 py-4 bg-stone-900 text-stone-500 font-black uppercase text-[10px] rounded-2xl border border-stone-800 hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => onSave({ 
              type, 
              advance_value: type === 'advance' ? advanceValue : undefined,
              specific_date: type === 'specific' ? specificDate : undefined,
              specific_time: type === 'specific' ? specificTime : undefined
            })} 
            className="flex-[2] py-4 bg-orange-800 text-stone-100 font-black uppercase text-[10px] rounded-2xl border border-orange-700 shadow-xl shadow-orange-950/40 active:scale-95 transition-transform"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const SwipeableEventCard: React.FC<{
  item: ScheduleItem;
  onEdit: (item: ScheduleItem) => void;
  onToggleReminder: (id: string) => void;
  onRemove: (id: string) => void;
  isInitiallyExpanded?: boolean;
}> = ({ item, onEdit, onToggleReminder, onRemove, isInitiallyExpanded = false }) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
  const swipeRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isInitiallyExpanded && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isInitiallyExpanded]);

  const ACTIONS_WIDTH = 210; // 70px * 3 buttons
  const isProfileMilestone = item.id.startsWith('prof-');

  const onTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - startX;
    // Don't swipe if we are vertically scrolling or just tapping
    const newX = isOpen ? deltaX - ACTIONS_WIDTH : deltaX;
    
    if (newX > 0) {
      setCurrentX(newX * 0.2); 
    } else {
      setCurrentX(Math.max(newX, -ACTIONS_WIDTH - 50)); 
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - startX;
    
    // If it's a very small movement, skip swipe logic
    if (Math.abs(deltaX) < 5) {
      setCurrentX(0);
      return;
    }

    if (currentX < -ACTIONS_WIDTH / 2) {
      setCurrentX(-ACTIONS_WIDTH);
      setIsOpen(true);
    } else {
      setCurrentX(0);
      setIsOpen(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If user clicked a button inside, let it handle it
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    if (isOpen) {
      close();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const close = () => {
    setCurrentX(0);
    setIsOpen(false);
  };

  const getTypeColor = (type: ScheduleType) => {
    switch(type) {
      case 'deadline': return 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]';
      case 'session': return 'bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.4)]';
      case 'milestone': return 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
      default: return 'bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.4)]';
    }
  };

  const getTagStyle = (type: ScheduleType) => {
    switch(type) {
      case 'deadline': return 'bg-rose-950/30 text-rose-500 border-rose-900/20';
      case 'session': return 'bg-purple-950/30 text-purple-500 border-purple-900/20';
      case 'milestone': return 'bg-emerald-950/30 text-emerald-500 border-emerald-900/20';
      default: return 'bg-amber-950/30 text-amber-500 border-amber-900/20';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] group">
      {/* Background Actions */}
      <div className="absolute inset-0 flex justify-end items-stretch z-0">
        {!isProfileMilestone && (
          <button 
            onClick={() => { onEdit(item); close(); }}
            className="w-[70px] bg-stone-800 text-stone-300 flex flex-col items-center justify-center transition-opacity"
          >
            <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            <span className="text-[8px] font-black uppercase">Edit</span>
          </button>
        )}
        {isProfileMilestone && (
          <div className="w-[70px] bg-stone-900 text-stone-700 flex flex-col items-center justify-center italic">
            <span className="text-[7px] font-black uppercase text-center px-1">Meta Goal (Edit in Profile)</span>
          </div>
        )}
        <button 
          onClick={() => { !isProfileMilestone && onToggleReminder(item.id); close(); }}
          className={`w-[70px] flex flex-col items-center justify-center transition-all ${item.reminder_set ? 'bg-orange-800 text-white' : 'bg-stone-900 text-stone-500'} ${isProfileMilestone ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22a2.98 2.98 0 002.822-2H9.178a2.98 2.98 0 002.822 2zm7.758-6.11l-1.171-1.171a4.992 4.992 0 01-1.587-3.568V11a5 5 0 00-4-4.9V5a1 1 0 00-2 0v1.1a5 5 0 00-4 4.9v.151c0 1.326-.527 2.598-1.465 3.535l-1.171 1.171A1 1 0 005 17h14a1 1 0 00.758-1.11z" /></svg>
          <span className="text-[8px] font-black uppercase">{item.reminder_set ? 'On' : 'Remind'}</span>
        </button>
        <button 
          onClick={() => { !isProfileMilestone && onRemove(item.id); close(); }}
          className={`w-[70px] bg-rose-900 text-rose-100 flex flex-col items-center justify-center ${isProfileMilestone ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          <span className="text-[8px] font-black uppercase">Delete</span>
        </button>
      </div>

      {/* Foreground Card */}
      <div 
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
        style={{ transform: `translateX(${currentX}px)` }}
        className={`relative z-10 bg-[#1a1715] border border-stone-800/40 p-6 rounded-[2.5rem] shadow-xl transition-all duration-300 ease-out flex flex-col cursor-pointer ${isProfileMilestone ? 'border-l-4 border-l-emerald-600/50' : ''} ${isInitiallyExpanded ? 'ring-2 ring-orange-600 ring-offset-4 ring-offset-[#0f0d0c]' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={`w-1 h-8 rounded-full flex-shrink-0 mt-1 ${getTypeColor(item.type)}`}></div>
            <div className="space-y-1.5 flex-1 pr-4">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getTagStyle(item.type)}`}>
                  {item.type}
                </span>
                {item.project_name && <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">{item.project_name}</span>}
                {isProfileMilestone && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-950/20 px-2 py-0.5 rounded-lg">Studio Target</span>}
              </div>
              <h4 className="text-stone-100 text-lg font-bold tracking-tight leading-tight">{item.title}</h4>
            </div>
          </div>
          
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
             <svg className="w-5 h-5 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* Expanded Content */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
          <div className="pt-4 border-t border-stone-800/40 space-y-4">
            {item.notes ? (
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-stone-600">Intention & Notes</span>
                <p className="text-stone-400 text-sm italic font-medium leading-relaxed">{item.notes}</p>
              </div>
            ) : (
              <p className="text-stone-700 text-xs italic font-medium">No additional details recorded for this commitment.</p>
            )}
            
            <div className="flex items-center justify-between pt-2">
               <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest text-stone-700">Target Date</span>
                  <span className="text-stone-500 text-[10px] font-mono uppercase tracking-widest">
                    {new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
               </div>
               {item.reminder_set && (
                 <div className="flex flex-col items-end space-y-1">
                   <div className="flex items-center space-x-2 bg-orange-950/20 px-3 py-1 rounded-full border border-orange-900/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">Reminder Active</span>
                   </div>
                   {item.reminder_config && (
                     <span className="text-[8px] font-black text-stone-600 uppercase tracking-widest pr-2">
                       {item.reminder_config.type === 'advance' 
                         ? item.reminder_config.advance_value === '10m' ? '10 mins advance' :
                           item.reminder_config.advance_value === '30m' ? '30 mins advance' :
                           item.reminder_config.advance_value === '1h' ? '1 hour advance' :
                           item.reminder_config.advance_value === '2h' ? '2 hours advance' :
                           item.reminder_config.advance_value === '1d' ? '1 day advance' : item.reminder_config.advance_value
                         : `${new Date(item.reminder_config.specific_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @ ${item.reminder_config.specific_time}`}
                     </span>
                   )}
                 </div>
               )}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3 pt-6 border-t border-stone-800/40 mt-2">
              {!isProfileMilestone && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 bg-stone-900/60 hover:bg-stone-800 rounded-2xl border border-stone-800/40 text-stone-300 transition-all text-[9px] font-black uppercase tracking-widest group/btn"
                  >
                    <svg className="w-3.5 h-3.5 text-stone-600 group-hover/btn:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleReminder(item.id); }}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl border transition-all text-[9px] font-black uppercase tracking-widest ${item.reminder_set ? 'bg-orange-950/40 border-orange-900/40 text-orange-500' : 'bg-stone-900/60 border-stone-800/40 text-stone-500 hover:bg-stone-800'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22a2.98 2.98 0 002.822-2H9.178a2.98 2.98 0 002.822 2zm7.758-6.11l-1.171-1.171a4.992 4.992 0 01-1.587-3.568V11a5 5 0 00-4-4.9V5a1 1 0 00-2 0v1.1a5 5 0 00-4 4.9v.151c0 1.326-.527 2.598-1.465 3.535l-1.171 1.171A1 1 0 005 17h14a1 1 0 00.758-1.11z" /></svg>
                    <span>{item.reminder_set ? 'Alert On' : 'Remind'}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 bg-rose-950/20 hover:bg-rose-900/30 rounded-2xl border border-rose-900/20 text-rose-500 transition-all text-[9px] font-black uppercase tracking-widest"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    <span>Delete</span>
                  </button>
                </>
              )}
              {isProfileMilestone && (
                <div className="w-full text-center py-2 text-stone-600 text-[8px] font-black uppercase tracking-widest italic">
                  Managed via Artist Profile
                </div>
              )}
            </div>
          </div>
        </div>

        {!isExpanded && item.notes && (
          <p className="text-stone-500 text-xs italic font-medium leading-relaxed mt-2 line-clamp-1 ml-5 opacity-60">
            {item.notes}
          </p>
        )}
      </div>
    </div>
  );
};

const SchedulePage = forwardRef<SchedulePageRef, SchedulePageProps>(({ 
  state, 
  onAddItem, 
  onUpdateItem, 
  onRemoveItem, 
  onToggleReminder, 
  initialSelectedDate, 
  initialFocusedItemId,
  autoOpenAddForm,
   onFormOpened
 }, ref) => {
   const [showForm, setShowForm] = useState(false);
   const [editingItemId, setEditingItemId] = useState<string | null>(null);
   const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
   const [selectedDate, setSelectedDate] = useState<string | null>(initialSelectedDate || new Date().toISOString().split('T')[0]);
   const [selectedRange, setSelectedRange] = useState<string[]>([]);
   
   const [showReminderPopup, setShowReminderPopup] = useState(false);
   const [reminderTargetId, setReminderTargetId] = useState<string | null>(null);
   const [isReminderFormSource, setIsReminderFormSource] = useState(false);
 
   const [formData, setFormData] = useState({
     title: '',
     date: new Date().toISOString().split('T')[0],
     type: 'deadline' as ScheduleType,
     project_id: '',
     notes: '',
     reminder_set: false,
     reminder_config: null as any
   });

  useEffect(() => {
    if (initialSelectedDate) {
      setSelectedDate(initialSelectedDate);
      setCurrentCalendarDate(new Date(initialSelectedDate));
    }
  }, [initialSelectedDate]);

  useEffect(() => {
    if (autoOpenAddForm) {
      resetForm(selectedDate || undefined);
      setShowForm(true);
      onFormOpened?.();
    }
  }, [autoOpenAddForm, selectedDate, onFormOpened]);

  useImperativeHandle(ref, () => ({
    openAddForm: () => {
      resetForm(selectedDate || undefined);
      setShowForm(true);
    }
  }));

  const handleToggleReminder = (id: string) => {
    const item = mergedSchedule.find(i => i.id === id);
    if (!item) return;

    if (!item.reminder_set) {
      // Turning it ON
      setReminderTargetId(id);
      setIsReminderFormSource(false);
      setShowReminderPopup(true);
    } else {
      // Turning it OFF
      onToggleReminder(id);
    }
  };

  const handleReminderSave = (config: any) => {
    if (isReminderFormSource) {
      setFormData(prev => ({ ...prev, reminder_set: true, reminder_config: config }));
    } else if (reminderTargetId) {
      onToggleReminder(reminderTargetId, config);
    }
    setShowReminderPopup(false);
    setReminderTargetId(null);
    setIsReminderFormSource(false);
  };

  const handleReminderCancel = () => {
    if (isReminderFormSource) {
      setFormData(prev => ({ ...prev, reminder_set: false, reminder_config: null }));
    }
    setShowReminderPopup(false);
    setReminderTargetId(null);
    setIsReminderFormSource(false);
  };

  const resetForm = (date?: string) => {
    setFormData({
      title: '',
      date: date || new Date().toISOString().split('T')[0],
      type: 'deadline',
      project_id: '',
      notes: '',
      reminder_set: false,
      reminder_config: null
    });
    setEditingItemId(null);
    setShowForm(false);
  };

  const handleEdit = (item: ScheduleItem) => {
    setFormData({
      title: item.title,
      date: item.date.split('T')[0],
      type: item.type,
      project_id: item.project_id || '',
      notes: item.notes || '',
      reminder_set: item.reminder_set,
      reminder_config: item.reminder_config
    });
    setEditingItemId(item.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const project = state.projects.find(p => p.id === formData.project_id);
    const itemData = {
      ...formData,
      project_name: project?.name
    };

    if (editingItemId) {
      onUpdateItem(editingItemId, itemData);
    } else {
      onAddItem(itemData);
    }
    resetForm();
  };

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    
    if (d.getTime() === today.getTime()) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Merge regular schedule with profile meta-milestones
  const mergedSchedule = useMemo(() => {
    const profileMetaItems: ScheduleItem[] = state.artistProfile.deadlines.map(d => ({
      id: `prof-${d.id}`,
      title: d.title,
      date: d.date,
      type: 'milestone',
      reminder_set: false,
      notes: 'Studio Target set from Profile'
    }));

    return [...state.schedule, ...profileMetaItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [state.schedule, state.artistProfile.deadlines]);
  
  const groupedSchedule = useMemo(() => {
    return mergedSchedule.reduce((groups, item) => {
      const date = item.date.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    }, {} as Record<string, ScheduleItem[]>);
  }, [mergedSchedule]);

  const handleDateSelect = (dateStr: string, isShift?: boolean) => {
    if (isShift && selectedDate) {
      const start = new Date(selectedDate < dateStr ? selectedDate : dateStr);
      const end = new Date(selectedDate < dateStr ? dateStr : selectedDate);
      const range = [];
      const current = new Date(start);
      while (current <= end) {
        range.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      setSelectedRange(range);
    } else {
      setSelectedDate(dateStr);
      setSelectedRange([]);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + offset, 1);
    setCurrentCalendarDate(newDate);
  };

  const inputClasses = "w-full bg-[#1a1715] border border-stone-800/60 rounded-2xl px-5 py-4 text-stone-100 placeholder:text-stone-700 focus:border-orange-900 outline-none transition-all font-medium text-sm";
  const labelClasses = "block text-stone-600 text-[10px] font-black uppercase tracking-[0.2em] mb-2 ml-1";

  const selectedEvents = useMemo(() => {
    if (selectedRange.length > 0) {
      return selectedRange.flatMap(date => groupedSchedule[date] || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return selectedDate ? groupedSchedule[selectedDate] || [] : [];
  }, [selectedDate, selectedRange, groupedSchedule]);

  const displayDateLabel = useMemo(() => {
    if (selectedRange.length > 0) {
      const start = new Date(selectedRange[0]);
      const end = new Date(selectedRange[selectedRange.length - 1]);
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    return selectedDate ? getDayLabel(selectedDate) : '';
  }, [selectedDate, selectedRange]);

  return (
    <div className="pt-2 pb-32 animate-in fade-in duration-500 relative">
      <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
        {/* LEFT COLUMN: Calendar */}
        <div className="lg:sticky lg:top-4">
          <Calendar 
            currentCalendarDate={currentCalendarDate}
            onMonthChange={changeMonth}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            groupedSchedule={groupedSchedule}
            selectedRange={selectedRange}
          />
        </div>

        {/* RIGHT COLUMN: Commitments List */}
        <div className="space-y-12">
          {selectedDate && (
            <div className="space-y-5">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-stone-100 text-[10px] font-black uppercase tracking-[0.3em]">
                  {displayDateLabel}
                </h3>
                <button 
                  onClick={() => {
                    resetForm(selectedDate);
                    setShowForm(true);
                  }}
                  className="text-[9px] font-black uppercase tracking-widest text-orange-600 border border-orange-900/20 px-3 py-1 rounded-lg"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-4">
                {selectedEvents.length > 0 ? (
                  selectedEvents.map((item) => (
                    <SwipeableEventCard 
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onToggleReminder={handleToggleReminder}
                      onRemove={onRemoveItem}
                      isInitiallyExpanded={item.id === initialFocusedItemId}
                    />
                  ))
                ) : (
                  <div 
                    onClick={() => {
                      resetForm(selectedDate);
                      setShowForm(true);
                    }}
                    className="bg-stone-900/10 border-2 border-dashed border-stone-800 rounded-[2.5rem] p-10 text-center cursor-pointer hover:border-orange-900/30 transition-colors"
                  >
                    <p className="text-stone-600 text-sm italic font-medium mb-4">No goals recorded for this day.</p>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-900/10 px-6 py-3 rounded-2xl border border-orange-900/20">Add Commitment</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedDate && Object.keys(groupedSchedule).length > 0 && Object.keys(groupedSchedule).map((date) => (
            <div key={date} className="space-y-5">
              <h3 className="text-stone-600 text-[10px] font-black uppercase tracking-[0.3em] ml-2 sticky top-2 z-10 bg-[#0f0d0c]/80 backdrop-blur-md py-2">
                {getDayLabel(date)}
              </h3>
              <div className="space-y-4">
                {groupedSchedule[date].map((item) => (
                  <SwipeableEventCard 
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onToggleReminder={handleToggleReminder}
                    onRemove={onRemoveItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-stone-950/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-[#14110f] w-full max-w-md rounded-[3rem] p-8 border border-stone-800/60 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500 my-auto">
            <div className="text-center">
              <h2 className="text-2xl font-black text-stone-100">{editingItemId ? 'Update Commitment' : 'Set New Commitment'}</h2>
              <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest mt-1">{editingItemId ? 'Refining the plan' : 'commit to your dreams'}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className={labelClasses}>What is the goal?</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Final Weave, Exhibition, etc." className={inputClasses} />
              </div>
              
              <div>
                <label className={labelClasses}>Description / Context</label>
                <textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="The intention behind this goal..." 
                  className={inputClasses + " h-24 resize-none"}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Intent Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Item Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ScheduleType})} className={inputClasses + " appearance-none"}>
                    <option value="deadline">Deadline</option>
                    <option value="session">Session</option>
                    <option value="event">Event</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Attach Project</label>
                <select value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} className={inputClasses + " appearance-none"}>
                  <option value="">No Project Attachment</option>
                  {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3 p-4 bg-stone-900/40 rounded-2xl border border-stone-800/40">
                  <input 
                    type="checkbox" 
                    checked={formData.reminder_set} 
                    onChange={e => {
                      const checked = e.target.checked;
                      if (checked) {
                        setIsReminderFormSource(true);
                        setShowReminderPopup(true);
                      } else {
                        setFormData({...formData, reminder_set: false, reminder_config: null});
                      }
                    }} 
                    className="w-5 h-5 accent-orange-700" 
                    id="rem-check" 
                  />
                  <label htmlFor="rem-check" className="text-stone-400 text-xs font-bold select-none cursor-pointer">Set Studio Reminder</label>
                </div>
                {formData.reminder_set && formData.reminder_config && (
                  <div className="px-4 py-2 bg-orange-950/20 border border-orange-900/20 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2 duration-300">
                    <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest">
                      {formData.reminder_config.type === 'advance' 
                         ? formData.reminder_config.advance_value === '10m' ? '10 mins advance' :
                           formData.reminder_config.advance_value === '30m' ? '30 mins advance' :
                           formData.reminder_config.advance_value === '1h' ? '1 hour advance' :
                           formData.reminder_config.advance_value === '2h' ? '2 hours advance' :
                           formData.reminder_config.advance_value === '1d' ? '1 day advance' : formData.reminder_config.advance_value
                        : `${new Date(formData.reminder_config.specific_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @ ${formData.reminder_config.specific_time}`}
                    </span>
                    <button 
                      type="button"
                      onClick={() => { setIsReminderFormSource(true); setShowReminderPopup(true); }}
                      className="text-[8px] font-black uppercase text-stone-500 hover:text-orange-500 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => resetForm()} className="flex-1 py-4 bg-stone-900 text-stone-500 font-black uppercase text-[10px] rounded-2xl border border-stone-800">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-orange-800 text-stone-100 font-black uppercase text-[10px] rounded-2xl border border-orange-700 shadow-xl shadow-orange-950/40">{editingItemId ? 'Save Changes' : 'Save Commitment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReminderPopup 
        isOpen={showReminderPopup}
        onClose={handleReminderCancel}
        onSave={handleReminderSave}
        initialDate={selectedDate || undefined}
      />
    </div>
  );
});

export default SchedulePage;
