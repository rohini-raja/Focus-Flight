import React, { useMemo } from 'react';
import { formatTime } from '@/utils/flight-utils';
import { SessionConfig } from '@/utils/flight-utils';

interface FlightDataPanelProps {
  progress: number;
  timeLeft: number;
  totalSeconds: number;
  activeSession: SessionConfig;
}

export function FlightDataPanel({ progress, timeLeft, totalSeconds, activeSession }: FlightDataPanelProps) {
  const data = useMemo(() => {
    // Speed calculation
    let speed = 0;
    if (progress < 10) speed = (progress / 10) * 350;
    else if (progress < 30) speed = 350 + ((progress - 10) / 20) * 197; // 350 to 547
    else if (progress < 60) speed = 547;
    else if (progress < 85) speed = 547 - ((progress - 60) / 25) * 197; // 547 to 350
    else speed = 350 - ((progress - 85) / 15) * 170; // 350 to 180

    // Altitude calculation
    let alt = 0;
    if (progress < 30) alt = (progress / 30) * 38400;
    else if (progress < 60) alt = 38400;
    else alt = 38400 - ((progress - 60) / 40) * 38400;

    // Distance remaining
    const totalDist = activeSession.distance || 0;
    const distRem = Math.max(0, totalDist * (1 - progress / 100));

    // Timezone mock
    const tzOffsets = ['UTC -8:00', 'UTC -5:00', 'UTC ±0:00', 'UTC +2:00', 'UTC +5:30', 'UTC +9:00'];
    const tzIdx = Math.floor((progress / 100) * (tzOffsets.length - 1));
    const timezone = tzOffsets[tzIdx] || tzOffsets[0];

    return {
      speed: Math.round(speed),
      alt: Math.round(alt),
      dist: Math.round(distRem),
      timezone
    };
  }, [progress, activeSession.distance]);

  return (
    <div className="glass-panel p-6 rounded-2xl w-full max-w-md font-mono text-sm border border-white/20 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-50" />
      
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-primary font-bold tracking-widest">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          FLIGHT DATA
        </div>
        <div className="text-xs text-muted-foreground">TELEM_LINK_ACTIVE</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Gnd Speed</div>
          <div className="text-xl font-bold text-white">{data.speed} <span className="text-xs text-white/50 font-normal">kts</span></div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">ETA</div>
          <div className="text-xl font-bold text-white">{formatTime(timeLeft)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Alt</div>
          <div className="text-xl font-bold text-white">{data.alt.toLocaleString()} <span className="text-xs text-white/50 font-normal">ft</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Dist Remaining</div>
          <div className="text-lg font-bold text-white">{data.dist.toLocaleString()} <span className="text-xs text-white/50 font-normal">km</span></div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Timezone</div>
          <div className="text-lg font-bold text-white">{data.timezone}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-right w-12 font-bold text-primary">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
