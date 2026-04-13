import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, ArrowRightLeft, Clock, Tag, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { StarField } from '@/components/StarField';
import { BoardingPassCard } from '@/components/BoardingPassCard';
import { useSession } from '@/context/SessionContext';
import { useSettings } from '@/hooks/use-storage';
import {
  SessionConfig, FocusType, generateIata, getDistanceForCities,
  calculateDistance, searchCities, geocodeCity, CitysuggestionResult,
} from '@/utils/flight-utils';

// ── Debounce helper ───────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── City search input with autocomplete ──────────────────────────────────────
interface CityInputProps {
  label: string;
  placeholder: string;
  value: string;
  coords: [number, number] | null;
  onChange: (city: string, coords: [number, number] | null) => void;
}

function CityInput({ label, placeholder, value, coords, onChange }: CityInputProps) {
  const [query, setQuery]           = useState(value);
  const [suggestions, setSuggestions] = useState<CitysuggestionResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const debouncedQuery              = useDebounce(query, 400);
  const containerRef                = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. swap button)
  useEffect(() => { setQuery(value); }, [value]);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) { setSuggestions([]); return; }
    // If the query matches the already-selected city, don't re-search
    if (debouncedQuery === value && coords) { setSuggestions([]); return; }
    let cancelled = false;
    setLoading(true);
    searchCities(debouncedQuery).then(results => {
      if (!cancelled) { setSuggestions(results); setOpen(results.length > 0); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (s: CitysuggestionResult) => {
    setQuery(s.name);
    setSuggestions([]);
    setOpen(false);
    onChange(s.name, s.coords);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value, null); // coords cleared until a suggestion is picked
  };

  const isConfirmed = !!coords && query === value && query.length > 0;

  return (
    <div className="w-full space-y-1" ref={containerRef}>
      <label className="text-xs uppercase text-muted-foreground font-bold ml-1">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-background border-2 border-border rounded-xl pl-9 pr-9 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
          {!loading && isConfirmed && <CheckCircle2 className="w-4 h-4 text-primary" />}
        </div>

        <AnimatePresence>
          {open && suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute z-50 left-0 right-0 top-full mt-1 glass rounded-xl border border-white/10 overflow-hidden shadow-xl"
            >
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={() => select(s)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-white">{s.displayName}</span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BookFlight() {
  const [, setLocation]       = useLocation();
  const { setActiveSession }  = useSession();
  const { settings }          = useSettings();

  const [isBoarding, setIsBoarding]   = useState(false);
  const [boardingText, setBoardingText] = useState('');

  const [from, setFrom]           = useState('');
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [to, setTo]               = useState('');
  const [toCoords, setToCoords]   = useState<[number, number] | null>(null);

  const [duration, setDuration]   = useState(settings.defaultDuration);
  const [focusType, setFocusType] = useState<FocusType>(settings.defaultFocusType as FocusType);
  const [label, setLabel]         = useState('');

  const quickRoutes = [
    { f: 'Mumbai',    t: 'London'    },
    { f: 'Delhi',     t: 'Tokyo'     },
    { f: 'New York',  t: 'Paris'     },
    { f: 'Bangalore', t: 'Sydney'    },
  ];

  const focusTypes: FocusType[] = ['Deep Work', 'Study', 'Creative', 'Meeting', 'Reading'];

  const handleSwap = () => {
    setFrom(to);  setFromCoords(toCoords);
    setTo(from);  setToCoords(fromCoords);
  };

  const handleQuickRoute = async (f: string, t: string) => {
    setFrom(f); setTo(t);
    const [fc, tc] = await Promise.all([geocodeCity(f), geocodeCity(t)]);
    setFromCoords(fc); setToCoords(tc);
  };

  const getDistance = (): number => {
    if (fromCoords && toCoords) {
      return calculateDistance(fromCoords[0], fromCoords[1], toCoords[0], toCoords[1]);
    }
    return getDistanceForCities(from, to);
  };

  const handleCheckIn = () => {
    if (!from || !to) return;

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
      distance: getDistance(),
      completed: false,
      fromCoords: fromCoords ?? undefined,
      toCoords:   toCoords   ?? undefined,
    };

    setActiveSession(session);
    setIsBoarding(true);

    const sequence = [
      'Boarding pass verified ✓',
      'Finding your seat…',
      'Cabin doors closing.',
      'Runway cleared. Prepare for takeoff. 🛫',
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
    from:      from  || 'Origin',
    to:        to    || 'Destination',
    fromCode:  generateIata(from  || 'ORG'),
    toCode:    generateIata(to    || 'DST'),
    durationMinutes: duration,
    focusType,
    label,
    date: new Date().toISOString(),
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center pt-8 pb-nav-safe md:pb-20 px-4">
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
              className="text-2xl md:text-3xl font-display text-white text-center z-10 px-6"
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
            <p className="text-muted-foreground">Search any city in the world as your route.</p>
          </div>

          <div className="space-y-6">
            {/* Step 1: Route */}
            <div className="glass p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 mb-2 text-primary font-medium text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">1</div>
                Route Selection
              </div>

              <div className="flex flex-col sm:flex-row items-end gap-4">
                <CityInput
                  label="Departure"
                  placeholder="Any city in the world…"
                  value={from}
                  coords={fromCoords}
                  onChange={(city, coords) => { setFrom(city); setFromCoords(coords); }}
                />

                <button
                  onClick={handleSwap}
                  className="mb-0.5 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all shrink-0 text-white"
                  title="Swap cities"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </button>

                <CityInput
                  label="Destination"
                  placeholder="Where to?"
                  value={to}
                  coords={toCoords}
                  onChange={(city, coords) => { setTo(city); setToCoords(coords); }}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {quickRoutes.map(r => (
                  <button
                    key={r.f + r.t}
                    onClick={() => handleQuickRoute(r.f, r.t)}
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
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">2</div>
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
                  type="range" min="15" max="240" step="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>15m</span><span>4h</span>
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
            <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold text-center mb-4">
              Boarding Pass Preview
            </h3>
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
