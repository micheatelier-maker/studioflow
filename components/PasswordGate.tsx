
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('studio_flow_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'lambchop.makes') {
      setIsAuthenticated(true);
      localStorage.setItem('studio_flow_auth', 'true');
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };


  if (isAuthenticated === null) return "AH shiiiiiet this ain't workin";

  if (isAuthenticated) {
    return <>{children}</>;
  }
  

  return (
    <div className="fixed inset-0 bg-[#0f0d0c] z-[1000] flex items-center justify-center p-6 font-sans overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-900/20 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-12 relative z-10"
      >
        <div className="text-center space-y-4">
          <div className="inline-block p-4 rounded-3xl bg-stone-900/50 border border-stone-800/50 mb-4">
            <svg className="w-10 h-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-stone-50">
            Studio Flow<span className="text-orange-600">.</span>
          </h1>
          <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.4em]">Secure Access Required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter access key"
              className={`w-full bg-stone-900/50 border ${error ? 'border-rose-900/50' : 'border-stone-800/50'} rounded-[2rem] px-8 py-6 text-stone-100 placeholder:text-stone-700 outline-none focus:border-orange-900/30 transition-all font-black text-center tracking-[0.3em] text-sm backdrop-blur-sm`}
              autoFocus
            />
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center pt-2"
                >
                  Invalid Access Key
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            className="w-full py-6 bg-stone-100 text-black font-black uppercase text-xs tracking-[0.4em] rounded-[2rem] active:scale-95 transition-all shadow-2xl shadow-black/50 border border-white/10"
          >
            Unlock Studio
          </button>
        </form>

        <div className="text-center">
          <p className="text-stone-700 text-[9px] font-black uppercase tracking-widest">
            Handcrafted for creative flow
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PasswordGate;
