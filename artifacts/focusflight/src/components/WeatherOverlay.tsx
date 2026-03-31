import React, { useMemo } from 'react';

export type WeatherType = 'clear' | 'drizzle' | 'rain' | 'fog' | 'snow';

export function pickWeather(): WeatherType {
  const r = Math.random();
  if (r < 0.42) return 'clear';
  if (r < 0.64) return 'drizzle';
  if (r < 0.80) return 'rain';
  if (r < 0.92) return 'fog';
  return 'snow';
}

interface Props {
  weather: WeatherType;
  /** 0-1, used to scale snow/rain intensity with time of day if desired */
  intensity?: number;
}

const RAIN_DROPS_DRIZZLE = 18;
const RAIN_DROPS_RAIN    = 38;
const SNOW_DOTS          = 28;

export function WeatherOverlay({ weather, intensity = 1 }: Props) {
  const rainDrops = useMemo(() => {
    const count = weather === 'drizzle' ? RAIN_DROPS_DRIZZLE : RAIN_DROPS_RAIN;
    return Array.from({ length: count }, (_, i) => ({
      left:     `${(i * 7.3 + 3) % 100}%`,
      delay:    `${-((i * 1.37) % 2.2).toFixed(2)}s`,
      duration: `${(0.35 + (i % 5) * 0.12).toFixed(2)}s`,
      opacity:  weather === 'drizzle' ? 0.35 + (i % 3) * 0.1 : 0.5 + (i % 4) * 0.1,
      width:    weather === 'drizzle' ? 1 : 1.5,
      height:   weather === 'drizzle' ? 12 + (i % 4) * 6 : 20 + (i % 5) * 10,
    }));
  }, [weather]);

  const snowDots = useMemo(() => Array.from({ length: SNOW_DOTS }, (_, i) => ({
    left:     `${(i * 3.7 + 2) % 100}%`,
    delay:    `${-((i * 0.9) % 4).toFixed(1)}s`,
    duration: `${(2.5 + (i % 5) * 0.5).toFixed(1)}s`,
    size:     2 + (i % 3),
    opacity:  0.55 + (i % 3) * 0.15,
  })), []);

  if (weather === 'clear') return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes rain-fall {
          0%   { transform: translateY(-20px) translateX(0); opacity: 1; }
          100% { transform: translateY(105%) translateX(-4px); opacity: 0.4; }
        }
        @keyframes snow-drift {
          0%   { transform: translateY(-10px) translateX(0px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.8; }
          100% { transform: translateY(105%) translateX(12px); opacity: 0; }
        }
        @keyframes fog-pulse {
          0%, 100% { opacity: 0.22; }
          50%       { opacity: 0.30; }
        }
      `}</style>

      {/* Rain / Drizzle */}
      {(weather === 'rain' || weather === 'drizzle') && rainDrops.map((d, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 0,
          left: d.left,
          width: d.width,
          height: d.height,
          background: `rgba(180,210,255,${d.opacity})`,
          borderRadius: 2,
          animation: `rain-fall ${d.duration} linear ${d.delay} infinite`,
          transform: 'rotate(8deg)',
        }} />
      ))}

      {/* Rain streaks running down glass (static smears for heavier rain) */}
      {weather === 'rain' && (
        <>
          {[12, 27, 45, 63, 78, 88].map((left, i) => (
            <div key={`streak-${i}`} style={{
              position: 'absolute',
              top: `${10 + (i * 11) % 30}%`,
              left: `${left}%`,
              width: 1,
              height: `${20 + (i * 7) % 35}%`,
              background: 'linear-gradient(to bottom, rgba(200,230,255,0.5), rgba(200,230,255,0))',
              borderRadius: 2,
              animation: `rain-fall ${(1.8 + i * 0.4).toFixed(1)}s linear ${-(i * 0.7).toFixed(1)}s infinite`,
            }} />
          ))}
          {/* Water on glass droplet smears */}
          {[8, 22, 38, 55, 71, 84].map((left, i) => (
            <div key={`smear-${i}`} style={{
              position: 'absolute',
              top: `${5 + (i * 13) % 60}%`,
              left: `${left}%`,
              width: 2 + (i % 2),
              height: `${8 + (i * 6) % 25}%`,
              background: 'linear-gradient(to bottom, rgba(200,230,255,0.35), rgba(200,230,255,0.05))',
              borderRadius: 8,
            }} />
          ))}
        </>
      )}

      {/* Fog */}
      {weather === 'fog' && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(210,220,230,0.28) 0%, rgba(210,220,230,0.12) 60%, rgba(210,220,230,0.05) 100%)',
            animation: 'fog-pulse 5s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', bottom: '20%', left: 0, right: 0, height: '30%',
            background: 'linear-gradient(to top, rgba(200,215,225,0.22), transparent)',
            animation: 'fog-pulse 7s ease-in-out 2s infinite',
          }} />
        </>
      )}

      {/* Snow */}
      {weather === 'snow' && snowDots.map((d, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 0,
          left: d.left,
          width: d.size,
          height: d.size,
          borderRadius: '50%',
          background: `rgba(255,255,255,${d.opacity})`,
          animation: `snow-drift ${d.duration} ease-in-out ${d.delay} infinite`,
        }} />
      ))}
    </div>
  );
}
