
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TicketDisplayProps {
  remaining: number;
  max?: number;
  variant?: 'compact' | 'full';
  isSpending?: boolean;
}

const TicketDisplay: React.FC<TicketDisplayProps> = ({ 
  remaining, 
  max = 6, 
  variant = 'compact',
  isSpending = false 
}) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2 bg-stone-900/40 border border-stone-800/40 px-3 py-1.5 rounded-full backdrop-blur-md">
        <div className="flex -space-x-1">
          {Array.from({ length: Math.min(remaining, 3) }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 bg-orange-500 rounded-sm rotate-45 border border-orange-400/50 shadow-[0_0_8px_rgba(234,88,12,0.4)]"
            />
          ))}
          {remaining > 3 && (
            <div className="w-3 h-3 bg-orange-900/40 rounded-sm rotate-45 border border-orange-800/40 flex items-center justify-center ml-1">
              <span className="text-[6px] font-black text-orange-500 rotate-[-45deg]">+{remaining - 3}</span>
            </div>
          )}
        </div>
        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
          {remaining} {remaining === 1 ? 'Ticket' : 'Tickets'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end px-1">
        <h4 className="text-stone-600 text-[10px] font-black uppercase tracking-[0.3em]">AI Usage Tickets</h4>
        <span className="text-orange-600 text-[8px] font-black uppercase tracking-widest">
          {remaining} / {max} Remaining
        </span>
      </div>
      
      <div className="grid grid-cols-6 gap-2 bg-stone-900/20 p-4 rounded-3xl border border-stone-800/40">
        <AnimatePresence mode="popLayout">
          {Array.from({ length: max }).map((_, i) => {
            const isFilled = i < remaining;
            const isBeingSpent = isSpending && i === remaining - 1;
            
            return (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  backgroundColor: isFilled ? 'rgb(234 88 12 / 0.2)' : 'rgb(28 25 23 / 0.4)',
                  borderColor: isFilled ? 'rgb(234 88 12 / 0.4)' : 'rgb(41 37 36 / 0.4)'
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                className={`aspect-[3/4] rounded-lg border flex flex-col items-center justify-center relative overflow-hidden group`}
              >
                {isFilled && (
                  <motion.div
                    animate={isBeingSpent ? {
                      opacity: [0.4, 1, 0.4],
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-4 h-6 bg-orange-600 rounded-sm rotate-12 shadow-[0_0_15px_rgba(234,88,12,0.3)] flex items-center justify-center"
                  >
                    <div className="w-px h-3 bg-orange-400/50 mx-0.5"></div>
                    <div className="w-px h-3 bg-orange-400/50 mx-0.5"></div>
                  </motion.div>
                )}
                
                {!isFilled && (
                  <div className="w-4 h-6 border border-stone-800 rounded-sm rotate-12 opacity-20"></div>
                )}

                {isBeingSpent && (
                  <motion.div 
                    className="absolute inset-0 bg-orange-500/10"
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      <p className="text-stone-500 text-[9px] font-medium italic px-1">
        1 ticket = 5 minutes of Studio Ear processing.
      </p>
    </div>
  );
};

export default TicketDisplay;
