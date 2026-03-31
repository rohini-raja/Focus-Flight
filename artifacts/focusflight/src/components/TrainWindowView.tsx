import React, { useMemo } from 'react';
import { WeatherOverlay, WeatherType } from './WeatherOverlay';

interface TrainWindowViewProps {
  progress: number;
  weather?: WeatherType;
}

/* ─── Static scene data ──────────────────────────────────────────────────── */
const MOUNTAINS = [
  { w: 280, h: 110, x: 0   },
  { w: 220, h: 90,  x: 220 },
  { w: 300, h: 130, x: 400 },
  { w: 200, h: 80,  x: 650 },
  { w: 260, h: 105, x: 820 },
  { w: 240, h: 95,  x: 1050},
  { w: 280, h: 120, x: 1280},
  { w: 220, h: 85,  x: 1500},
];

const COUNTRY_FIELDS = [
  { w: 140, color: '#166534' },
  { w: 90,  color: '#14532d' },
  { w: 120, color: '#4d7c0f' },
  { w: 80,  color: '#3f6212' },
  { w: 160, color: '#166534' },
  { w: 100, color: '#16a34a' },
  { w: 130, color: '#15803d' },
  { w: 110, color: '#4d7c0f' },
];

const URBAN_BUILDINGS = [
  { w: 70,  h: 90,  color: '#1f2937', windows: 6 },
  { w: 55,  h: 70,  color: '#111827', windows: 4 },
  { w: 90,  h: 110, color: '#1e293b', windows: 8 },
  { w: 60,  h: 80,  color: '#0f172a', windows: 5 },
  { w: 45,  h: 60,  color: '#1f2937', windows: 3 },
  { w: 80,  h: 95,  color: '#1e293b', windows: 7 },
  { w: 65,  h: 75,  color: '#111827', windows: 5 },
  { w: 75,  h: 100, color: '#0f172a', windows: 6 },
];

const TREES = [
  { w: 28, tall: true  },
  { w: 0,  tall: false }, // gap
  { w: 34, tall: false },
  { w: 0,  tall: false },
  { w: 26, tall: true  },
  { w: 30, tall: false },
  { w: 0,  tall: false },
  { w: 32, tall: true  },
  { w: 0,  tall: false },
  { w: 28, tall: false },
];

const POLES = [true, false, false, true, false, false, true, false];

function repeat<T>(arr: T[], n: number): T[] {
  return Array.from({ length: n * arr.length }, (_, i) => arr[i % arr.length]);
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export function TrainWindowView({ progress, weather = 'clear' }: TrainWindowViewProps) {
  const isCountry = progress < 30 || progress > 72;
  const isUrban   = progress >= 30 && progress <= 72;
  const isNight   = progress >= 60;
  const isSunset  = progress >= 40 && progress < 60;
  const isDay     = progress < 40;

  /* Speed: slow at start/end, full in middle */
  const rawSpeed = progress < 8 ? progress / 8 : progress > 92 ? (100 - progress) / 8 : 1;
  const spd = Math.max(rawSpeed, 0.08);

  const skyDur  = `${80  / spd}s`;
  const mtDur   = `${120 / spd}s`;
  const fieldDur = `${28 / spd}s`;
  const treeDur  = `${12 / spd}s`;
  const poleDur  = `${4  / spd}s`;

  /* Sky */
  const skyTop = isDay ? '#60a5fa' : isSunset ? '#dc2626' : '#0c0c1e';
  const skyBot = isDay ? '#bfdbfe' : isSunset ? '#f97316' : '#1e1b4b';
  const groundCol = isNight ? '#14532d' : '#166534';

  /* Stagger repeated scene sets for seamless loops */
  const mtSet      = useMemo(() => repeat(MOUNTAINS, 2),      []);
  const fieldSet   = useMemo(() => repeat(COUNTRY_FIELDS, 4), []);
  const urbanSet   = useMemo(() => repeat(URBAN_BUILDINGS, 3),[]);
  const treeSet    = useMemo(() => repeat(TREES, 6),           []);
  const poleSet    = useMemo(() => repeat(POLES, 5),           []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 540,
      aspectRatio: '3 / 2',
      margin: '0 auto',
      borderRadius: 12,
      overflow: 'hidden',
      /* Train carriage window frame */
      border: '24px solid #1c1008',
      outline: '4px solid #3d2b1a',
      boxShadow: 'inset 0 0 0 3px #5c4033, inset 0 2px 0 2px #8b6914, 0 24px 60px rgba(0,0,0,0.75)',
      background: '#0a0a0a',
    }}>
      <style>{`
        @keyframes train-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes train-sway {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          20%       { transform: translateY(-0.8px) rotate(0.05deg); }
          60%       { transform: translateY(0.8px) rotate(-0.05deg); }
        }
        @keyframes wire-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Train sway wrapper */}
      <div style={{ position: 'absolute', inset: 0, animation: `train-sway ${3.2 / spd}s ease-in-out infinite` }}>

        {/* ── SKY ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, ${skyTop} 0%, ${skyBot} 65%)`,
          transition: 'background 3.5s ease',
        }} />

        {/* Sun / Moon */}
        {isDay && (
          <div style={{ position: 'absolute', top: '10%', right: '18%', width: 28, height: 28, borderRadius: '50%', background: '#fde047', boxShadow: '0 0 20px 8px rgba(253,224,71,0.3)' }} />
        )}
        {isSunset && (
          <div style={{ position: 'absolute', bottom: '36%', left: '12%', width: 38, height: 38, borderRadius: '50%', background: 'radial-gradient(circle, #fbbf24, #f97316)', boxShadow: '0 0 40px 16px rgba(251,191,36,0.25)' }} />
        )}
        {isNight && (
          <>
            <div style={{ position: 'absolute', top: '7%', right: '22%', width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', boxShadow: '0 0 16px 6px rgba(241,245,249,0.18)' }} />
            {[...Array(16)].map((_, i) => (
              <div key={i} style={{ position: 'absolute', width: 1.5, height: 1.5, borderRadius: '50%', background: 'white', opacity: 0.55 + (i % 4) * 0.12, top: `${5 + (i * 41 % 30)}%`, left: `${3 + (i * 61 % 85)}%` }} />
            ))}
          </>
        )}

        {/* Clouds (day/sunset) */}
        {!isNight && (
          <div style={{ position: 'absolute', top: '6%', left: 0, width: '200%', height: '20%', animation: `train-scroll ${skyDur} linear infinite`, pointerEvents: 'none' }}>
            {[80, 260, 480, 700, 920, 1100, 1320, 1520].map((x, i) => (
              <div key={i} style={{
                position: 'absolute', left: x, top: `${(i % 3) * 22}%`,
                width: 70 + (i % 4) * 30, height: 20 + (i % 3) * 8,
                borderRadius: 40,
                background: isSunset ? 'rgba(255,180,100,0.5)' : 'rgba(255,255,255,0.72)',
              }} />
            ))}
          </div>
        )}

        {/* ── MOUNTAINS / DISTANT HILLS (very slow) ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '35%', width: '200%', height: '35%', animation: `train-scroll ${mtDur} linear infinite` }}>
          {mtSet.map((m, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: (i % MOUNTAINS.length === 0 && i > 0 ? 1600 * Math.floor(i / MOUNTAINS.length) : 0) + m.x,
              bottom: 0,
              width: m.w,
              height: m.h,
              background: isNight ? '#0d1b2a' : isSunset ? '#7c2d12' : '#1e3a5f',
              clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
              opacity: 0.7,
            }} />
          ))}
        </div>

        {/* ── FIELDS or URBAN BUILDINGS ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '20%', width: '200%', height: '40%', animation: `train-scroll ${fieldDur} linear infinite`, display: 'flex', alignItems: 'flex-end' }}>
          {!isUrban ? (
            fieldSet.map((f, i) => (
              <div key={i} style={{
                minWidth: f.w, width: f.w, height: `${55 + (i % 4) * 12}%`,
                background: isNight ? '#14532d' : f.color,
                flexShrink: 0, marginRight: 2,
                borderTop: `2px solid ${isNight ? '#166534' : '#22c55e'}`,
                opacity: isNight ? 0.75 : 0.9,
              }} />
            ))
          ) : (
            urbanSet.map((b, i) => (
              <div key={i} style={{
                minWidth: b.w, width: b.w, height: b.h,
                background: b.color, flexShrink: 0, marginRight: 2,
                borderTop: '2px solid rgba(255,255,255,0.06)',
                position: 'relative',
              }}>
                {/* Building windows */}
                <div style={{ position: 'absolute', inset: '6px 5px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                  {[...Array(b.windows)].map((_, j) => (
                    <div key={j} style={{
                      background: (isNight || isSunset) && (i + j) % 3 !== 2
                        ? 'rgba(253,224,71,0.65)'
                        : 'rgba(100,130,160,0.3)',
                      borderRadius: 1,
                    }} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── TREES ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '20%', width: '200%', height: '32%', animation: `train-scroll ${treeDur} linear infinite`, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {treeSet.map((t, i) => t.w === 0 ? (
            <div key={i} style={{ minWidth: 50, flexShrink: 0 }} />
          ) : (
            <div key={i} style={{ position: 'relative', minWidth: t.w + 16, flexShrink: 0 }}>
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 5, height: t.tall ? 50 : 38, background: '#78350f', borderRadius: 2 }} />
              <div style={{ position: 'absolute', bottom: t.tall ? 44 : 32, left: '50%', transform: 'translateX(-50%)', width: t.w, height: t.tall ? 52 : 38, borderRadius: '50% 50% 40% 40%', background: isNight ? '#14532d' : '#15803d' }} />
              {t.tall && (
                <div style={{ position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)', width: t.w * 0.7, height: 32, borderRadius: '50% 50% 40% 40%', background: isNight ? '#166534' : '#16a34a' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── RAILWAY EMBANKMENT (foreground wall) ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '22%', background: isNight ? '#111827' : '#374151' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: isNight ? '#4b5563' : '#6b7280' }} />
          {/* Gravel texture lines */}
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', top: `${20 + i * 12}%`, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>

        {/* Railway track sleepers (animated) */}
        <div style={{ position: 'absolute', left: 0, bottom: '2%', width: '200%', height: '18%', animation: `train-scroll ${poleDur} linear infinite`, display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          {[...Array(28)].map((_, i) => (
            <div key={i} style={{ minWidth: 8, height: '40%', background: '#5c4033', borderRadius: 2, flexShrink: 0, opacity: 0.8 }} />
          ))}
        </div>

        {/* ── TELEGRAPH POLES (fastest foreground layer) ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '18%', width: '200%', height: '65%', animation: `train-scroll ${poleDur} linear infinite`, display: 'flex', alignItems: 'flex-end', gap: 160 }}>
          {poleSet.map((hasPole, i) => hasPole ? (
            <div key={i} style={{ position: 'relative', minWidth: 10, height: '100%', flexShrink: 0 }}>
              {/* Pole */}
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 5, height: '85%', background: '#1c120a', borderRadius: 2 }} />
              {/* Cross-arm */}
              <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 38, height: 4, background: '#1c120a', borderRadius: 2 }} />
              {/* Wire dots (insulators) */}
              <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(-16px, -2px)', width: 6, height: 6, borderRadius: '50%', background: '#4b5563' }} />
              <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(10px, -2px)', width: 6, height: 6, borderRadius: '50%', background: '#4b5563' }} />
              {/* Wires (extend out to the sides) */}
              <div style={{ position: 'absolute', top: '10%', left: '50%', width: '180px', height: 1, background: 'rgba(50,50,50,0.6)', transform: 'translateX(-90px) translateY(2px)' }} />
            </div>
          ) : (
            <div key={i} style={{ minWidth: 40, flexShrink: 0 }} />
          ))}
        </div>

        {/* ── WEATHER OVERLAY ── */}
        <WeatherOverlay weather={weather} />

        {/* Glass reflection */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(140deg, rgba(255,255,255,0.09) 0%, transparent 40%, rgba(0,0,0,0.1) 100%)', pointerEvents: 'none', zIndex: 15 }} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 22px rgba(0,0,0,0.6)', pointerEvents: 'none', zIndex: 16 }} />

        {/* Night dark overlay */}
        {isNight && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,10,0.22)', zIndex: 14, pointerEvents: 'none' }} />
        )}
      </div>

      {/* ── WINDOW FRAME DETAILS (outside the sway wrapper so they stay fixed) ── */}
      {/* Top trim strip (cabin ceiling edge) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 7, background: 'linear-gradient(to bottom, #2a1a0a, #111)', zIndex: 20 }} />
      {/* Bottom sill */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: 'linear-gradient(to top, #2a1a0a, #1a1008)', zIndex: 20 }} />
    </div>
  );
}
