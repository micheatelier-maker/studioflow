
import React from 'react';

interface RainbowPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

const THEMES = [
  {
    name: "Earthy",
    colors: ["#451a03", "#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#3f6212", "#4d7c0f", "#166534"]
  },
  {
    name: "Deep Autumn",
    colors: ["#7f1d1d", "#991b1b", "#b91c1c", "#7c2d12", "#9a3412", "#c2410c", "#854d0e", "#a16207", "#365314", "#14532d"]
  },
  {
    name: "Neon Glow",
    colors: ["#ff0000", "#ff7300", "#fffb00", "#48ff00", "#00ffd5", "#002bff", "#7a00ff", "#ff00c8", "#00ffff", "#00ff00"]
  },
  {
    name: "Pastel",
    colors: ["#fecaca", "#fed7aa", "#fef08a", "#dcfce7", "#ccfbf1", "#cffafe", "#dbeafe", "#e0e7ff", "#f3e8ff", "#fce7f3"]
  },
  {
    name: "Oceanic",
    colors: ["#0c4a6e", "#075985", "#0369a1", "#0284c7", "#0ea5e9", "#1e3a8a", "#1e40af", "#3b82f6", "#155e75", "#0891b2"]
  },
  {
    name: "Midnight",
    colors: ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#2e1065", "#4c1d95", "#5b21b6", "#1e1b4b", "#312e81"]
  }
];

export const RainbowPicker: React.FC<RainbowPickerProps> = ({ color, onChange, label }) => {
  // Robust parsing for both HSL and HEX
  const getHslValues = (c: string) => {
    if (c.startsWith('hsl')) {
      const matches = c.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (matches) return [parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])];
    } else if (c.startsWith('#')) {
      const hex = c.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h = Math.round(h * 60);
        s = Math.round(s * 100);
        l = Math.round(l * 100);
      }
      return [h, s, l];
    }
    return [0, 70, 50]; // Fallback
  };

  const [h, s, l] = getHslValues(color);

  const updateColor = (newH: number, newS: number, newL: number) => {
    onChange(`hsl(${newH}, ${newS}%, ${newL}%)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{label}</span>
        <div className="flex items-center space-x-2 bg-stone-900/60 px-3 py-1 rounded-full border border-stone-800/40">
          <span className="text-[8px] font-mono text-stone-500 uppercase tracking-tighter">{h}°, {s}%, {l}%</span>
          <div 
            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
            style={{ backgroundColor: color.startsWith('hsl') ? color : color }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {THEMES.map((theme) => (
          <div key={theme.name} className="space-y-2.5">
            <h4 className="text-[7px] font-black uppercase text-stone-600 tracking-[0.2em] ml-1">{theme.name}</h4>
            <div className="grid grid-cols-5 gap-2.5">
              {theme.colors.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange(c)}
                  className={`aspect-square w-full rounded-2xl border-2 transition-all duration-300 relative group ${color.toLowerCase() === c.toLowerCase() ? 'border-orange-600 scale-95 shadow-lg shadow-orange-900/20' : 'border-stone-800/40 hover:border-stone-700'}`}
                  style={{ backgroundColor: c }}
                >
                  <div className={`absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  {color.toLowerCase() === c.toLowerCase() && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-600 rounded-full border-2 border-[#1a1715] flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="space-y-5 px-1 pt-4 border-t border-stone-800/40">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[7px] font-black uppercase text-stone-700 tracking-[0.2em]">
            <span>Fine Tune Tone</span>
          </div>
          {/* Spectrum Slider */}
          <div className="relative h-3 w-full rounded-full overflow-hidden border border-stone-800/50">
            <input 
              type="range" 
              min="0" 
              max="360" 
              step="1"
              value={h}
              onChange={(e) => updateColor(parseInt(e.target.value), s, l)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute inset-0 w-full h-full"
              style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="relative h-3 w-full rounded-full overflow-hidden border border-stone-800/50">
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="1"
              value={l}
              onChange={(e) => updateColor(h, s, parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute inset-0 w-full h-full"
              style={{ background: `linear-gradient(to right, #000, hsl(${h}, ${s}%, 50%), #fff)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
