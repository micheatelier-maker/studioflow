
import React from 'react';

interface RainbowPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

export const RainbowPicker: React.FC<RainbowPickerProps> = ({ color, onChange, label }) => {
  // Robust parsing for both HSL and HEX
  const getHslValues = (c: string) => {
    if (c.startsWith('hsl')) {
      const matches = c.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (matches) return [parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])];
    } else if (c.startsWith('#')) {
      const r = parseInt(c.slice(1, 3), 16) / 255;
      const g = parseInt(c.slice(3, 5), 16) / 255;
      const b = parseInt(c.slice(5, 7), 16) / 255;
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
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-black uppercase text-stone-600 tracking-widest">{label}</span>
        <div className="flex items-center space-x-2 bg-stone-900/60 px-3 py-1 rounded-full border border-stone-800/40">
          <span className="text-[8px] font-mono text-stone-500 uppercase tracking-tighter">{h}°, {s}%, {l}%</span>
          <div 
            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
            style={{ backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }}
          />
        </div>
      </div>
      
      <div className="space-y-5 px-1">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[7px] font-black uppercase text-stone-700 tracking-[0.2em]">
            <span>Spectrum</span>
          </div>
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
          <div className="flex justify-between items-center text-[7px] font-black uppercase text-stone-700 tracking-[0.2em]">
            <span>Saturation</span>
          </div>
          <div className="relative h-3 w-full rounded-full overflow-hidden border border-stone-800/50">
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="1"
              value={s}
              onChange={(e) => updateColor(h, parseInt(e.target.value), l)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute inset-0 w-full h-full"
              style={{ background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[7px] font-black uppercase text-stone-700 tracking-[0.2em]">
            <span>Luminance</span>
          </div>
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
