import React, { useMemo } from 'react';

export default function ParticleBackground({ count = 55, opacity = 1 }) {
  // Stable randomized particles generated once per mount
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const size = 1.5 + Math.random() * 3.0;
      const baseOpacity = 0.25 + Math.random() * 0.50;
      const duration = 9 + Math.random() * 9; // 9s to 18s
      const delay = -Math.random() * 15;      // staggered start
      const driftX = (Math.random() - 0.5) * 50; // -25px to +25px
      const driftY = -25 - Math.random() * 45;   // -25px to -70px upward float

      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        opacity: baseOpacity,
        glow: size * 2.5,
        duration,
        delay,
        driftX,
        driftY,
      });
    }
    return arr;
  }, [count]);

  return (
    <div
      className="particle-background-container"
      style={{ opacity }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="glowing-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.glow}px rgba(0, 255, 157, ${p.opacity * 0.95})`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--drift-x': `${p.driftX}px`,
            '--drift-y': `${p.driftY}px`,
          }}
        />
      ))}
    </div>
  );
}
