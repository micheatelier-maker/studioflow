
import React, { useMemo } from 'react';
import { ScheduleItem } from '../types';

interface CalendarProps {
  currentCalendarDate: Date;
  onMonthChange: (offset: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string, isShift?: boolean) => void;
  groupedSchedule: Record<string, ScheduleItem[]>;
  selectedRange?: string[];
}

const Calendar: React.FC<CalendarProps> = ({ 
  currentCalendarDate, 
  onMonthChange, 
  selectedDate, 
  onDateSelect,
  groupedSchedule,
  selectedRange = []
}) => {
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) {
        days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = new Date(year, month, i);
        const dateStr = date.toISOString().split('T')[0];
        const isSelected = dateStr === selectedDate || selectedRange.includes(dateStr);
        days.push({
            day: i,
            dateStr,
            hasEvents: !!groupedSchedule[dateStr],
            isToday: dateStr === new Date().toISOString().split('T')[0],
            isSelected
        });
    }
    return days;
  }, [currentCalendarDate, groupedSchedule, selectedDate, selectedRange]);

  return (
    <section className="bg-[#1a1715] rounded-[2.5rem] border border-stone-800/40 p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-6 px-2">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-stone-100">
          {currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex space-x-2">
          <button onClick={() => onMonthChange(-1)} className="p-2 text-stone-500 hover:text-stone-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => onMonthChange(1)} className="p-2 text-stone-500 hover:text-stone-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={`${day}-${i}`} className="text-center text-[8px] font-black text-stone-600 uppercase tracking-widest py-1">{day}</div>
        ))}
        {calendarDays.map((d, i) => (
          <button 
            key={i} 
            onClick={(e) => d && onDateSelect(d.dateStr, e.shiftKey)}
            className="aspect-square flex flex-col items-center justify-center relative active:scale-90 transition-transform"
          >
            {d && (
              <>
                <div className={`w-full h-full flex items-center justify-center rounded-xl text-[10px] font-bold transition-all ${d.isSelected ? 'bg-orange-800 text-stone-100 shadow-lg scale-105' : d.isToday ? 'border border-orange-700 text-orange-500' : 'text-stone-400'}`}>
                  {d.day}
                </div>
                {d.hasEvents && (
                  <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${d.isSelected ? 'bg-stone-100' : 'bg-orange-500'}`}></div>
                )}
              </>
            )}
          </button>
        ))}
      </div>
    </section>
  );
};

export default Calendar;
