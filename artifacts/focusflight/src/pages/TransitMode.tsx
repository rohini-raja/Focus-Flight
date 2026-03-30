import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Train, Bus, Play, Pause, ArrowLeftRight, CheckCircle, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { StarField } from '@/components/StarField';
import { useSession } from '@/context/SessionContext';
import { useTimer } from '@/hooks/use-timer';
import { useLogbook } from '@/hooks/use-storage';
import { useAmbientSound } from '@/hooks/use-ambient-sound';
import { TrainWindowView } from '@/components/TrainWindowView';
import { BusWindowView } from '@/components/BusWindowView';
import { RailFocusView } from '@/components/RailFocusView';
import { formatTime, generateIata, FocusType, SessionConfig } from '@/utils/flight-utils';
import confetti from 'canvas-confetti';

type TransitVehicle = 'train' | 'bus' | 'railfocus';

const TRAIN_ROUTES = [
  { from: 'Chennai Central', to: 'Bangalore City' },
  { from: 'Mumbai CST', to: 'Pune' },
  { from: 'Delhi', to: 'Agra' },
  { from: 'Kolkata', to: 'Howrah' },
  { from: 'Hyderabad', to: 'Secunderabad' },
];

const BUS_ROUTES = [
  { from: 'City Center', to: 'Airport' },
  { from: 'Main Station', to: 'University' },
  { from: 'Old Town', to: 'Tech Park' },
  { from: 'Market Square', to: 'Stadium' },
  { from: 'Harbor View', to: 'Shopping Mall' },
];

const FOCUS_TYPES: FocusType[] = ['Deep Work', 'Study', 'Creative', 'Meeting', 'Reading'];

function TrainTrack({ progress }: { progress: number }) {
  const stations = ['Departure', '25%', '50%', '75%', 'Arrival'];
  return (
    <div className="relative w-full py-8">
      <div className="h-1 bg-white/10 rounded-full relative">
        <motion.div
          className="h-full bg-primary rounded-full"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
        {stations.map((station, i) => {
          const pos = (i / (stations.length - 1)) * 100;
          const passed = progress >= pos;
          return (
            <div key={i} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }}>
              <div className={`w-3 h-3 rounded-full border-2 ${passed ? 'bg-primary border-primary' : 'bg-background border-white/20'}`} />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">{station}</div>
            </div>
          );
        })}
      </div>
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 text-lg"
        style={{ left: `${Math.min(progress, 98)}%`, transform: 'translate(-50%, -50%)' }}
        animate={{ x: [0, 2, -2, 0] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        🚆
      </motion.div>
    </div>
  );
}

function BusRoute({ progress }: { progress: number }) {
  const stops = ['Stop 1', 'Stop 2', 'Stop 3', 'Stop 4', 'Destination'];
  return (
    <div className="relative w-full py-8">
      <div className="h-1 bg-white/10 rounded-full relative">
        <motion.div
          className="h-full bg-secondary rounded-full"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
        {stops.map((stop, i) => {
          const pos = (i / (stops.length - 1)) * 100;
          const passed = progress >= pos;
          return (
            <div key={i} className="absolute" style={{ left: `${pos}%`, top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className={`w-3 h-3 rounded-sm border-2 ${passed ? 'bg-secondary border-secondary' : 'bg-background border-white/20'}`} />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">{stop}</div>
            </div>
          );
        })}
      </div>
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 text-lg"
        style={{ left: `${Math.min(progress, 98)}%`, transform: 'translate(-50%, -50%)' }}
        animate={{ x: [0, 3, -1, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        🚌
      </motion.div>
    </div>
  );
}

function ActiveTransitSession({
  session,
  vehicle,
  onEnd,
  onComplete,
}: {
  session: SessionConfig;
  vehicle: TransitVehicle;
  onEnd: () => void;
  onComplete: (session: SessionConfig) => void;
}) {
  const { addLog } = useLogbook();
  const [showExit, setShowExit] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);

  const handleComplete = () => {
    setHasArrived(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#30D158', '#ffd54f', '#ffffff'] });
    const completedSession = { ...session, completed: true };
    addLog(completedSession);
    onComplete(completedSession);
  };

  const { timeLeft, isActive, toggle, progress } = useTimer(session.durationMinutes, handleComplete);

  useEffect(() => {
    if (!isActive) toggle();
  }, []);

  const accentColor = vehicle === 'train' ? 'text-primary' : 'text-secondary';
  const accentBg = vehicle === 'train' ? 'bg-primary' : 'bg-secondary';

  if (hasArrived) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4"
      >
        <div className="text-center max-w-md space-y-6">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6 }}
            className="text-6xl mb-4"
          >
            {vehicle === 'train' ? '🚆' : '🚌'}
          </motion.div>
          <h2 className="text-3xl font-bold text-white">We have arrived!</h2>
          <p className="text-xl text-primary">Welcome to {session.to}</p>
          <div className="bg-card/50 border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Journey Time</span>
              <span className="text-white font-medium">{session.durationMinutes}m</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Route</span>
              <span className="text-white font-medium">{session.from} → {session.to}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Focus Type</span>
              <span className="text-white font-medium">{session.focusType}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = '/logbook'}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              View Logbook
            </button>
            <button
              onClick={onEnd}
              className="flex-1 py-3 rounded-xl bg-primary text-background font-bold hover:bg-primary/90 transition-colors"
            >
              New Session
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 pb-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{vehicle === 'train' ? '🚆' : '🚌'}</span>
            <div>
              <div className={`text-lg font-bold ${accentColor}`}>{session.fromCode} → {session.toCode}</div>
              <div className="text-xs text-muted-foreground">{session.from} → {session.to}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className={`text-xl font-mono font-bold ${accentColor}`}>{formatTime(timeLeft)}</div>
          </div>
        </div>

        {/* Window View */}
        <div className="w-full flex justify-center py-4">
          {vehicle === 'train' ? (
            <TrainWindowView progress={progress} />
          ) : (
            <BusWindowView progress={progress} />
          )}
        </div>

        {/* Route visualization */}
        <div className="bg-card/50 border border-white/10 rounded-2xl p-6">
          {vehicle === 'train' ? (
            <TrainTrack progress={progress} />
          ) : (
            <BusRoute progress={progress} />
          )}
          <div className="text-center mt-6 text-sm text-muted-foreground">
            {Math.round(progress)}% to destination
          </div>
        </div>

        {/* Timer */}
        <div className="bg-card/50 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-6xl font-mono font-bold text-white mb-2">{formatTime(timeLeft)}</div>
          {session.label && (
            <div className="text-muted-foreground mb-6">{session.label}</div>
          )}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggle}
              className={`px-8 py-3 rounded-xl ${accentBg} text-background font-bold flex items-center gap-2 hover:opacity-90 transition-opacity`}
            >
              {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isActive ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => setShowExit(true)}
              className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors text-sm"
            >
              End Early
            </button>
          </div>
        </div>

        {/* Focus banner */}
        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <span>🔕</span>
          <span>Focus Mode Active — Stay on track</span>
        </div>
      </div>

      {/* Exit confirm */}
      <AnimatePresence>
        {showExit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center space-y-4"
            >
              <AlertTriangle className="w-8 h-8 text-secondary mx-auto" />
              <h3 className="text-xl font-bold text-white">End session early?</h3>
              <p className="text-muted-foreground text-sm">This session won't be logged as complete.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExit(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Stay on board
                </button>
                <button
                  onClick={onEnd}
                  className="flex-1 py-2 rounded-xl bg-destructive text-white hover:bg-destructive/90 transition-colors"
                >
                  End session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TransitMode() {
  const [vehicle, setVehicle] = useState<TransitVehicle>('train');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [duration, setDuration] = useState(45);
  const [focusType, setFocusType] = useState<FocusType>('Deep Work');
  const [label, setLabel] = useState('');
  const [activeSession, setActiveSession] = useState<SessionConfig | null>(null);
  const [completedSession, setCompletedSession] = useState<SessionConfig | null>(null);

  // Auto-select RailFocus if navigated from the home mode switcher
  useEffect(() => {
    if (sessionStorage.getItem('rf_direct') === '1') {
      sessionStorage.removeItem('rf_direct');
      setVehicle('railfocus');
    }
  }, []);

  const routes = vehicle === 'train' ? TRAIN_ROUTES : BUS_ROUTES;

  const handleQuickRoute = (route: { from: string; to: string }) => {
    setFrom(route.from);
    setTo(route.to);
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleStart = () => {
    if (!from || !to) return;
    const session: SessionConfig = {
      id: Date.now().toString(),
      mode: vehicle,
      from,
      to,
      fromCode: generateIata(from),
      toCode: generateIata(to),
      durationMinutes: duration,
      focusType,
      label,
      date: new Date().toISOString(),
      distance: Math.floor(Math.random() * 500) + 50,
      completed: false,
    };
    setActiveSession(session);
  };

  const handleEnd = () => {
    setActiveSession(null);
    setCompletedSession(null);
  };

  if (activeSession) {
    return (
      <div 
        className="relative min-h-screen transition-colors duration-1000"
        style={{ backgroundColor: vehicle === 'train' ? '#0f1c13' : '#121215' }}
      >
        <StarField />
        <div className="relative z-10">
          <ActiveTransitSession
            session={activeSession}
            vehicle={vehicle}
            onEnd={handleEnd}
            onComplete={setCompletedSession}
          />
        </div>
      </div>
    );
  }

  if (vehicle === 'railfocus') {
    return (
      <div className="relative min-h-[calc(100vh-4rem)]" style={{ backgroundColor: '#0a0e1a' }}>
        <StarField />
        {/* Mode switcher bar */}
        <div className="relative z-10 pt-20 px-4">
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-card/50 border border-white/10 rounded-2xl p-2 flex gap-2">
              <button
                onClick={() => setVehicle('train')}
                className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all text-muted-foreground hover:text-white"
              >
                <Train className="w-5 h-5" /> 🚆 Train
              </button>
              <button
                onClick={() => setVehicle('bus')}
                className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all text-muted-foreground hover:text-white"
              >
                <Bus className="w-5 h-5" /> 🚌 Bus
              </button>
              <button
                className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all bg-primary text-background"
              >
                🚂 RailFocus
              </button>
            </div>
          </div>
        </div>
        <div className="relative z-10 -mt-6">
          <RailFocusView onEnd={() => setVehicle('train')} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pt-20 pb-24 px-4">
      <StarField />

      <main className="relative z-10 max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Ground Transit Mode</h1>
          <p className="text-muted-foreground">Focus sessions themed for your commute</p>
        </div>

        {/* Vehicle Toggle */}
        <div className="bg-card/50 border border-white/10 rounded-2xl p-2 flex gap-2">
          <button
            onClick={() => setVehicle('train')}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
              vehicle === 'train'
                ? 'bg-primary text-background'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Train className="w-5 h-5" />
            🚆 Train
          </button>
          <button
            onClick={() => setVehicle('bus')}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
              vehicle === 'bus'
                ? 'bg-secondary text-background'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Bus className="w-5 h-5" />
            🚌 Bus
          </button>
          <button
            onClick={() => setVehicle('railfocus')}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all text-muted-foreground hover:text-white"
          >
            🚂 RailFocus
          </button>
        </div>

        {/* Route selection */}
        <div className="bg-card/50 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {vehicle === 'train' ? 'Station' : 'Stop'} Selection
          </h2>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">
                {vehicle === 'train' ? 'Departure Station' : 'From Stop'}
              </label>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder={vehicle === 'train' ? 'Mumbai CST' : 'City Center'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={handleSwap}
              className="mt-5 p-2 rounded-lg bg-white/10 text-muted-foreground hover:text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">
                {vehicle === 'train' ? 'Arrival Station' : 'To Stop'}
              </label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={vehicle === 'train' ? 'Pune Junction' : 'University'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Quick routes */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Quick routes</div>
            <div className="flex flex-wrap gap-2">
              {routes.map((route, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickRoute(route)}
                  className="px-3 py-1.5 rounded-full border border-white/10 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {route.from} → {route.to}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Session Config */}
        <div className="bg-card/50 border border-white/10 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Journey Configuration
          </h2>

          {/* Duration */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-white">Journey Duration</span>
              <span className="text-sm font-bold text-primary">
                {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={180}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>15m</span>
              <span>3h</span>
            </div>
          </div>

          {/* Focus Type */}
          <div>
            <div className="text-sm text-white mb-3">Focus Type</div>
            <div className="flex flex-wrap gap-2">
              {FOCUS_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setFocusType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    focusType === type
                      ? vehicle === 'train'
                        ? 'bg-primary text-background'
                        : 'bg-secondary text-background'
                      : 'bg-white/5 border border-white/10 text-muted-foreground hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Task label */}
          <div>
            <label className="text-sm text-white mb-2 block">What are you working on? (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Reading research papers"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Board button */}
        <button
          onClick={handleStart}
          disabled={!from || !to}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            from && to
              ? vehicle === 'train'
                ? 'bg-primary text-background hover:bg-primary/90'
                : 'bg-secondary text-background hover:bg-secondary/90'
              : 'bg-white/10 text-muted-foreground cursor-not-allowed'
          }`}
        >
          {vehicle === 'train' ? <Train className="w-5 h-5" /> : <Bus className="w-5 h-5" />}
          {vehicle === 'train' ? 'All Aboard! 🚆' : 'Hop On! 🚌'}
        </button>
      </main>
    </div>
  );
}
