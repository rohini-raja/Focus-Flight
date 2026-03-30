import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimer } from '@/hooks/use-timer';
import { useLogbook } from '@/hooks/use-storage';
import { formatTime, generateIata, FocusType } from '@/utils/flight-utils';
import confetti from 'canvas-confetti';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type LatLng = [number, number];
interface Route {
  id: number;
  name: string;
  from: string;
  to: string;
  waypoints: LatLng[];
  distance: number;
  duration: number;
}
type RailPhase = 'picker' | 'platform' | 'active' | 'arriving' | 'arrived' | 'abandoned';
type ArrivalStep = 'decelerating' | 'banner' | 'summary';

/* ─── Hardcoded Routes ───────────────────────────────────────────────────── */
const ROUTES: Route[] = [
  {"id":1,"name":"🇬🇧 London → Edinburgh","from":"London Kings Cross","to":"Edinburgh Waverley","waypoints":[[51.5322,-0.1235],[52.9548,-1.1581],[53.4808,-2.2426],[54.9783,-1.6178],[55.9521,-3.1895]],"distance":633,"duration":270},
  {"id":2,"name":"🇫🇷 Paris → Marseille","from":"Paris Gare de Lyon","to":"Marseille Saint-Charles","waypoints":[[48.8448,2.3735],[46.1512,4.7966],[45.7640,4.8357],[43.2965,5.3813]],"distance":775,"duration":195},
  {"id":3,"name":"🇯🇵 Tokyo → Osaka","from":"Tokyo Station","to":"Osaka Station","waypoints":[[35.6812,139.7671],[35.1815,136.9066],[34.7024,135.4959]],"distance":513,"duration":145},
  {"id":4,"name":"🇮🇳 Mumbai → Delhi","from":"Mumbai CST","to":"New Delhi Station","waypoints":[[18.9398,72.8355],[21.1458,79.0882],[23.1765,79.9462],[26.4499,80.3319],[28.6419,77.2194]],"distance":1384,"duration":960},
  {"id":5,"name":"🇺🇸 New York → Washington DC","from":"Penn Station NY","to":"Union Station DC","waypoints":[[40.7506,-74.0023],[39.9526,-75.1652],[39.3498,-76.6413],[38.8977,-77.0063]],"distance":362,"duration":165},
  {"id":6,"name":"🇩🇪 Berlin → Munich","from":"Berlin Hauptbahnhof","to":"Munich Hauptbahnhof","waypoints":[[52.5251,13.3694],[51.3397,12.3731],[48.9957,12.1151],[48.1402,11.5580]],"distance":585,"duration":240},
  {"id":7,"name":"🇨🇳 Beijing → Shanghai","from":"Beijing South","to":"Shanghai Hongqiao","waypoints":[[39.8654,116.3783],[36.6512,117.1201],[34.2674,117.1950],[31.1934,121.3237]],"distance":1318,"duration":270},
  {"id":8,"name":"🇪🇸 Madrid → Barcelona","from":"Madrid Atocha","to":"Barcelona Sants","waypoints":[[40.4065,-3.6914],[41.3851,2.1734]],"distance":621,"duration":165},
  {"id":9,"name":"🇮🇹 Rome → Milan","from":"Roma Termini","to":"Milano Centrale","waypoints":[[41.9009,12.5011],[43.7696,11.2558],[44.4056,8.9463],[45.4862,9.2045]],"distance":575,"duration":175},
  {"id":10,"name":"🇷🇺 Moscow → St Petersburg","from":"Moscow Leningradsky","to":"St Petersburg Moskovsky","waypoints":[[55.7765,37.6554],[57.9661,32.9598],[59.9311,30.3609]],"distance":650,"duration":240},
  {"id":11,"name":"🇦🇺 Sydney → Melbourne","from":"Sydney Central","to":"Melbourne Southern Cross","waypoints":[[-33.8833,151.2056],[-34.9285,138.6007],[-37.8183,144.9671]],"distance":878,"duration":660},
  {"id":12,"name":"🇨🇦 Toronto → Montreal","from":"Toronto Union","to":"Montreal Central","waypoints":[[43.6453,-79.3806],[44.2334,-76.4819],[45.5017,-73.5673]],"distance":541,"duration":300},
  {"id":13,"name":"🇧🇷 São Paulo → Rio","from":"São Paulo Luz","to":"Rio Central","waypoints":[[-23.5329,-46.6395],[-22.9068,-43.1729]],"distance":429,"duration":360},
  {"id":14,"name":"🇳🇱 Amsterdam → Paris","from":"Amsterdam Centraal","to":"Paris Nord","waypoints":[[52.3791,4.9003],[51.2194,4.4025],[50.6292,3.0573],[48.8809,2.3553]],"distance":514,"duration":195},
  {"id":15,"name":"🇨🇭 Zurich → Geneva","from":"Zurich HB","to":"Geneva Cornavin","waypoints":[[47.3783,8.5403],[46.9480,7.4474],[46.2044,6.1432]],"distance":288,"duration":170},
  {"id":16,"name":"🇯🇵 Tokyo → Sapporo","from":"Tokyo Station","to":"Sapporo Station","waypoints":[[35.6812,139.7671],[37.9026,140.8765],[41.7688,140.7288],[43.0618,141.3545]],"distance":1035,"duration":480},
  {"id":17,"name":"🇰🇷 Seoul → Busan","from":"Seoul Station","to":"Busan Station","waypoints":[[37.5547,126.9707],[36.3504,127.3845],[35.1796,129.0756]],"distance":325,"duration":150},
  {"id":18,"name":"🇿🇦 Johannesburg → Cape Town","from":"Park Station JHB","to":"Cape Town Station","waypoints":[[-26.2041,28.0473],[-29.1210,26.2140],[-33.9249,18.4241]],"distance":1547,"duration":1680},
  {"id":19,"name":"🇲🇽 Mexico City → Guadalajara","from":"Buenavista CDMX","to":"Guadalajara Station","waypoints":[[19.4517,-99.1453],[20.5888,-100.3899],[20.6597,-103.3496]],"distance":539,"duration":360},
  {"id":20,"name":"🇸🇪 Stockholm → Oslo","from":"Stockholm Central","to":"Oslo Central","waypoints":[[59.3304,18.0582],[59.6099,16.5448],[59.9139,10.7522]],"distance":521,"duration":360},
];

/* ─── Waypoint interpolation ─────────────────────────────────────────────── */
function waypointAt(waypoints: LatLng[], progress: number): LatLng {
  if (waypoints.length === 1) return waypoints[0];
  if (progress <= 0) return waypoints[0];
  if (progress >= 100) return waypoints[waypoints.length - 1];

  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dlat = waypoints[i + 1][0] - waypoints[i][0];
    const dlng = waypoints[i + 1][1] - waypoints[i][1];
    const len = Math.sqrt(dlat * dlat + dlng * dlng);
    segLens.push(len);
    total += len;
  }

  const target = (progress / 100) * total;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (acc + segLens[i] >= target) {
      const t = segLens[i] === 0 ? 0 : (target - acc) / segLens[i];
      const a = waypoints[i];
      const b = waypoints[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    acc += segLens[i];
  }
  return waypoints[waypoints.length - 1];
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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
    <span style={{
      display: 'inline-block', minWidth: finalChar === ' ' ? '0.35em' : '0.65em',
      textAlign: 'center', color: active ? '#f59e0b' : '#ffffff', transition: 'color 0.04s',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontWeight: 700,
    }}>
      {current === ' ' ? '\u00A0' : current}
    </span>
  );
}

function FlipText({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  return (
    <>{text.toUpperCase().split('').map((ch, i) => (
      <FlipChar key={i} finalChar={ch} delay={startDelay + i * 45} />
    ))}</>
  );
}

function BoardRow({ label, value, amber = false, flipDelay = 0, large = false }: {
  label: string; value: string; amber?: boolean; flipDelay?: number; large?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', minWidth: 90, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: large ? 22 : 17, color: amber ? '#f59e0b' : '#ffffff', fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontWeight: 700, letterSpacing: large ? 2 : 1 }}>
        <FlipText text={value} startDelay={flipDelay} />
      </span>
    </div>
  );
}

function BoardingBadge() {
  const [lit, setLit] = useState(true);
  useEffect(() => {
    const iv = setInterval(() => setLit(v => !v), 800);
    return () => clearInterval(iv);
  }, []);
  return (
    <span style={{
      fontSize: 11, fontWeight: 900, letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace",
      color: lit ? '#f59e0b' : 'rgba(245,158,11,0.3)', transition: 'color 0.3s', textTransform: 'uppercase',
      padding: '4px 10px', borderRadius: 6,
      background: lit ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.04)',
      border: `1px solid ${lit ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.1)'}`,
    }}>● BOARDING</span>
  );
}

/* ─── Shared Styles ──────────────────────────────────────────────────────── */
const GLASS: React.CSSProperties = {
  background: 'rgba(8,10,20,0.82)', backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18, color: 'white',
};
const GREEN = '#30D158';
const FOCUS_TYPES: FocusType[] = ['Deep Work', 'Study', 'Creative', 'Meeting', 'Reading'];

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function RailFocusView({ onEnd }: { onEnd: () => void }) {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [duration, setDuration] = useState(45);
  const [focusType, setFocusType] = useState<FocusType>('Deep Work');
  const [phase, setPhase] = useState<RailPhase>('picker');
  const [trainNumber, setTrainNumber] = useState('RF-0000');
  const [arrivalStep, setArrivalStep] = useState<ArrivalStep>('decelerating');
  const [showExit, setShowExit] = useState(false);
  const [abandonProgress, setAbandonProgress] = useState(0);
  const [abandonTimeLeft, setAbandonTimeLeft] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeRef = useRef(selectedRoute);
  const pauseStartRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);
  useEffect(() => { routeRef.current = selectedRoute; }, [selectedRoute]);

  const { addLog } = useLogbook();

  /* ── Timer ── */
  const handleComplete = useCallback(() => {
    const route = routeRef.current;
    if (!route) return;
    setPhase('arriving');
    setArrivalStep('decelerating');
    setTimeout(() => {
      if (mapRef.current) {
        const dest = route.waypoints[route.waypoints.length - 1];
        mapRef.current.panTo(dest, { animate: true, duration: 4 } as any);
      }
    }, 100);
    setTimeout(() => setArrivalStep('banner'), 4200);
    setTimeout(() => {
      setArrivalStep('summary');
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#30D158', '#ffd54f', '#ffffff'] });
      addLog({
        id: Date.now().toString(), mode: 'railfocus',
        from: route.from, to: route.to,
        fromCode: generateIata(route.from), toCode: generateIata(route.to),
        durationMinutes: duration, focusType, label: '',
        date: new Date().toISOString(), distance: route.distance, completed: true,
      });
    }, 6300);
  }, [duration, focusType, addLog]);

  const { timeLeft, isActive, toggle, progress } = useTimer(duration, handleComplete);

  useEffect(() => {
    if (!isActive && phase === 'active') { pauseStartRef.current = Date.now(); }
    else if (isActive && pauseStartRef.current !== null) {
      totalPausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
  }, [isActive, phase]);

  useEffect(() => {
    if (phase === 'active' && !isActive) toggle();
  }, [phase]);

  /* ── Map setup ── */
  useEffect(() => {
    if ((phase !== 'active' && phase !== 'arriving') || !mapContainerRef.current || !selectedRoute) return;
    if (mapRef.current) return;

    const dep = selectedRoute.waypoints[0];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      touchZoom: false, keyboard: false,
    });
    map.setView(dep, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.tileLayer('https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', { maxZoom: 19, opacity: 0.85 }).addTo(map);

    /* Route polyline */
    L.polyline(selectedRoute.waypoints, {
      color: GREEN, weight: 3, opacity: 0.55, dashArray: '8 6',
    }).addTo(map);

    /* Departure marker */
    const depIcon = L.divIcon({
      html: `<div style="width:10px;height:10px;border-radius:50%;background:${GREEN};border:2px solid white;box-shadow:0 0 8px ${GREEN}"></div>`,
      className: '', iconAnchor: [5, 5],
    });
    const arrIcon = L.divIcon({
      html: `<div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;border:2px solid white;box-shadow:0 0 8px #f59e0b"></div>`,
      className: '', iconAnchor: [5, 5],
    });
    L.marker(dep, { icon: depIcon }).addTo(map);
    L.marker(selectedRoute.waypoints[selectedRoute.waypoints.length - 1], { icon: arrIcon }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [phase]);

  /* ── Pan map following waypoints ── */
  useEffect(() => {
    if (phase !== 'active' || !mapRef.current || !selectedRoute) return;
    const pos = waypointAt(selectedRoute.waypoints, progress);
    mapRef.current.setView(pos, 14, { animate: true, duration: 1.5 } as any);
  }, [progress, phase]);

  const handleBoardFromPicker = () => {
    if (!selectedRoute) return;
    setTrainNumber(generateTrainNumber());
    setPhase('platform');
  };

  const handleAbandon = () => {
    const route = routeRef.current;
    setAbandonProgress(progress);
    setAbandonTimeLeft(timeLeft);
    if (route) {
      addLog({
        id: Date.now().toString(), mode: 'railfocus',
        from: route.from, to: route.to,
        fromCode: generateIata(route.from), toCode: generateIata(route.to),
        durationMinutes: Math.round((duration * 60 - timeLeft) / 60), focusType, label: '',
        date: new Date().toISOString(),
        distance: Math.round(route.distance * progress / 100), completed: false,
      });
    }
    setPhase('abandoned');
    setShowExit(false);
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* PHASE: PICKER                                                           */
  /* ═══════════════════════════════════════════════════════════════════════ */
  if (phase === 'picker') {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-20 pb-24 px-4">
        <main className="max-w-3xl mx-auto space-y-8">

          <div>
            <h2 className="text-2xl font-bold text-white mb-1">🚂 RailFocus</h2>
            <p className="text-muted-foreground">
              Choose one of 20 iconic rail routes. Your session follows real geographic waypoints on the map.
            </p>
          </div>

          {/* Route dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 10 }}>
              Select a Route — {ROUTES.length} iconic journeys
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedRoute?.id ?? ''}
                onChange={e => {
                  const route = ROUTES.find(r => r.id === Number(e.target.value)) ?? null;
                  setSelectedRoute(route);
                  if (route) setDuration(Math.min(180, Math.max(25, Math.round(route.duration / 4 / 5) * 5)));
                }}
                style={{
                  width: '100%', padding: '14px 48px 14px 18px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${selectedRoute ? 'rgba(48,209,88,0.45)' : 'rgba(255,255,255,0.12)'}`,
                  color: selectedRoute ? 'white' : 'rgba(255,255,255,0.45)',
                  fontSize: 15, fontWeight: 600, appearance: 'none', WebkitAppearance: 'none',
                  cursor: 'pointer', outline: 'none', transition: 'border-color 0.2s',
                  boxShadow: selectedRoute ? `0 0 0 3px rgba(48,209,88,0.08)` : 'none',
                }}
              >
                <option value="" disabled style={{ background: '#0d1117', color: 'rgba(255,255,255,0.4)' }}>
                  Choose your journey…
                </option>
                {ROUTES.map(route => (
                  <option key={route.id} value={route.id} style={{ background: '#0d1117', color: 'white', padding: '8px 0' }}>
                    {route.name} · {route.distance.toLocaleString()} km · ≈{fmtDuration(route.duration)}
                  </option>
                ))}
              </select>
              {/* Custom chevron */}
              <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: selectedRoute ? GREEN : 'rgba(255,255,255,0.3)', fontSize: 16, lineHeight: 1 }}>
                ▾
              </span>
            </div>
          </div>

          {/* Session config */}
          <AnimatePresence>
            {selectedRoute && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                {/* Route info panel */}
                <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(48,209,88,0.07)', border: '1px solid rgba(48,209,88,0.22)', marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 16px', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>Departure</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{selectedRoute.from}</div>
                    </div>
                    <span style={{ fontSize: 28, lineHeight: 1, alignSelf: 'center' }}>🚂</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>Arrival</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{selectedRoute.to}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>Distance</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>{selectedRoute.distance.toLocaleString()} km</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 16 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Real journey time </span>
                      <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>≈{fmtDuration(selectedRoute.duration)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Waypoints </span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{selectedRoute.waypoints.length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 border border-white/10 rounded-2xl p-6 space-y-6">
                  {/* Duration */}
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

                  {/* Focus Type */}
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

                <button onClick={handleBoardFromPicker}
                  className="w-full mt-4 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 text-background hover:opacity-90 transition-all"
                  style={{ background: GREEN, boxShadow: `0 0 30px rgba(48,209,88,0.3)` }}>
                  🚂 Board Train
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* PHASE: PLATFORM (Solari Departure Board)                               */
  /* ═══════════════════════════════════════════════════════════════════════ */
  if (phase === 'platform' && selectedRoute) {
    const durationLabel = duration >= 60
      ? `${Math.floor(duration / 60)}H ${String(duration % 60).padStart(2, '0')}M`
      : `${String(duration).padStart(2, '0')}M`;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 8000, background: '#06080d',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}>
        {/* CRT scanlines */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)' }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 640, padding: '0 24px' }}
        >
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}>
            {/* Header strip */}
            <div style={{ background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, letterSpacing: 4, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>
                ◈ Departures
              </span>
              <BoardingBadge />
            </div>

            <div style={{ padding: '8px 28px 28px' }}>
              <BoardRow label="Train"    value={trainNumber}                     large flipDelay={200} />
              <BoardRow label="From"     value={selectedRoute.from.substring(0, 22).toUpperCase()} flipDelay={600} />
              <BoardRow label="To"       value={selectedRoute.to.substring(0, 22).toUpperCase()}   flipDelay={900} />
              <BoardRow label="Session"  value={durationLabel}                    flipDelay={1300} />
              <BoardRow label="Distance" value={`${selectedRoute.distance} KM`}   flipDelay={1550} />
              <BoardRow label="Status"   value="BOARDING"        amber            flipDelay={1800} />
            </div>
          </div>

          <motion.button
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.5 }}
            onClick={() => setPhase('active')}
            style={{
              marginTop: 28, width: '100%', padding: '18px 0', borderRadius: 14,
              background: GREEN, border: 'none', color: '#000', fontSize: 17,
              fontWeight: 900, letterSpacing: 1, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", boxShadow: `0 0 30px rgba(48,209,88,0.35)`,
            }}
            whileHover={{ scale: 1.02, boxShadow: `0 0 50px rgba(48,209,88,0.5)` }}
            whileTap={{ scale: 0.98 }}
          >
            🚂 BOARD TRAIN
          </motion.button>

          <button
            onClick={() => setPhase('picker')}
            style={{ marginTop: 12, width: '100%', padding: '12px 0', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
          >
            ← Back to Routes
          </button>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* PHASE: ABANDONED                                                        */
  /* ═══════════════════════════════════════════════════════════════════════ */
  if (phase === 'abandoned' && selectedRoute) {
    const kmCovered = Math.round(selectedRoute.distance * abandonProgress / 100);
    const secsElapsed = duration * 60 - abandonTimeLeft;
    const mElapsed = Math.floor(secsElapsed / 60);
    const sElapsed = secsElapsed % 60;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ position: 'fixed', inset: 0, zIndex: 8000, background: '#0a0005', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🚧</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#ef4444', marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>JOURNEY ABANDONED</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 28 }}>The train returned to the depot.</p>
          <div style={{ ...GLASS, padding: '20px 28px', marginBottom: 24, textAlign: 'left' }}>
            {[
              ['Train', trainNumber],
              ['Route', selectedRoute.name],
              ['Time Elapsed', `${mElapsed}m ${sElapsed}s`],
              ['Distance Covered', `${kmCovered} km`],
              ['Completed', `${Math.round(abandonProgress)}%`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                <span style={{ color: 'white', fontWeight: 600, maxWidth: 220, textAlign: 'right' }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => { setPhase('picker'); setSelectedRoute(null); }}
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

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* PHASES: ACTIVE + ARRIVING                                               */
  /* ═══════════════════════════════════════════════════════════════════════ */
  const distKmLeft = selectedRoute ? selectedRoute.distance * (1 - progress / 100) : 0;
  const focusScore = Math.max(60, Math.round(100 - (totalPausedMsRef.current / (duration * 60 * 1000)) * 40));
  const isArriving = phase === 'arriving';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, background: '#0a0e1a' }}>
      {/* Leaflet map */}
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

      {/* Fixed train icon */}
      <motion.div
        animate={isArriving && arrivalStep === 'decelerating' ? { x: [0, 2, -1, 1, 0], scale: [1, 1, 0.95, 1] } : { x: 0, scale: 1 }}
        transition={{ duration: 3, ease: 'easeOut' }}
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 44, zIndex: 9050, filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.9))', pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}
      >🚂</motion.div>

      {/* ARRIVED banner */}
      <AnimatePresence>
        {isArriving && (arrivalStep === 'banner' || arrivalStep === 'summary') && (
          <motion.div
            initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9300, background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', borderBottom: '2px solid #30D158', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}
          >
            <span style={{ fontSize: 28 }}>✅</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: GREEN, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }}>ARRIVED</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{selectedRoute?.to}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary card */}
      <AnimatePresence>
        {isArriving && arrivalStep === 'summary' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: 24, paddingTop: 100 }}
          >
            <div style={{ maxWidth: 440, width: '100%' }}>
              <div style={{ ...GLASS, padding: '28px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🚂</div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: GREEN, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>JOURNEY COMPLETE</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 24 }}>{selectedRoute?.from} → {selectedRoute?.to}</p>
                <div style={{ textAlign: 'left', marginBottom: 24 }}>
                  {[
                    ['Route', selectedRoute?.name || ''],
                    ['Journey Time', `${duration >= 60 ? `${Math.floor(duration/60)}h ${duration%60}m` : `${duration}m`} · ${focusType}`],
                    ['Distance Covered', `${selectedRoute?.distance.toLocaleString()} km`],
                    ['Stations Passed', `~${Math.max(1, Math.round((selectedRoute?.distance || 0) / 40))} stations`],
                    ['Focus Score', `${focusScore} / 100`],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 14 }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                      <span style={{ color: label === 'Focus Score' ? GREEN : 'white', fontWeight: 700, maxWidth: 220, textAlign: 'right' }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setPhase('picker'); setSelectedRoute(null); }}
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
      {!isArriving && selectedRoute && (
        <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 9100, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...GLASS, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={toggle}
              style={{ width: 40, height: 40, borderRadius: 11, background: isActive ? 'rgba(255,255,255,0.12)' : GREEN, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'white' : '#000', fontSize: 18, transition: 'all 0.2s', flexShrink: 0 }}>
              {isActive ? '⏸' : '▶'}
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{trainNumber}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, marginTop: 2 }}>
                {selectedRoute.name}
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
