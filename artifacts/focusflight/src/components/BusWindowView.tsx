import React, { useMemo } from 'react';
import { WeatherOverlay, WeatherType } from './WeatherOverlay';

interface BusWindowViewProps {
  progress: number;
  weather?: WeatherType;
}

/* ─── Deterministic scene data ───────────────────────────────────────────── */
const FAR_BUILDINGS = [
  { w: 55, h: 72, color: '#1e293b', windows: 4 },
  { w: 80, h: 110, color: '#0f172a', windows: 6 },
  { w: 45, h: 60, color: '#1e293b', windows: 3 },
  { w: 100, h: 95, color: '#0f1923', windows: 8 },
  { w: 60, h: 130, color: '#162032', windows: 5 },
  { w: 75, h: 80, color: '#1a2640', windows: 6 },
  { w: 50, h: 65, color: '#0f172a', windows: 4 },
  { w: 90, h: 105, color: '#1e293b', windows: 7 },
];

const MID_BUILDINGS = [
  { w: 110, color: '#7f1d1d', accent: '#dc2626', sign: 'MARKET',    signColor: '#fde047', awning: '#b91c1c' },
  { w: 90,  color: '#1c3a1c', accent: '#16a34a', sign: 'CAFÉ',      signColor: '#86efac', awning: '#15803d' },
  { w: 80,  color: '#1e3a5f', accent: '#2563eb', sign: 'HOTEL',     signColor: '#93c5fd', awning: '#1d4ed8' },
  { w: 130, color: '#3b1f5e', accent: '#7c3aed', sign: 'PHARMACY',  signColor: '#c4b5fd', awning: '#6d28d9' },
  { w: 100, color: '#5a2d0c', accent: '#ea580c', sign: 'DINER',     signColor: '#fed7aa', awning: '#c2410c' },
  { w: 85,  color: '#1a3a3a', accent: '#0891b2', sign: 'LAUNDRY',   signColor: '#7dd3fc', awning: '#0e7490' },
  { w: 95,  color: '#2d1f3d', accent: '#9333ea', sign: 'BOOKS',     signColor: '#e9d5ff', awning: '#7e22ce' },
  { w: 115, color: '#1f2937', accent: '#374151', sign: 'HARDWARE',  signColor: '#9ca3af', awning: '#374151' },
];

const TREES = [true, false, true, true, false, false, true, false, true, true, false, true];
const LAMPS  = [0, 1, 0, 1, 0, 1, 0, 1]; // 1 = lamp post here

const CARS = [
  { w: 72,  h: 28, color: '#dc2626', roof: '#991b1b' },
  { w: 88,  h: 30, color: '#1d4ed8', roof: '#1e3a8a' },
  { w: 65,  h: 26, color: '#e5e7eb', roof: '#9ca3af' },
  { w: 80,  h: 28, color: '#15803d', roof: '#14532d' },
  { w: 90,  h: 32, color: '#fbbf24', roof: '#b45309' },
  { w: 78,  h: 28, color: '#374151', roof: '#111827' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function repeat<T>(arr: T[], times: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < times; i++) out.push(...arr);
  return out;
}

/* ─── Component ───────────────────────────────────────────────────────────── */
export function BusWindowView({ progress, weather = 'clear' }: BusWindowViewProps) {
  const isDay    = progress < 38;
  const isSunset = progress >= 38 && progress < 62;
  const isNight  = progress >= 62;

  /* Speed: slow at start/end, full in the middle */
  const rawSpeed = progress < 8
    ? progress / 8
    : progress > 92
      ? (100 - progress) / 8
      : 1;
  const spd = Math.max(rawSpeed, 0.08);

  /* Animation durations per layer */
  const cloudDur  = `${70  / spd}s`;
  const farDur    = `${55  / spd}s`;
  const midDur    = `${20  / spd}s`;
  const treeDur   = `${14  / spd}s`;
  const roadDur   = `${1.4 / spd}s`;
  const lampDur   = `${5.5 / spd}s`;
  const carFastDur = `${3  / spd}s`;
  const carSlowDur = `${6  / spd}s`;

  /* Sky colours */
  const skyTop = isDay    ? '#3b82f6' : isSunset ? '#c2410c' : '#0a0a20';
  const skyBot = isDay    ? '#bfdbfe' : isSunset ? '#fbbf24' : '#1e1b4b';
  const groundColour = isNight ? '#111827' : '#374151';

  /* Pre-render repeating sections (×2 for seamless loop) */
  const farBldgSet  = useMemo(() => repeat(FAR_BUILDINGS, 2), []);
  const midBldgSet  = useMemo(() => repeat(MID_BUILDINGS, 2), []);
  const treeSet     = useMemo(() => repeat(TREES, 6),         []);
  const lampSet     = useMemo(() => repeat(LAMPS, 4),         []);
  const carsTop     = useMemo(() => repeat(CARS, 3),          []);
  const carsBot     = useMemo(() => repeat(CARS, 3).reverse(),[]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 560,
      aspectRatio: '16 / 7',
      margin: '0 auto',
      borderRadius: 10,
      overflow: 'hidden',
      /* Bus window frame */
      border: '20px solid #111',
      boxShadow: 'inset 0 0 0 3px #2a2a2a, inset 0 0 0 4px #3a3a3a, 0 20px 50px rgba(0,0,0,0.7)',
      background: '#111',
    }}>
      <style>{`
        @keyframes scroll-loop {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes road-dash {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-40px); }
        }
        @keyframes bus-sway {
          0%, 100% { transform: translateY(0px); }
          25%       { transform: translateY(-1px); }
          75%       { transform: translateY(1px); }
        }
      `}</style>

      {/* Inner sway wrapper */}
      <div style={{ position: 'absolute', inset: 0, animation: `bus-sway ${2.8 / spd}s ease-in-out infinite` }}>

        {/* ── SKY ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, ${skyTop} 0%, ${skyBot} 100%)`,
          transition: 'background 3s ease',
        }} />

        {/* ── SUN / MOON ── */}
        {isDay && (
          <div style={{ position: 'absolute', top: '10%', right: '15%', width: 32, height: 32, borderRadius: '50%', background: '#fde047', boxShadow: '0 0 24px 10px rgba(253,224,71,0.35)' }} />
        )}
        {isSunset && (
          <div style={{ position: 'absolute', bottom: '35%', left: '20%', width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(to bottom, #fbbf24, #f97316)', boxShadow: '0 0 40px 16px rgba(251,191,36,0.3)' }} />
        )}
        {isNight && (
          <>
            <div style={{ position: 'absolute', top: '8%', right: '20%', width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', boxShadow: '0 0 20px 6px rgba(241,245,249,0.2)' }} />
            {[...Array(14)].map((_, i) => (
              <div key={i} style={{ position: 'absolute', width: 2, height: 2, borderRadius: '50%', background: 'white', opacity: 0.6 + (i % 3) * 0.2, top: `${8 + (i * 37 % 28)}%`, left: `${5 + (i * 53 % 80)}%` }} />
            ))}
          </>
        )}

        {/* ── CLOUDS (day/sunset only) ── */}
        {!isNight && (
          <div style={{ position: 'absolute', top: '8%', left: 0, width: '200%', height: '22%', animation: `scroll-loop ${cloudDur} linear infinite`, pointerEvents: 'none' }}>
            {[140, 300, 520, 760, 1000, 1200, 1400, 1600].map((x, i) => (
              <div key={i} style={{
                position: 'absolute', top: `${10 + (i % 3) * 25}%`, left: x,
                width: 80 + (i % 3) * 40, height: 24 + (i % 2) * 10,
                borderRadius: 40, background: isSunset ? 'rgba(255,200,150,0.6)' : 'rgba(255,255,255,0.75)',
                boxShadow: isSunset ? '0 4px 12px rgba(251,191,36,0.2)' : '0 4px 8px rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        )}

        {/* ── FAR BUILDINGS (slow) ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '30%', width: '200%', height: '40%', animation: `scroll-loop ${farDur} linear infinite`, display: 'flex', alignItems: 'flex-end' }}>
          {farBldgSet.map((b, i) => (
            <div key={i} style={{ position: 'relative', width: b.w, minWidth: b.w, height: b.h, background: isNight ? '#0d1b2a' : b.color, flexShrink: 0, marginRight: 4 }}>
              {isNight && (
                <div style={{ position: 'absolute', inset: '8px 6px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                  {[...Array(b.windows)].map((_, j) => (
                    <div key={j} style={{ background: (i + j) % 3 !== 0 ? 'rgba(253,224,71,0.7)' : 'transparent', borderRadius: 1 }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── MID BUILDINGS — shops/storefronts ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '24%', width: '200%', height: '46%', animation: `scroll-loop ${midDur} linear infinite`, display: 'flex', alignItems: 'flex-end' }}>
          {midBldgSet.map((b, i) => (
            <div key={i} style={{ position: 'relative', width: b.w, minWidth: b.w, height: '100%', background: b.color, flexShrink: 0, marginRight: 2, borderTop: `3px solid ${b.accent}` }}>
              {/* Awning */}
              <div style={{ position: 'absolute', top: '28%', left: 0, right: 0, height: 12, background: b.awning, borderBottom: `2px solid rgba(0,0,0,0.3)` }} />
              {/* Shop window */}
              <div style={{ position: 'absolute', bottom: 20, left: 8, right: 8, height: '28%', background: (isNight || isSunset) ? 'rgba(253,224,71,0.15)' : 'rgba(186,230,253,0.35)', border: `1px solid ${b.accent}40`, borderRadius: 2, boxShadow: (isNight || isSunset) ? `0 0 12px rgba(253,224,71,0.2)` : 'none' }} />
              {/* Neon sign */}
              <div style={{
                position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                fontSize: 7, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 0.5,
                color: b.signColor, whiteSpace: 'nowrap',
                textShadow: isNight ? `0 0 6px ${b.signColor}, 0 0 12px ${b.signColor}` : 'none',
              }}>
                {b.sign}
              </div>
              {/* Door */}
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 16, height: 20, background: b.accent + '88', border: `1px solid ${b.accent}` }} />
            </div>
          ))}
        </div>

        {/* ── TREES ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '24%', width: '200%', height: '32%', animation: `scroll-loop ${treeDur} linear infinite`, display: 'flex', alignItems: 'flex-end' }}>
          {treeSet.map((hasTree, i) =>
            hasTree ? (
              <div key={i} style={{ position: 'relative', width: 50, minWidth: 50, flexShrink: 0 }}>
                {/* Trunk */}
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 6, height: 28, background: '#78350f', borderRadius: 3 }} />
                {/* Foliage */}
                <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', width: 36, height: 44, borderRadius: '50%', background: isNight ? '#14532d' : '#166534', boxShadow: isNight ? 'none' : `inset -4px -4px 8px rgba(0,0,0,0.3)` }} />
                <div style={{ position: 'absolute', bottom: 38, left: '50%', transform: 'translateX(-50%)', width: 26, height: 30, borderRadius: '50%', background: isNight ? '#15803d' : '#16a34a' }} />
              </div>
            ) : (
              <div key={i} style={{ width: 40, minWidth: 40, flexShrink: 0 }} />
            )
          )}
        </div>

        {/* ── SIDEWALK ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '16%', height: '10%', background: isNight ? '#374151' : '#9ca3af', borderTop: `2px solid ${isNight ? '#4b5563' : '#d1d5db'}` }}>
          {/* Sidewalk slabs */}
          {[...Array(10)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${i * 10}%`, width: 1, background: 'rgba(0,0,0,0.15)' }} />
          ))}
        </div>

        {/* ── ROAD ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '20%', background: isNight ? '#111827' : '#374151' }}>
          {/* Lane divider — animated dashes */}
          <div style={{ position: 'absolute', top: '45%', left: 0, right: 0, height: 2, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 20, animation: `road-dash ${roadDur} linear infinite`, width: '200%' }}>
              {[...Array(32)].map((_, i) => (
                <div key={i} style={{ width: 30, minWidth: 30, height: 2, background: '#fbbf24', borderRadius: 1, opacity: 0.8 }} />
              ))}
            </div>
          </div>
          {/* Road edge lines */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#e5e7eb', opacity: 0.6 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#e5e7eb', opacity: 0.4 }} />
        </div>

        {/* ── CARS ON ROAD (far lane, going same direction — slow) ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '4%', width: '200%', height: '10%', animation: `scroll-loop ${carSlowDur} linear infinite`, display: 'flex', alignItems: 'flex-end', gap: 80 }}>
          {carsTop.map((car, i) => (
            <div key={i} style={{ position: 'relative', minWidth: car.w, flexShrink: 0 }}>
              {/* Car body */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: car.w, height: car.h, background: car.color, borderRadius: '4px 4px 2px 2px' }}>
                {/* Roof */}
                <div style={{ position: 'absolute', top: -10, left: '20%', right: '15%', height: car.h * 0.55, background: car.roof, borderRadius: '4px 4px 0 0' }} />
                {/* Windows */}
                <div style={{ position: 'absolute', top: -8, left: '22%', right: '18%', height: car.h * 0.48, background: 'rgba(147,210,234,0.7)', borderRadius: '3px 3px 0 0' }} />
                {/* Headlights */}
                {isNight && <>
                  <div style={{ position: 'absolute', right: 4, bottom: 6, width: 6, height: 4, background: '#fde047', borderRadius: 2, boxShadow: '0 0 8px 4px rgba(253,224,71,0.5)' }} />
                  <div style={{ position: 'absolute', left: 4, bottom: 6, width: 6, height: 4, background: '#ef4444', borderRadius: 2, boxShadow: '0 0 6px 2px rgba(239,68,68,0.5)' }} />
                </>}
                {/* Wheels */}
                <div style={{ position: 'absolute', bottom: -4, left: 10, width: 10, height: 10, borderRadius: '50%', background: '#111', border: '2px solid #4b5563' }} />
                <div style={{ position: 'absolute', bottom: -4, right: 10, width: 10, height: 10, borderRadius: '50%', background: '#111', border: '2px solid #4b5563' }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── CARS COMING THE OTHER WAY (fast, lower lane) ── */}
        <div style={{
          position: 'absolute', left: 0, bottom: '14%', width: '200%', height: '8%',
          animation: `scroll-loop ${carFastDur} linear infinite`,
          animationDirection: 'reverse',
          display: 'flex', alignItems: 'flex-end', gap: 60,
        }}>
          {carsBot.map((car, i) => (
            <div key={i} style={{ position: 'relative', minWidth: car.w, flexShrink: 0, transform: 'scaleX(-1)' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: car.w, height: car.h - 4, background: car.color, borderRadius: '4px 4px 2px 2px' }}>
                <div style={{ position: 'absolute', top: -8, left: '20%', right: '15%', height: (car.h - 4) * 0.5, background: car.roof, borderRadius: '4px 4px 0 0' }} />
                <div style={{ position: 'absolute', top: -6, left: '22%', right: '18%', height: (car.h - 4) * 0.42, background: 'rgba(147,210,234,0.65)', borderRadius: '3px 3px 0 0' }} />
                {isNight && <>
                  <div style={{ position: 'absolute', right: 4, bottom: 5, width: 8, height: 5, background: '#fde047', borderRadius: 2, boxShadow: '0 0 14px 6px rgba(253,224,71,0.6)' }} />
                </>}
                <div style={{ position: 'absolute', bottom: -4, left: 8, width: 9, height: 9, borderRadius: '50%', background: '#111', border: '2px solid #4b5563' }} />
                <div style={{ position: 'absolute', bottom: -4, right: 8, width: 9, height: 9, borderRadius: '50%', background: '#111', border: '2px solid #4b5563' }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── LAMP POSTS (foreground, fast) ── */}
        <div style={{ position: 'absolute', left: 0, bottom: '15%', width: '200%', height: '70%', animation: `scroll-loop ${lampDur} linear infinite`, display: 'flex', alignItems: 'flex-end', gap: 140 }}>
          {lampSet.map((hasLamp, i) =>
            hasLamp ? (
              <div key={i} style={{ position: 'relative', minWidth: 16, height: '100%', flexShrink: 0 }}>
                {/* Pole */}
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 4, height: '90%', background: '#374151', borderRadius: 2 }} />
                {/* Arm */}
                <div style={{ position: 'absolute', top: '5%', left: '50%', width: 20, height: 3, background: '#374151', borderRadius: 2 }} />
                {/* Light */}
                <div style={{
                  position: 'absolute', top: '2%', left: '50%',
                  width: 14, height: 8, background: (isNight || isSunset) ? '#fde047' : '#d1d5db',
                  borderRadius: 3,
                  boxShadow: (isNight || isSunset) ? '0 0 16px 8px rgba(253,224,71,0.5)' : 'none',
                  transform: 'translateX(2px)',
                }} />
              </div>
            ) : (
              <div key={i} style={{ minWidth: 80, flexShrink: 0 }} />
            )
          )}
        </div>

        {/* ── WEATHER ── */}
        <WeatherOverlay weather={weather} />

        {/* ── GLASS REFLECTION ── */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(130deg, rgba(255,255,255,0.08) 0%, transparent 45%, rgba(0,0,0,0.12) 100%)', pointerEvents: 'none', zIndex: 10 }} />
        {/* Inner window edge grime */}
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 18px rgba(0,0,0,0.55)', pointerEvents: 'none', zIndex: 11 }} />

        {/* ── INTERIOR FRAME DETAILS ── */}
        {/* Overhead luggage rack strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'linear-gradient(to bottom, #1f2937, #111827)', opacity: 0.85, zIndex: 12 }} />
        {/* Seat headrest silhouette at bottom corner */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 16, background: '#111', borderTopRightRadius: 6, opacity: 0.7, zIndex: 12 }} />

        {/* Night overlay to darken the whole scene */}
        {isNight && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,10,0.28)', zIndex: 9, pointerEvents: 'none' }} />
        )}
      </div>
    </div>
  );
}
