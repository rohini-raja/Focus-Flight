import React, { useMemo } from 'react';

export function StarField() {
  // Generate random stars only once to avoid hydration mismatch and react re-renders
  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${Math.random() * 3 + 3}s`,
      opacity: Math.random() * 0.7 + 0.1
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#0a0e1a]">
      {/* Optional faint gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a] via-transparent to-[#050812]" />
      
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.animationDelay,
            animationDuration: star.animationDuration,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}
