import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface BusWindowViewProps {
  progress: number;
}

export function BusWindowView({ progress }: BusWindowViewProps) {
  // Day/Night cycle
  const isDay = progress < 40;
  const isDusk = progress >= 40 && progress < 60;
  const isNight = progress >= 60;

  let skyClass = "from-sky-300 to-sky-100";
  if (isDusk) skyClass = "from-orange-400 via-amber-300 to-purple-400";
  if (isNight) skyClass = "from-indigo-950 via-slate-900 to-black";

  // Pre-generate elements
  const skyline = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
    width: `${Math.random() * 40 + 30}px`,
    height: `${Math.random() * 60 + 30}%`,
    delay: `${-i * 4}s`,
    windows: Array.from({ length: 6 }).map(() => Math.random() > 0.5)
  })), []);

  const streetBuildings = useMemo(() => Array.from({ length: 8 }).map((_, i) => ({
    width: `${Math.random() * 120 + 80}px`,
    height: `${Math.random() * 30 + 40}%`,
    delay: `${-i * 3}s`,
    color: ['bg-red-900', 'bg-slate-800', 'bg-amber-900', 'bg-stone-800'][Math.floor(Math.random() * 4)],
    awning: ['bg-red-500', 'bg-blue-500', 'bg-green-600', 'bg-yellow-500'][Math.floor(Math.random() * 4)],
    windowsOn: Math.random() > 0.3
  })), []);

  const streetLights = useMemo(() => Array.from({ length: 6 }).map((_, i) => ({
    delay: `${-i * 2}s`
  })), []);

  // Speed logic
  let speedMultiplier = 1;
  if (progress < 5) speedMultiplier = progress / 5;
  else if (progress > 95) speedMultiplier = (100 - progress) / 5;
  
  const safeMultiplier = Math.max(speedMultiplier, 0.1);
  const bgDuration = `${40 / safeMultiplier}s`;
  const midDuration = `${15 / safeMultiplier}s`;
  const fgDuration = `${3 / safeMultiplier}s`;

  return (
    <div className="relative w-full max-w-lg aspect-[21/9] mx-auto rounded-lg bg-black border-[16px] border-[#1a1a1a] shadow-[inset_0_0_20px_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.6)] overflow-hidden isolate">
      <style>{`
        @keyframes bus-slide {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .bus-anim {
          position: absolute;
          animation-name: bus-slide;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .glow {
          box-shadow: 0 0 15px 5px rgba(253, 224, 71, 0.6);
        }
      `}</style>

      {/* Frame details */}
      <div className="absolute inset-0 border-2 border-white/10 rounded-[inherit] pointer-events-none z-50" />

      {/* Sky Background */}
      <div className={`absolute inset-0 bg-gradient-to-b ${skyClass} transition-colors duration-2000`} />

      {/* Background Skyline */}
      <div className="absolute inset-x-0 bottom-[30%] h-full opacity-60">
        {skyline.map((bldg, i) => (
          <div key={`skyline-${i}`} className="bus-anim bottom-0 bg-[#0f172a]" style={{ width: bldg.width, height: bldg.height, animationDuration: bgDuration, animationDelay: bldg.delay, right: 0 }}>
            {isNight && (
              <div className="w-full h-full p-1 flex flex-col gap-1">
                {bldg.windows.map((on, j) => (
                  <div key={j} className={`w-full h-2 ${on ? 'bg-yellow-200/60' : 'bg-transparent'}`} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Midground Street Buildings */}
      <div className="absolute inset-x-0 bottom-[15%] h-full">
        {streetBuildings.map((bldg, i) => (
          <div key={`street-${i}`} className={`bus-anim bottom-0 ${bldg.color} border-r border-black/50`} style={{ width: bldg.width, height: bldg.height, animationDuration: midDuration, animationDelay: bldg.delay, right: 0 }}>
            {/* Awning */}
            <div className={`absolute top-1/2 inset-x-0 h-4 ${bldg.awning} shadow-lg`} />
            {/* Shop Window */}
            <div className={`absolute bottom-2 inset-x-2 h-1/3 ${(isNight || isDusk) && bldg.windowsOn ? 'bg-yellow-100/80 glow' : 'bg-sky-900/60'}`} />
          </div>
        ))}
      </div>

      {/* Foreground Pavement & Road */}
      <div className="absolute inset-x-0 bottom-0 h-[20%] bg-zinc-800 border-t border-zinc-600" />
      <div className="absolute inset-x-0 bottom-0 h-[10%] bg-zinc-900" />

      {/* Street Lights */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {streetLights.map((light, i) => (
          <div key={`light-${i}`} className="bus-anim h-full right-0 flex flex-col items-center" style={{ animationDuration: fgDuration, animationDelay: light.delay }}>
            {/* Light Source */}
            <div className={`w-8 h-4 rounded-full mt-4 ${(isNight || isDusk) ? 'bg-yellow-100 glow' : 'bg-white/50'}`} />
            {/* Pole */}
            <div className="w-2 h-full bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Passing Cars Blur */}
      <div className="absolute inset-x-0 bottom-0 h-[15%] opacity-40 z-30 mix-blend-screen pointer-events-none">
        <div className="bus-anim bottom-2 w-32 h-2 bg-red-500 blur-md right-0" style={{ animationDuration: `${1 / safeMultiplier}s`, animationDelay: '0s' }} />
        <div className="bus-anim bottom-4 w-32 h-2 bg-white blur-md right-0" style={{ animationDuration: `${1.5 / safeMultiplier}s`, animationDelay: '-1s' }} />
      </div>

      {/* Glass Reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 rounded-[inherit] pointer-events-none z-50" />
      
      {/* Dirty window edge effect */}
      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none z-50" />
    </div>
  );
}
