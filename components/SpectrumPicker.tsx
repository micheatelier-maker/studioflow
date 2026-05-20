
import React from 'react';

interface SpectrumPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

export const SpectrumPicker: React.FC<SpectrumPickerProps> = ({ color, onChange, label }) => {
  // Parsing for both HSL and HEX
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
            style={{ backgroundColor: color }}
          />
        </div>
      </div>

      <div className="space-y-6 px-1">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[7px] font-black uppercase text-stone-700 tracking-[0.2em]">
            <span>Hue Spectrum</span>
          </div>
          <div className="relative h-4 w-full">
            <div 
              className="absolute inset-0 w-full h-full rounded-full border border-stone-800/50 overflow-hidden"
              style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}
            />
            
            {/* Dot Indicator representing the selected hue */}
            <div 
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-stone-900 shadow-[0_2px_8px_rgba(0,0,0,0.5)] pointer-events-none flex items-center justify-center z-20"
              style={{ left: `${(h / 360) * 100}%` }}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" 
                style={{ backgroundColor: `hsl(${h}, 100%, 50%)` }}
              />
            </div>

            <input 
              type="range" 
              min="0" 
              max="360" 
              step="1"
              value={h}
              onChange={(e) => updateColor(parseInt(e.target.value), s, l)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[7px] font-black uppercase text-stone-700 tracking-[0.2em]">
            <span>Luminance Spectrum</span>
          </div>
          <div className="relative h-4 w-full">
            <div 
              className="absolute inset-0 w-full h-full rounded-full border border-stone-800/50 overflow-hidden"
              style={{ background: `linear-gradient(to right, #000, hsl(${h}, ${s}%, 50%), #fff)` }}
            />

            {/* Dot Indicator representing the selected luminance */}
            <div 
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-stone-900 shadow-[0_2px_8px_rgba(0,0,0,0.5)] pointer-events-none flex items-center justify-center z-20"
              style={{ left: `${l}%` }}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" 
                style={{ backgroundColor: `hsl(${h}, ${s}%, ${l}%)` }}
              />
            </div>

            <input 
              type="range" 
              min="0" 
              max="100" 
              step="1"
              value={l}
              onChange={(e) => updateColor(h, s, parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
