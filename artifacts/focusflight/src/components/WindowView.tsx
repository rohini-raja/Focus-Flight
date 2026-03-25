import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Pre-generate random data for clouds and stars
  const climbClouds = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      left: `${Math.random() * 80 + 10}%`,
      width: `${Math.random() * 40 + 60}px`,
      height: `${Math.random() * 20 + 30}px`,
      delay: `${Math.random() * -10}s`,
      duration: `${4 + Math.random() * 4}s`,
      opacity: 0.4 + Math.random() * 0.4,
      isNear: i < 4
    }));
  }, []);

  const cruiseClouds = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      top: `${Math.random() * 30 + 50}%`,
      width: `${Math.random() * 100 + 150}px`,
      height: `${Math.random() * 40 + 40}px`,
      delay: `${Math.random() * -20}s`,
      duration: `${15 + Math.random() * 15}s`,
      opacity: 0.6 + Math.random() * 0.4
    }));
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 30}%`,
      size: `${Math.random() * 2 + 1}px`,
      opacity: Math.random() * 0.8 + 0.2
    }));
  }, []);

  const descentClouds = useMemo(() => {
    return Array.from({ length: 6 }).map(() => ({
      left: `${Math.random() * 80 + 10}%`,
      width: `${Math.random() * 80 + 100}px`,
      height: `${Math.random() * 40 + 50}px`,
      delay: `${Math.random() * -10}s`,
      duration: `${5 + Math.random() * 3}s`,
      opacity: 0.3 + Math.random() * 0.3
    }));
  }, []);

  const descentCityLights = useMemo(() => {
    return Array.from({ length: 60 }).map(() => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * -10}s`,
      duration: `${8 + Math.random() * 4}s`,
      opacity: 0.4 + Math.random() * 0.6,
      size: `${Math.random() * 2 + 1}px`
    }));
  }, []);

  const finalCityLights = useMemo(() => {
    return Array.from({ length: 120 }).map(() => ({
      active: Math.random() > 0.4,
      delay: `${Math.random() * 3}s`,
      color: Math.random() > 0.8 ? 'bg-orange-500' : 'bg-amber-400'
    }));
  }, []);

  return (
    <div className="relative w-full max-w-md aspect-[4/5] mx-auto rounded-[40%/45%] bg-[#0a0e1a] border-[20px] border-[#1c1c2e] shadow-[inset_0_0_40px_rgba(0,0,0,0.9),0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden isolate">
      <style>{`
        @keyframes scroll-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
        @keyframes scroll-down-left {
          0% { transform: translate(20%, -20%); }
          100% { transform: translate(-20%, 120%); }
        }
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes scroll-up-descent {
          0% { transform: translateY(120%); }
          100% { transform: translateY(-20%); }
        }
        @keyframes pulse-light {
          0%, 100% { opacity: 0.5; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .anim-scroll-up { animation: scroll-up linear infinite; }
        .anim-scroll-down-left { animation: scroll-down-left linear infinite; }
        .anim-scroll-left { animation: scroll-left linear infinite; }
        .anim-scroll-up-descent { animation: scroll-up-descent linear infinite; }
        .anim-pulse-light { animation: pulse-light ease-in-out infinite; }
      `}</style>

      {/* Inner Bezel */}
      <div className="absolute inset-0 border-[8px] border-[#2a2a40] rounded-[inherit] pointer-events-none z-50" />
      <div className="absolute inset-0 border-[2px] border-white/5 rounded-[inherit] pointer-events-none z-50 m-2" />
      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] rounded-[inherit] pointer-events-none z-50" />
      
      {/* Scene Container */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence mode="popLayout">
          
          {/* TAKEOFF (0-15%) */}
          {isTakeoff && (
            <motion.div 
              key="takeoff"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* Sky */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a] via-[#1a2940] to-[#80b3ff]" />
              <div className="absolute inset-x-0 top-1/2 h-32 bg-gradient-to-t from-amber-200/40 to-transparent blur-2xl" />
              
              {/* Ground Shrinking */}
              <motion.div 
                className="absolute bottom-0 inset-x-0 bg-[#111] overflow-hidden"
                style={{ height: `${Math.max(0, 40 - (progress / 15) * 40)}%` }}
              >
                {/* Runways lines */}
                <div className="absolute inset-0 flex justify-center opacity-40">
                  <div className="w-4 h-[200%] border-l-[6px] border-r-[6px] border-dashed border-white anim-scroll-up" style={{ animationDuration: '0.5s' }} />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* CLIMBING (15-35%) */}
          {isClimbing && (
            <motion.div 
              key="climbing"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 bg-gradient-to-b from-[#0a2e5c] to-[#4fc3f7]"
            >
              {/* Sun Glow */}
              <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/20 blur-[60px] rounded-full" />
              <div className="absolute top-[5%] right-[5%] w-24 h-24 bg-amber-100/40 blur-[20px] rounded-full" />

              {/* Clouds */}
              <div className="absolute inset-0">
                {climbClouds.map((cloud, i) => (
                  <div
                    key={i}
                    className="absolute w-full h-full anim-scroll-down-left"
                    style={{ animationDuration: cloud.duration, animationDelay: cloud.delay }}
                  >
                    <div 
                      className={`absolute rounded-full blur-xl bg-white ${cloud.isNear ? 'blur-2xl' : 'blur-md'}`}
                      style={{ 
                        left: cloud.left, 
                        width: cloud.width, 
                        height: cloud.height, 
                        opacity: cloud.opacity,
                        transform: cloud.isNear ? 'scale(2)' : 'scale(1)'
                      }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CRUISING (35-65%) */}
          {isCruising && (
            <motion.div 
              key="cruising"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0"
            >
              {/* Stratosphere Sky */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#050b14] via-[#0d1b4b] to-[#1e3c72]">
                {stars.map((star, i) => (
                  <div key={i} className="absolute bg-white rounded-full" style={{ left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity }} />
                ))}
              </div>

              {/* Sun positioning based on progress */}
              <motion.div 
                className="absolute top-[20%] w-32 h-32 bg-white/30 blur-[40px] rounded-full"
                style={{ left: `${20 + ((progress - 35) / 30) * 60}%` }}
              />

              {/* Cloud Carpet */}
              <div className="absolute bottom-0 inset-x-0 h-[60%] overflow-hidden">
                {/* Dense base layer */}
                <div className="absolute bottom-0 inset-x-0 h-full bg-gradient-to-t from-white via-white/90 to-transparent blur-lg translate-y-10" />
                
                {/* Scrolling top layer */}
                {cruiseClouds.map((cloud, i) => (
                  <div
                    key={i}
                    className="absolute w-full h-full anim-scroll-left"
                    style={{ animationDuration: cloud.duration, animationDelay: cloud.delay }}
                  >
                    <div 
                      className="absolute bg-white rounded-[100px] blur-xl"
                      style={{ top: cloud.top, width: cloud.width, height: cloud.height, opacity: cloud.opacity }}
                    />
                  </div>
                ))}

                {/* Ocean Gap occasionally */}
                <div className="absolute w-[200%] h-full anim-scroll-left" style={{ animationDuration: '40s' }}>
                  <div className="absolute top-1/2 left-1/2 w-64 h-32 bg-[#0a192f] rounded-full blur-2xl opacity-40 mix-blend-overlay" />
                </div>
              </div>
            </motion.div>
          )}

          {/* DESCENT (65-85%) */}
          {isDescent && (
            <motion.div 
              key="descent"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="flex-1 bg-gradient-to-b from-[#2d1b69] via-[#7a3a60] to-[#f97316]" />
              <div className="flex-1 bg-[#0a0a14] relative overflow-hidden border-t border-orange-500/30">
                {/* City Lights scattered */}
                <div className="absolute inset-0 opacity-60">
                  {descentCityLights.map((light, i) => (
                    <div key={i} className="absolute w-full h-full anim-scroll-up-descent" style={{ animationDuration: light.duration, animationDelay: light.delay }}>
                      <div className="absolute bg-amber-400 rounded-full blur-[1px]" style={{ left: light.left, width: light.size, height: light.size, opacity: light.opacity }} />
                    </div>
                  ))}
                </div>
                
                {/* Wispy Clouds upward */}
                {descentClouds.map((cloud, i) => (
                  <div key={i} className="absolute w-full h-full anim-scroll-up-descent" style={{ animationDuration: cloud.duration, animationDelay: cloud.delay }}>
                    <div className="absolute bg-white/20 rounded-full blur-2xl" style={{ left: cloud.left, width: cloud.width, height: cloud.height, opacity: cloud.opacity }} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* FINAL APPROACH (85-100%) */}
          {isFinal && (
            <motion.div 
              key="final"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 bg-[#05050a] flex flex-col justify-end overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#020205] to-transparent" />
              
              <motion.div 
                className="relative w-full h-[250%]"
                initial={{ y: '20%', scale: 0.8 }}
                animate={{ y: '-60%', scale: 1.5 }}
                transition={{ duration: 30, ease: "linear" }}
              >
                {/* City Grid Perspective */}
                <div className="absolute inset-0 grid grid-cols-[repeat(10,1fr)] grid-rows-[repeat(12,1fr)] gap-2 p-8 transform perspective-[800px] rotateX-[60deg] scale-150">
                  {finalCityLights.map((light, i) => (
                    <div key={i} className="w-full h-full flex items-center justify-center">
                      {light.active && (
                        <div className={`w-2 h-2 ${light.color} rounded-full blur-[2px] anim-pulse-light`} style={{ animationDuration: '2s', animationDelay: light.delay }} />
                      )}
                    </div>
                  ))}
                  
                  {/* Runway Approach Lines */}
                  <div className="absolute inset-x-1/2 -translate-x-1/2 top-[60%] bottom-0 w-32 flex justify-between border-l-4 border-r-4 border-dashed border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)]" />
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Glass Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/15 rounded-[inherit] pointer-events-none z-50 mix-blend-screen" />
    </div>
  );
}
