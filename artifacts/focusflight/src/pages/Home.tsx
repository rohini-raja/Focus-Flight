import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { StarField } from '@/components/StarField';
import { Plane, Compass, BarChart3 } from 'lucide-react';
import { useLogbook } from '@/hooks/use-storage';
import { computeStats } from '@/utils/flight-utils';

type HomeMode = 'flight' | 'rail';

const FLIGHT_MARQUEE = [
  "BOM → LHR · 9h 30m · Deep Work",
  "DEL → NRT · 7h 15m · Study",
  "MAA → JFK · 18h 45m · Creative",
  "BLR → SYD · 12h 20m · Deep Work",
  "CCU → CDG · 9h 50m · Reading",
];

const RAIL_MARQUEE = [
  "London Waterloo → Paris Nord · 45m · Deep Work",
  "Mumbai CSMT → Pune · 60m · Study",
  "Tokyo → Osaka · 90m · Creative",
  "Berlin → Frankfurt · 75m · Reading",
  "Delhi → Agra · 50m · Deep Work",
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { logs } = useLogbook();
  const [mode, setMode] = useState<HomeMode>('flight');

  const stats = computeStats(logs);
  const marquee = mode === 'flight' ? FLIGHT_MARQUEE : RAIL_MARQUEE;

  const handleRailBook = () => {
    sessionStorage.setItem('rf_direct', '1');
    setLocation('/transit');
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center pt-10 pb-nav-safe md:pb-20 px-4">
      <StarField />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center space-y-12">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-6 max-w-3xl"
        >
          {/* Mode switcher */}
          <div className="flex justify-center mb-2">
            <div style={{
              display: 'inline-flex',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 18,
              padding: 4,
              gap: 4,
            }}>
              <button
                onClick={() => setMode('flight')}
                style={{
                  padding: '10px 24px',
                  borderRadius: 14,
                  background: mode === 'flight' ? '#30D158' : 'transparent',
                  color: mode === 'flight' ? '#000' : 'rgba(255,255,255,0.55)',
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                ✈️ FocusFlight
              </button>
              <button
                onClick={() => setMode('rail')}
                style={{
                  padding: '10px 24px',
                  borderRadius: 14,
                  background: mode === 'rail' ? '#30D158' : 'transparent',
                  color: mode === 'rail' ? '#000' : 'rgba(255,255,255,0.55)',
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                🚂 RailFocus
              </button>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {mode === 'flight' ? 'Clear skies ahead for deep focus' : 'Tracks clear — ready to depart'}
          </div>

          <motion.h1
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display font-bold text-white leading-tight"
          >
            {mode === 'flight' ? (
              <>Your focus, <br className="hidden md:block" /><span className="text-gradient-primary">cleared for takeoff.</span></>
            ) : (
              <>Your focus, <br className="hidden md:block" /><span className="text-gradient-primary">all aboard.</span></>
            )}
          </motion.h1>

          <motion.p
            key={`desc-${mode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            {mode === 'flight'
              ? 'Turn your work sessions into immersive virtual flights. Set your destination, stay on course, and track your productivity journey across the globe.'
              : 'Ride real rail lines on a live map. Pick your stations, board the train, and let your focus carry you from platform to platform.'}
          </motion.p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            {mode === 'flight' ? (
              <Link
                href="/book"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-primary text-primary-foreground shadow-[0_0_40px_-10px_rgba(48,209,88,0.5)] hover:shadow-[0_0_60px_-10px_rgba(48,209,88,0.7)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Plane className="w-5 h-5" />
                Book a Flight
              </Link>
            ) : (
              <button
                onClick={handleRailBook}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-primary text-primary-foreground shadow-[0_0_40px_-10px_rgba(48,209,88,0.5)] hover:shadow-[0_0_60px_-10px_rgba(48,209,88,0.7)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
              >
                🚂 Board a Train
              </button>
            )}
            <Link
              href="/logbook"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
            >
              View Logbook
            </Link>
          </div>
        </motion.div>

        {/* Marquee */}
        <div className="w-full max-w-4xl overflow-hidden py-4 border-y border-white/5 relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0e1a] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0e1a] to-transparent z-10" />
          <div className="flex whitespace-nowrap animate-marquee">
            {[...marquee, ...marquee].map((item, i) => (
              <span key={i} className="mx-6 text-sm font-mono text-muted-foreground/60 flex items-center gap-2">
                <span className="text-primary/50">{mode === 'flight' ? '✈' : '🚂'}</span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        >
          <div className="glass p-8 rounded-2xl text-left hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Custom Routes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {mode === 'flight'
                ? 'Set your departure, destination, and focus duration. Every session becomes a unique flight across the world.'
                : 'Search any city and pick real stations via OpenRailwayMap. Your session travels real-world tracks.'}
            </p>
          </div>

          <div className="glass p-8 rounded-2xl text-left hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-6">
              {mode === 'flight' ? <Plane className="w-6 h-6" /> : <span className="text-2xl">🗺️</span>}
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{mode === 'flight' ? 'Live Tracking' : 'Real-World Map'}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {mode === 'flight'
                ? 'Watch your progress on a real-time animated flight path. Immersive ambient sounds keep you in the zone.'
                : 'Ride a live Leaflet map at ground level with OpenRailwayMap overlay. The map pans as your session progresses.'}
            </p>
          </div>

          <div className="glass p-8 rounded-2xl text-left hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Focus Logbook</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Track sessions, build streaks, and earn badges. Both FocusFlight and RailFocus count toward your shared progress.
            </p>
          </div>
        </motion.div>

        {/* Mini Stats */}
        {stats.totalSessions > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-x-8 gap-y-3 px-6 py-4 rounded-full border border-white/10 bg-white/5 text-sm"
          >
            {stats.streak > 0 && (
              <>
                <div>
                  <span className="text-muted-foreground mr-2">🔥 Streak:</span>
                  <span className="font-bold text-white">{stats.streak} day{stats.streak !== 1 ? 's' : ''}</span>
                </div>
                <div className="w-px h-4 bg-white/20 self-center hidden sm:block" />
              </>
            )}
            {stats.flightCount > 0 && (
              <>
                <div>
                  <span className="text-muted-foreground mr-2">✈️ By air:</span>
                  <span className="font-bold text-white">{stats.flightCount}</span>
                </div>
                <div className="w-px h-4 bg-white/20 self-center hidden sm:block" />
              </>
            )}
            {stats.railCount > 0 && (
              <>
                <div>
                  <span className="text-muted-foreground mr-2">🚂 By rail:</span>
                  <span className="font-bold text-white">{stats.railCount}</span>
                </div>
                <div className="w-px h-4 bg-white/20 self-center hidden sm:block" />
              </>
            )}
            <div>
              <span className="text-muted-foreground mr-2">Distance:</span>
              <span className="font-bold text-primary">{stats.totalDistKm.toLocaleString()} km</span>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
