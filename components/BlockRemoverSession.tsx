import React, { useState, useEffect, useMemo, useRef } from 'react';

interface BlockRemoverSessionProps {
  name: string;
  durationMinutes: number;
  onCancel: () => void;
  onComplete: (reflection?: string, reflectionType?: 'voice' | 'text') => void;
}

const MOTIVATIONAL_MESSAGES = [
  "Be proud of yourself for nurturing your creative energy.",
  "Momentum unlocked.",
  "You showed up. That matters.",
  "Small action. Big shift.",
  "Creative resistance cleared.",
  "Your future self thanks you.",
  "The block has been transmuted.",
  "Flow state is within reach."
];

const ACTIVE_SAYINGS = [
  "Nurturing Creative Energy",
  "Regulating Nervous System",
  "Breaking Demand Avoidance",
  "Triggering Diffuse Mode",
  "Clearing Cognitive Fog",
  "Resetting Creative Baseline",
  "Dissolving Resistance",
  "Reclaiming Focus"
];

const BlockRemoverSession: React.FC<BlockRemoverSessionProps> = ({ 
  name, 
  durationMinutes, 
  onCancel, 
  onComplete 
}) => {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [isActive, setIsActive] = useState(true);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  const [activeSayingIdx, setActiveSayingIdx] = useState(0);
  const [reflectionMode, setReflectionMode] = useState<'none' | 'voice' | 'keyboard'>('none');
  const [reflectionText, setReflectionText] = useState('');
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const dnaCanvasRef = useRef<HTMLCanvasElement>(null);

  const isDone = secondsLeft === 0;

  useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => {
      setActiveSayingIdx((prev) => (prev + 1) % ACTIVE_SAYINGS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isDone]);

  const randomMessage = useMemo(() => {
    return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  // Electrical Energy Squiggle Animation
  useEffect(() => {
    if (isDone || !dnaCanvasRef.current) return;
    const canvas = dnaCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 130;
      const points = 240; // Increased points for higher resolution "electricity"
      const totalSeconds = durationMinutes * 60;
      const progress = 1 - (secondsLeft / totalSeconds);
      
      phase += 0.04; // Faster phase for more energy

      const colors = ['#ea580c', '#c2410c', '#f97316', '#7c2d12', '#431407'];
      
      colors.forEach((color, strandIdx) => {
        ctx.beginPath();
        // Electrical lines flicker in width
        const flickerWidth = 0.5 + Math.random() * 0.8;
        ctx.lineWidth = flickerWidth;
        ctx.strokeStyle = color;
        
        // Occasional intensity surges
        const isSurging = Math.sin(phase * 2 + strandIdx) > 0.92;
        ctx.globalAlpha = isSurging ? 0.9 : (0.3 + (strandIdx * 0.1));

        const segmentCount = Math.floor(points * progress);

        for (let i = 0; i <= segmentCount; i++) {
          const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
          
          // Electrical "Noise": Combining multiple high-frequency sine waves
          // Base wave
          const base = Math.sin(i * 0.1 + phase * (1 + strandIdx * 0.1)) * 5;
          // High frequency jitter (Harmonics)
          const harmonic1 = Math.sin(i * 0.5 + phase * 8) * 3;
          const harmonic2 = Math.sin(i * 1.2 - phase * 12) * 1.5;
          // Random tiny jitter
          const jitter = (Math.random() - 0.5) * 2;
          
          const currentRadius = radius + base + harmonic1 + harmonic2 + jitter + (strandIdx * 5);
          
          const x = centerX + Math.cos(angle) * currentRadius;
          const y = centerY + Math.sin(angle) * currentRadius;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Add glow to surging strands
        if (isSurging) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.stroke();

        // Leading edge "Arc" node
        if (segmentCount > 0) {
           const endAngle = (segmentCount / points) * Math.PI * 2 - Math.PI / 2;
           const base = Math.sin(segmentCount * 0.1 + phase * (1 + strandIdx * 0.1)) * 5;
           const harmonic1 = Math.sin(segmentCount * 0.5 + phase * 8) * 3;
           const harmonic2 = Math.sin(segmentCount * 1.2 - phase * 12) * 1.5;
           const jitter = (Math.random() - 0.5) * 2;
           
           const curR = radius + base + harmonic1 + harmonic2 + jitter + (strandIdx * 5);
           const ex = centerX + Math.cos(endAngle) * curR;
           const ey = centerY + Math.sin(endAngle) * curR;
           
           ctx.beginPath();
           ctx.fillStyle = color;
           ctx.globalAlpha = 0.9;
           // Leading point "arcs" or sparks
           const arcSize = isSurging ? 3.5 : 2;
           ctx.arc(ex, ey, arcSize, 0, Math.PI * 2);
           ctx.fill();
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isDone, secondsLeft, durationMinutes]);

  // Celebration logic: Sound and Sparks
  useEffect(() => {
    if (isDone && !hasPlayedSound) {
      const audio = new Audio('https://actions.google.com/sounds/v1/cartoon/clown_horn.ogg');
      audio.volume = 0.4;
      audio.play().catch(() => console.log('Audio playback blocked by browser'));
      setHasPlayedSound(true);
      startSparks();
    }
  }, [isDone, hasPlayedSound]);

  const startSparks = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#f97316', '#fb923c', '#fdba74', '#ffffff', '#ea580c'];

    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: Math.random() * 2 + 1,
        life: 1,
        decay: Math.random() * 0.02 + 0.01,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let animationId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; 
        p.life -= p.decay;

        if (p.life > 0) {
          ctx.beginPath();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
        }
      });
      
      if (particles.some(p => p.life > 0)) {
        animationId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    draw();

    setTimeout(() => {
      cancelAnimationFrame(animationId);
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 z-[300] flex flex-col items-center justify-between p-10 safe-area-top safe-area-bottom animate-in fade-in duration-500 transition-colors duration-1000 ${isDone ? 'bg-emerald-950/40 backdrop-blur-md' : 'bg-[#0f0d0c]'}`}>
      <canvas ref={confettiCanvasRef} className="absolute inset-0 pointer-events-none z-[310]" />
      
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${isDone ? 'bg-emerald-500/20' : 'bg-orange-950/10'}`}></div>
      
      <header className="w-full text-center space-y-3 relative z-10">
        <div className="space-y-1">
          <span className="text-stone-600 text-[9px] font-black uppercase tracking-[0.4em]">Current Block Remover</span>
          <h2 className={`font-black text-3xl tracking-tighter transition-colors duration-1000 ${isDone ? 'text-emerald-400' : 'text-stone-100'}`}>{name}</h2>
        </div>
        {!isDone && (
          <p className="text-stone-500 text-xs font-medium italic max-w-[240px] mx-auto leading-relaxed">
            Breathe. Regulate. The studio will wait for your return.
          </p>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
        {isDone ? (
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-700 w-full max-w-sm">
            <div className="space-y-2">
              <h1 className="text-5xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">Protocol Complete.</h1>
              <div className="w-12 h-1 bg-emerald-500 mx-auto rounded-full"></div>
            </div>
            
            <p className="text-stone-200 text-lg font-medium italic max-w-xs mx-auto leading-relaxed">
              "{randomMessage}"
            </p>

            {reflectionMode === 'none' ? (
              <div className="space-y-4 pt-4">
                <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.2em]">How do you feel now?</p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setReflectionMode('voice')}
                    className="flex flex-col items-center justify-center space-y-3 bg-stone-900/40 border border-stone-800 p-6 rounded-[2rem] hover:bg-stone-900/60 transition-all active:scale-95 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-rose-950/30 border border-rose-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3z" /></svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Voice Memo</span>
                  </button>
                  <button 
                    onClick={() => setReflectionMode('keyboard')}
                    className="flex flex-col items-center justify-center space-y-3 bg-stone-900/40 border border-stone-800 p-6 rounded-[2rem] hover:bg-stone-900/60 transition-all active:scale-95 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-950/30 border border-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Keyboard</span>
                  </button>
                </div>
                <button 
                  onClick={() => onComplete()}
                  className="text-stone-600 text-[9px] font-black uppercase tracking-widest hover:text-stone-400 transition-colors"
                >
                  Skip Reflection
                </button>
              </div>
            ) : reflectionMode === 'keyboard' ? (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <textarea 
                  autoFocus
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="What shifted? (Optional)"
                  className="w-full bg-stone-900/60 border border-stone-800 rounded-[1.5rem] p-5 text-stone-100 placeholder:text-stone-700 outline-none focus:border-emerald-900/50 transition-all text-sm min-h-[120px] resize-none font-medium italic"
                />
                <button 
                  onClick={() => onComplete(reflectionText, 'text')}
                  className="w-full py-4 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
                >
                  Save & Return
                </button>
              </div>
            ) : (
              <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-2 border-rose-500/40 animate-ping"></div>
                    <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3z" /></svg>
                  </div>
                  <div className="text-center">
                    <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Recording Reflection...</p>
                    <p className="text-stone-500 text-[9px] font-medium italic mt-1">Speak freely. Your thoughts are safe.</p>
                  </div>
                </div>
                <button 
                  onClick={() => onComplete('[Voice Reflection Recorded]', 'voice')}
                  className="w-full py-4 bg-rose-600 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-xl shadow-rose-900/20 active:scale-95 transition-all"
                >
                  Stop & Save
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-80 h-80 flex items-center justify-center animate-breath">
            <canvas 
              ref={dnaCanvasRef} 
              width={320} 
              height={320} 
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            <div className="text-center space-y-1 relative z-10">
              <div className="text-8xl font-black tabular-nums tracking-tighter text-stone-100 drop-shadow-[0_0_30px_rgba(234,88,12,0.2)]">
                {formatTime(secondsLeft)}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="w-full relative z-10 flex flex-col items-center space-y-8">
        {isDone ? null : (
          <div className="w-full flex flex-col items-center space-y-6">
            <div className="relative group">
              {/* Studio Recording Light Styling */}
              <div className="absolute -inset-1 bg-red-600/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative flex items-center justify-center bg-[#1a1715] border border-red-900/40 px-8 py-3 rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] min-w-[240px]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_10px_#ef4444] animate-pulse mr-3"></div>
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)] transition-all duration-500">
                  {ACTIVE_SAYINGS[activeSayingIdx]}
                </span>
              </div>
            </div>

            <button 
              onClick={onCancel}
              className="text-[10px] font-black uppercase text-stone-700 tracking-[0.2em] hover:text-stone-400 transition-colors"
            >
              End Early
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};

export default BlockRemoverSession;