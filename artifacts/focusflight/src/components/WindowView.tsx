import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface WindowViewProps {
  progress: number;
}

export function WindowView({ progress }: WindowViewProps) {
  // Phase determination
  const isTakeoff = progress < 15;
  const isClimbing = progress >= 15 && progress < 35;
  const isCruising = progress >= 35 && progress < 65;
  const isDescent = progress >= 65 && progress < 85;
  const isFinal = progress >= 85;

  return (
    <div className="relative w-full max-w-md aspect-[4/5] mx-auto rounded-[40%] bg-sky-900 border-[24px] border-[#1a1a2e] shadow-[inset_0_0_40px_rgba(0,0,0,0.9),0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Inner Bezel */}
      <div className="absolute inset-0 border-[8px] border-[#2a2a3e] rounded-[inherit] pointer-events-none z-50 opacity-80" />
      <div className="absolute inset-0 border-[2px] border-white/10 rounded-[inherit] pointer-events-none z-50 m-2" />
      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] rounded-[inherit] pointer-events-none z-50" />
      
      {/* Scene Container */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-800 to-sky-300 transition-colors duration-1000">
        
        {/* Takeoff Scene */}
        {isTakeoff && (
          <motion.div 
            initial={{ y: 0 }}
            animate={{ y: '100%' }}
            transition={{ duration: 10, ease: "linear", repeat: Infinity }}
            className="absolute inset-x-0 h-[200%] bottom-0 flex flex-col"
          >
            <div className="flex-1 bg-[#4a5d23] relative">
               <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-8 border-l-4 border-r-4 border-dashed border-white/50" />
            </div>
          </motion.div>
        )}

        {/* Climbing Scene */}
        {(isClimbing || isTakeoff) && (
          <div className="absolute inset-0 opacity-80">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`cloud-climb-${i}`}
                initial={{ y: '-10%', x: Math.random() * 100 - 50 }}
                animate={{ y: '120%' }}
                transition={{ 
                  duration: 4 + Math.random() * 4, 
                  ease: "linear", 
                  repeat: Infinity,
                  delay: Math.random() * 4
                }}
                className="absolute top-0 w-32 h-16 bg-white/60 blur-md rounded-full"
                style={{ left: `${Math.random() * 80}%` }}
              />
            ))}
          </div>
        )}

        {/* Cruising Scene */}
        {isCruising && (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-[2] bg-gradient-to-b from-[#0d1b4b] to-blue-500" />
            <div className="flex-1 bg-white/90 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-200/20 blur-xl" />
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={`cloud-cruise-${i}`}
                  initial={{ x: '100%' }}
                  animate={{ x: '-100%' }}
                  transition={{ 
                    duration: 15 + Math.random() * 10, 
                    ease: "linear", 
                    repeat: Infinity,
                    delay: Math.random() * 5
                  }}
                  className="absolute top-2 w-64 h-20 bg-white blur-lg rounded-full"
                  style={{ top: `${Math.random() * 40}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Descent Scene */}
        {isDescent && (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 bg-gradient-to-b from-[#2d1b69] to-[#f97316]" />
            <div className="flex-1 bg-gray-900 relative overflow-hidden">
               <div className="absolute inset-0 opacity-50 blur-sm">
                 {[...Array(40)].map((_, i) => (
                   <motion.div
                     key={`city-light-descent-${i}`}
                     initial={{ y: '-20%' }}
                     animate={{ y: '120%' }}
                     transition={{ duration: 8, ease: "linear", repeat: Infinity, delay: Math.random() * 8 }}
                     className="absolute w-1.5 h-1.5 bg-yellow-400/80 rounded-full blur-[1px]"
                     style={{ left: `${Math.random() * 100}%` }}
                   />
                 ))}
               </div>
               {/* Passing Clouds */}
               {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`cloud-descent-${i}`}
                  initial={{ y: '120%' }}
                  animate={{ y: '-20%' }}
                  transition={{ 
                    duration: 6, 
                    ease: "linear", 
                    repeat: Infinity,
                    delay: Math.random() * 3
                  }}
                  className="absolute bottom-0 w-48 h-24 bg-white/30 blur-xl rounded-full"
                  style={{ left: `${Math.random() * 60}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Final Approach Scene */}
        {isFinal && (
          <div className="absolute inset-0 bg-gray-950 flex flex-col justify-end overflow-hidden">
            <motion.div 
              className="relative w-full h-[200%]"
              initial={{ y: 0, scale: 1 }}
              animate={{ y: '-50%', scale: 1.2 }}
              transition={{ duration: 15, ease: "easeOut" }}
            >
              {/* City Grid */}
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-12 gap-1 p-4 transform perspective-1000 rotateX-45">
                {[...Array(96)].map((_, i) => (
                  <div key={i} className="w-full h-full flex items-center justify-center">
                    {Math.random() > 0.3 && (
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" style={{ animationDelay: `${Math.random() * 2}s` }} />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

      </div>

      {/* Glass Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/20 rounded-[inherit] pointer-events-none z-50 mix-blend-overlay" />
    </div>
  );
}
