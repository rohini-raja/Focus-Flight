import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, CloudRain, Wind, Radio, AlertTriangle, Plane } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FlightArc } from '@/components/FlightArc';
import { useSession } from '@/context/SessionContext';
import { useTimer } from '@/hooks/use-timer';
import { useAmbientSound, SoundType } from '@/hooks/use-ambient-sound';
import { useLogbook } from '@/hooks/use-storage';
import { formatTime } from '@/utils/flight-utils';

import { WindowView } from '@/components/WindowView';
import { FlightDataPanel } from '@/components/FlightDataPanel';
import { ArrivalBoard } from '@/components/ArrivalBoard';

// Dynamic Sky Background Component
function SkyBackground({ progress }: { progress: number }) {
  const getGradient = (p: number) => {
    if (p < 10) return 'linear-gradient(to bottom, #0a0e1a, #1a1040, #4a2a00)';
    if (p < 30) return 'linear-gradient(to bottom, #101c38, #2a4b80, #805020)';
    if (p < 60) return 'linear-gradient(to bottom, #0d1b4b, #1a2980, #1a2980)';
    if (p < 85) return 'linear-gradient(to bottom, #2d1b69, #7a3a60, #f97316)';
    return 'linear-gradient(to bottom, #4a1a30, #a03020, #ff8c00)';
  };

  const hasStars = progress >= 30 && progress < 85;

  return (
    <div 
      className="absolute inset-0 transition-all duration-1000 ease-linear"
      style={{ background: getGradient(progress) }}
    >
      {hasStars && (
        <div className="absolute inset-0 opacity-40 transition-opacity duration-1000">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActiveFlight() {
  const [, setLocation] = useLocation();
  const { activeSession, clearSession } = useSession();
  const { addLog } = useLogbook();
  
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const announced85 = useRef(false);
  const announced90 = useRef(false);
  const announced95 = useRef(false);

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

  // Handle Descent Announcements
  useEffect(() => {
    if (!activeSession) return;

    let text = null;
    if (progress >= 85 && progress < 90 && !announced85.current) {
      text = `Captain speaking. Beginning our descent into ${activeSession.to}.`;
      announced85.current = true;
    } else if (progress >= 90 && progress < 95 && !announced90.current) {
      text = `🛬 Landing gear deployed. Please prepare for arrival.`;
      announced90.current = true;
    } else if (progress >= 95 && progress < 100 && !announced95.current) {
      text = `Final approach. Fasten your seatbelts.`;
      announced95.current = true;
    }

    if (text) {
      setAnnouncement(text);
      const t = setTimeout(() => setAnnouncement(null), 4000);
      return () => clearTimeout(t);
    }
  }, [progress, activeSession]);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
        colors: ['#4fc3f7', '#ffd54f', '#ffffff']
      });
      confetti({
        particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
        colors: ['#4fc3f7', '#ffd54f', '#ffffff']
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleEarlyLanding = () => {
    if (activeSession) {
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

  const handleExit = () => {
    clearSession();
    setLocation('/logbook');
  };

  const handleBookAnother = () => {
    clearSession();
    setLocation('/book');
  };

  if (!activeSession) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] text-white">
        <div className="relative z-10 text-center space-y-4 px-4">
          <div className="text-5xl mb-4">✈️</div>
          <h2 className="text-2xl font-bold">No flight in progress</h2>
          <p className="text-muted-foreground">Book a flight first to start your focus session.</p>
        </div>
      </div>
    );
  }

  if (hasLanded) {
    return (
      <ArrivalBoard 
        session={activeSession} 
        onExit={handleExit} 
        onBookAnother={handleBookAnother} 
      />
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col text-white overflow-hidden font-sans">
      <SkyBackground progress={progress} />
      
      {/* Header Bar */}
      <header className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-50">
        <div className="glass-panel px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-3 shadow-lg">
          <span className="text-muted-foreground font-mono">{activeSession.fromCode}</span>
          <Plane className="w-4 h-4 text-primary" />
          <span className="text-white font-mono">{activeSession.toCode}</span>
        </div>

        <button 
          onClick={() => setShowExitConfirm(true)}
          className="glass-panel text-white/70 hover:text-white text-sm flex items-center gap-2 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors"
        >
          <AlertTriangle className="w-4 h-4" /> <span className="hidden sm:inline">Request Early Landing</span>
        </button>
      </header>

      {/* Announcements */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-24 left-0 right-0 z-50 flex justify-center px-4"
          >
            <div className="bg-[#facc15]/20 border border-[#facc15]/50 text-[#fef08a] px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md font-medium text-center flex items-center gap-3">
              <Radio className="w-5 h-5 animate-pulse" />
              {announcement}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-24 pb-20 relative z-10 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
        
        {/* Left Column: Window View */}
        <div className="w-full lg:w-5/12 flex justify-center">
          <WindowView progress={progress} />
        </div>

        {/* Right Column: Instruments & Data */}
        <div className="w-full lg:w-7/12 flex flex-col items-center gap-8">
          
          <div className="w-full">
            <FlightArc progress={progress} fromCode={activeSession.fromCode} toCode={activeSession.toCode} />
          </div>

          <FlightDataPanel 
            progress={progress} 
            timeLeft={timeLeft} 
            totalSeconds={totalSeconds} 
            activeSession={activeSession} 
          />

          {/* Timer and Controls Container */}
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="font-mono text-7xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] tabular-nums">
              {formatTime(timeLeft)}
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={toggleTimer}
                className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/30"
              >
                {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 translate-x-0.5" />}
              </button>

              <div className="flex items-center gap-2 glass-panel rounded-full p-2">
                <button 
                  onClick={toggleSound}
                  className="p-3 rounded-full hover:bg-white/10 text-white transition-colors"
                >
                  {isPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <SoundBtn icon={Radio} active={currentSound === 'white-noise'} onClick={() => playSound('white-noise')} />
                <SoundBtn icon={Wind} active={currentSound === 'engine-hum'} onClick={() => playSound('engine-hum')} />
                <SoundBtn icon={CloudRain} active={currentSound === 'rain'} onClick={() => playSound('rain')} />
              </div>
            </div>
          </div>
          
        </div>
      </main>

      {/* Focus Mode Banner */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-6 z-50 pointer-events-none">
          <div className="px-6 py-2 rounded-full bg-secondary/20 text-secondary border border-secondary/30 text-sm font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md">
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
                <h3 className="text-2xl font-display font-bold text-white mb-2">Divert Flight?</h3>
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
      className={`p-2.5 rounded-full transition-all ${active ? 'bg-primary text-background shadow-[0_0_10px_rgba(79,195,247,0.5)]' : 'hover:bg-white/10 text-muted-foreground'}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
