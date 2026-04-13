import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionConfig, formatTime, PLANE_ICONS, generateIata } from '@/utils/flight-utils';
import { SoundType, SOUND_OPTIONS } from '@/hooks/use-ambient-sound';
import { useWeather } from '@/hooks/use-weather';

// ─── 20 major world airports ──────────────────────────────────────────────────
const AIRPORTS = [
  { code: 'JFK', name: 'New York',      lat: 40.6413,  lng: -73.7781  },
  { code: 'LHR', name: 'London',        lat: 51.4700,  lng:  -0.4543  },
  { code: 'CDG', name: 'Paris',         lat: 49.0097,  lng:   2.5479  },
  { code: 'DXB', name: 'Dubai',         lat: 25.2532,  lng:  55.3657  },
  { code: 'HND', name: 'Tokyo',         lat: 35.5493,  lng: 139.7798  },
  { code: 'SIN', name: 'Singapore',     lat:  1.3644,  lng: 103.9915  },
  { code: 'SYD', name: 'Sydney',        lat: -33.9399, lng: 151.1753  },
  { code: 'LAX', name: 'Los Angeles',   lat: 33.9425,  lng:-118.4081  },
  { code: 'ORD', name: 'Chicago',       lat: 41.9742,  lng: -87.9073  },
  { code: 'FRA', name: 'Frankfurt',     lat: 50.0379,  lng:   8.5622  },
  { code: 'AMS', name: 'Amsterdam',     lat: 52.3086,  lng:   4.7639  },
  { code: 'PEK', name: 'Beijing',       lat: 40.0799,  lng: 116.6031  },
  { code: 'HKG', name: 'Hong Kong',     lat: 22.3080,  lng: 113.9185  },
  { code: 'ICN', name: 'Seoul',         lat: 37.4602,  lng: 126.4407  },
  { code: 'BOM', name: 'Mumbai',        lat: 19.0896,  lng:  72.8656  },
  { code: 'GRU', name: 'São Paulo',     lat: -23.4356, lng: -46.4731  },
  { code: 'MEX', name: 'Mexico City',   lat: 19.4363,  lng: -99.0721  },
  { code: 'JNB', name: 'Johannesburg',  lat: -26.1367, lng:  28.2411  },
  { code: 'SVO', name: 'Moscow',        lat: 55.9736,  lng:  37.4125  },
  { code: 'DEL', name: 'New Delhi',     lat: 28.5665,  lng:  77.1031  },
] as const;
type Airport = typeof AIRPORTS[number];

// ─── Tile URLs ────────────────────────────────────────────────────────────────
const SATELLITE_TILES   = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const HYBRID_TILES      = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const STREET_TILES      = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
// NASA VIIRS Black Marble — real city lights as seen from orbit at night
const NIGHT_EARTH_TILES = 'https://map1.vis.earthdata.nasa.gov/wmts-webmercator/VIIRS_City_Lights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg';
// CartoDB labels only (no base) — overlay city names on top of night earth
const NIGHT_LABELS_TILES = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';

// ─── Zoom levels ──────────────────────────────────────────────────────────────
const ZOOM_PREFLIGHT = 11;
const ZOOM_RUNWAY    = 14;
const ZOOM_CRUISE    = 8;
const ZOOM_LANDING   = 13;

// ─── Utilities ────────────────────────────────────────────────────────────────
function easeInOut(t: number) { return t < 0.5 ? 2*t*t : 1-(-2*t+2)**2/2; }

function zoomForProgress(p: number): number {
  if (p <= 8)  return ZOOM_RUNWAY  - (ZOOM_RUNWAY  - ZOOM_CRUISE)  * easeInOut(p / 8);
  if (p >= 92) return ZOOM_CRUISE  + (ZOOM_LANDING - ZOOM_CRUISE)  * easeInOut((p-92)/8);
  return ZOOM_CRUISE;
}

function haversineKm(a: [number,number], b: [number,number]): number {
  const R = 6371, dLat = (b[0]-a[0])*Math.PI/180, dLon = (b[1]-a[1])*Math.PI/180;
  const h = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

function lerp(a:[number,number], b:[number,number], t:number):[number,number] {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
}

function calcBearing(a:[number,number], b:[number,number]): number {
  return (Math.atan2(b[1]-a[1], b[0]-a[0])*180)/Math.PI;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej, {timeout:8000, maximumAge:60000})
  );
}

function targetDistanceKm(mins: number): number { return (mins/25)*400; }

function nearestAirport(c:[number,number]): Airport {
  return [...AIRPORTS].sort((a,b) =>
    haversineKm(c,[a.lat,a.lng]) - haversineKm(c,[b.lat,b.lng])
  )[0];
}

function bestDestination(origin: Airport, targetKm: number): Airport {
  return [...AIRPORTS]
    .filter(a => a.code !== origin.code)
    .sort((a,b) => {
      const dA = Math.abs(haversineKm([origin.lat,origin.lng],[a.lat,a.lng])-targetKm);
      const dB = Math.abs(haversineKm([origin.lat,origin.lng],[b.lat,b.lng])-targetKm);
      return dA - dB;
    })[0];
}

// ─── Shared style constants ───────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(8,10,20,0.82)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
  color: 'white',
};

const BTN: React.CSSProperties = {
  width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(8,10,20,0.82)',
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.13)', borderRadius: 13,
  color: 'white', cursor: 'pointer', fontSize: 18,
  transition: 'background 0.15s',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface MapFlightViewProps {
  session: SessionConfig;
  timeLeft: number;
  progress: number;
  totalSeconds: number;
  isActive: boolean;
  flightStarted: boolean;
  currentSound: SoundType;
  planeIcon: string;
  mapTheme: 'day' | 'night';
  onToggle: () => void;
  onStartFlight: () => void;
  onEarlyLanding: () => void;
  onSoundChange: (s: SoundType) => void;
  onMapThemeToggle: () => void;
  onPlaneIconChange: (icon: string) => void;
}

export function MapFlightView({
  session, timeLeft, progress, totalSeconds,
  isActive, flightStarted, currentSound, planeIcon, mapTheme,
  onToggle, onStartFlight, onEarlyLanding, onSoundChange, onMapThemeToggle, onPlaneIconChange,
}: MapFlightViewProps) {
  const mapRef           = useRef<L.Map|null>(null);
  const containerRef     = useRef<HTMLDivElement>(null);
  const satRef           = useRef<L.TileLayer|null>(null);
  const hybridRef        = useRef<L.TileLayer|null>(null);
  const streetRef        = useRef<L.TileLayer|null>(null);
  const nightEarthRef    = useRef<L.TileLayer|null>(null);
  const nightLabelsRef   = useRef<L.TileLayer|null>(null);
  const mapThemeRef      = useRef(mapTheme);
  mapThemeRef.current    = mapTheme;
  const startRef       = useRef<[number,number]|null>(null);
  const endRef         = useRef<[number,number]|null>(null);
  const totalKmRef     = useRef<number|null>(null);
  const progressRef    = useRef(progress);
  progressRef.current  = progress;

  const [isSat,          setIsSat]          = useState(true);
  const [showLabels,     setShowLabels]     = useState(true);
  const [distKm,         setDistKm]         = useState<number|null>(null);
  const [bearing,        setBearing]        = useState(45);
  const [launching,      setLaunching]      = useState(false);
  const [routeReady,     setRouteReady]     = useState(false);
  const [showSoundPicker,setShowSoundPicker]= useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [originCode,     setOriginCode]     = useState('');
  const [destCode,       setDestCode]       = useState('');
  const [destCity,       setDestCity]       = useState('');
  const [destCoords,     setDestCoords]     = useState<[number,number]|null>(null);

  // ── Real-time destination weather via Open-Meteo ─────────────────────────
  const weather = useWeather(destCoords);

  // ── Map init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl:false, attributionControl:false,
      keyboard:false, scrollWheelZoom:false,
      dragging:false, doubleClickZoom:false, boxZoom:false,
      zoomAnimation:true, fadeAnimation:true,
    });
    satRef.current        = L.tileLayer(SATELLITE_TILES,   { maxZoom:18 });
    hybridRef.current     = L.tileLayer(HYBRID_TILES,      { maxZoom:18, opacity:0.8 });
    streetRef.current     = L.tileLayer(STREET_TILES,      { maxZoom:18 });
    nightEarthRef.current = L.tileLayer(NIGHT_EARTH_TILES, { maxZoom:8,  attribution:'NASA VIIRS', errorTileUrl: '' });
    nightLabelsRef.current= L.tileLayer(NIGHT_LABELS_TILES,{ maxZoom:18, subdomains:'abcd', opacity:0.9 });

    // Apply the correct tile layers based on the current theme preference
    if (mapThemeRef.current === 'night') {
      nightEarthRef.current.addTo(map);
      nightLabelsRef.current.addTo(map);
    } else {
      satRef.current.addTo(map);
      hybridRef.current.addTo(map);
    }
    mapRef.current = map;

    const init = async () => {
      try {
        // ── Prefer coords stored in session (set via geocoding at booking time)
        if (session.fromCoords && session.toCoords) {
          const start = session.fromCoords as [number,number];
          const end   = session.toCoords   as [number,number];
          startRef.current = start;
          endRef.current   = end;
          setOriginCode(session.fromCode ?? generateIata(session.from));
          setDestCode(session.toCode     ?? generateIata(session.to));
          setDestCity(session.to);
          setDestCoords(end);
          map.setView(start, ZOOM_PREFLIGHT, {animate:false});
          const km = haversineKm(start, end);
          totalKmRef.current = km;
          setDistKm(km);
          setBearing(calcBearing(start, end));
        } else {
          // ── Fallback: GPS → nearest airport → best destination
          let gps: [number,number];
          try {
            const pos = await getCurrentPosition();
            gps = [pos.coords.latitude, pos.coords.longitude];
          } catch { gps = [51.5074,-0.1278]; }

          const origin = nearestAirport(gps);
          const start: [number,number] = [origin.lat, origin.lng];
          startRef.current = start;
          setOriginCode(origin.code);
          map.setView(start, ZOOM_PREFLIGHT, {animate:false});

          const targetKm = targetDistanceKm(session.durationMinutes ?? 25);
          const dest = bestDestination(origin, targetKm);
          const end: [number,number] = [dest.lat, dest.lng];
          endRef.current = end;
          setDestCode(dest.code);
          setDestCity(dest.name);
          setDestCoords(end);

          const km = haversineKm(start, end);
          totalKmRef.current = km;
          setDistKm(km);
          setBearing(calcBearing(start, end));
        }
      } catch (err) {
        console.error('[MapFlightView] init:', err);
        const fb: [number,number] = [51.5074,-0.1278];
        startRef.current = fb;
        endRef.current = [48.8566,2.3522];
        map.setView(fb, ZOOM_PREFLIGHT, {animate:false});
      } finally {
        setRouteReady(true);
      }
    };
    init();
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to mapTheme prop changes ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !satRef.current || !nightEarthRef.current) return;
    if (mapTheme === 'night') {
      if (satRef.current    && map.hasLayer(satRef.current))    map.removeLayer(satRef.current);
      if (hybridRef.current && map.hasLayer(hybridRef.current)) map.removeLayer(hybridRef.current);
      if (streetRef.current && map.hasLayer(streetRef.current)) map.removeLayer(streetRef.current);
      if (!map.hasLayer(nightEarthRef.current))  nightEarthRef.current.addTo(map);
      if (nightLabelsRef.current && !map.hasLayer(nightLabelsRef.current)) nightLabelsRef.current.addTo(map);
    } else {
      if (nightEarthRef.current  && map.hasLayer(nightEarthRef.current))  map.removeLayer(nightEarthRef.current);
      if (nightLabelsRef.current && map.hasLayer(nightLabelsRef.current)) map.removeLayer(nightLabelsRef.current);
      if (isSat) {
        if (satRef.current && !map.hasLayer(satRef.current)) satRef.current.addTo(map);
        if (showLabels && hybridRef.current && !map.hasLayer(hybridRef.current)) hybridRef.current.addTo(map);
      } else {
        if (streetRef.current && !map.hasLayer(streetRef.current)) streetRef.current.addTo(map);
      }
    }
  }, [mapTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tick: pan + zoom + distance countdown ───────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !startRef.current || !endRef.current || !flightStarted) return;
    const t = progress/100;
    const pos = lerp(startRef.current, endRef.current, t);
    (mapRef.current as any).setView(pos, zoomForProgress(progress), {animate:true, duration:1.2});
    if (totalKmRef.current !== null) setDistKm(totalKmRef.current*(1-t));
  }, [progress, flightStarted]);

  // ── Launch handler ──────────────────────────────────────────────────────────
  const handleLaunch = useCallback(() => {
    if (!mapRef.current) { onStartFlight(); return; }
    setLaunching(true);
    const c = mapRef.current.getCenter();
    (mapRef.current as any).setView([c.lat,c.lng], ZOOM_RUNWAY, {animate:true,duration:1.8});
    setTimeout(() => { setLaunching(false); onStartFlight(); }, 1900);
  }, [onStartFlight]);

  // ── Layer toggles ───────────────────────────────────────────────────────────
  const toggleLayer = useCallback(() => {
    const map = mapRef.current; if (!map) return;
    if (isSat) {
      if (satRef.current) map.removeLayer(satRef.current);
      if (hybridRef.current) map.removeLayer(hybridRef.current);
      if (streetRef.current) streetRef.current.addTo(map);
    } else {
      if (streetRef.current) map.removeLayer(streetRef.current);
      if (satRef.current) satRef.current.addTo(map);
      if (showLabels && hybridRef.current) hybridRef.current.addTo(map);
    }
    setIsSat(v=>!v);
  }, [isSat, showLabels]);

  const toggleLabels = useCallback(() => {
    const map = mapRef.current; if (!map||!hybridRef.current) return;
    if (showLabels) map.removeLayer(hybridRef.current);
    else if (isSat) hybridRef.current.addTo(map);
    setShowLabels(v=>!v);
  }, [showLabels, isSat]);

  const reCenter = useCallback(() => {
    const map = mapRef.current; if (!map||!startRef.current||!endRef.current) return;
    const pos = lerp(startRef.current, endRef.current, progressRef.current/100);
    (map as any).setView(pos, zoomForProgress(progressRef.current), {animate:true});
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const timeLeftMin = Math.ceil(timeLeft/60);
  const altFt = progress<=8 ? Math.round((progress/8)*38000)
    : progress>=92 ? Math.round(((100-progress)/8)*38000) : 38000;
  const altPhase = progress<=8 ? 'CLIMBING' : progress>=92 ? 'DESCENDING' : 'CRUISE';

  return (
    <>
      {/* ── Full-screen map canvas ────────────────────────────────────── */}
      <div style={{ position:'fixed', inset:0, zIndex:0 }}>
        <div ref={containerRef} style={{ position:'absolute', inset:0 }} />
      </div>

      <style>{`
        @keyframes halo    { 0%{opacity:.7;transform:scale(1)} 100%{opacity:0;transform:scale(2)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Plane icon — fixed z:9050 so always visible above everything ── */}
      <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', pointerEvents:'none', zIndex:9050 }}>
        <div style={{ transform:`rotate(${bearing}deg)`, position:'relative',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ position:'absolute', width:84, height:84, borderRadius:'50%',
            background:'rgba(255,255,255,0.07)', animation:'halo 2.4s ease-out infinite' }} />
          <div style={{ position:'absolute', width:50, height:50, borderRadius:'50%',
            background:'rgba(255,255,255,0.13)', border:'1px solid rgba(255,255,255,0.22)' }} />
          <span style={{ position:'relative', zIndex:1, fontSize:36, lineHeight:1,
            transform:`rotate(-${bearing}deg)`,
            filter:'drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 2px 14px rgba(0,0,0,0.7))' }}>
            {planeIcon}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PREFLIGHT OVERLAY — position:fixed so it's always above Leaflet
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {!flightStarted && (
          <motion.div
            key="preflight"
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.5 }}
            style={{
              position:'fixed', inset:0, zIndex:9000,
              background:'rgba(5,8,18,0.90)',
              backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            }}
          >
            <motion.div
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.1, duration:0.45 }}
              style={{ textAlign:'center', maxWidth:400, padding:'0 28px', width:'100%' }}
            >
              {/* Label */}
              <p style={{ fontSize:11, letterSpacing:5, color:'rgba(255,255,255,0.32)',
                textTransform:'uppercase', marginBottom:14, fontWeight:700 }}>
                Destination
              </p>

              {/* City name */}
              <h1 style={{ fontSize:54, fontWeight:800, color:'white', lineHeight:1.05,
                marginBottom:8, letterSpacing:'-2px' }}>
                {routeReady ? (destCity || session.to) : (session.to || '—')}
              </h1>

              {/* Route codes / loading */}
              <div style={{ fontSize:15, color:'rgba(255,255,255,0.36)', marginBottom:38,
                fontFamily:'monospace', letterSpacing:3, minHeight:24,
                display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                {routeReady ? (
                  `${originCode} ——— ${destCode}`
                ) : (
                  <>
                    <span style={{ width:14, height:14, borderRadius:'50%', display:'inline-block',
                      border:'2px solid rgba(255,255,255,0.25)', borderTopColor:'rgba(255,255,255,0.8)',
                      animation:'spin 0.8s linear infinite', flexShrink:0 }} />
                    Plotting route…
                  </>
                )}
              </div>

              {/* Stats strip */}
              <div style={{ display:'flex', marginBottom:36, borderRadius:14, overflow:'hidden',
                background:'rgba(255,255,255,0.055)', border:'1px solid rgba(255,255,255,0.09)' }}>
                {[
                  { label:'Duration', value: session.durationMinutes ? `${session.durationMinutes} min` : '—' },
                  { label:'Distance', value: distKm ? `${Math.round(distKm).toLocaleString()} km` : '…' },
                  { label:'Focus',    value: session.focusType || '—' },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{ flex:1, padding:'16px 0', textAlign:'center',
                    borderRight: i<arr.length-1 ? '1px solid rgba(255,255,255,0.09)' : 'none' }}>
                    <div style={{ fontSize:10, letterSpacing:3, color:'rgba(255,255,255,0.32)',
                      textTransform:'uppercase', marginBottom:6 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize:17, fontWeight:700, color:'white' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Start Flight CTA */}
              <button
                onClick={handleLaunch}
                disabled={!routeReady || launching}
                style={{
                  width:'100%', padding:'19px 0', borderRadius:16,
                  background: (!routeReady||launching) ? 'rgba(255,255,255,0.35)' : 'white',
                  color:'#050810', fontSize:17, fontWeight:800,
                  cursor:(!routeReady||launching)?'not-allowed':'pointer',
                  border:'none', letterSpacing:0.3,
                  transition:'background 0.2s, transform 0.15s',
                  transform: launching ? 'scale(0.97)' : 'scale(1)',
                }}
              >
                {launching ? '✈️  Taking off…' : !routeReady ? '⏳  Plotting route…' : '✈️  Start Flight'}
              </button>

              {/* Destination weather preview on pre-flight screen */}
              {weather && (
                <div style={{
                  marginTop:20, display:'flex', alignItems:'center', justifyContent:'center',
                  gap:8, fontSize:13, color:'rgba(255,255,255,0.5)',
                }}>
                  <span style={{ fontSize:20 }}>{weather.emoji}</span>
                  <span style={{ color:'white', fontWeight:600 }}>{weather.tempC}°C</span>
                  <span>{weather.label}</span>
                  <span style={{ color:'rgba(255,255,255,0.3)' }}>·</span>
                  <span>💨 {weather.windKmh} km/h</span>
                </div>
              )}

              {session.label && (
                <p style={{ marginTop:14, fontSize:13, color:'rgba(255,255,255,0.25)', fontStyle:'italic' }}>
                  "{session.label}"
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          IN-FLIGHT HUD — all position:fixed, zIndex:8000+
          Visible only once flight has started
      ═══════════════════════════════════════════════════════════════════ */}
      {flightStarted && (
        <>
          {/* TOP-LEFT: Pause + route */}
          <div style={{ position:'fixed', top:20, left:20, zIndex:8100, display:'flex', gap:10, alignItems:'center' }}>
            <button onClick={onToggle} style={BTN} title={isActive?'Pause':'Resume'}>
              {isActive ? (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="white">
                  <rect x="4" y="3" width="4" height="14" rx="1.5"/>
                  <rect x="12" y="3" width="4" height="14" rx="1.5"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="white">
                  <path d="M5 3.5l12 6.5-12 6.5V3.5z"/>
                </svg>
              )}
            </button>
            <div style={{ ...GLASS, padding:'10px 18px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ color:'rgba(255,255,255,0.45)', fontSize:13, fontFamily:'monospace', fontWeight:700 }}>
                {originCode}
              </span>
              <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>→</span>
              <span style={{ color:'white', fontSize:13, fontFamily:'monospace', fontWeight:700 }}>
                {destCode}
              </span>
            </div>
          </div>

          {/* TOP-CENTER: Altitude + weather */}
          <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:8100,
            display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ ...GLASS, padding:'9px 20px', display:'flex', alignItems:'center', gap:12,
              fontSize:12, fontFamily:'monospace', color:'rgba(255,255,255,0.55)' }}>
              <span>
                {altPhase==='CLIMBING'?'↑ CLIMBING':altPhase==='DESCENDING'?'↓ DESCENDING':'✈ CRUISE'}
              </span>
              <span style={{ color:'rgba(255,255,255,0.2)' }}>|</span>
              <span>{altFt.toLocaleString()} ft</span>
            </div>

            {/* Weather widget — fades in once data arrives */}
            {weather && (
              <div style={{
                ...GLASS,
                padding:'7px 16px',
                display:'flex', alignItems:'center', gap:10,
                fontSize:12, animation:'fadeIn 0.6s ease',
              }}>
                <span style={{ fontSize:18, lineHeight:1 }}>{weather.emoji}</span>
                <span style={{ color:'white', fontWeight:700 }}>{weather.tempC}°C</span>
                <span style={{ color:'rgba(255,255,255,0.4)' }}>·</span>
                <span style={{ color:'rgba(255,255,255,0.65)' }}>{weather.label}</span>
                <span style={{ color:'rgba(255,255,255,0.4)' }}>·</span>
                <span style={{ color:'rgba(255,255,255,0.5)', fontFamily:'monospace' }}>💨 {weather.windKmh} km/h</span>
              </div>
            )}
          </div>

          {/* TOP-RIGHT: Map controls + Night + Sound */}
          <div style={{ position:'fixed', top:20, right:20, zIndex:8100, display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end' }}>
            {/* Day/Night toggle — always visible */}
            <button
              onClick={onMapThemeToggle}
              title={mapTheme === 'night' ? 'Switch to Day' : 'Switch to Night'}
              style={{
                ...BTN,
                background: mapTheme === 'night'
                  ? 'rgba(90,40,160,0.7)'
                  : 'rgba(255,215,0,0.18)',
                border: mapTheme === 'night'
                  ? '1px solid rgba(167,139,250,0.5)'
                  : '1px solid rgba(255,215,0,0.35)',
              }}
            >
              <span style={{ fontSize: 18 }}>{mapTheme === 'night' ? '🌙' : '☀️'}</span>
            </button>

            {/* Sat/Street — hidden in night mode */}
            {mapTheme !== 'night' && (
              <button onClick={toggleLayer} style={{ ...BTN, background: isSat ? 'rgba(255,255,255,0.22)' : BTN.background }}
                title={isSat?'Street':'Satellite'}>
                {isSat ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M3 12h18M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18"/>
                  </svg>
                )}
              </button>
            )}
            <button onClick={reCenter} style={BTN} title="Re-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="8"/>
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="2.5"/>
                <circle cx="12" cy="12" r="2.5" fill="white" stroke="none"/>
              </svg>
            </button>
            {mapTheme !== 'night' && (
              <button onClick={toggleLabels}
                style={{ ...BTN, background: showLabels ? 'rgba(255,255,255,0.22)' : BTN.background }}
                title="Labels">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M4 6h16M4 12h10M4 18h12"/>
                </svg>
              </button>
            )}

            {/* Icon picker button */}
            <button
              onClick={() => { setShowSoundPicker(false); setShowIconPicker(v => !v); }}
              title="Change flight icon"
              style={{
                ...BTN,
                background: showIconPicker ? 'rgba(255,255,255,0.22)' : BTN.background,
                marginTop: 4,
                fontSize: 20,
              }}
            >
              {planeIcon}
            </button>

            {/* Icon picker panel */}
            <AnimatePresence>
              {showIconPicker && (
                <motion.div
                  key="icon-panel"
                  initial={{ opacity:0, scale:0.93, x:12 }}
                  animate={{ opacity:1, scale:1, x:0 }}
                  exit={{ opacity:0, scale:0.93, x:12 }}
                  transition={{ duration:0.2 }}
                  style={{
                    ...GLASS, padding:'16px 14px',
                    position:'absolute', top:0, right:56,
                    width:232, borderRadius:16,
                  }}
                >
                  <p style={{ fontSize:10, letterSpacing:3, color:'rgba(255,255,255,0.38)',
                    textTransform:'uppercase', marginBottom:12, fontWeight:700 }}>
                    Flight Icon
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
                    {PLANE_ICONS.map(opt => {
                      const active = planeIcon === opt.id;
                      return (
                        <button
                          key={opt.id}
                          title={opt.desc}
                          onClick={() => { onPlaneIconChange(opt.id); setShowIconPicker(false); }}
                          style={{
                            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                            padding:'10px 4px 8px', borderRadius:11, cursor:'pointer',
                            border: active ? '1.5px solid rgba(79,195,247,0.6)' : '1.5px solid transparent',
                            background: active ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.06)',
                            transition:'all 0.14s',
                          }}
                        >
                          <span style={{ fontSize:22, lineHeight:1 }}>{opt.id}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:0.3,
                            color: active ? '#30D158' : 'rgba(255,255,255,0.5)',
                            textAlign:'center', lineHeight:1.2 }}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sound button */}
            <button
              onClick={() => { setShowIconPicker(false); setShowSoundPicker(v => !v); }}
              style={{ ...BTN, background: (showSoundPicker || currentSound !== 'silence') ? 'rgba(255,255,255,0.22)' : BTN.background, marginTop:4 }}
              title="Ambient sounds"
            >
              <span style={{ fontSize:18 }}>
                {currentSound === 'silence' ? '🔇' : SOUND_OPTIONS.find(s => s.type === currentSound)?.emoji ?? '🔊'}
              </span>
            </button>

            {/* Sound picker panel */}
            <AnimatePresence>
              {showSoundPicker && (
                <motion.div
                  key="sound-panel"
                  initial={{ opacity:0, scale:0.93, x:12 }}
                  animate={{ opacity:1, scale:1, x:0 }}
                  exit={{ opacity:0, scale:0.93, x:12 }}
                  transition={{ duration:0.2 }}
                  style={{
                    ...GLASS, padding:'16px 14px',
                    position:'absolute', top:0, right:56,
                    width:210, borderRadius:16,
                  }}
                >
                  <p style={{ fontSize:10, letterSpacing:3, color:'rgba(255,255,255,0.38)',
                    textTransform:'uppercase', marginBottom:12, fontWeight:700 }}>
                    Ambient Sound
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {SOUND_OPTIONS.map(opt => {
                      const active = currentSound === opt.type;
                      return (
                        <button
                          key={opt.type}
                          onClick={() => { onSoundChange(opt.type); setShowSoundPicker(false); }}
                          style={{
                            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                            padding:'10px 6px', borderRadius:12, cursor:'pointer', border:'none',
                            background: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)',
                            outline: active ? '1.5px solid rgba(255,255,255,0.4)' : 'none',
                            transition:'background 0.15s',
                          }}
                        >
                          <span style={{ fontSize:22 }}>{opt.emoji}</span>
                          <span style={{ fontSize:11, fontWeight:600, color: active ? 'white' : 'rgba(255,255,255,0.6)' }}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BOTTOM STRIP: Time + Distance + Emergency */}
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:8100,
            padding:'0 20px 24px',
            display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16,
            pointerEvents:'none' }}>

            {/* Time Remaining */}
            <div style={{ ...GLASS, padding:'14px 22px', pointerEvents:'auto', flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, letterSpacing:3, color:'rgba(255,255,255,0.4)',
                textTransform:'uppercase', marginBottom:4 }}>Time Remaining</div>
              <div style={{ fontSize:36, fontWeight:800, letterSpacing:'-1px', lineHeight:1,
                fontFamily:'system-ui,-apple-system,sans-serif', color:'white' }}>
                {timeLeftMin<60 ? `${timeLeftMin} min` : `${Math.floor(timeLeftMin/60)}h ${timeLeftMin%60}m`}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:3,
                fontFamily:'monospace' }}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Emergency Landing button — center */}
            <div style={{ pointerEvents:'auto', flexShrink:0 }}>
              <button
                onClick={onEarlyLanding}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  background:'rgba(200,30,30,0.18)',
                  border:'1.5px solid rgba(255,80,80,0.5)', borderRadius:16,
                  padding:'14px 20px', cursor:'pointer', color:'#ff6b6b',
                  backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
                  transition:'background 0.2s',
                }}
                title="Emergency landing"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.2">
                  <path d="M3 17l3-3 4 2 7-9 1 5-8 5-3-1z"/>
                  <path d="M3 21h18" strokeWidth="1.5"/>
                </svg>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:1, whiteSpace:'nowrap' }}>
                  Land Now
                </span>
              </button>
            </div>

            {/* Distance Remaining */}
            <div style={{ ...GLASS, padding:'14px 22px', pointerEvents:'auto', flex:1, minWidth:0, textAlign:'right' }}>
              <div style={{ fontSize:10, letterSpacing:3, color:'rgba(255,255,255,0.4)',
                textTransform:'uppercase', marginBottom:4 }}>Distance Remaining</div>
              <div style={{ fontSize:36, fontWeight:800, letterSpacing:'-1px', lineHeight:1,
                fontFamily:'system-ui,-apple-system,sans-serif', color:'white' }}>
                {distKm!==null ? `${Math.round(distKm).toLocaleString()} km` : '— km'}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:3 }}>
                to {destCity||session.to}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:8200, height:3 }}>
            <div style={{ height:'100%', background:'rgba(255,255,255,0.55)',
              width:`${progress}%`, transition:'width 1s linear' }} />
          </div>

          {/* Focus mode badge */}
          {isActive && (
            <div style={{ position:'fixed', bottom:110, left:'50%', transform:'translateX(-50%)',
              zIndex:8100, pointerEvents:'none' }}>
              <div style={{ ...GLASS, padding:'8px 20px', fontSize:12, fontWeight:600,
                letterSpacing:'0.18em', color:'rgba(255,255,255,0.55)',
                display:'flex', alignItems:'center', gap:8 }}>
                🔕 Focus Mode Active
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
