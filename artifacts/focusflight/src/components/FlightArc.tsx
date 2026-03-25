import React from 'react';
import { Plane } from 'lucide-react';
import { motion } from 'framer-motion';

interface FlightArcProps {
  progress: number; // 0 to 100
  fromCode: string;
  toCode: string;
}

export function FlightArc({ progress, fromCode, toCode }: FlightArcProps) {
  // We use a simple SVG viewBox 0 0 1000 200
  // Start point: 100, 150
  // End point: 900, 150
  // Control point for curve: 500, -50
  
  const pathD = "M 100 150 Q 500 -50 900 150";
  const pathLength = 850; // Approximate length for dash calculations
  
  // Calculate current position along the quadratic bezier
  // B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const t = progress / 100;
  const t1 = 1 - t;
  
  const x = (t1 * t1 * 100) + (2 * t1 * t * 500) + (t * t * 900);
  const y = (t1 * t1 * 150) + (2 * t1 * t * -50) + (t * t * 150);
  
  // Calculate angle for the plane
  // Derivative of bezier
  // dx/dt = 2(1-t)(P1x - P0x) + 2t(P2x - P1x)
  const dx = 2 * t1 * (500 - 100) + 2 * t * (900 - 500);
  const dy = 2 * t1 * (-50 - 150) + 2 * t * (150 - -50);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div className="w-full relative py-10">
      <div className="flex justify-between items-end absolute inset-0 px-4 md:px-10 pb-4 text-white font-display text-2xl md:text-4xl font-bold opacity-50 z-0">
        <span>{fromCode}</span>
        <span>{toCode}</span>
      </div>
      
      <svg viewBox="0 0 1000 200" className="w-full h-auto drop-shadow-[0_0_15px_rgba(79,195,247,0.3)] z-10 relative">
        {/* Background track */}
        <path 
          d={pathD} 
          fill="none" 
          stroke="rgba(255,255,255,0.1)" 
          strokeWidth="4" 
          strokeDasharray="10 15"
        />
        
        {/* Active progress track */}
        <motion.path 
          d={pathD} 
          fill="none" 
          stroke="hsl(var(--primary))" 
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={pathLength - (pathLength * progress / 100)}
          className="transition-all duration-1000 ease-linear"
        />

        {/* The Plane */}
        <g style={{ transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`, transition: 'transform 1s linear' }}>
          <circle cx="0" cy="0" r="15" fill="hsl(var(--primary))" className="animate-pulse opacity-20" />
          <foreignObject x="-16" y="-16" width="32" height="32" className="text-white">
             <Plane className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(79,195,247,1)]" />
          </foreignObject>
        </g>

        {/* Origin / Dest Markers */}
        <circle cx="100" cy="150" r="6" fill="white" />
        <circle cx="900" cy="150" r="6" fill={progress === 100 ? "hsl(var(--primary))" : "white"} />
      </svg>
    </div>
  );
}
