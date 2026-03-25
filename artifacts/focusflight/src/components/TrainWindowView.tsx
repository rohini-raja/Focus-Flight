import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface TrainWindowViewProps {
  progress: number;
}

export function TrainWindowView({ progress }: TrainWindowViewProps) {
  // Generate random scenery elements once
  const telegraphPoles = useMemo(() => Array.from({ length: 8 }).map((_, i) => ({
    delay: `${-i * 1.2}s`
  })), []);
  
  const backgroundHills = useMemo(() => Array.from({ length: 4 }).map((_, i) => ({
    width: `${Math.random() * 200 + 300}px`,
    height: `${Math.random() * 100 + 150}px`,
    left: `${i * 30}%`,
    opacity: 0.3 + Math.random() * 0.4
  })), []);
  
  const fields = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
    width: `${Math.random() * 100 + 150}px`,
    color: ['bg-green-700', 'bg-green-800', 'bg-emerald-900', 'bg-[#3b5323]'][Math.floor(Math.random() * 4)],
    delay: `${-i * 4}s`
  })), []);

  const buildings = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
    width: `${Math.random() * 60 + 40}px`,
    height: `${Math.random() * 80 + 40}px`,
    delay: `${-i * 2.5}s`,
    color: ['bg-[#2a2a2a]', 'bg-[#333]', 'bg-[#1f1f1f]'][Math.floor(Math.random() * 3)]
  })), []);

  // Determine speed and scene based on progress
  const isUrban = progress > 25 && progress < 75;
  const isStation = progress > 75;
  
  // Speed multiplier: slow at edges, fast in middle
  let speedMultiplier = 1;
  if (progress < 10) speedMultiplier = progress / 10;
  else if (progress > 90) speedMultiplier = (100 - progress) / 10;
  
  // Ensure we never divide by zero or have completely stopped animation until the very end
  const safeMultiplier = Math.max(speedMultiplier, 0.1);
  
  const bgDuration = `${60 / safeMultiplier}s`;
  const midDuration = `${20 / safeMultiplier}s`;
  const fgDuration = `${4 / safeMultiplier}s`;
  const blurDuration = `${0.5 / safeMultiplier}s`;

  return (
    <div className="relative w-full max-w-lg aspect-[3/2] mx-auto rounded-xl bg-sky-900 border-[24px] border-[#3e352f] shadow-[inset_0_0_30px_rgba(0,0,0,0.8),0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden isolate">
      <style>{`
        @keyframes slide-right-to-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes scroll-bg {
          0% { background-position: 0 0; }
          100% { background-position: -1000px 0; }
        }
        .anim-slide {
          position: absolute;
          animation-name: slide-right-to-left;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>

      {/* Chrome Bezel */}
      <div className="absolute inset-0 border-[4px] border-[#888] rounded-[inherit] pointer-events-none z-50 mix-blend-screen opacity-50" />
      <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.9)] rounded-[inherit] pointer-events-none z-50" />

      {/* Background (Sky & Mountains) */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${isUrban ? 'bg-gradient-to-b from-[#4a5568] to-[#1e293b]' : 'bg-gradient-to-b from-sky-400 to-sky-200'}`}>
        <div className="absolute bottom-1/3 inset-x-0 h-1/2 opacity-40 flex w-[200%]" style={{ animation: `slide-right-to-left ${bgDuration} linear infinite` }}>
          {backgroundHills.map((hill, i) => (
            <div key={i} className="absolute bottom-0 rounded-t-full bg-slate-800" style={{ width: hill.width, height: hill.height, left: hill.left, opacity: hill.opacity }} />
          ))}
          {/* Duplicate for seamless loop */}
          {backgroundHills.map((hill, i) => (
            <div key={`dup-${i}`} className="absolute bottom-0 rounded-t-full bg-slate-800" style={{ width: hill.width, height: hill.height, left: `calc(100% + ${hill.left})`, opacity: hill.opacity }} />
          ))}
        </div>
      </div>

      {/* Midground (Fields or Buildings) */}
      <div className="absolute inset-x-0 bottom-[15%] h-[45%]">
        {!isUrban ? (
          // Countryside Fields
          fields.map((field, i) => (
            <div key={`field-${i}`} className={`anim-slide h-full ${field.color} opacity-80 rounded-t-lg`} style={{ width: field.width, animationDuration: midDuration, animationDelay: field.delay, bottom: 0, right: 0 }} />
          ))
        ) : (
          // Urban Buildings
          buildings.map((bldg, i) => (
            <div key={`bldg-${i}`} className={`anim-slide ${bldg.color} border-t border-r border-white/10`} style={{ width: bldg.width, height: bldg.height, animationDuration: midDuration, animationDelay: bldg.delay, bottom: 0, right: 0 }}>
              {/* Windows */}
              <div className="w-full h-full flex flex-wrap gap-1 p-2 opacity-60">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div key={j} className="w-2 h-2 bg-yellow-200/40" />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ground Base */}
      <div className="absolute inset-x-0 bottom-0 h-[25%] bg-[#2a3026]" />

      {/* Foreground (Fence / Wall) */}
      <div className="absolute inset-x-0 bottom-[15%] h-[10%] bg-[#3d2a1d] border-t-4 border-[#2c1d12]" />

      {/* Telegraph Poles / Lamp Posts */}
      <div className="absolute inset-0 pointer-events-none">
        {telegraphPoles.map((pole, i) => (
          <div key={`pole-${i}`} className="anim-slide h-full w-4 bg-[#1a110a] right-0 shadow-[-10px_0_10px_rgba(0,0,0,0.3)] flex flex-col items-center" style={{ animationDuration: fgDuration, animationDelay: pole.delay }}>
            <div className="w-12 h-2 bg-[#1a110a] mt-10" />
            <div className="absolute top-[48px] w-[500px] h-px bg-black/40 origin-left rotate-[-5deg]" />
            <div className="absolute top-[48px] -left-[500px] w-[500px] h-px bg-black/40 origin-right rotate-[5deg]" />
          </div>
        ))}
      </div>

      {/* Very Near (Motion Blur ground) */}
      <div 
        className="absolute inset-x-0 bottom-0 h-[15%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0iIzM1MjcyMCIvPjxwYXRoIGQ9Ik0wIDEwaDQwdjRIMGdNMCAzMGg0MHY0SDB6IiBmaWxsPSIjMjAxNTEwIi8+PC9zdmc+')] opacity-80 blur-[2px]"
        style={{ animation: `scroll-bg ${blurDuration} linear infinite` }}
      />

      {/* Station Platform Overlay */}
      {isStation && (
        <div className="absolute inset-0 pointer-events-none z-40 mix-blend-multiply bg-[#8b7355]/30 transition-opacity duration-2000" />
      )}

      {/* Glass Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 rounded-[inherit] pointer-events-none z-50" />
    </div>
  );
}
