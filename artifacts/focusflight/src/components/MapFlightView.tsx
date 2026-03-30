import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionConfig, formatTime } from '@/utils/flight-utils';

// ─── Tile sources ─────────────────────────────────────────────────────────────
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const HYBRID_TILES    = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const STREET_TILES    = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// ─── Zoom levels ──────────────────────────────────────────────────────────────
const ZOOM_PREFLIGHT  = 11;   // city-level overview on preflight screen
const ZOOM_RUNWAY     = 14;   // zoomed in tight (runway / takeoff)
const ZOOM_CRUISE     = 8;    // high altitude during cruise
const ZOOM_LANDING    = 13;   // zoomed back in on approach

// ─── Easing ───────────────────────────────────────────────────────────────────
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Returns the target zoom level for a given flight progress (0-100) */
function zoomForProgress(p: number): number {
  if (p <= 8) {
    // Takeoff: zoom OUT from runway → cruise
    return ZOOM_RUNWAY - (ZOOM_RUNWAY - ZOOM_CRUISE) * easeInOut(p / 8);
  }
  if (p >= 92) {
    // Descent: zoom IN from cruise → landing
    return ZOOM_CRUISE + (ZOOM_LANDING - ZOOM_CRUISE) * easeInOut((p - 92) / 8);
  }
  return ZOOM_CRUISE; // cruise
}

// ─── Geo helpers ──────────────────────────────────────────────────────────────
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function bearing(a: [number, number], b: [number, number]): number {
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

async function geocode(query: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch (_) {}
  return null;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 60000 })
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MapFlightViewProps {
  session: SessionConfig;
  timeLeft: number;
  progress: number;
  totalSeconds: number;
  isActive: boolean;
  flightStarted: boolean;
  onToggle: () => void;
  onStartFlight: () => void;
  onEarlyLanding: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MapFlightView({
  session,
  timeLeft,
  progress,
  totalSeconds,
  isActive,
  flightStarted,
  onToggle,
  onStartFlight,
  onEarlyLanding,
}: MapFlightViewProps) {
  const mapRef       = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const satLayerRef  = useRef<L.TileLayer | null>(null);
  const hybridLayerRef = useRef<L.TileLayer | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);

  const startCoordsRef = useRef<[number, number] | null>(null);
  const endCoordsRef   = useRef<[number, number] | null>(null);
  const progressRef    = useRef(progress);
  progressRef.current  = progress;

  const [isSatellite,  setIsSatellite]  = useState(true);
  const [showLabels,   setShowLabels]   = useState(true);
  const [distKm,       setDistKm]       = useState<number | null>(null);
  const [planeBearing, setPlaneBearing] = useState(45);
  const [status, setStatus] = useState<'locating' | 'geocoding' | 'ready' | 'error'>('locating');
  const [launching, setLaunching] = useState(false); // zoom-in animation running

  // ── Map initialisation (once on mount) ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false, attributionControl: false,
      keyboard: false, scrollWheelZoom: false,
      dragging: false, doubleClickZoom: false, boxZoom: false,
      zoomAnimation: true, fadeAnimation: true,
    });

    const sat    = L.tileLayer(SATELLITE_TILES, { maxZoom: 18 }).addTo(map);
    const hybrid = L.tileLayer(HYBRID_TILES,    { maxZoom: 18, opacity: 0.8 }).addTo(map);
    const street = L.tileLayer(STREET_TILES,    { maxZoom: 18 });

    satLayerRef.current    = sat;
    hybridLayerRef.current = hybrid;
    streetLayerRef.current = street;
    mapRef.current         = map;

    const init = async () => {
      // 1. Get departure coords
      let startCoords: [number, number];
      try {
        const pos = await getCurrentPosition();
        startCoords = [pos.coords.latitude, pos.coords.longitude];
      } catch (_) {
        const fallback = await geocode(session.from + ' airport');
        if (!fallback) { setStatus('error'); return; }
        startCoords = fallback;
      }

      startCoordsRef.current = startCoords;
      // Preflight view: overview zoom
      map.setView(startCoords, ZOOM_PREFLIGHT, { animate: false });
      setStatus('geocoding');

      // 2. Get destination coords
      let endCoords = await geocode(session.to + ' airport');
      if (!endCoords) endCoords = await geocode(session.to);
      endCoordsRef.current = endCoords ?? [startCoords[0] + 4, startCoords[1] + 4];

      const b = bearing(startCoords, endCoordsRef.current);
      setPlaneBearing(b);
      const totalKm = haversineKm(startCoords, endCoordsRef.current);
      setDistKm(totalKm);

      setStatus('ready');
    };

    init();

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Progress → map pan + zoom every second ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !startCoordsRef.current || !endCoordsRef.current || !flightStarted) return;

    const t = progress / 100;
    const currentPos = lerp(startCoordsRef.current, endCoordsRef.current, t);
    const zoom = zoomForProgress(progress);

    // animate:true with duration 1.2s — completes just as the next tick fires
    (mapRef.current as any).setView(currentPos, zoom, { animate: true, duration: 1.2 });

    const remaining = haversineKm(currentPos, endCoordsRef.current);
    setDistKm(remaining);
  }, [progress, flightStarted]);

  // ── "Start Flight" button handler ─────────────────────────────────────────
  const handleLaunch = useCallback(() => {
    if (!mapRef.current || !startCoordsRef.current) { onStartFlight(); return; }
    setLaunching(true);
    // Zoom in to runway level
    const center = mapRef.current.getCenter();
    (mapRef.current as any).setView([center.lat, center.lng], ZOOM_RUNWAY, { animate: true, duration: 1.8 });
    // After zoom-in completes, hand off to timer
    setTimeout(() => {
      setLaunching(false);
      onStartFlight();
    }, 1900);
  }, [onStartFlight]);

  // ── Layer toggles ─────────────────────────────────────────────────────────
  const toggleLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map || !satLayerRef.current || !streetLayerRef.current || !hybridLayerRef.current) return;
    if (isSatellite) {
      map.removeLayer(satLayerRef.current);
      map.removeLayer(hybridLayerRef.current);
      streetLayerRef.current.addTo(map);
    } else {
      map.removeLayer(streetLayerRef.current);
      satLayerRef.current.addTo(map);
      if (showLabels) hybridLayerRef.current.addTo(map);
    }
    setIsSatellite(v => !v);
  }, [isSatellite, showLabels]);

  const toggleLabels = useCallback(() => {
    const map = mapRef.current;
    if (!map || !hybridLayerRef.current) return;
    if (showLabels) { map.removeLayer(hybridLayerRef.current); }
    else if (isSatellite) { hybridLayerRef.current.addTo(map); }
    setShowLabels(v => !v);
  }, [showLabels, isSatellite]);

  const reCenter = useCallback(() => {
    const map = mapRef.current;
    if (!map || !startCoordsRef.current || !endCoordsRef.current) return;
    const pos = lerp(startCoordsRef.current, endCoordsRef.current, progressRef.current / 100);
    (map as any).setView(pos, zoomForProgress(progressRef.current), { animate: true });
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  const timeLeftMinutes = Math.ceil(timeLeft / 60);

  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden">
      <style>{`
        .leaflet-container { background: #0a0a0f; }
        .map-btn {
          width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.68);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 12px;
          color: white; cursor: pointer; font-size: 18px;
          transition: background 0.15s;
          user-select: none; -webkit-user-select: none;
        }
        .map-btn:hover  { background: rgba(255,255,255,0.15); }
        .map-btn.active { background: rgba(255,255,255,0.22); }
        .overlay-pill {
          background: rgba(0,0,0,0.68);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          padding: 14px 20px;
          color: white;
        }
      `}</style>

      {/* ── MAP CANVAS ───────────────────────────────────────────────────── */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* ── INIT STATUS ──────────────────────────────────────────────────── */}
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="overlay-pill flex flex-col items-center gap-3 px-10 py-7">
            <div className="w-6 h-6 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold tracking-wider text-white/80">
              {status === 'locating'  && 'Acquiring position…'}
              {status === 'geocoding' && 'Plotting route…'}
              {status === 'error'     && 'Location unavailable'}
            </span>
          </div>
        </div>
      )}

      {/* ── PLANE ICON ── locked to viewport center always ───────────────── */}
      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
        <div className="relative flex items-center justify-center"
          style={{ transform: `rotate(${planeBearing}deg)` }}>
          {/* Halo rings */}
          <div className="absolute w-20 h-20 rounded-full bg-white/8 animate-ping"
            style={{ animationDuration: '2.4s' }} />
          <div className="absolute w-12 h-12 rounded-full bg-white/15 border border-white/20" />
          {/* Plane — counter-rotated so it always points direction regardless of map bearing */}
          <span className="relative z-10 text-[38px] leading-none drop-shadow-[0_2px_12px_rgba(255,255,255,0.9)]"
            style={{ transform: `rotate(-${planeBearing}deg)` }}>
            ✈️
          </span>
        </div>
      </div>

      {/* ── PREFLIGHT OVERLAY ────────────────────────────────────────────── */}
      <AnimatePresence>
        {!flightStarted && status === 'ready' && (
          <motion.div
            key="preflight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              style={{ textAlign: 'center', maxWidth: 380, padding: '0 24px', width: '100%' }}
            >
              {/* Destination label */}
              <p style={{ fontSize: 11, letterSpacing: 5, color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
                Destination
              </p>

              {/* City name */}
              <h1 style={{ fontSize: 52, fontWeight: 800, color: 'white', lineHeight: 1.1,
                marginBottom: 6, letterSpacing: '-1px' }}>
                {session.to}
              </h1>

              {/* Route */}
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginBottom: 36,
                fontFamily: 'monospace', letterSpacing: 2 }}>
                {session.fromCode} ——— {session.toCode}
              </p>

              {/* Stats row */}
              <div style={{
                display: 'flex', gap: 0,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 14, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 36,
              }}>
                {[
                  { label: 'Duration', value: `${session.durationMinutes} min` },
                  { label: 'Focus', value: session.focusType },
                  ...(distKm ? [{ label: 'Distance', value: `${Math.round(distKm).toLocaleString()} km` }] : []),
                ].map((item, i, arr) => (
                  <div key={item.label} style={{
                    flex: 1, padding: '14px 0',
                    borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.35)',
                      textTransform: 'uppercase', marginBottom: 4 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Start Flight button */}
              <button
                onClick={handleLaunch}
                disabled={launching}
                style={{
                  width: '100%', padding: '18px 0', borderRadius: 16,
                  background: launching ? 'rgba(255,255,255,0.6)' : 'white',
                  color: '#050810', fontSize: 17, fontWeight: 800,
                  cursor: launching ? 'default' : 'pointer',
                  border: 'none', letterSpacing: 0.3,
                  transition: 'background 0.2s, transform 0.1s',
                  transform: launching ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                {launching ? '✈️  Taking off…' : '✈️  Start Flight'}
              </button>

              {/* Task hint */}
              {session.label && (
                <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                  "{session.label}"
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP-LEFT: PAUSE + ROUTE ───────────────────────────────────────── */}
      {flightStarted && (
        <div className="absolute top-5 left-5 z-40 flex items-center gap-2">
          <button className="map-btn" onClick={onToggle} title={isActive ? 'Pause' : 'Resume'}>
            {isActive ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                <rect x="4" y="3" width="4" height="14" rx="1.5"/>
                <rect x="12" y="3" width="4" height="14" rx="1.5"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                <path d="M5 3.5l12 6.5-12 6.5V3.5z"/>
              </svg>
            )}
          </button>
          <div className="overlay-pill flex items-center gap-2 py-2 px-4">
            <span className="text-white/50 text-sm font-mono font-bold">{session.fromCode}</span>
            <span className="text-white/30 text-xs">→</span>
            <span className="text-white text-sm font-mono font-bold">{session.toCode}</span>
          </div>
        </div>
      )}

      {/* ── TOP-RIGHT: MAP CONTROLS ──────────────────────────────────────── */}
      <div className="absolute top-5 right-5 z-40 flex flex-col gap-2">
        <button className={`map-btn ${isSatellite ? 'active' : ''}`} onClick={toggleLayer}
          title={isSatellite ? 'Street map' : 'Satellite'}>
          {isSatellite ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="9"/>
              <path d="M3 12h18M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18"/>
            </svg>
          )}
        </button>
        <button className="map-btn" onClick={reCenter} title="Re-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="8"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="2.5"/>
            <circle cx="12" cy="12" r="2.5" fill="white" stroke="none"/>
          </svg>
        </button>
        <button className={`map-btn ${showLabels ? 'active' : ''}`} onClick={toggleLabels} title="Labels">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M4 6h16M4 12h10M4 18h12"/>
          </svg>
        </button>
        {flightStarted && (
          <button className="map-btn" onClick={onEarlyLanding} title="End early" style={{ marginTop: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── BOTTOM-LEFT: TIME REMAINING ──────────────────────────────────── */}
      {flightStarted && (
        <div className="absolute bottom-8 left-5 z-40">
          <div className="overlay-pill">
            <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', marginBottom: 4 }}>Time Remaining</div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px',
              fontFamily: 'system-ui,-apple-system,sans-serif', color: 'white', tabularNums: true }}>
              {timeLeftMinutes < 60
                ? `${timeLeftMinutes} min`
                : `${Math.floor(timeLeftMinutes / 60)}h ${timeLeftMinutes % 60}m`}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2,
              fontFamily: 'monospace' }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM-RIGHT: DISTANCE REMAINING ────────────────────────────── */}
      {flightStarted && (
        <div className="absolute bottom-8 right-5 z-40">
          <div className="overlay-pill" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', marginBottom: 4 }}>Distance Remaining</div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px',
              fontFamily: 'system-ui,-apple-system,sans-serif', color: 'white' }}>
              {distKm !== null ? `${Math.round(distKm).toLocaleString()} km` : '— km'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {session.to}
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRESS BAR ─────────────────────────────────────────────────── */}
      {flightStarted && (
        <div className="absolute bottom-0 left-0 right-0 z-40 h-[3px]">
          <div className="h-full bg-white/55 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ── FOCUS MODE ───────────────────────────────────────────────────── */}
      {flightStarted && isActive && (
        <div className="absolute bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="overlay-pill py-2 px-5 text-xs font-semibold tracking-[0.2em] text-white/60 flex items-center gap-2">
            🔕 Focus Mode Active
          </div>
        </div>
      )}

      {/* ── ALTITUDE INDICATOR ───────────────────────────────────────────── */}
      {flightStarted && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="overlay-pill py-2 px-5 text-xs font-mono text-white/50 flex items-center gap-3">
            <span>
              {progress <= 8
                ? `↑ ${Math.round(progress / 8 * 100)}%`
                : progress >= 92
                ? `↓ DESCENDING`
                : `✈ CRUISE`}
            </span>
            <span className="text-white/25">|</span>
            <span>
              {progress <= 8
                ? `${Math.round(progress / 8 * 38000).toLocaleString()} ft`
                : progress >= 92
                ? `${Math.round((1 - (progress - 92) / 8) * 38000).toLocaleString()} ft`
                : '38,000 ft'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
