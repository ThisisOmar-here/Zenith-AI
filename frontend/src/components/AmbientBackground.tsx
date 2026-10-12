import React from 'react';

// Layered ambient background with soft gradients, organic orbs, subtle noise
// Purely decorative; aria-hidden for accessibility.
const AmbientBackground: React.FC = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,theme(colors.primary.100)/80%,transparent_60%),radial-gradient(circle_at_80%_30%,theme(colors.accent.100)/70%,transparent_65%),radial-gradient(circle_at_50%_80%,theme(colors.secondary.100)/60%,transparent_70%)]">
      {/* Gradient veil */}
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      {/* Animated color film */}
      <div className="absolute inset-0 animate-zenith-shift mix-blend-soft-light bg-[conic-gradient(from_0deg_at_50%_50%,theme(colors.primary.200)_0deg,theme(colors.accent.200)_120deg,theme(colors.secondary.200)_240deg,theme(colors.primary.200)_360deg)] opacity-[0.25]" />

      {/* Organic orbs */}
      <div className="absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`zenith-orb orb-${i + 1}`}
            style={{ animationDelay: `${i * 2.75}s` }}
          />
        ))}
      </div>

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.07))]" />

      {/* Grain layer */}
      <div className="absolute inset-0 zenith-noise opacity-[0.18] mix-blend-overlay" />
    </div>
  );
};

export default AmbientBackground;
