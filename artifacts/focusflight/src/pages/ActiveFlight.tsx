import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, CloudRain, Wind, Radio, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StarField } from '@/components/StarField';
import { FlightArc } from '@/components/FlightArc';
import { useSession } from '@/context/SessionContext';
import { useTimer } from '@/hooks/use-timer';
import { useAmbientSound, SoundType } from '@/hooks/use-ambient-sound';
import { useLogbook } from '@/hooks/use-storage';
import { formatTime } from '@/utils/flight-utils';

export default function ActiveFlight() {
  const [, setLocation] = useLocation();
  const { activeSession, clearSession } = useSession();
  const { addLog } = useLogbook();
  
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);

  // Redirect if no active session
  useEffect(() => {
    if (!activeSession) {
      const timer = setTimeout(() => setLocation('/book'), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeSession, setLocation]);

  const handleTimerComplete = () => {
    setHasLanded(true);
    triggerConfetti();
    if (activeSession) {
      const completedSession = { ...activeSession, completed: true };
      addLog(completedSession);
    }
    pauseSound();
  };

  const {
    timeLeft, isActive, toggle: toggleTimer, progress, totalSeconds
  } = useTimer(activeSession?.durationMinutes || 0, handleTimerComplete);

  const { currentSound, isPlaying, playSound, togglePlay: toggleSound, pause: pauseSound } = useAmbientSound('engine-hum');

  // Start timer and sound on mount
  useEffect(() => {
    if (activeSession && !hasLanded) {
      if (!isActive) toggleTimer(); // start
      if (!isPlaying) playSound('engine-hum');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#4fc3f7', '#ffd54f', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#4fc3f7', '#ffd54f', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleEarlyLanding = () => {
    if (activeSession) {
      // Calculate partial stats
      const timeFlown = totalSeconds - timeLeft;
      const partialMiles = Math.round((timeFlown / totalSeconds) * (activeSession.distance || 0));
      
      const partialSession = { 
        ...activeSession, 
        durationMinutes: Math.round(timeFlown / 60),
        distance: partialMiles,
        completed: false,
        label: `${activeSession.label} (Early Landing)`
      };
      
      addLog(partialSession);
    }
    clearSession();
    setLocation('/logbook');
  };

  const handleFinish = () => {
    clearSession();
    setLocation('/logbook');
  };

  if (!activeSession) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] text-white">
        <StarField />
        <div className="relative z-10 text-center space-y-4 px-4">
          <div className="text-5xl mb-4">✈️</div>
          <h2 className="text-2xl font-bold">No flight in progress</h2>
          <p className="text-muted-foreground">Book a flight first to start your focus session.</p>
          <p className="text-sm text-muted-foreground/60">Redirecting to booking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0e1a] text-white overflow-hidden">
      <StarField />
      
      {/* Top Bar */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50">
        <div className="glass-panel px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-3">
          <span className="text-muted-foreground">{activeSession.fromCode}</span>
          <Plane className="w-4 h-4 text-primary" />
          <span className="text-white">{activeSession.toCode}</span>
        </div>

        {!hasLanded && (
          <button 
            onClick={() => setShowExitConfirm(true)}
            className="text-muted-foreground hover:text-white text-sm flex items-center gap-2 hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> Request Early Landing
          </button>
        )}
      </header>

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-6xl mx-auto px-4 mt-12">
        
        {/* Map / Arc */}
        <div className="w-full max-w-4xl -mb-10">
           <FlightArc progress={progress} fromCode={activeSession.fromCode} toCode={activeSession.toCode} />
        </div>

        {/* Timer Panel */}
        <div className="glass p-8 md:p-12 rounded-3xl w-full max-w-xl text-center shadow-[0_0_100px_rgba(79,195,247,0.1)] relative z-20">
          
          <p className="text-secondary font-bold tracking-widest text-sm uppercase mb-4">
            {activeSession.focusType} — {activeSession.label}
          </p>

          <div className="font-mono text-7xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-8 tabular-nums">
            {formatTime(timeLeft)}
          </div>

          {/* Controls */}
          {!hasLanded && (
            <div className="flex flex-col items-center gap-8">
              <button
                onClick={toggleTimer}
                className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/30"
              >
                {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 translate-x-0.5" />}
              </button>

              {/* Sound Controls */}
              <div className="flex items-center gap-2 bg-background/50 rounded-full p-2 border border-white/5">
                <button 
                  onClick={toggleSound}
                  className="p-3 rounded-full hover:bg-white/10 text-white transition-colors"
                >
                  {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="w-px h-6 bg-white/10 mx-2" />
                <div className="flex gap-1">
                  <SoundBtn icon={Radio} active={currentSound === 'white-noise'} onClick={() => playSound('white-noise')} />
                  <SoundBtn icon={Wind} active={currentSound === 'engine-hum'} onClick={() => playSound('engine-hum')} />
                  <SoundBtn icon={CloudRain} active={currentSound === 'rain'} onClick={() => playSound('rain')} />
                </div>
              </div>
            </div>
          )}

          {hasLanded && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-display font-bold text-secondary">Touchdown! 🛬</h2>
              <p className="text-muted-foreground">Welcome to {activeSession.to}. You've completed your focus session.</p>
              <button
                onClick={handleFinish}
                className="px-8 py-3 rounded-xl bg-primary text-background font-bold hover:bg-primary/90 transition-colors w-full"
              >
                Log Flight & Exit
              </button>
            </motion.div>
          )}

        </div>
      </main>

      {/* Focus Mode Banner */}
      {!hasLanded && isActive && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-6 z-50">
          <div className="px-6 py-2 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-sm font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md">
            🔕 Focus Mode Active — Stay on course
          </div>
        </div>
      )}

      {/* Early Landing Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass p-8 rounded-2xl max-w-md w-full text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Divert Flight?</h3>
                <p className="text-muted-foreground">Ending the session early will log your partial progress, but you won't reach your destination.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                >
                  Return to Focus
                </button>
                <button 
                  onClick={handleEarlyLanding}
                  className="flex-1 py-3 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-medium transition-colors"
                >
                  Land Early
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function SoundBtn({ icon: Icon, active, onClick }: { icon: any, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2.5 rounded-full transition-all ${active ? 'bg-primary text-background' : 'hover:bg-white/10 text-muted-foreground'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
