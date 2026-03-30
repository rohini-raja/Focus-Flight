import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionConfig, formatTime } from '@/utils/flight-utils';

// ─── 20 Major world airports ──────────────────────────────────────────────────
const AIRPORTS = [
  { code: 'JFK', name: 'New York',       lat: 40.6413,  lng: -73.7781  },
  { code: 'LHR', name: 'London',         lat: 51.4700,  lng: -0.4543   },
  { code: 'CDG', name: 'Paris',          lat: 49.0097,  lng:  2.5479   },
  { code: 'DXB', name: 'Dubai',          lat: 25.2532,  lng: 55.3657   },
  { code: 'HND', name: 'Tokyo',          lat: 35.5493,  lng: 139.7798  },
  { code: 'SIN', name: 'Singapore',      lat:  1.3644,  lng: 103.9915  },
  { code: 'SYD', name: 'Sydney',         lat: -33.9399, lng: 151.1753  },
  { code: 'LAX', name: 'Los Angeles',    lat: 33.9425,  lng: -118.4081 },
  { code: 'ORD', name: 'Chicago',        lat: 41.9742,  lng: -87.9073  },
  { code: 'FRA', name: 'Frankfurt',      lat: 50.0379,  lng:  8.5622   },
  { code: 'AMS', name: 'Amsterdam',      lat: 52.3086,  lng:  4.7639   },
  { code: 'PEK', name: 'Beijing',        lat: 40.0799,  lng: 116.6031  },
  { code: 'HKG', name: 'Hong Kong',      lat: 22.3080,  lng: 113.9185  },
  { code: 'ICN', name: 'Seoul',          lat: 37.4602,  lng: 126.4407  },
  { code: 'BOM', name: 'Mumbai',         lat: 19.0896,  lng:  72.8656  },
  { code: 'GRU', name: 'São Paulo',      lat: -23.4356, lng: -46.4731  },
  { code: 'MEX', name: 'Mexico City',    lat: 19.4363,  lng: -99.0721  },
  { code: 'JNB', name: 'Johannesburg',   lat: -26.1367, lng:  28.2411  },
  { code: 'SVO', name: 'Moscow',         lat: 55.9736,  lng:  37.4125  },
  { code: 'DEL', name: 'New Delhi',      lat: 28.5665,  lng:  77.1031  },
] as const;

type Airport = typeof AIRPORTS[number];

// ─── Tile sources ─────────────────────────────────────────────────────────────
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const HYBRID_TILES    = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const STREET_TILES    = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// ─── Zoom levels ──────────────────────────────────────────────────────────────
const ZOOM_PREFLIGHT = 11;
const ZOOM_RUNWAY    = 14;
const ZOOM_CRUISE    = 8;
const ZOOM_LANDING   = 13;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function zoomForProgress(p: number): number {
  if (p <= 8)  return ZOOM_RUNWAY - (ZOOM_RUNWAY - ZOOM_CRUISE) * easeInOut(p / 8);
  if (p >= 92) return ZOOM_CRUISE + (ZOOM_LANDING - ZOOM_CRUISE) * easeInOut((p - 92) / 8);
  return ZOOM_CRUISE;
}

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

function calcBearing(a: [number, number], b: [number, number]): number {
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 60000 })
  );
}

/** km per minute mapping: 25 min ≈ 400 km, 50 min ≈ 800 km, 90 min ≈ 1500 km */
function targetDistanceKm(durationMinutes: number): number {
  return Math.round((durationMinutes / 25) * 400);
}

function nearestAirport(coords: [number, number]): Airport {
  return [...AIRPORTS].sort(
    (a, b) =>
      haversineKm(coords, [a.lat, a.lng]) - haversineKm(coords, [b.lat, b.lng])
  )[0];
}

function bestDestination(origin: Airport, targetKm: number): Airport {
  return [...AIRPORTS]
    .filter(a => a.code !== origin.code)
    .sort((a, b) => {
      const dA = Math.abs(haversineKm([origin.lat, origin.lng], [a.lat, a.lng]) - targetKm);
      const dB = Math.abs(haversineKm([origin.lat, origin.lng], [b.lat, b.lng]) - targetKm);
      return dA - dB;
    })[0];
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
  const mapRef          = useRef<L.Map | null>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const satLayerRef     = useRef<L.TileLayer | null>(null);
  const hybridLayerRef  = useRef<L.TileLayer | null>(null);
  const streetLayerRef  = useRef<L.TileLayer | null>(null);

  const startCoordsRef  = useRef<[number, number] | null>(null);
  const endCoordsRef    = useRef<[number, number] | null>(null);
  const totalKmRef      = useRef<number | null>(null);
  const progressRef     = useRef(progress);
  progressRef.current   = progress;

  const [isSatellite,  setIsSatellite]  = useState(true);
  const [showLabels,   setShowLabels]   = useState(true);
  const [distKm,       setDistKm]       = useState<number | null>(null);
  const [planeBearing, setPlaneBearing] = useState(45);
  const [launching,    setLaunching]    = useState(false);
  const [routeReady,   setRouteReady]   = useState(false); // true once airports resolved

  // Display names resolved from airport list
  const [originCode, setOriginCode] = useState('');
  const [destCode,   setDestCode]   = useState('');
  const [destCity,   setDestCity]   = useState('');

  // ── Map init (once) ──────────────────────────────────────────────────────────
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
      try {
        // 1 ── Get GPS coords (fall back to a sensible default if denied/slow)
        let gpsCoords: [number, number];
        try {
          const pos = await getCurrentPosition();
          gpsCoords = [pos.coords.latitude, pos.coords.longitude];
        } catch (_) {
          gpsCoords = [51.5074, -0.1278]; // London fallback
        }

        // 2 ── Nearest airport to user = origin
        const origin = nearestAirport(gpsCoords);
        const startCoords: [number, number] = [origin.lat, origin.lng];
        startCoordsRef.current = startCoords;
        setOriginCode(origin.code);

        // Centre map on departure airport at preflight zoom
        map.setView(startCoords, ZOOM_PREFLIGHT, { animate: false });

        // 3 ── Pick destination airport that matches session duration
        const targetKm  = targetDistanceKm(session.durationMinutes ?? 25);
        const dest      = bestDestination(origin, targetKm);
        const endCoords: [number, number] = [dest.lat, dest.lng];
        endCoordsRef.current = endCoords;
        setDestCode(dest.code);
        setDestCity(dest.name);

        // 4 ── Great-circle distance & bearing
        const totalKm = haversineKm(startCoords, endCoords);
        totalKmRef.current = totalKm;
        setDistKm(totalKm);
        setPlaneBearing(calcBearing(startCoords, endCoords));
      } catch (err) {
        console.error('[MapFlightView] init error:', err);
        // Even on error, unblock the UI with defaults
        const fallback: [number, number] = [51.5074, -0.1278];
        if (!startCoordsRef.current) startCoordsRef.current = fallback;
        if (!endCoordsRef.current)   endCoordsRef.current   = [48.8566, 2.3522];
        map.setView(fallback, ZOOM_PREFLIGHT, { animate: false });
      } finally {
        // Always unblock the preflight screen — no matter what happened above
        setRouteReady(true);
      }
    };

    init();

    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Every second: pan map + decrement distance proportionally ─────────────
  useEffect(() => {
    if (!mapRef.current || !startCoordsRef.current || !endCoordsRef.current || !flightStarted) return;

    const t = progress / 100;

    // Interpolate position along great-circle route
    const currentPos = lerp(startCoordsRef.current, endCoordsRef.current, t);

    // Zoom altitude simulation
    const zoom = zoomForProgress(progress);

    // Smooth Leaflet animation — 1.2 s completes just as the next tick fires
    (mapRef.current as any).setView(currentPos, zoom, { animate: true, duration: 1.2 });

    // Proportional distance countdown: totalKm × (1 − t)
    if (totalKmRef.current !== null) {
      setDistKm(totalKmRef.current * (1 - t));
    }
  }, [progress, flightStarted]);

  // ── "Start Flight" → zoom-in animation → hand off to timer ───────────────
  const handleLaunch = useCallback(() => {
    if (!mapRef.current || !startCoordsRef.current) { onStartFlight(); return; }
    setLaunching(true);
    const c = mapRef.current.getCenter();
    (mapRef.current as any).setView([c.lat, c.lng], ZOOM_RUNWAY, { animate: true, duration: 1.8 });
    setTimeout(() => { setLaunching(false); onStartFlight(); }, 1900);
  }, [onStartFlight]);

  // ── Layer toggles ─────────────────────────────────────────────────────────
  const toggleLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isSatellite) {
      if (satLayerRef.current)   map.removeLayer(satLayerRef.current);
      if (hybridLayerRef.current) map.removeLayer(hybridLayerRef.current);
      if (streetLayerRef.current) streetLayerRef.current.addTo(map);
    } else {
      if (streetLayerRef.current) map.removeLayer(streetLayerRef.current);
      if (satLayerRef.current)    satLayerRef.current.addTo(map);
      if (showLabels && hybridLayerRef.current) hybridLayerRef.current.addTo(map);
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

  // ── Derived values ────────────────────────────────────────────────────────
  const timeLeftMinutes = Math.ceil(timeLeft / 60);
  const altFt = (() => {
    if (progress <= 8)  return Math.round((progress / 8) * 38000);
    if (progress >= 92) return Math.round(((100 - progress) / 8) * 38000);
    return 38000;
  })();
  const altPhase = progress <= 8 ? 'CLIMBING' : progress >= 92 ? 'DESCENDING' : 'CRUISE';

  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden">
      <style>{`
        .leaflet-container { background: #0a0a0f; }
        .map-btn {
          width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.68);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.13); border-radius: 12px;
          color: white; cursor: pointer; font-size: 18px;
          transition: background 0.15s; user-select: none;
        }
        .map-btn:hover  { background: rgba(255,255,255,0.15); }
        .map-btn.active { background: rgba(255,255,255,0.22); }
        .overlay-pill {
          background: rgba(0,0,0,0.68);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px; padding: 14px 20px; color: white;
        }
      `}</style>

      {/* ── MAP CANVAS ─────────────────────────────────────────────────── */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />


      {/* ── PLANE ICON — fixed to viewport center ─────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
        <div style={{ transform: `rotate(${planeBearing}deg)` }}
          className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-white/8 animate-ping"
            style={{ animationDuration: '2.4s' }} />
          <div className="absolute w-12 h-12 rounded-full bg-white/15 border border-white/20" />
          <span className="relative z-10 text-[38px] leading-none drop-shadow-[0_2px_12px_rgba(255,255,255,0.9)]"
            style={{ transform: `rotate(-${planeBearing}deg)` }}>
            ✈️
          </span>
        </div>
      </div>

      {/* ── PREFLIGHT OVERLAY — shown immediately, data fills in async ── */}
      <AnimatePresence>
        {!flightStarted && (
          <motion.div
            key="preflight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={{ textAlign: 'center', maxWidth: 380, padding: '0 24px', width: '100%' }}
            >
              <p style={{ fontSize: 11, letterSpacing: 5, color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
                Destination
              </p>

              {/* City name — show session.to immediately, update once route resolves */}
              <h1 style={{ fontSize: 52, fontWeight: 800, color: 'white', lineHeight: 1.1,
                marginBottom: 6, letterSpacing: '-1.5px', minHeight: 62 }}>
                {routeReady ? (destCity || session.to) : (session.to || '…')}
              </h1>

              {/* Airport codes */}
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.38)', marginBottom: 36,
                fontFamily: 'monospace', letterSpacing: 3, minHeight: 26 }}>
                {routeReady
                  ? `${originCode || '???'} ——— ${destCode || '???'}`
                  : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                        display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      Plotting route…
                    </span>
                }
              </p>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

              {/* Stats strip */}
              <div style={{
                display: 'flex', background: 'rgba(255,255,255,0.06)',
                borderRadius: 14, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.10)', marginBottom: 36,
              }}>
                {[
                  { label: 'Duration', value: session.durationMinutes ? `${session.durationMinutes} min` : '—' },
                  { label: 'Distance', value: distKm ? `${Math.round(distKm).toLocaleString()} km` : '…' },
                  { label: 'Focus',    value: session.focusType || '—' },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{
                    flex: 1, padding: '14px 0', textAlign: 'center',
                    borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none',
                  }}>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.35)',
                      textTransform: 'uppercase', marginBottom: 5 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Start Flight button — enabled once route is ready */}
              <button
                onClick={handleLaunch}
                disabled={!routeReady || launching}
                style={{
                  width: '100%', padding: '18px 0', borderRadius: 16,
                  background: (!routeReady || launching) ? 'rgba(255,255,255,0.4)' : 'white',
                  color: '#050810', fontSize: 17, fontWeight: 800,
                  cursor: (!routeReady || launching) ? 'default' : 'pointer',
                  border: 'none', letterSpacing: 0.3,
                  transition: 'background 0.25s, transform 0.15s',
                  transform: launching ? 'scale(0.97)' : 'scale(1)',
                }}
              >
                {launching ? '✈️  Taking off…' : !routeReady ? '⏳  Plotting route…' : '✈️  Start Flight'}
              </button>

              {session.label && (
                <p style={{ marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
                  "{session.label}"
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HUD (only visible once flight started) ──────────────────────── */}

      {/* Pause + Route pill — top left */}
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
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>
              {originCode}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>→</span>
            <span style={{ color: 'white', fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>
              {destCode}
            </span>
          </div>
        </div>
      )}

      {/* Altitude indicator — top center */}
      {flightStarted && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="overlay-pill py-2 px-5 flex items-center gap-3"
            style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)' }}>
            <span>
              {altPhase === 'CLIMBING'    && '↑ CLIMBING'}
              {altPhase === 'CRUISE'      && '✈ CRUISE'}
              {altPhase === 'DESCENDING'  && '↓ DESCENDING'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span>{altFt.toLocaleString()} ft</span>
          </div>
        </div>
      )}

      {/* Map controls — top right */}
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

      {/* Time Remaining — bottom left */}
      {flightStarted && (
        <div className="absolute bottom-8 left-5 z-40">
          <div className="overlay-pill">
            <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.42)',
              textTransform: 'uppercase', marginBottom: 4 }}>Time Remaining</div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px',
              fontFamily: 'system-ui,-apple-system,sans-serif', color: 'white' }}>
              {timeLeftMinutes < 60
                ? `${timeLeftMinutes} min`
                : `${Math.floor(timeLeftMinutes / 60)}h ${timeLeftMinutes % 60}m`}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginTop: 3,
              fontFamily: 'monospace' }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      )}

      {/* Distance Remaining — bottom right */}
      {flightStarted && (
        <div className="absolute bottom-8 right-5 z-40">
          <div className="overlay-pill" style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.42)',
              textTransform: 'uppercase', marginBottom: 4 }}>Distance Remaining</div>
            <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px',
              fontFamily: 'system-ui,-apple-system,sans-serif', color: 'white' }}>
              {distKm !== null ? `${Math.round(distKm).toLocaleString()} km` : '— km'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginTop: 3 }}>
              to {destCity || session.to}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {flightStarted && (
        <div className="absolute bottom-0 left-0 right-0 z-40 h-[3px]">
          <div className="h-full bg-white/50 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Focus mode badge */}
      {flightStarted && isActive && (
        <div className="absolute bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="overlay-pill py-2 px-5 flex items-center gap-2"
            style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.58)' }}>
            🔕 Focus Mode Active
          </div>
        </div>
      )}
    </div>
  );
}
