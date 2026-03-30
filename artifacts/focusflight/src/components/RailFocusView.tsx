import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, ArrowLeftRight } from 'lucide-react';
import { useTimer } from '@/hooks/use-timer';
import { useLogbook } from '@/hooks/use-storage';
import { formatTime, generateIata, FocusType } from '@/utils/flight-utils';
import confetti from 'canvas-confetti';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Station = { name: string; city: string; lat: number; lng: number };
type RailPhase = 'picker' | 'platform' | 'active' | 'arriving' | 'arrived' | 'abandoned';
type ArrivalStep = 'decelerating' | 'banner' | 'summary';

/* ─── Station Data ───────────────────────────────────────────────────────── */
const WORLD_STATIONS: Station[] = [
  { name: 'London Waterloo', city: 'London', lat: 51.5033, lng: -0.1134 },
  { name: 'Paris Gare du Nord', city: 'Paris', lat: 48.8809, lng: 2.3553 },
  { name: 'Tokyo Shinjuku', city: 'Tokyo', lat: 35.6896, lng: 139.7006 },
  { name: 'Mumbai CSMT', city: 'Mumbai', lat: 18.9399, lng: 72.8348 },
  { name: 'New York Penn Station', city: 'New York', lat: 40.7505, lng: -73.9934 },
  { name: 'Berlin Hauptbahnhof', city: 'Berlin', lat: 52.5252, lng: 13.3695 },
  { name: 'Madrid Atocha', city: 'Madrid', lat: 40.4068, lng: -3.6899 },
  { name: 'Rome Termini', city: 'Rome', lat: 41.9006, lng: 12.5012 },
  { name: 'Moscow Yaroslavsky', city: 'Moscow', lat: 55.7753, lng: 37.6571 },
  { name: 'Beijing West', city: 'Beijing', lat: 39.8947, lng: 116.2224 },
  { name: 'Shanghai Hongqiao', city: 'Shanghai', lat: 31.1963, lng: 121.3269 },
  { name: 'Seoul Station', city: 'Seoul', lat: 37.5546, lng: 126.9707 },
  { name: 'Sydney Central', city: 'Sydney', lat: -33.8831, lng: 151.2063 },
  { name: 'Toronto Union', city: 'Toronto', lat: 43.6455, lng: -79.3809 },
  { name: 'Chicago Union Station', city: 'Chicago', lat: 41.8788, lng: -87.64 },
  { name: 'Amsterdam Centraal', city: 'Amsterdam', lat: 52.3791, lng: 4.8997 },
  { name: 'Vienna Hauptbahnhof', city: 'Vienna', lat: 48.1848, lng: 16.3784 },
  { name: 'Zurich HB', city: 'Zurich', lat: 47.3779, lng: 8.5401 },
  { name: 'Brussels Midi', city: 'Brussels', lat: 50.8355, lng: 4.3361 },
  { name: 'Barcelona Sants', city: 'Barcelona', lat: 41.3793, lng: 2.1406 },
  { name: 'Milan Centrale', city: 'Milan', lat: 45.4854, lng: 9.2045 },
  { name: 'Frankfurt Hauptbahnhof', city: 'Frankfurt', lat: 50.107, lng: 8.6635 },
  { name: 'New Delhi Station', city: 'Delhi', lat: 28.6425, lng: 77.2197 },
  { name: 'KL Sentral', city: 'Kuala Lumpur', lat: 3.1334, lng: 101.6864 },
  { name: 'Bangkok Hua Lamphong', city: 'Bangkok', lat: 13.74, lng: 100.517 },
  { name: 'Cairo Ramses', city: 'Cairo', lat: 30.0605, lng: 31.2511 },
  { name: 'Johannesburg Park Station', city: 'Johannesburg', lat: -26.1953, lng: 28.0376 },
  { name: 'Buenos Aires Retiro', city: 'Buenos Aires', lat: -34.5824, lng: -58.3731 },
  { name: 'São Paulo Luz', city: 'São Paulo', lat: -23.5353, lng: -46.6397 },
  { name: 'Singapore Woodlands', city: 'Singapore', lat: 1.4319, lng: 103.7861 },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function haversineKm(a: Station, b: Station): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

async function fetchStations(city: string): Promise<Station[]> {
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error('no-geo');
    const { lat, lon } = geoData[0];
    const q = `[out:json];node["railway"="station"](around:20000,${lat},${lon});out body 8;`;
    const ovRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
    const ovData = await ovRes.json();
    const results: Station[] = ovData.elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => ({
        name: el.tags.name as string,
        city: (el.tags['addr:city'] as string) || city,
        lat: el.lat as number,
        lng: el.lon as number,
      }))
      .slice(0, 6);
    if (results.length) return results;
    throw new Error('empty');
  } catch {
    const q = city.toLowerCase();
    const fallback = WORLD_STATIONS.filter(
      s => s.city.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 5);
    return fallback.length ? fallback : WORLD_STATIONS.slice(0, 5);
  }
}

function generateTrainNumber(): string {
  return 'RF-' + (1000 + Math.floor(Math.random() * 8999));
}

/* ─── Solari Flip Display ─────────────────────────────────────────────────── */
const FLIP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·-: ';

function FlipChar({ finalChar, delay }: { finalChar: string; delay: number }) {
  const [current, setCurrent] = useState('·');
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      let count = 0;
      const flips = 6 + Math.floor(Math.random() * 8);
      setActive(true);
      const iv = setInterval(() => {
        count++;
        if (count >= flips) {
          setCurrent(finalChar === ' ' ? ' ' : finalChar);
          setActive(false);
          clearInterval(iv);
        } else {
          setCurrent(FLIP_CHARS[Math.floor(Math.random() * FLIP_CHARS.length)]);
        }
      }, 55);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [finalChar, delay]);

  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: finalChar === ' ' ? '0.35em' : '0.65em',
        textAlign: 'center',
        color: active ? '#f59e0b' : '#ffffff',
        transition: 'color 0.04s',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        fontWeight: 700,
      }}
    >
      {current === ' ' ? '\u00A0' : current}
    </span>
  );
}

function FlipText({ text, startDelay = 0, upper = true }: { text: string; startDelay?: number; upper?: boolean }) {
  const normalized = upper ? text.toUpperCase() : text;
  return (
    <>
      {normalized.split('').map((ch, i) => (
        <FlipChar key={i} finalChar={ch} delay={startDelay + i * 45} />
      ))}
    </>
  );
}

/* ─── Departure Board Row ─────────────────────────────────────────────────── */
function BoardRow({
  label,
  value,
  amber = false,
  flipDelay = 0,
  large = false,
}: {
  label: string;
  value: string;
  amber?: boolean;
  flipDelay?: number;
  large?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 20,
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          minWidth: 90,
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: large ? 22 : 17,
          color: amber ? '#f59e0b' : '#ffffff',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          fontWeight: 700,
          letterSpacing: large ? 2 : 1,
        }}
      >
        <FlipText text={value} startDelay={flipDelay} />
      </span>
    </div>
  );
}

/* ─── Shared Styles ──────────────────────────────────────────────────────── */
const GLASS: React.CSSProperties = {
  background: 'rgba(8,10,20,0.82)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
  color: 'white',
};

const GREEN = '#30D158';
const FOCUS_TYPES: FocusType[] = ['Deep Work', 'Study', 'Creative', 'Meeting', 'Reading'];

/* ─── Main Component ─────────────────────────────────────────────────────── */
interface RailFocusViewProps {
  onEnd: () => void;
}

export function RailFocusView({ onEnd }: RailFocusViewProps) {
  /* Picker state */
  const [depQuery, setDepQuery] = useState('');
  const [arrQuery, setArrQuery] = useState('');
  const [depResults, setDepResults] = useState<Station[]>([]);
  const [arrResults, setArrResults] = useState<Station[]>([]);
  const [depStation, setDepStation] = useState<Station | null>(null);
  const [arrStation, setArrStation] = useState<Station | null>(null);
  const [isSearchingDep, setIsSearchingDep] = useState(false);
  const [isSearchingArr, setIsSearchingArr] = useState(false);
  const [duration, setDuration] = useState(45);
  const [focusType, setFocusType] = useState<FocusType>('Deep Work');

  /* Session state */
  const [phase, setPhase] = useState<RailPhase>('picker');
  const [trainNumber, setTrainNumber] = useState('RF-0000');
  const [arrivalStep, setArrivalStep] = useState<ArrivalStep>('decelerating');
  const [showExit, setShowExit] = useState(false);

  /* Abandon snapshot */
  const [abandonProgress, setAbandonProgress] = useState(0);
  const [abandonTimeLeft, setAbandonTimeLeft] = useState(0);

  /* Refs */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const depRef = useRef(depStation);
  const arrRef = useRef(arrStation);
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);

  useEffect(() => { depRef.current = depStation; }, [depStation]);
  useEffect(() => { arrRef.current = arrStation; }, [arrStation]);

  const { addLog } = useLogbook();

  const totalDistKm = depStation && arrStation ? haversineKm(depStation, arrStation) : 0;

  /* ── Timer ── */
  const handleComplete = useCallback(() => {
    const dep = depRef.current;
    const arr = arrRef.current;
    if (!dep || !arr) return;
    setPhase('arriving');
    setArrivalStep('decelerating');
    /* Slow pan to arrival station */
    setTimeout(() => {
      if (mapRef.current && arr) {
        mapRef.current.panTo([arr.lat, arr.lng], { animate: true, duration: 4 } as any);
      }
    }, 100);
    /* Banner after 4s, summary after 6s */
    setTimeout(() => setArrivalStep('banner'), 4200);
    setTimeout(() => {
      setArrivalStep('summary');
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#30D158', '#ffd54f', '#ffffff'] });
      addLog({
        id: Date.now().toString(),
        mode: 'railfocus',
        from: dep.name,
        to: arr.name,
        fromCode: generateIata(dep.name),
        toCode: generateIata(arr.name),
        durationMinutes: duration,
        focusType,
        label: '',
        date: new Date().toISOString(),
        distance: Math.round(haversineKm(dep, arr)),
        completed: true,
      });
    }, 6300);
  }, [duration, focusType, addLog]);

  const { timeLeft, isActive, toggle, progress } = useTimer(duration, handleComplete);

  /* Track paused time for focus score */
  useEffect(() => {
    if (!isActive && phase === 'active') {
      pauseStartRef.current = Date.now();
    } else if (isActive && pauseStartRef.current !== null) {
      totalPausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
  }, [isActive, phase]);

  /* Auto-start timer when active phase begins */
  useEffect(() => {
    if (phase === 'active' && !isActive) toggle();
  }, [phase]);

  /* ── Leaflet setup ── */
  useEffect(() => {
    if ((phase !== 'active' && phase !== 'arriving') || !mapContainerRef.current || !depStation || !arrStation) return;
    if (mapRef.current) return;
    const midLat = (depStation.lat + arrStation.lat) / 2;
    const midLng = (depStation.lng + arrStation.lng) / 2;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    });
    map.setView([depStation.lat, depStation.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.tileLayer('https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', { maxZoom: 19, opacity: 0.85 }).addTo(map);
    mapRef.current = map;
    /* Pan from midpoint to start position */
    setTimeout(() => map.setView([midLat, midLng], 14, { animate: false }), 10);
    return () => { map.remove(); mapRef.current = null; };
  }, [phase]);

  /* ── Pan map during session ── */
  useEffect(() => {
    if (phase !== 'active' || !mapRef.current || !depStation || !arrStation) return;
    const t = progress / 100;
    const lat = depStation.lat + (arrStation.lat - depStation.lat) * t;
    const lng = depStation.lng + (arrStation.lng - depStation.lng) * t;
    mapRef.current.setView([lat, lng], 14, { animate: true, duration: 1.5 } as any);
  }, [progress, phase]);

  /* ── Station Search ── */
  const handleSearch = async (which: 'dep' | 'arr') => {
    const query = which === 'dep' ? depQuery : arrQuery;
    if (!query.trim()) return;
    if (which === 'dep') { setIsSearchingDep(true); setDepResults([]); }
    else { setIsSearchingArr(true); setArrResults([]); }
    const results = await fetchStations(query);
    if (which === 'dep') { setDepResults(results); setIsSearchingDep(false); }
    else { setArrResults(results); setIsSearchingArr(false); }
  };

  const handleSwap = () => {
    const d = depStation; const a = arrStation;
    setDepStation(a); setArrStation(d);
    setDepQuery(a?.name || ''); setArrQuery(d?.name || '');
    setDepResults([]); setArrResults([]);
  };

  const handleBoardFromPicker = () => {
    if (!depStation || !arrStation) return;
    setTrainNumber(generateTrainNumber());
    setPhase('platform');
  };

  const handleBoardFromPlatform = () => {
    setPhase('active');
  };

  const handleAbandon = () => {
    setAbandonProgress(progress);
    setAbandonTimeLeft(timeLeft);
    const dep = depRef.current;
    const arr = arrRef.current;
    if (dep && arr) {
      addLog({
        id: Date.now().toString(),
        mode: 'railfocus',
        from: dep.name,
        to: arr.name,
        fromCode: generateIata(dep.name),
        toCode: generateIata(arr.name),
        durationMinutes: Math.round((duration * 60 - timeLeft) / 60),
        focusType,
        label: '',
        date: new Date().toISOString(),
        distance: Math.round(haversineKm(dep, arr) * progress / 100),
        completed: false,
      });
    }
    setPhase('abandoned');
    setShowExit(false);
  };

  /* ─── PHASE: PICKER ──────────────────────────────────────────────────── */
  if (phase === 'picker') {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-20 pb-24 px-4">
        <main className="max-w-2xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">🚂 RailFocus</h2>
            <p className="text-muted-foreground">Live train maps powered by OpenRailwayMap. Your session rides real tracks.</p>
          </div>

          <div className="bg-card/50 border border-white/10 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Station Search
            </h3>

            {/* Departure */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Departure City or Station</label>
              <div className="flex gap-2">
                <input
                  value={depQuery}
                  onChange={e => { setDepQuery(e.target.value); setDepStation(null); setDepResults([]); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch('dep')}
                  placeholder="e.g. London, Mumbai, Tokyo…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={() => handleSearch('dep')}
                  disabled={isSearchingDep || !depQuery.trim()}
                  className="px-4 py-3 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  <Search className="w-4 h-4" />
                  {isSearchingDep ? '…' : 'Find'}
                </button>
              </div>
              {depStation && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
                  <span style={{ color: GREEN, fontWeight: 700 }}>✓</span>
                  <span className="text-white font-medium">{depStation.name}</span>
                  <span className="text-muted-foreground">— {depStation.city}</span>
                </div>
              )}
              {depResults.length > 0 && !depStation && (
                <div className="space-y-1 mt-1">
                  {depResults.map((s, i) => (
                    <button key={i} onClick={() => { setDepStation(s); setDepResults([]); setDepQuery(s.name); }}
                      className="w-full text-left px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-colors text-sm">
                      <span className="text-white font-medium">{s.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{s.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button onClick={handleSwap} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Swap">
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Arrival */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Arrival City or Station</label>
              <div className="flex gap-2">
                <input
                  value={arrQuery}
                  onChange={e => { setArrQuery(e.target.value); setArrStation(null); setArrResults([]); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch('arr')}
                  placeholder="e.g. Paris, Berlin, Seoul…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={() => handleSearch('arr')}
                  disabled={isSearchingArr || !arrQuery.trim()}
                  className="px-4 py-3 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  <Search className="w-4 h-4" />
                  {isSearchingArr ? '…' : 'Find'}
                </button>
              </div>
              {arrStation && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
                  <span style={{ color: GREEN, fontWeight: 700 }}>✓</span>
                  <span className="text-white font-medium">{arrStation.name}</span>
                  <span className="text-muted-foreground">— {arrStation.city}</span>
                </div>
              )}
              {arrResults.length > 0 && !arrStation && (
                <div className="space-y-1 mt-1">
                  {arrResults.map((s, i) => (
                    <button key={i} onClick={() => { setArrStation(s); setArrResults([]); setArrQuery(s.name); }}
                      className="w-full text-left px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-colors text-sm">
                      <span className="text-white font-medium">{s.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{s.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <AnimatePresence>
              {depStation && arrStation && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-4 rounded-xl border flex items-center justify-between"
                  style={{ background: 'rgba(48,209,88,0.08)', borderColor: 'rgba(48,209,88,0.25)' }}>
                  <div className="text-sm">
                    <div className="text-white font-bold">{depStation.name} → {arrStation.name}</div>
                    <div className="text-muted-foreground mt-0.5">{Math.round(totalDistKm).toLocaleString()} km · {duration}m session</div>
                  </div>
                  <span className="text-3xl ml-4">🚂</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Journey Config */}
          <div className="bg-card/50 border border-white/10 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Journey Configuration
            </h3>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-white">Session Duration</span>
                <span className="text-sm font-bold text-primary">
                  {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`}
                </span>
              </div>
              <input type="range" min={15} max={180} step={5} value={duration}
                onChange={e => setDuration(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>15m</span><span>3h</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-white mb-3">Focus Type</div>
              <div className="flex flex-wrap gap-2">
                {FOCUS_TYPES.map(type => (
                  <button key={type} onClick={() => setFocusType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${focusType === type ? 'bg-primary text-background' : 'bg-white/5 border border-white/10 text-muted-foreground hover:text-white'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick fill */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Quick-fill departure</div>
            <div className="flex flex-wrap gap-2">
              {WORLD_STATIONS.slice(0, 12).map((s, i) => (
                <button key={i} onClick={() => { setDepStation(s); setDepQuery(s.name); setDepResults([]); }}
                  className="px-3 py-1.5 rounded-full border border-white/10 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleBoardFromPicker} disabled={!depStation || !arrStation}
            className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: depStation && arrStation ? GREEN : 'rgba(255,255,255,0.15)' }}>
            🚂 Board Train
          </button>
        </main>
      </div>
    );
  }

  /* ─── PHASE: PLATFORM (Departure Board) ─────────────────────────────────── */
  if (phase === 'platform') {
    const durationLabel = duration >= 60
      ? `${Math.floor(duration / 60)}H ${String(duration % 60).padStart(2, '0')}M`
      : `${String(duration).padStart(2, '0')}M`;
    const depName = (depStation?.name || '').toUpperCase().substring(0, 20);
    const arrName = (arrStation?.name || '').toUpperCase().substring(0, 20);

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        background: '#06080d',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}>
        {/* Scanlines overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 640, padding: '0 24px' }}
        >
          {/* Board header */}
          <div style={{
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)',
          }}>
            {/* Header strip */}
            <div style={{
              background: '#111827',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              padding: '14px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, letterSpacing: 4, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>
                ◈ Departures
              </span>
              <BoardingBadge />
            </div>

            {/* Board rows */}
            <div style={{ padding: '8px 28px 28px' }}>
              <BoardRow label="Train" value={trainNumber} large flipDelay={200} />
              <BoardRow label="From" value={depName} flipDelay={600} />
              <BoardRow label="To" value={arrName} flipDelay={900} />
              <BoardRow label="Journey" value={durationLabel} flipDelay={1300} />
              <BoardRow label="Dist" value={`${Math.round(totalDistKm)} KM`} flipDelay={1550} />
              <BoardRow label="Status" value="BOARDING" amber flipDelay={1800} />
            </div>
          </div>

          {/* Board Train button */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.5 }}
            onClick={handleBoardFromPlatform}
            style={{
              marginTop: 28,
              width: '100%',
              padding: '18px 0',
              borderRadius: 14,
              background: GREEN,
              border: 'none',
              color: '#000',
              fontSize: 17,
              fontWeight: 900,
              letterSpacing: 1,
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              boxShadow: `0 0 30px rgba(48,209,88,0.35)`,
            }}
            whileHover={{ scale: 1.02, boxShadow: `0 0 50px rgba(48,209,88,0.5)` }}
            whileTap={{ scale: 0.98 }}
          >
            🚂 BOARD TRAIN
          </motion.button>

          <button
            onClick={() => setPhase('picker')}
            style={{
              marginTop: 12, width: '100%', padding: '12px 0', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
              color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ← Back to Stations
          </button>
        </motion.div>
      </div>
    );
  }

  /* ─── PHASE: ABANDONED ───────────────────────────────────────────────────── */
  if (phase === 'abandoned') {
    const depKmCovered = Math.round(totalDistKm * abandonProgress / 100);
    const secondsElapsed = duration * 60 - abandonTimeLeft;
    const minsElapsed = Math.floor(secondsElapsed / 60);
    const secsElapsed = secondsElapsed % 60;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 8000,
          background: '#0a0005',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}
        >
          <div style={{ fontSize: 60, marginBottom: 16 }}>🚧</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#ef4444', marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
            JOURNEY ABANDONED
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 28 }}>
            The train returned to the depot.
          </p>
          <div style={{ ...GLASS, padding: '20px 28px', marginBottom: 24, textAlign: 'left' }}>
            {[
              ['Train', trainNumber],
              ['Route', `${depStation?.name} → ${arrStation?.name}`],
              ['Time Elapsed', `${minsElapsed}m ${secsElapsed}s`],
              ['Distance Covered', `${depKmCovered} km`],
              ['Completed', `${Math.round(abandonProgress)}%`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                <span style={{ color: 'white', fontWeight: 600, maxWidth: 220, textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setPhase('picker')}
              style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Try Again
            </button>
            <button onClick={onEnd}
              style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: GREEN, border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              New Journey
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  /* ─── PHASES: ACTIVE + ARRIVING ─────────────────────────────────────────── */
  const distKmLeft = totalDistKm * (1 - progress / 100);
  const focusScore = Math.max(60, Math.round(100 - (totalPausedMsRef.current / (duration * 60 * 1000)) * 40));
  const stationsPassed = Math.max(1, Math.round((totalDistKm * (progress / 100)) / 40));
  const isArriving = phase === 'arriving';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: '#0a0e1a' }}>
      {/* Leaflet map */}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

      {/* Fixed train icon */}
      <motion.div
        animate={isArriving && arrivalStep === 'decelerating'
          ? { x: [0, 2, -1, 1, 0], scale: [1, 1, 0.95, 1] }
          : { x: 0, scale: 1 }}
        transition={{ duration: 3, ease: 'easeOut' }}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 44, zIndex: 9050,
          filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.9))',
          pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
        }}
      >
        🚂
      </motion.div>

      {/* ARRIVED banner */}
      <AnimatePresence>
        {isArriving && (arrivalStep === 'banner' || arrivalStep === 'summary') && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9300,
              background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
              borderBottom: '2px solid #30D158',
              padding: '18px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}
          >
            <span style={{ fontSize: 28 }}>✅</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#30D158', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }}>
                ARRIVED
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                {arrStation?.name}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary card */}
      <AnimatePresence>
        {isArriving && arrivalStep === 'summary' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
              padding: 24, paddingTop: 100,
            }}
          >
            <div style={{ maxWidth: 440, width: '100%' }}>
              <div style={{ ...GLASS, padding: '28px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🚂</div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: GREEN, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
                  JOURNEY COMPLETE
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 24 }}>
                  {depStation?.name} → {arrStation?.name}
                </p>

                <div style={{ textAlign: 'left', marginBottom: 24 }}>
                  {[
                    ['Journey Time', `${duration}m · ${focusType}`],
                    ['Distance Covered', `${Math.round(totalDistKm).toLocaleString()} km`],
                    ['Stations Passed', `~${Math.max(1, Math.round(totalDistKm / 40))} stations`],
                    ['Focus Score', `${focusScore} / 100`],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 14 }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                      <span style={{ color: label === 'Focus Score' ? GREEN : 'white', fontWeight: 700 }}>{val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setPhase('picker')}
                    style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Book Next Journey
                  </button>
                  <button onClick={onEnd}
                    style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: GREEN, border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-left HUD */}
      {!isArriving && (
        <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 9100, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...GLASS, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={toggle}
              style={{ width: 40, height: 40, borderRadius: 11, background: isActive ? 'rgba(255,255,255,0.12)' : GREEN, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'white' : '#000', fontSize: 18, transition: 'all 0.2s', flexShrink: 0 }}>
              {isActive ? '⏸' : '▶'}
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{trainNumber}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, marginTop: 2 }}>
                {depStation?.name} → {arrStation?.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{focusType}</div>
            </div>
          </div>
          <button onClick={() => setShowExit(true)}
            style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(8,10,20,0.75)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', alignSelf: 'flex-start' }}>
            End Early
          </button>
        </div>
      )}

      {/* Bottom HUD */}
      {!isArriving && (
        <div style={{ position: 'fixed', bottom: 36, left: 0, right: 0, zIndex: 9100, display: 'flex', justifyContent: 'space-between', padding: '0 24px', pointerEvents: 'none', gap: 16 }}>
          <div style={{ ...GLASS, padding: '16px 24px', pointerEvents: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 6 }}>Time Remaining</div>
            <div style={{ fontSize: 38, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: 'white', letterSpacing: -1, lineHeight: 1 }}>{formatTime(timeLeft)}</div>
          </div>
          <div style={{ ...GLASS, padding: '16px 24px', textAlign: 'right', pointerEvents: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 6 }}>Distance Remaining</div>
            <div style={{ fontSize: 38, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: 'white', letterSpacing: -1, lineHeight: 1 }}>
              {distKmLeft < 10 ? distKmLeft.toFixed(1) : Math.round(distKmLeft).toLocaleString()}
              <span style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginLeft: 5 }}>km</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 4, zIndex: 9200, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', background: GREEN, width: `${progress}%`, transition: 'width 1s linear' }} />
      </div>

      {/* Zoom indicator */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9100, ...GLASS, padding: '8px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>
        z14 · ground level
      </div>

      {/* Exit modal */}
      <AnimatePresence>
        {showExit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9500, padding: 16 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ ...GLASS, padding: 32, maxWidth: 340, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Stop the train?</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                Your progress will be recorded but the session won't count as complete.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowExit(false)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Keep going
                </button>
                <button onClick={handleAbandon}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Abandon
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Boarding Badge ─────────────────────────────────────────────────────── */
function BoardingBadge() {
  const [lit, setLit] = useState(true);
  useEffect(() => {
    const iv = setInterval(() => setLit(v => !v), 800);
    return () => clearInterval(iv);
  }, []);
  return (
    <span style={{
      fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace",
      color: lit ? '#f59e0b' : 'rgba(245,158,11,0.3)',
      transition: 'color 0.3s',
      textTransform: 'uppercase',
      padding: '4px 10px',
      borderRadius: 6,
      background: lit ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.04)',
      border: `1px solid ${lit ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.1)'}`,
    }}>
      ● BOARDING
    </span>
  );
}
