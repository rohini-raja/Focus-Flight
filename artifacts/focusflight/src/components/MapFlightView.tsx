import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SessionConfig, formatTime } from '@/utils/flight-utils';

const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const HYBRID_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const STREET_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const MAP_ZOOM = 9;

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
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 60000,
    })
  );
}

interface MapFlightViewProps {
  session: SessionConfig;
  timeLeft: number;
  progress: number;
  totalSeconds: number;
  isActive: boolean;
  onToggle: () => void;
  onEarlyLanding: () => void;
}

export function MapFlightView({
  session,
  timeLeft,
  progress,
  totalSeconds,
  isActive,
  onToggle,
  onEarlyLanding,
}: MapFlightViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const satLayerRef = useRef<L.TileLayer | null>(null);
  const hybridLayerRef = useRef<L.TileLayer | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);

  const startCoordsRef = useRef<[number, number] | null>(null);
  const endCoordsRef = useRef<[number, number] | null>(null);

  const [isSatellite, setIsSatellite] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [distKm, setDistKm] = useState<number | null>(null);
  const [status, setStatus] = useState<'locating' | 'geocoding' | 'ready' | 'error'>('locating');
  const [bearing, setBearing] = useState(0);

  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      keyboard: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
    });

    const sat = L.tileLayer(SATELLITE_TILES, { maxZoom: 18 }).addTo(map);
    const hybrid = L.tileLayer(HYBRID_TILES, { maxZoom: 18, opacity: 0.7 }).addTo(map);
    const street = L.tileLayer(STREET_TILES, { maxZoom: 18 });

    satLayerRef.current = sat;
    hybridLayerRef.current = hybrid;
    streetLayerRef.current = street;

    mapRef.current = map;

    const init = async () => {
      let startCoords: [number, number];

      try {
        const pos = await getCurrentPosition();
        startCoords = [pos.coords.latitude, pos.coords.longitude];
      } catch (_) {
        const fallback = await geocode(session.from + ' airport');
        if (!fallback) {
          setStatus('error');
          return;
        }
        startCoords = fallback;
      }

      startCoordsRef.current = startCoords;
      map.setView(startCoords, MAP_ZOOM, { animate: false });
      setStatus('geocoding');

      const endCoords = await geocode(session.to + ' airport');
      if (!endCoords) {
        const cityCoords = await geocode(session.to);
        endCoordsRef.current = cityCoords ?? [
          startCoords[0] + 3,
          startCoords[1] + 3,
        ];
      } else {
        endCoordsRef.current = endCoords;
      }

      const dx = endCoordsRef.current![1] - startCoords[1];
      const dy = endCoordsRef.current![0] - startCoords[0];
      const b = (Math.atan2(dx, dy) * 180) / Math.PI;
      setBearing(b);

      const totalKm = haversineKm(startCoords, endCoordsRef.current!);
      setDistKm(totalKm * (1 - progressRef.current / 100));

      setStatus('ready');
    };

    init();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !startCoordsRef.current || !endCoordsRef.current) return;

    const t = progress / 100;
    const currentPos = lerp(startCoordsRef.current, endCoordsRef.current, t);
    mapRef.current.setView(currentPos, MAP_ZOOM, { animate: true, duration: 1.2 } as any);

    const remaining = haversineKm(currentPos, endCoordsRef.current);
    setDistKm(remaining);
  }, [progress]);

  const toggleLayer = useCallback(() => {
    if (!mapRef.current || !satLayerRef.current || !streetLayerRef.current || !hybridLayerRef.current) return;
    const map = mapRef.current;
    if (isSatellite) {
      map.removeLayer(satLayerRef.current);
      map.removeLayer(hybridLayerRef.current);
      streetLayerRef.current.addTo(map);
    } else {
      map.removeLayer(streetLayerRef.current);
      satLayerRef.current.addTo(map);
      if (showLabels) hybridLayerRef.current.addTo(map);
    }
    setIsSatellite((v) => !v);
  }, [isSatellite, showLabels]);

  const toggleLabels = useCallback(() => {
    if (!mapRef.current || !hybridLayerRef.current) return;
    if (showLabels) {
      mapRef.current.removeLayer(hybridLayerRef.current);
    } else if (isSatellite) {
      hybridLayerRef.current.addTo(mapRef.current);
    }
    setShowLabels((v) => !v);
  }, [showLabels, isSatellite]);

  const resetNorth = useCallback(() => {
    if (!mapRef.current || !startCoordsRef.current || !endCoordsRef.current) return;
    const t = progressRef.current / 100;
    const pos = lerp(startCoordsRef.current, endCoordsRef.current, t);
    mapRef.current.setView(pos, MAP_ZOOM, { animate: true } as any);
  }, []);

  const timeLeftMinutes = Math.ceil(timeLeft / 60);

  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden">
      <style>{`
        .leaflet-container { background: #111; }
        .map-btn {
          width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-size: 18px;
          transition: background 0.15s;
          user-select: none;
        }
        .map-btn:hover { background: rgba(255,255,255,0.15); }
        .map-btn.active { background: rgba(255,255,255,0.25); }
        .overlay-pill {
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          padding: 12px 18px;
          color: white;
        }
      `}</style>

      {/* MAP */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Status overlays */}
      {status !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
          <div className="overlay-pill flex flex-col items-center gap-3 px-8 py-6">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium tracking-wide">
              {status === 'locating' && 'Acquiring position…'}
              {status === 'geocoding' && 'Plotting route…'}
              {status === 'error' && 'Location unavailable'}
            </span>
          </div>
        </div>
      )}

      {/* PLANE ICON — locked to exact center */}
      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
        <div
          className="relative flex items-center justify-center"
          style={{ transform: `rotate(${bearing}deg)` }}
        >
          {/* Pulsing halo */}
          <div className="absolute w-16 h-16 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-10 h-10 rounded-full bg-white/20" />
          {/* Plane emoji rendered as text for crispness */}
          <span
            className="text-4xl drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] relative z-10"
            style={{ transform: `rotate(-${bearing}deg)` }}
          >
            ✈️
          </span>
        </div>
      </div>

      {/* ROUTE LINE (faint, from start to current) */}
      {/* Drawn via Leaflet polyline in useEffect — handled in map init */}

      {/* ——— TOP-LEFT: PAUSE BUTTON ——— */}
      <div className="absolute top-5 left-5 z-40">
        <button className="map-btn" onClick={onToggle} title={isActive ? 'Pause' : 'Resume'}>
          {isActive ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <rect x="4" y="3" width="4" height="14" rx="1.5" />
              <rect x="12" y="3" width="4" height="14" rx="1.5" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <path d="M5 3.5l12 6.5-12 6.5V3.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* ——— TOP-LEFT-2: Route pill ——— */}
      <div className="absolute top-5 left-16 z-40 flex items-center">
        <div className="overlay-pill flex items-center gap-2 py-2 px-4">
          <span className="text-white/60 text-sm font-mono font-semibold">{session.fromCode}</span>
          <span className="text-white/40 text-xs">→</span>
          <span className="text-white text-sm font-mono font-semibold">{session.toCode}</span>
        </div>
      </div>

      {/* ——— TOP-RIGHT: MAP CONTROLS ——— */}
      <div className="absolute top-5 right-5 z-40 flex flex-col gap-2">
        <button
          className={`map-btn ${isSatellite ? 'active' : ''}`}
          onClick={toggleLayer}
          title={isSatellite ? 'Switch to Map' : 'Switch to Satellite'}
        >
          {isSatellite ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18" />
            </svg>
          )}
        </button>

        <button className="map-btn" onClick={resetNorth} title="Re-center on plane">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2l3 7H9l3-7z" fill="white" stroke="none" />
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="2" fill="white" />
          </svg>
        </button>

        <button
          className={`map-btn ${showLabels ? 'active' : ''}`}
          onClick={toggleLabels}
          title="Toggle labels"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M4 6h16M4 12h10M4 18h12" />
          </svg>
        </button>

        <button
          className="map-btn"
          onClick={onEarlyLanding}
          title="End session early"
          style={{ marginTop: 8 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ——— BOTTOM-LEFT: TIME REMAINING ——— */}
      <div className="absolute bottom-8 left-5 z-40">
        <div className="overlay-pill">
          <div className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-1">Time Remaining</div>
          <div className="text-white font-bold text-4xl leading-none tabular-nums" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
            {timeLeftMinutes < 60
              ? `${timeLeftMinutes} min`
              : `${Math.floor(timeLeftMinutes / 60)}h ${timeLeftMinutes % 60}m`}
          </div>
          <div className="text-white/40 text-xs mt-1 tabular-nums font-mono">
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* ——— BOTTOM-RIGHT: DISTANCE REMAINING ——— */}
      <div className="absolute bottom-8 right-5 z-40 text-right">
        <div className="overlay-pill" style={{ textAlign: 'right' }}>
          <div className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-1">Distance Remaining</div>
          <div className="text-white font-bold text-4xl leading-none tabular-nums" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>
            {distKm !== null ? `${Math.round(distKm).toLocaleString()} km` : '— km'}
          </div>
          <div className="text-white/40 text-xs mt-1">
            {session.to}
          </div>
        </div>
      </div>

      {/* ——— BOTTOM CENTER: progress bar ——— */}
      <div className="absolute bottom-0 left-0 right-0 z-40 h-1">
        <div
          className="h-full bg-white/60 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Focus mode banner */}
      {isActive && (
        <div className="absolute bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="overlay-pill py-2 px-5 text-xs font-semibold tracking-wider text-white/70 flex items-center gap-2">
            <span>🔕</span> Focus Mode Active
          </div>
        </div>
      )}
    </div>
  );
}
