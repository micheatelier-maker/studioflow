import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';

const Auth: React.FC = () => {
  const { signUp, signInWithEmail, signIn } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name');
        await signUp(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f0d0c] z-[500] flex flex-col justify-center items-center px-6 overflow-y-auto">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-900/10 blur-[150px] rounded-full -z-10 animate-pulse"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-12"
      >
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 bg-orange-950/20 border border-orange-900/30 rounded-full">
            <span className="text-[10px] font-black uppercase text-orange-600 tracking-[0.3em]">Studio Access</span>
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-stone-100">
            Studio<br />Flow<span className="text-orange-600">.</span>
          </h1>
          <p className="text-stone-500 text-xs font-medium max-w-[240px] mx-auto leading-relaxed italic">
            Enter your creative workshop and map your studio intentions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <label className="text-stone-500 text-[10px] font-black uppercase tracking-widest ml-1">Stage Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-stone-900/40 border border-stone-800/60 rounded-2xl px-5 py-4 text-stone-100 placeholder:text-stone-700 focus:border-orange-900 focus:ring-1 focus:ring-orange-900/30 outline-none transition-all duration-300 font-medium text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-stone-500 text-[10px] font-black uppercase tracking-widest ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creative@example.com"
                className="w-full bg-stone-900/40 border border-stone-800/60 rounded-2xl px-5 py-4 text-stone-100 placeholder:text-stone-700 focus:border-orange-900 focus:ring-1 focus:ring-orange-900/30 outline-none transition-all duration-300 font-medium text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-stone-500 text-[10px] font-black uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-900/40 border border-stone-800/60 rounded-2xl px-5 py-4 text-stone-100 placeholder:text-stone-700 focus:border-orange-900 focus:ring-1 focus:ring-orange-900/30 outline-none transition-all duration-300 font-medium text-sm"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-rose-500 text-[10px] font-black uppercase tracking-widest bg-rose-950/20 px-4 py-2 rounded-xl border border-rose-900/20"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 rounded-[2.2rem] font-black text-xs uppercase tracking-[0.3em] bg-orange-800 border border-orange-700 text-white shadow-xl flex items-center justify-center space-x-3 active:scale-[0.97] transition-all duration-500 disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>{mode === 'login' ? 'Enter Studio' : 'Create Account'}</span>
            )}
          </button>
        </form>

        <div className="space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-800/40"></div>
            </div>
            <span className="relative px-4 bg-[#0f0d0c] text-[10px] font-black text-stone-700 uppercase tracking-widest">Or continue with</span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-4 rounded-2xl bg-stone-900/20 border border-stone-800/60 text-stone-300 font-bold text-sm flex items-center justify-center space-x-3 hover:bg-stone-900/40 active:scale-[0.98] transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google Account</span>
          </button>

          <div className="pt-4 text-center">
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-[10px] font-black uppercase text-stone-600 hover:text-orange-500 tracking-[0.2em] transition-colors"
            >
              {mode === 'login' ? 'First time in the workshop? Sign Up' : 'Already have a key? Log In'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
