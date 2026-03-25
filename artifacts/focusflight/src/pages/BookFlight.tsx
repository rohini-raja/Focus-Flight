import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, ArrowRightLeft, Clock, Tag } from 'lucide-react';
import { StarField } from '@/components/StarField';
import { BoardingPassCard } from '@/components/BoardingPassCard';
import { useSession } from '@/context/SessionContext';
import { useSettings } from '@/hooks/use-storage';
import { SessionConfig, FocusType, generateIata, getDistanceForCities } from '@/utils/flight-utils';

export default function BookFlight() {
  const [, setLocation] = useLocation();
  const { setActiveSession } = useSession();
  const { settings } = useSettings();

  const [step, setStep] = useState(1);
  const [isBoarding, setIsBoarding] = useState(false);
  const [boardingText, setBoardingText] = useState("");

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [duration, setDuration] = useState(settings.defaultDuration);
  const [focusType, setFocusType] = useState<FocusType>(settings.defaultFocusType as FocusType);
  const [label, setLabel] = useState('');

  // Quick suggestions
  const quickRoutes = [
    { f: 'Mumbai', t: 'London' },
    { f: 'Delhi', t: 'Tokyo' },
    { f: 'New York', t: 'Paris' },
    { f: 'Bangalore', t: 'Sydney' }
  ];

  const focusTypes: FocusType[] = ['Deep Work', 'Study', 'Creative', 'Meeting', 'Reading'];

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleCheckIn = () => {
    if (!from || !to) return;
    
    // Create session object
    const session: SessionConfig = {
      id: Math.random().toString(36).substring(2, 9),
      mode: 'flight',
      from: from.trim(),
      to: to.trim(),
      fromCode: generateIata(from),
      toCode: generateIata(to),
      durationMinutes: duration,
      focusType,
      label: label.trim() || 'Untitled Session',
      date: new Date().toISOString(),
      distance: getDistanceForCities(from, to),
      completed: false
    };

    setActiveSession(session);
    
    // Boarding Animation Sequence
    setIsBoarding(true);
    
    const sequence = [
      "Boarding pass verified ✓",
      "Finding your seat...",
      "Cabin doors closing.",
      "Runway cleared. Prepare for takeoff. 🛫"
    ];

    let i = 0;
    setBoardingText(sequence[0]);
    
    const interval = setInterval(() => {
      i++;
      if (i < sequence.length) {
        setBoardingText(sequence[i]);
      } else {
        clearInterval(interval);
        setTimeout(() => setLocation('/flight'), 1000);
      }
    }, 1500);
  };

  const draftSession: Partial<SessionConfig> = {
    mode: 'flight',
    from: from || 'Origin',
    to: to || 'Destination',
    fromCode: generateIata(from || 'ORG'),
    toCode: generateIata(to || 'DST'),
    durationMinutes: duration,
    focusType,
    label,
    date: new Date().toISOString()
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center pt-8 pb-20 px-4">
      <StarField />
      
      <AnimatePresence>
        {isBoarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-[#0a0e1a] flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-32 h-32 bg-primary/20 rounded-full blur-2xl absolute"
            />
            <Plane className="w-12 h-12 text-primary mb-8 animate-pulse" />
            <motion.h2 
              key={boardingText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl md:text-3xl font-display text-white text-center z-10"
            >
              {boardingText}
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">Book your flight</h1>
            <p className="text-muted-foreground">Configure your focus session parameters.</p>
          </div>

          <div className="space-y-6">
            {/* Step 1: Route */}
            <div className="glass p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2 text-primary font-medium text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">1</div>
                Route Selection
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full space-y-1">
                  <label className="text-xs uppercase text-muted-foreground font-bold ml-1">Departure</label>
                  <input 
                    type="text" 
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="Where are you?"
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                
                <button 
                  onClick={handleSwap}
                  className="mt-6 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover-elevate transition-all shrink-0 text-white"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </button>

                <div className="w-full space-y-1">
                  <label className="text-xs uppercase text-muted-foreground font-bold ml-1">Destination</label>
                  <input 
                    type="text" 
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="Where to?"
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {quickRoutes.map(r => (
                  <button 
                    key={r.f+r.t}
                    onClick={() => { setFrom(r.f); setTo(r.t); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:border-primary/50 transition-colors"
                  >
                    {r.f} → {r.t}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Duration & Type */}
            <div className="glass p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-2 mb-2 text-primary font-medium text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">2</div>
                Flight Details
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Duration
                  </label>
                  <span className="font-mono text-primary font-bold">
                    {Math.floor(duration / 60)}h {duration % 60}m
                  </span>
                </div>
                <input 
                  type="range" 
                  min="15" max="240" step="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>15m</span>
                  <span>4h</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Focus Class
                </label>
                <div className="flex flex-wrap gap-2">
                  {focusTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setFocusType(type)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        focusType === type 
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                          : 'bg-background border border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs uppercase text-muted-foreground font-bold ml-1">Task / Remarks (Optional)</label>
                <input 
                  type="text" 
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Finish Q3 Report"
                  className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="sticky top-24 space-y-6">
            <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold text-center mb-4">Boarding Pass Preview</h3>
            
            <BoardingPassCard session={draftSession} />

            <button
              onClick={handleCheckIn}
              disabled={!from || !to}
              className={`
                w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300
                ${from && to 
                  ? 'bg-gradient-to-r from-primary to-blue-500 text-background shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed'}
              `}
            >
              Check In <Plane className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
