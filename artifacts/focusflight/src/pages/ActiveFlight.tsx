import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSession } from '@/context/SessionContext';
import { useTimer } from '@/hooks/use-timer';
import { useAmbientSound } from '@/hooks/use-ambient-sound';
import { useLogbook, useSettings } from '@/hooks/use-storage';

import { MapFlightView } from '@/components/MapFlightView';
import { ArrivalBoard } from '@/components/ArrivalBoard';

export default function ActiveFlight() {
  const [, setLocation] = useLocation();
  const { activeSession, clearSession } = useSession();
  const { addLog } = useLogbook();
  const { settings, updateSettings } = useSettings();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const [flightStarted, setFlightStarted] = useState(false);

  const announced85 = useRef(false);
  const announced90 = useRef(false);
  const announced95 = useRef(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSession) {
      const t = setTimeout(() => setLocation('/book'), 3000);
      return () => clearTimeout(t);
    }
  }, [activeSession, setLocation]);

  const handleTimerComplete = () => {
    setHasLanded(true);
    triggerConfetti();
    if (activeSession) addLog({ ...activeSession, completed: true });
    pauseSound();
  };

  const { timeLeft, isActive, toggle: toggleTimer, progress, totalSeconds } =
    useTimer(activeSession?.durationMinutes || 0, handleTimerComplete);

  const { currentSound, isPlaying, playSound } = useAmbientSound('silence');
  const pauseSound = () => playSound('silence');

  // Called by MapFlightView after the launch zoom-in animation completes
  const handleStartFlight = () => {
    setFlightStarted(true);
    if (!isActive) toggleTimer();
    // Start engine hum only if user hasn't chosen a sound yet
    if (!isPlaying) playSound('engine-hum');
  };

  useEffect(() => {
    if (!activeSession) return;
    let text: string | null = null;
    if (progress >= 85 && !announced85.current) {
      text = `Captain speaking — beginning our descent into ${activeSession.to}.`;
      announced85.current = true;
    } else if (progress >= 90 && !announced90.current) {
      text = `🛬 Landing gear deployed. Please prepare for arrival.`;
      announced90.current = true;
    } else if (progress >= 95 && !announced95.current) {
      text = `Final approach. Fasten your seatbelts.`;
      announced95.current = true;
    }
    if (text) {
      setAnnouncement(text);
      const t = setTimeout(() => setAnnouncement(null), 5000);
      return () => clearTimeout(t);
    }
  }, [progress, activeSession]);

  const triggerConfetti = () => {
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#4fc3f7', '#ffd54f', '#ffffff'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#4fc3f7', '#ffd54f', '#ffffff'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleEarlyLanding = () => {
    if (activeSession) {
      const timeFlown = totalSeconds - timeLeft;
      addLog({
        ...activeSession,
        durationMinutes: Math.round(timeFlown / 60),
        distance: Math.round((timeFlown / totalSeconds) * (activeSession.distance || 0)),
        completed: false,
        label: `${activeSession.label} (Early Landing)`,
      });
    }
    clearSession();
    setLocation('/logbook');
  };

  const handleExit = () => { clearSession(); setLocation('/logbook'); };
  const handleBookAnother = () => { clearSession(); setLocation('/book'); };

  if (!activeSession) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] text-white">
        <div className="text-center space-y-4 px-4">
          <div className="text-5xl mb-4">✈️</div>
          <h2 className="text-2xl font-bold">No flight in progress</h2>
          <p className="text-muted-foreground">Book a flight first to start your focus session.</p>
          <p className="text-sm text-muted-foreground/60">Redirecting to booking…</p>
        </div>
      </div>
    );
  }

  if (hasLanded) {
    return <ArrivalBoard session={activeSession} onExit={handleExit} onBookAnother={handleBookAnother} />;
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      {/* FULL-SCREEN MAP */}
      <MapFlightView
        session={activeSession}
        timeLeft={timeLeft}
        progress={progress}
        totalSeconds={totalSeconds}
        isActive={isActive}
        flightStarted={flightStarted}
        currentSound={currentSound}
        planeIcon={settings.planeIcon}
        mapTheme={settings.mapTheme}
        onToggle={toggleTimer}
        onStartFlight={handleStartFlight}
        onEarlyLanding={() => setShowExitConfirm(true)}
        onSoundChange={playSound}
        onMapThemeToggle={() => updateSettings({ mapTheme: settings.mapTheme === 'night' ? 'day' : 'night' })}
        onPlaneIconChange={(icon) => updateSettings({ planeIcon: icon })}
      />

      {/* DESCENT ANNOUNCEMENTS */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            style={{ position: 'fixed', top: 88, left: 0, right: 0, zIndex: 9200,
              display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(250,204,21,0.4)',
                borderRadius: 14,
                padding: '12px 20px',
                color: '#fef08a',
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                maxWidth: 480,
              }}
            >
              <span style={{ fontSize: 18 }}>📣</span>
              {announcement}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EARLY LANDING MODAL */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9900, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: '0 16px',
              background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              style={{
                background: 'rgba(15,15,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: 32,
                maxWidth: 400,
                width: '100%',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 56, height: 56, borderRadius: 28,
                  background: 'rgba(239,68,68,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <AlertTriangle className="w-7 h-7" style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Divert Flight?</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
                Ending the session early will log your partial progress, but you won't reach your destination.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14,
                  }}
                >
                  Return to Focus
                </button>
                <button
                  onClick={handleEarlyLanding}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: '#ef4444', border: 'none',
                    color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14,
                  }}
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
