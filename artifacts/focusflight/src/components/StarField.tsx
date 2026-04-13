import React, { useMemo } from 'react';

// Approximate city-cluster positions on screen (% x, % y) + glow radius + intensity
// Modelled after NASA Black Marble night-light density map
const CITY_CLUSTERS = [
  { x: 18, y: 30, r: 38, intensity: 0.55 }, // North America East Coast
  { x: 16, y: 32, r: 22, intensity: 0.70 }, // Northeast USA
  { x:  7, y: 33, r: 25, intensity: 0.45 }, // North America West Coast
  { x: 47, y: 24, r: 45, intensity: 0.75 }, // Europe
  { x: 49, y: 22, r: 28, intensity: 0.60 }, // UK / North Sea
  { x: 57, y: 34, r: 30, intensity: 0.50 }, // Middle East / Gulf
  { x: 63, y: 36, r: 38, intensity: 0.65 }, // South Asia (India)
  { x: 64, y: 38, r: 20, intensity: 0.55 }, // Mumbai / Chennai belt
  { x: 76, y: 28, r: 55, intensity: 0.80 }, // East Asia (China)
  { x: 80, y: 30, r: 32, intensity: 0.70 }, // Japan / Korea
  { x: 74, y: 40, r: 22, intensity: 0.45 }, // Southeast Asia
  { x: 80, y: 62, r: 20, intensity: 0.40 }, // Australia East
  { x: 30, y: 58, r: 28, intensity: 0.40 }, // South America East
  { x: 45, y: 45, r: 18, intensity: 0.30 }, // West Africa
  { x: 55, y: 20, r: 20, intensity: 0.35 }, // Russia / Moscow
];

export function StarField() {
  const stars = useMemo(() =>
    Array.from({ length: 200 }).map((_, i) => ({
      id:                i,
      left:              `${Math.random() * 100}%`,
      top:               `${Math.random() * 100}%`,
      size:              `${Math.random() * 1.8 + 0.6}px`,
      animationDelay:    `${Math.random() * 6}s`,
      animationDuration: `${Math.random() * 4 + 3}s`,
      opacity:           Math.random() * 0.6 + 0.15,
    })), []);

  // Warm city-light dots scattered around each cluster centre
  const cityLights = useMemo(() =>
    CITY_CLUSTERS.flatMap((c, ci) =>
      Array.from({ length: 18 + Math.round(c.intensity * 22) }).map((_, li) => {
        const angle  = Math.random() * 2 * Math.PI;
        const radius = Math.random() * c.r;
        const isIndustrial = Math.random() > 0.85;
        return {
          id:       `${ci}-${li}`,
          left:     `${c.x + Math.cos(angle) * radius * 0.55}%`,
          top:      `${c.y + Math.sin(angle) * radius * 0.30}%`,
          size:     Math.random() * 2.4 + 0.8,
          opacity:  Math.random() * c.intensity * 0.65 + 0.08,
          color:    isIndustrial
            ? 'hsl(200,60%,85%)'
            : `hsl(${35 + Math.round(Math.random() * 20)},90%,70%)`,
          delay:    `${Math.random() * 8}s`,
          duration: `${Math.random() * 6 + 5}s`,
        };
      })
    ), []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #0b0f20 0%, #050810 60%, #020408 100%)' }}
    >
      {/* Aurora / atmosphere glow at poles */}
      <div style={{
        position: 'absolute', inset: 0,
        background: [
          'radial-gradient(ellipse 120% 40% at 50% 0%,   rgba(30,15,60,0.55) 0%, transparent 70%)',
          'radial-gradient(ellipse 120% 30% at 50% 100%, rgba(10,20,40,0.45) 0%, transparent 70%)',
          'radial-gradient(ellipse 80%  60% at 20% 50%,  rgba(5,15,35,0.25)  0%, transparent 60%)',
        ].join(','),
        pointerEvents: 'none',
      }} />

      {/* Milky Way — faint diagonal shimmer */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(125deg, transparent 20%, rgba(60,50,100,0.06) 40%, rgba(80,70,140,0.08) 50%, rgba(60,50,100,0.05) 60%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      {/* Stars */}
      {stars.map(star => (
        <div
          key={star.id}
          className="star"
          style={{
            position:          'absolute',
            left:              star.left,
            top:               star.top,
            width:             star.size,
            height:            star.size,
            background:        'white',
            borderRadius:      '50%',
            animationDelay:    star.animationDelay,
            animationDuration: star.animationDuration,
            opacity:           star.opacity,
          }}
        />
      ))}

      {/* City light dots — warm amber/orange glow mimicking night-earth lights */}
      {cityLights.map(dot => (
        <div
          key={dot.id}
          className="star"
          style={{
            position:          'absolute',
            left:              dot.left,
            top:               dot.top,
            width:             `${dot.size}px`,
            height:            `${dot.size}px`,
            borderRadius:      '50%',
            background:        dot.color,
            boxShadow:         `0 0 ${dot.size * 2.5}px ${dot.color}`,
            animationDelay:    dot.delay,
            animationDuration: dot.duration,
            opacity:           dot.opacity,
          }}
        />
      ))}

      {/* Soft regional glow — diffuse warmth over populated areas */}
      {CITY_CLUSTERS.map((c, i) => (
        <div
          key={i}
          style={{
            position:     'absolute',
            left:         `${c.x - c.r * 0.4}%`,
            top:          `${c.y - c.r * 0.4}%`,
            width:        `${c.r * 1.2}%`,
            height:       `${c.r * 0.7}%`,
            borderRadius: '50%',
            background:   `radial-gradient(ellipse, rgba(255,180,60,${c.intensity * 0.07}) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
}
